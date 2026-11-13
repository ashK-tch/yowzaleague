"""Manager trading cards: one card per team, built from this season's ESPN data and the Hall of Fame."""

from collections import defaultdict

from espn import BENCH, IR

CLOSE = 10  # points: a game decided by less than this is "close"
FALLBACK_NAMES = ["Dark Horse", "Steady Eddie", "Wild Card", "The Grinder", "The Sleeper", "Middle Child",
                  "The Contender", "Mr. Average"]


def ordinal(n):
    return f"{n}{'th' if 10 <= n % 100 <= 20 else {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')}"


def _f(x):
    return f"{x:.1f}" if round(x, 1) == round(x, 2) else f"{x:.2f}"


def percentile(values):
    """0 for the lowest value, 1 for the highest; ties share the average."""
    vals = {k: v for k, v in values.items() if v is not None}
    if len(vals) < 2:
        return {}
    srt = sorted(vals.values())
    n = len(srt) - 1
    return {k: (sum(x < v for x in srt) + 0.5 * (sum(x == v for x in srt) - 1)) / n for k, v in vals.items()}


def where(rank, most=False):
    """'the most in the league' / '3rd-most in the league' (or '3rd in the league')."""
    if rank == 1:
        return "the most in the league" if most else "1st in the league"
    return f"{ordinal(rank)}-most in the league" if most else f"{ordinal(rank)} in the league"


def plural(n, word):
    return f"{n} {word}" + ("" if n == 1 else "s")


def rank_of(values, tid, high=True):
    v = values[tid]
    return 1 + sum((x > v) if high else (x < v) for x in values.values())


