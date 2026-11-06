"""Season-level extras ESPN doesn't show: playoff odds from simulated seasons,
the schedule swap grid, and the season record book."""

import math
from collections import Counter

import numpy as np

SIMS = 20000
PRIOR_GAMES = 3  # how many league-average games to blend into each team's mean


def _regular(summaries):
    return [s for s in summaries if not s["playoff"]]


def _team_scores(summaries):
    """team id -> {week: (score, opponent id, opponent score)} for regular-season weeks."""
    out = {}
    for s in _regular(summaries):
        for m in s["matchups"]:
            out.setdefault(m["home"], {})[s["week"]] = (m["homeScore"], m["away"], m["awayScore"])
            out.setdefault(m["away"], {})[s["week"]] = (m["awayScore"], m["home"], m["homeScore"])
    return out


def _ranks(wins, pf):
    """Rank teams in each simulated season: wins first, then points for. 0 = first."""
    key = wins * 1e6 + pf
    order = np.argsort(-key, axis=1, kind="stable")
    ranks = np.empty_like(order)
    rows = np.arange(order.shape[0])[:, None]
    ranks[rows, order] = np.arange(order.shape[1])[None, :]
    return ranks


def playoff_odds(league, standings, summaries, sims=SIMS, seed=2026):
    remaining = league.get("remaining") or []
    spots = league.get("playoffTeams") or 0
    team_ids = [t["id"] for t in league["teams"]]
    n = len(team_ids)
    if not remaining or not spots or n < 2 or not _regular(summaries):
        return None
    spots = min(spots, n)
    idx = {t: i for i, t in enumerate(team_ids)}
    row = {r["team"]: r for r in standings}

    played = _team_scores(summaries)
    all_scores = np.array([v[0] for t in played.values() for v in t.values()], dtype=float)
    league_mean = all_scores.mean()
    raw_means = np.array([np.mean([v[0] for v in played.get(t, {}).values()] or [league_mean]) for t in team_ids])
    games = np.array([len(played.get(t, {})) for t in team_ids], dtype=float)
    resid = [v[0] - raw_means[idx[t]] for t in team_ids for v in played.get(t, {}).values()]
    dof = max(len(resid) - n, 1)
    sd = math.sqrt(sum(r * r for r in resid) / dof) if resid else 20.0
    sd = max(sd, 5.0)
    means = (raw_means * games + PRIOR_GAMES * league_mean) / (games + PRIOR_GAMES)

    weeks = sorted({g["week"] for g in remaining})
    w_idx = {w: i for i, w in enumerate(weeks)}
    gw = np.array([w_idx[g["week"]] for g in remaining])
    gh = np.array([idx[g["home"]] for g in remaining])
    ga = np.array([idx[g["away"]] for g in remaining])

    rng = np.random.default_rng(seed)
    true_mean = means[None, :] + rng.normal(0, 1, (sims, n)) * (sd / np.sqrt(games + PRIOR_GAMES))[None, :]
    draws = true_mean[:, None, :] + rng.normal(0, sd, (sims, len(weeks), n))
    hs = draws[:, gw, gh]
    as_ = draws[:, gw, ga]
    home_win = hs > as_

    cur_wins = np.array([row[t]["w"] + 0.5 * row[t]["t"] for t in team_ids], dtype=float)
    cur_pf = np.array([row[t]["pf"] for t in team_ids], dtype=float)
    pf = np.tile(cur_pf, (sims, 1))
    for g in range(len(remaining)):
        pf[:, gh[g]] += hs[:, g]
        pf[:, ga[g]] += as_[:, g]

    def season_wins(hw):
        wins = np.tile(cur_wins, (sims, 1))
        for g in range(len(remaining)):
            wins[:, gh[g]] += hw[:, g]
            wins[:, ga[g]] += ~hw[:, g]
        return wins

    wins = season_wins(home_win)
    ranks = _ranks(wins, pf)
    in_playoffs = ranks < spots
    bracket = 1 << (spots - 1).bit_length()
    byes = bracket - spots

    first_week = weeks[0]
    next_games = [g for g in remaining if g["week"] == first_week]
    out = {}
    for t in team_ids:
        i = idx[t]
        # odds if this team wins every remaining game
        forced = home_win.copy()
        forced[:, gh == i] = True
        forced[:, ga == i] = False
        win_out = (_ranks(season_wins(forced), pf)[:, i] < spots).mean()
        nxt = next((g for g in next_games if i in (idx[g["home"]], idx[g["away"]])), None)
        swing = None
        if nxt is not None:
            col = remaining.index(nxt)
            won = home_win[:, col] if idx[nxt["home"]] == i else ~home_win[:, col]
            if won.any() and (~won).any():
                swing = {
                    "opp": nxt["away"] if nxt["home"] == t else nxt["home"],
                    "ifWin": float(in_playoffs[won, i].mean()),
                    "ifLoss": float(in_playoffs[~won, i].mean()),
                    "winProb": float(won.mean()),
                }
        out[t] = {
            "playoffs": float(in_playoffs[:, i].mean()),
            "bye": float((ranks[:, i] < byes).mean()) if byes else None,
            "first": float((ranks[:, i] == 0).mean()),
            "winOut": float(win_out),
            "projWins": float(wins[:, i].mean()),
            "remaining": int(((gh == i) | (ga == i)).sum()),
            "next": swing,
        }

    game_of_week = None
    best = -1.0
    for g in next_games:
        a, b = out[g["home"]]["next"], out[g["away"]]["next"]
        if not a or not b:
            continue
        stakes = (a["ifWin"] - a["ifLoss"]) + (b["ifWin"] - b["ifLoss"])
        if stakes > best:
            best = stakes
            game_of_week = {"home": g["home"], "away": g["away"], "stakes": round(stakes, 3)}

    return {
        "week": first_week,
        "spots": spots,
        "byes": byes,
        "regularWeeks": league.get("regularWeeks"),
        "divisions": league.get("divisions", 0),
        "sims": sims,
        "teams": out,
        "gameOfWeek": game_of_week,
    }


