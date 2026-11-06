"""Everything the site calculates: best possible lineups, weekly awards,
all-play records, the luck index, and coach efficiency."""

import numpy as np
from scipy.optimize import linear_sum_assignment

from espn import BENCH, IR, SLOT_NAMES

IMPOSSIBLE = 1e9


def optimal_lineup(players, slot_counts):
    """Best points a roster could have scored, and which players do it.

    Solved exactly as an assignment problem: each starting slot gets one
    eligible player (or stays empty), each player fills at most one slot.
    """
    slots = [s for s, n in sorted(slot_counts.items()) for _ in range(n)]
    pool = [p for p in players if p["slot"] != IR]
    if not slots:
        return 0.0, []
    n_slots, n_players = len(slots), len(pool)
    cost = np.full((n_slots, n_players + n_slots), IMPOSSIBLE)
    for i, slot in enumerate(slots):
        for j, p in enumerate(pool):
            if slot in p["eligible"]:
                cost[i, j] = -p["points"]
        cost[i, n_players + i] = 0.0  # leaving the slot empty scores zero
    rows, cols = linear_sum_assignment(cost)
    chosen = []
    for i, j in zip(rows, cols):
        if j < n_players:
            chosen.append((slots[i], pool[j]))
    total = round(sum(p["points"] for _, p in chosen), 2)
    return total, chosen


def started(players):
    return [p for p in players if p["slot"] not in (BENCH, IR)]


def lineup_review(players, slot_counts):
    """Actual vs best lineup for one team-week, plus the single worst call."""
    actual = round(sum(p["points"] for p in started(players)), 2)
    best, chosen = optimal_lineup(players, slot_counts)
    best = max(best, actual)  # guard against odd lineups ESPN allowed
    best_ids = {id(p) for _, p in chosen}
    start_ids = {id(p) for p in started(players)}
    should_have = sorted((p for p in players if id(p) in best_ids - start_ids),
                         key=lambda p: -p["points"])
    should_not = sorted((p for p in started(players) if id(p) not in best_ids),
                        key=lambda p: p["points"])
    worst_call = None
    for benched in should_have:
        swap = next((s for s in should_not if s["slot"] in benched["eligible"]), None)
        swap = swap or (should_not[0] if should_not else None)
        if swap and benched["points"] > swap["points"]:
            worst_call = {
                "benched": {"name": benched["name"], "pos": benched["pos"], "points": benched["points"]},
                "started": {"name": swap["name"], "pos": swap["pos"], "points": swap["points"],
                            "slot": SLOT_NAMES.get(swap["slot"], "")},
            }
            break
    return {"actual": actual, "best": round(best, 2), "left": round(best - actual, 2), "worstCall": worst_call}


def margin(m):
    return abs(m["home"]["score"] - m["away"]["score"])


def winner_loser(m):
    h, a = m["home"], m["away"]
    return (h, a) if h["score"] >= a["score"] else (a, h)


def week_summary(week, slot_counts):
    games = week["matchups"]
    sides = [s for m in games for s in (m["home"], m["away"])]
    scores = [s["score"] for s in sides]

    reviews = {}
    for s in sides:
        if s.get("lineup"):
            reviews[s["team"]] = lineup_review(s["lineup"], slot_counts)

    awards = {}
    if reviews:
        tid, rv = max(reviews.items(), key=lambda kv: kv[1]["left"])
        game = next(m for m in games if tid in (m["home"]["team"], m["away"]["team"]))
        mine = game["home"] if game["home"]["team"] == tid else game["away"]
        theirs = game["away"] if mine is game["home"] else game["home"]
        awards["yowza"] = {
            "team": tid, **rv,
            "score": mine["score"], "oppScore": theirs["score"], "opp": theirs["team"],
            "result": "W" if mine["score"] > theirs["score"] else ("L" if mine["score"] < theirs["score"] else "T"),
            "costGame": mine["score"] < theirs["score"] < mine["score"] + rv["left"],
        }
        perfect = [t for t, r in reviews.items() if r["left"] < 0.01]
        if perfect:
            awards["perfect"] = perfect
        mvp = max(((s["team"], p) for s in sides if s.get("lineup") for p in started(s["lineup"])),
                  key=lambda tp: tp[1]["points"])
        awards["mvp"] = {"team": mvp[0], "name": mvp[1]["name"], "pos": mvp[1]["pos"], "points": mvp[1]["points"]}

    top = max(sides, key=lambda s: s["score"])
    awards["top"] = {"team": top["team"], "score": top["score"]}

    decided = [m for m in games if m["home"]["score"] != m["away"]["score"]]
    if decided:
        big = max(decided, key=margin)
        w, l = winner_loser(big)
        awards["blowout"] = {"winner": w["team"], "loser": l["team"], "margin": round(margin(big), 2)}
        close = min(decided, key=margin)
        w, l = winner_loser(close)
        awards["nailbiter"] = {"winner": w["team"], "loser": l["team"], "margin": round(margin(close), 2)}
        losers = [winner_loser(m)[1] for m in decided]
        winners = [winner_loser(m)[0] for m in decided]
        robbed = max(losers, key=lambda s: s["score"])
        awards["robbed"] = {"team": robbed["team"], "score": robbed["score"],
                            "wouldBeat": sum(x < robbed["score"] for x in scores)}
        lucky = min(winners, key=lambda s: s["score"])
        awards["lucky"] = {"team": lucky["team"], "score": lucky["score"],
                           "wouldBeat": sum(x < lucky["score"] for x in scores)}

    return {
        "week": week["week"],
        "playoff": any(m["playoff"] for m in games),
        "matchups": [{"home": m["home"]["team"], "away": m["away"]["team"],
                      "homeScore": m["home"]["score"], "awayScore": m["away"]["score"]} for m in games],
        "reviews": reviews,
        "awards": awards,
    }


