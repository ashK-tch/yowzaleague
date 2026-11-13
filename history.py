"""The Hall of Fame: every season before ESPN, plus each finished ESPN season.

history/seasons.csv   one row per team per season: season, place (final finish), team, wins, losses, ties
history/managers.csv  who owned which team: manager, team, and optionally seasons (for a name two people used)

Teams get renamed, so titles and records are credited to managers listed in managers.csv. A team name
that isn't listed is credited to the team name itself (spelling and capitals don't matter).
"""

import csv
import re
from collections import defaultdict
from pathlib import Path

FOLDER = Path(__file__).parent / "history"


def norm(text):
    return re.sub(r"[^a-z0-9]", "", (text or "").lower())


def load_seasons(folder=FOLDER):
    path = Path(folder) / "seasons.csv"
    rows = []
    if not path.exists():
        return rows
    with path.open(newline="", encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            try:
                rows.append({"season": int(r["season"]), "place": int(r["place"]), "team": r["team"].strip(),
                             "w": int(r.get("wins") or 0), "l": int(r.get("losses") or 0), "t": int(r.get("ties") or 0)})
            except (KeyError, ValueError, AttributeError):
                continue  # skip a malformed line rather than fail the whole build
    return rows


def load_managers(folder=FOLDER):
    path = Path(folder) / "managers.csv"
    out = []
    if not path.exists():
        return out
    with path.open(newline="", encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            manager, team = (r.get("manager") or "").strip(), (r.get("team") or "").strip()
            if manager and team:
                seasons = {int(s) for s in re.findall(r"\d{4}", r.get("seasons") or "")}
                out.append({"manager": manager, "team": team, "seasons": seasons})
    return out


class Who:
    """Works out which person (or, failing that, which team name) a team-season belongs to."""

    def __init__(self, mapping):
        self.mapping = mapping
        self.names = {}
        for m in mapping:
            self.names.setdefault(norm(m["manager"]), m["manager"])

    def person(self, name):
        return {"key": "m:" + norm(name), "name": self.names.get(norm(name), name), "person": True}

    @staticmethod
    def team(name):
        return {"key": "t:" + norm(name), "name": name, "person": False}

    def for_team(self, team, season):
        n = norm(team)
        for m in self.mapping:
            if norm(m["team"]) == n and (not m["seasons"] or season in m["seasons"]):
                return self.person(m["manager"])
        return None

    def for_aliases(self, aliases):
        """ESPN names, most specific first ('Mike Smith', 'Mike S', display name, 'Mike')."""
        for a in aliases:
            if norm(a) in self.names:
                return self.person(a)
        return None


def _pct(e):
    games = e["w"] + e["l"] + e["t"]
    return (e["w"] + 0.5 * e["t"]) / games if games else 0.0


def _rec(e):
    return f"{e['w']}–{e['l']}" + (f"–{e['t']}" if e["t"] else "")


def _years(ys):
    return ", ".join(str(y) for y in sorted(ys))


def _tag(e):
    """'Kid Ants (2017)', or 'Kid Ants (Mike, 2017)' once managers are listed."""
    return f"{e['team']} ({e['who']['name']}, {e['season']})" if e["who"]["person"] else f"{e['team']} ({e['season']})"


def _names(people):
    names = [p["name"] for p in people]
    return names[0] if len(names) == 1 else ", ".join(names[:-1]) + " and " + names[-1]


def hall_of_fame(league, standings, folder=FOLDER):
    """Returns (hall, careers): the Hall of Fame for the page, and each current team's league career."""
    rows = load_seasons(folder)
    who = Who(load_managers(folder))
    current = league["season"]

    current_who = {}
    for t in league["teams"]:
        current_who[t["id"]] = (who.for_team(t["name"], current) or who.for_aliases(t.get("_aliases", []))
                                or Who.team(t["name"]))

    entries = [dict(r, who=who.for_team(r["team"], r["season"]) or Who.team(r["team"])) for r in rows]
    if league.get("seasonOver") and current not in {r["season"] for r in rows}:
        st = {s["team"]: s for s in standings}
        for t in league["teams"]:
            s = st.get(t["id"], {})
            entries.append({"season": current, "place": t["finalRank"], "team": t["name"],
                            "w": s.get("w", 0), "l": s.get("l", 0), "t": s.get("t", 0), "who": current_who[t["id"]]})
    if not entries:
        return None, {}

    by_season = defaultdict(list)
    for e in entries:
        by_season[e["season"]].append(e)
    size = {s: len(es) for s, es in by_season.items()}

    def pack(e):
        return {"place": e["place"], "team": e["team"], "who": e["who"]["name"] if e["who"]["person"] else "",
                "w": e["w"], "l": e["l"], "t": e["t"]}

    seasons = []
    for s in sorted(by_season, reverse=True):
        es = sorted(by_season[s], key=lambda e: e["place"])
        top = max(_pct(e) for e in es)
        seasons.append({"season": s, "size": len(es), "rows": [pack(e) for e in es],
                        "best": [pack(e) for e in es if _pct(e) == top]})

    people = {}
    for e in sorted(entries, key=lambda e: e["season"]):
        k = e["who"]["key"]
        p = people.setdefault(k, {"name": e["who"]["name"], "person": e["who"]["person"], "seasons": [],
                                  "titles": [], "finals": [], "podiums": [], "lasts": [], "teams": [],
                                  "w": 0, "l": 0, "t": 0, "best": None})
        p["name"] = e["who"]["name"]  # latest spelling wins
        s = e["season"]
        if s not in p["seasons"]:
            p["seasons"].append(s)
        p["w"] += e["w"]; p["l"] += e["l"]; p["t"] += e["t"]
        if e["place"] == 1: p["titles"].append(s)
        if e["place"] <= 2: p["finals"].append(s)
        if e["place"] <= 3: p["podiums"].append(s)
        if e["place"] == size[s]: p["lasts"].append(s)
        if e["team"] not in p["teams"]: p["teams"].append(e["team"])
        if p["best"] is None or e["place"] < p["best"]["place"]:
            p["best"] = {"place": e["place"], "seasons": [s]}
        elif e["place"] == p["best"]["place"]:
            p["best"]["seasons"].append(s)
    for p in people.values():
        g = p["w"] + p["l"] + p["t"]
        p["pct"] = round((p["w"] + 0.5 * p["t"]) / g, 3) if g else 0.0

    ranked = sorted(people.values(), key=lambda p: (-len(p["titles"]), -len(p["finals"]), -len(p["podiums"]), -p["pct"]))
    lore = _lore(entries, ranked, size)

    first, last = min(by_season), max(by_season)
    hall = {
        "seasons": seasons,
        "people": ranked,
        "lore": lore,
        "byPerson": any(p["person"] for p in ranked),
        "range": [first, last],
        "missing": [y for y in range(first, last + 1) if y not in by_season],
    }
    careers = {}
    for tid, w in current_who.items():
        p = people.get(w["key"])
        if p:
            careers[tid] = {k: p[k] for k in ("name", "person", "seasons", "titles", "finals", "podiums",
                                              "lasts", "teams", "w", "l", "t", "pct", "best")}
    return hall, careers


def _lore(entries, people, size):
    items = []
    champs = [e for e in entries if e["place"] == 1]

    top = max((len(p["titles"]) for p in people), default=0)
    if top >= 2:
        holders = [p for p in people if len(p["titles"]) == top]
        items.append({"label": "Most titles", "value": f"{top}",
                      "text": "; ".join(f"{p['name']} ({_years(p['titles'])})" for p in holders)})

    repeats = []
    for p in people:
        ts = sorted(p["titles"])
        for a, b in zip(ts, ts[1:]):
            if b == a + 1:
                repeats.append(f"{p['name']} ({a}–{b})")
    if repeats:
        items.append({"label": "Back-to-back champions", "value": "B2B", "text": "; ".join(repeats)})

    best = max(_pct(e) for e in entries)
    tops = sorted([e for e in entries if _pct(e) == best], key=lambda e: e["season"])
    note = " Neither won the title that year." if len(tops) > 1 and all(e["place"] != 1 for e in tops) else \
        (" Didn't win the title that year." if len(tops) == 1 and tops[0]["place"] != 1 else "")
    items.append({"label": "Best regular season", "value": _rec(tops[0]),
                  "text": "; ".join(_tag(e) for e in tops) + "." + note})

    worst = min(_pct(e) for e in entries)
    lows = sorted([e for e in entries if _pct(e) == worst], key=lambda e: e["season"])
    items.append({"label": "Worst regular season", "value": _rec(lows[0]),
                  "text": "; ".join(_tag(e) for e in lows) + "."})

    if champs:
        lo = min(_pct(e) for e in champs)
        cinderella = sorted([e for e in champs if _pct(e) == lo], key=lambda e: e["season"])
        if lo < 0.6:
            items.append({"label": "Worst record to win it all", "value": _rec(cinderella[0]),
                          "text": "; ".join(_tag(e) for e in cinderella) + "."})

    seasons = sorted(size)
    nxt = dict(zip(seasons, seasons[1:]))
    by_key_season = {}
    for e in entries:  # someone with two teams in a season counts their better finish
        k = (e["who"]["key"], e["season"])
        if k not in by_key_season or e["place"] < by_key_season[k]["place"]:
            by_key_season[k] = e
    up, down = [], []
    for e in entries:
        k, s = e["who"]["key"], e["season"]
        later = by_key_season.get((k, nxt.get(s)))
        if not later:
            continue
        if e["place"] == size[s] and later["place"] == 1:
            up.append(f"{later['who']['name']}: last in {s}, champion in {later['season']}")
        if e["place"] == 1 and later["place"] == size[later["season"]]:
            down.append(f"{later['who']['name']}: champion in {s}, last in {later['season']}")
    if up:
        items.append({"label": "Worst to first", "value": "↑", "text": "; ".join(sorted(up)) + "."})
    if down:
        items.append({"label": "First to worst", "value": "↓", "text": "; ".join(sorted(down)) + "."})

    maids = [p for p in people if not p["titles"] and len(p["podiums"]) >= 2]
    if maids:
        most = max(len(p["podiums"]) for p in maids)
        bm = [p for p in maids if len(p["podiums"]) == most]
        items.append({"label": "Always the bridesmaid", "value": str(most),
                      "text": "; ".join(f"{p['name']}: top 3 in {_years(p['podiums'])}, no title" for p in bm) + "."})

    sacko = max((len(p["lasts"]) for p in people), default=0)
    if sacko >= 2:
        bl = [p for p in people if len(p["lasts"]) == sacko]
        items.append({"label": "Most last-place finishes", "value": str(sacko),
                      "text": "; ".join(f"{p['name']} ({_years(p['lasts'])})" for p in bl) + "."})

    finals = max((len(p["finals"]) for p in people), default=0)
    if finals >= 3:
        fl = [p for p in people if len(p["finals"]) == finals]
        items.append({"label": "Most title-game trips", "value": str(finals),
                      "text": "; ".join(f"{p['name']} ({_years(p['finals'])})" for p in fl) + "."})

    vets = [p for p in people if len(p["seasons"]) >= 3]
    if vets:
        b = max(vets, key=lambda p: p["pct"])
        items.append({"label": "Best all-time record", "value": f"{b['pct']:.3f}".lstrip("0"),
                      "text": f"{b['name']}, {b['w']}–{b['l']}" + (f"–{b['t']}" if b["t"] else "") +
                              f" over {len(b['seasons'])} seasons (minimum 3)."})
    longest = max(len(p["seasons"]) for p in people)
    iron = [p for p in people if len(p["seasons"]) == longest]
    if longest >= 3:
        items.append({"label": "Most seasons", "value": str(longest),
                      "text": _names(iron) + "."})
    return items