def build_cards(league, standings, race, records, careers):
    if not standings:
        return []
    teams = {t["id"]: t for t in league["teams"]}
    st = {s["team"]: s for s in standings}
    ids = [s["team"] for s in standings]

    started = defaultdict(lambda: defaultdict(lambda: [0.0, 0]))
    benched = defaultdict(lambda: defaultdict(float))
    best_week = {}
    close = defaultdict(lambda: [0, 0])
    for w in league["weeks"]:
        for m in w["matchups"]:
            for me, them in ((m["home"], m["away"]), (m["away"], m["home"])):
                tid = me["team"]
                if tid not in best_week or me["score"] > best_week[tid]["score"]:
                    best_week[tid] = {"score": me["score"], "week": w["week"]}
                if me["score"] != them["score"] and abs(me["score"] - them["score"]) < CLOSE:
                    close[tid][0 if me["score"] > them["score"] else 1] += 1
                for p in me.get("lineup") or []:
                    key = (p["name"], p["pos"])
                    if p["slot"] == BENCH:
                        benched[tid][key] += p["points"]
                    elif p["slot"] != IR:
                        started[tid][key][0] += p["points"]
                        started[tid][key][1] += 1

    flags = {f["team"]: f["count"] for f in (records or {}).get("flags", [])}
    streaks = (records or {}).get("streaks", {})
    odds = {int(k): v.get("playoffs") for k, v in (race or {}).get("teams", {}).items()} if race else {}

    def games(t):
        s = st[t]
        return s["w"] + s["l"] + s["t"]

    metric = {
        "pf": {t: st[t]["pf"] for t in ids},
        "pa": {t: st[t]["pa"] for t in ids},
        "eff": {t: st[t]["efficiency"] for t in ids},
        "bench": {t: st[t]["benchLeft"] for t in ids},
        "luck": {t: st[t]["luck"] for t in ids},
        "flags": {t: flags.get(t, 0) for t in ids},
        "win": {t: (st[t]["w"] + 0.5 * st[t]["t"]) / games(t) if games(t) else None for t in ids},
        "clutch": {t: (close[t][0] + 1) / (sum(close[t]) + 2) for t in ids},
        "closeL": {t: close[t][1] for t in ids},
        "hot": {t: (streaks.get(t) or streaks.get(str(t)) or {}).get("length", 0)
                if (streaks.get(t) or streaks.get(str(t)) or {}).get("type") == "W" else 0 for t in ids},
    }
    has_moves = all(teams[t].get("moves") for t in ids)
    if has_moves:
        metric["hustle"] = {t: teams[t]["moves"]["adds"] + 2 * teams[t]["moves"]["trades"] for t in ids}
    pct = {k: percentile(v) for k, v in metric.items()}

    def rating(key, t):
        q = pct.get(key, {}).get(t)
        return None if q is None else round(40 + 59 * q)

    def rec(t):
        s = st[t]
        return f"{s['w']}–{s['l']}" + (f"–{s['t']}" if s["t"] else "")

    # nickname, metric, which end, extra condition, flavor text
    archetypes = [
        ("Point Machine", "pf", 1, lambda t: True,
         lambda t: f"{_f(st[t]['pf'])} points scored, {where(rank_of(metric['pf'], t), most=True)}."),
        ("The Professor", "eff", 1, lambda t: st[t]["efficiency"] is not None,
         lambda t: f"Starts the right guys: {st[t]['efficiency']:.1f}% of the best possible lineup, {where(rank_of(metric['eff'], t))}."),
        ("Bench Warmer", "bench", 1, lambda t: st[t]["benchLeft"] > 0,
         lambda t: f"Has left {_f(st[t]['benchLeft'])} points on the bench this season, {where(rank_of(metric['bench'], t), most=True)}."),
        ("Flag Collector", "flags", 1, lambda t: flags.get(t, 0) >= 2,
         lambda t: f"{flags.get(t, 0)} Yowza flags this season. Frame them."),
        ("Horseshoe", "luck", 1, lambda t: st[t]["luck"] >= 0.75,
         lambda t: f"{st[t]['luck']:.1f} more wins than the scores earned. Must be nice."),
        ("Cursed", "luck", -1, lambda t: st[t]["luck"] <= -0.75,
         lambda t: f"{abs(st[t]['luck']):.1f} fewer wins than the scores earned. Somebody check for a curse."),
        ("The Tinkerer", "hustle", 1, lambda t: has_moves and teams[t]["moves"]["adds"] >= 1,
         lambda t: f"{plural(teams[t]['moves']['adds'], 'pickup')} and {plural(teams[t]['moves']['trades'], 'trade')}. Lives on the waiver wire."),
        ("Set It and Forget It", "hustle", -1, lambda t: has_moves,
         lambda t: (f"Just {plural(teams[t]['moves']['adds'], 'pickup')} all season." if teams[t]['moves']['adds'] else "Zero pickups all season.") + " Trusts the process."),
        ("Punching Bag", "pa", 1, lambda t: True,
         lambda t: f"Opponents have hung {_f(st[t]['pa'])} points on them, {where(rank_of(metric['pa'], t), most=True)}."),
        ("Top Dog", "win", 1, lambda t: rank_of(metric["win"], t) == 1,
         lambda t: f"Best record in the league at {rec(t)}."),
        ("Cellar Dweller", "win", -1, lambda t: rank_of(metric["win"], t, high=False) == 1,
         lambda t: f"{rec(t)}. Nowhere to go but up."),
        ("Ice Water", "clutch", 1, lambda t: close[t][0] >= 2,
         lambda t: f"{close[t][0]}–{close[t][1]} in games decided by less than {CLOSE} points."),
        ("Heartbreak Kid", "closeL", 1, lambda t: close[t][1] >= 2,
         lambda t: f"Has lost {close[t][1]} games by less than {CLOSE} points."),
        ("On Fire", "hot", 1, lambda t: metric["hot"][t] >= 3,
         lambda t: f"Has won {metric['hot'][t]} straight."),
    ]
    offers = []
    for i, (nick, key, sign, ok, _) in enumerate(archetypes):
        for t in ids:
            q = pct.get(key, {}).get(t)
            if q is None or not ok(t):
                continue
            strength = q if sign > 0 else 1 - q
            if strength >= 0.75:
                offers.append((strength, -i, t, i))
    offers.sort(reverse=True)
    nick_of, used = {}, set()
    for strength, _, t, i in offers:
        if t in nick_of or i in used:
            continue
        nick_of[t] = i
        used.add(i)

    cards = []
    spare = iter(FALLBACK_NAMES)
    for n, t in enumerate(ids, 1):
        team = teams[t]
        if t in nick_of:
            nick, flavor = archetypes[nick_of[t]][0], archetypes[nick_of[t]][4](t)
        else:
            nick = next(spare, "The Contender")
            o = odds.get(t)
            flavor = f"{rec(t)} with {'<1' if o is not None and o < 0.005 else round(100 * o) if o is not None else '?'}% playoff odds. Don't count them out." \
                if o is not None else f"{rec(t)}, {_f(st[t]['pf'])} points scored."
        mvp = max(started[t].items(), key=lambda kv: kv[1][0], default=None)
        bench_guy = max(benched[t].items(), key=lambda kv: kv[1], default=None)
        career = careers.get(t)
        rarity = "holo" if career and career["titles"] else "rare" if career and career["podiums"] else "common"
        ratings = [[label, rating(key, t)] for label, key in
                   (("OFF", "pf"), ("COACH", "eff"), ("LUCK", "luck"), ("HUSTLE", "hustle"), ("CLUTCH", "clutch"))]
        cards.append({
            "team": t, "no": n, "nickname": nick, "flavor": flavor, "rarity": rarity,
            "rank": n, "w": st[t]["w"], "l": st[t]["l"], "t": st[t]["t"], "pf": st[t]["pf"], "pa": st[t]["pa"],
            "ratings": [r for r in ratings if r[1] is not None],
            "mvp": {"name": mvp[0][0], "pos": mvp[0][1], "points": round(mvp[1][0], 2), "games": mvp[1][1]} if mvp else None,
            "benchGuy": {"name": bench_guy[0][0], "pos": bench_guy[0][1], "points": round(bench_guy[1], 2)}
                        if bench_guy and bench_guy[1] > 0 else None,
            "bestWeek": best_week.get(t),
            "flags": flags.get(t, 0),
            "odds": odds.get(t),
            "moves": team.get("moves"),
            "career": career,
        })
    return cards