def season_table(league, summaries):
    teams = {t["id"]: t for t in league["teams"]}
    rows = {tid: {"team": tid, "w": 0, "l": 0, "t": 0, "pf": 0.0, "pa": 0.0,
                  "apW": 0, "apL": 0, "apT": 0, "xWins": 0.0, "actual": 0.0, "best": 0.0}
            for tid in teams}
    regular = [s for s in summaries if not s["playoff"]]
    for s in regular:
        week_scores = []
        for m in s["matchups"]:
            for me, opp, ms, os_ in ((m["home"], m["away"], m["homeScore"], m["awayScore"]),
                                     (m["away"], m["home"], m["awayScore"], m["homeScore"])):
                r = rows[me]
                r["pf"] += ms
                r["pa"] += os_
                r["w" if ms > os_ else "l" if ms < os_ else "t"] += 1
                week_scores.append((me, ms))
        n = len(week_scores)
        for me, ms in week_scores:
            r = rows[me]
            wins = sum(1 for t, x in week_scores if t != me and x < ms)
            ties = sum(1 for t, x in week_scores if t != me and x == ms)
            r["apW"] += wins
            r["apT"] += ties
            r["apL"] += (n - 1) - wins - ties
            r["xWins"] += (wins + 0.5 * ties) / (n - 1)
        for tid, rv in s["reviews"].items():
            rows[tid]["actual"] += rv["actual"]
            rows[tid]["best"] += rv["best"]

    out = []
    for r in rows.values():
        actual_wins = r["w"] + 0.5 * r["t"]
        out.append({
            "team": r["team"], "w": r["w"], "l": r["l"], "t": r["t"],
            "pf": round(r["pf"], 2), "pa": round(r["pa"], 2),
            "apW": r["apW"], "apL": r["apL"], "apT": r["apT"],
            "xWins": round(r["xWins"], 2),
            "luck": round(actual_wins - r["xWins"], 2),
            "efficiency": round(100 * r["actual"] / r["best"], 1) if r["best"] else None,
            "startedPts": round(r["actual"], 2), "bestPts": round(r["best"], 2),
            "benchLeft": round(r["best"] - r["actual"], 2),
        })
    out.sort(key=lambda r: (-(r["w"] + 0.5 * r["t"]), -r["pf"]))
    return out, len(regular)


def build_payload(league, updated_at):
    import season

    summaries = [week_summary(w, league["slotCounts"]) for w in league["weeks"]]
    standings, weeks_played = season_table(league, summaries)
    for s in summaries:
        s.pop("reviews")  # keep the published file small
    return {
        "league": {"name": league["name"], "season": league["season"],
                   "isSample": league["isSample"], "updatedAt": updated_at,
                   "weeksPlayed": weeks_played},
        "teams": league["teams"],
        "standings": standings,
        "weeks": summaries,
        "race": season.playoff_odds(league, standings, summaries),
        "swap": season.schedule_swap(league, summaries),
        "records": season.season_records(league, summaries),
    }