def schedule_swap(league, summaries):
    """records[a][b] = team a's [wins, losses, ties] if it had played team b's schedule."""
    played = _team_scores(summaries)
    team_ids = [t["id"] for t in league["teams"]]
    weeks = sorted({w for t in played.values() for w in t})
    if not weeks:
        return None
    grid = {}
    for a in team_ids:
        grid[a] = {}
        for b in team_ids:
            w = l = t = 0
            for wk in weeks:
                mine = played.get(a, {}).get(wk)
                theirs = played.get(b, {}).get(wk)
                if not mine or not theirs:
                    continue
                opp = theirs[1]
                if b == a:
                    opp = mine[1]
                elif opp == a:
                    opp = b
                opp_score = played.get(opp, {}).get(wk)
                if not opp_score:
                    continue
                if mine[0] > opp_score[0]:
                    w += 1
                elif mine[0] < opp_score[0]:
                    l += 1
                else:
                    t += 1
            grid[a][b] = [w, l, t]
    return {"weeks": len(weeks), "records": grid}


def season_records(league, summaries):
    sides, games = [], []
    for s in summaries:
        for m in s["matchups"]:
            sides.append((m["homeScore"], m["home"], s["week"]))
            sides.append((m["awayScore"], m["away"], s["week"]))
            if m["homeScore"] != m["awayScore"]:
                w, l = (("home", "away") if m["homeScore"] > m["awayScore"] else ("away", "home"))
                games.append({"week": s["week"], "winner": m[w], "loser": m[l],
                              "winScore": m[w + "Score"], "loseScore": m[l + "Score"],
                              "margin": round(abs(m["homeScore"] - m["awayScore"]), 2)})
    if not sides:
        return None
    hi = max(sides)
    lo = min(sides)
    rec = {
        "high": {"score": hi[0], "team": hi[1], "week": hi[2]},
        "low": {"score": lo[0], "team": lo[1], "week": lo[2]},
    }
    if games:
        rec["blowout"] = max(games, key=lambda g: g["margin"])
        rec["closest"] = min(games, key=lambda g: g["margin"])
    mvps = [dict(s["awards"]["mvp"], week=s["week"]) for s in summaries if s["awards"].get("mvp")]
    if mvps:
        rec["player"] = max(mvps, key=lambda p: p["points"])
    yowzas = [dict(s["awards"]["yowza"], week=s["week"]) for s in summaries
              if s["awards"].get("yowza") and s["awards"]["yowza"]["left"] > 0.005]
    if yowzas:
        worst = max(yowzas, key=lambda y: y["left"])
        rec["bench"] = {"team": worst["team"], "left": worst["left"], "week": worst["week"]}

    flags = Counter(y["team"] for y in yowzas)
    flag_weeks = {}
    for y in yowzas:
        flag_weeks.setdefault(y["team"], []).append(y["week"])

    # streaks, regular season and playoffs in week order
    results = {}
    for s in sorted(summaries, key=lambda s: s["week"]):
        for m in s["matchups"]:
            for me, ms, os_ in ((m["home"], m["homeScore"], m["awayScore"]), (m["away"], m["awayScore"], m["homeScore"])):
                results.setdefault(me, []).append(("W" if ms > os_ else "L" if ms < os_ else "T", s["week"]))
    best_streak = None
    for team, seq in results.items():
        run = 0
        for i, (r, wk) in enumerate(seq):
            run = run + 1 if r == "W" else 0
            if run and (best_streak is None or run > best_streak["length"]):
                best_streak = {"team": team, "length": run, "from": seq[i - run + 1][1], "to": wk}
    if best_streak:
        rec["streak"] = best_streak
    current = {}
    for team, seq in results.items():
        last = seq[-1][0]
        run = 0
        for r, _ in reversed(seq):
            if r != last:
                break
            run += 1
        current[team] = {"type": last, "length": run}

    return {
        "records": rec,
        "flags": [{"team": t, "count": c, "weeks": sorted(flag_weeks[t])} for t, c in flags.most_common()],
        "streaks": current,
    }
