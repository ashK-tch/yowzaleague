"""Pull a league from ESPN's fantasy football API and normalize it.

ESPN doesn't publish this API officially. It's free and widely used, but it can
change without notice. Everything that depends on ESPN's raw JSON shape lives in
this file, so if ESPN changes something, this is the only file to fix.
"""

import json

import requests

BASE = "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{season}/segments/0/leagues/{league_id}"

# ESPN lineup slot ids for football.
SLOT_NAMES = {
    0: "QB", 1: "TQB", 2: "RB", 3: "RB/WR", 4: "WR", 5: "WR/TE", 6: "TE",
    7: "OP", 8: "DT", 9: "DE", 10: "LB", 11: "DL", 12: "CB", 13: "S",
    14: "DB", 15: "DP", 16: "D/ST", 17: "K", 18: "P", 19: "HC",
    20: "Bench", 21: "IR", 23: "FLEX",
}
BENCH, IR = 20, 21
POSITION_NAMES = {1: "QB", 2: "RB", 3: "WR", 4: "TE", 5: "K", 16: "D/ST"}


class EspnError(RuntimeError):
    pass


class EspnClient:
    def __init__(self, league_id, season, espn_s2=None, swid=None, timeout=30):
        self.url = BASE.format(season=season, league_id=league_id)
        self.session = requests.Session()
        self.session.headers["User-Agent"] = "yowzaleague-site"
        if espn_s2 and swid:
            self.session.cookies.set("espn_s2", espn_s2)
            self.session.cookies.set("SWID", swid)
        self.timeout = timeout

    def _get(self, views, scoring_period=None, matchup_filter=None):
        params = [("view", v) for v in views]
        if scoring_period is not None:
            params.append(("scoringPeriodId", scoring_period))
        headers = {}
        if matchup_filter is not None:
            headers["x-fantasy-filter"] = json.dumps(
                {"schedule": {"filterMatchupPeriodIds": {"value": [matchup_filter]}}}
            )
        r = self.session.get(self.url, params=params, headers=headers, timeout=self.timeout)
        if r.status_code in (401, 403):
            raise EspnError(
                "ESPN refused access to this league. It's probably private: add the "
                "ESPN_S2 and ESPN_SWID secrets, or have the league manager make the "
                "league viewable to the public in ESPN's league settings."
            )
        if r.status_code == 404:
            raise EspnError("ESPN couldn't find that league. Check LEAGUE_ID and the season year.")
        r.raise_for_status()
        try:
            return r.json()
        except ValueError as e:
            raise EspnError("ESPN sent back something that isn't JSON. Its API may have changed.") from e

    def league(self):
        return self._get(["mTeam", "mSettings", "mMatchupScore", "mStatus"])

    def box_scores(self, matchup_period, scoring_period):
        return self._get(["mMatchupScore", "mScoreboard"], scoring_period, matchup_period)


def fetch_raw(client):
    """Return the raw league JSON plus a box-score JSON for every decided week."""
    league = client.league()
    boxes = {}
    for period in decided_periods(league):
        sps = scoring_periods_for(league, period)
        if len(sps) == 1:  # multi-week playoff matchups skip lineup analysis
            boxes[period] = client.box_scores(period, sps[0])
    return league, boxes


# ---------------------------------------------------------------------------
# Normalizing ESPN's JSON into the plain shape stats.py works with.
# ---------------------------------------------------------------------------

def decided_periods(league):
    by_period = {}
    for m in league.get("schedule", []):
        by_period.setdefault(m["matchupPeriodId"], []).append(m)
    out = []
    for period, games in sorted(by_period.items()):
        if games and all(g.get("winner", "UNDECIDED") != "UNDECIDED" for g in games):
            out.append(period)
    return out


def scoring_periods_for(league, period):
    mp = league.get("settings", {}).get("scheduleSettings", {}).get("matchupPeriods", {})
    return mp.get(str(period)) or [period]


def team_name(t):
    if t.get("name"):
        return t["name"].strip()
    return f"{t.get('location', '')} {t.get('nickname', '')}".strip() or f"Team {t['id']}"


def manager_name(t, members):
    owner = t.get("primaryOwner") or (t.get("owners") or [None])[0]
    if isinstance(owner, dict):
        owner = owner.get("id")
    m = members.get(owner)
    if not m:
        return ""
    first = (m.get("firstName") or "").strip()
    return first.title() if first else (m.get("displayName") or "")


def player_points(entry, scoring_period):
    ppe = entry.get("playerPoolEntry", {})
    for s in ppe.get("player", {}).get("stats", []):
        if s.get("scoringPeriodId") == scoring_period and s.get("statSourceId") == 0:
            return round(float(s.get("appliedTotal", 0.0)), 2)
    return round(float(ppe.get("appliedStatTotal", 0.0)), 2)


def lineup(side, scoring_period):
    entries = side.get("rosterForCurrentScoringPeriod", {}).get("entries", [])
    if not entries:
        return None
    players = []
    for e in entries:
        p = e.get("playerPoolEntry", {}).get("player", {})
        players.append({
            "name": p.get("fullName", "Unknown"),
            "pos": POSITION_NAMES.get(p.get("defaultPositionId"), "?"),
            "slot": e.get("lineupSlotId"),
            "eligible": [s for s in p.get("eligibleSlots", []) if s not in (BENCH, IR)],
            "points": player_points(e, scoring_period),
        })
    return players


def normalize(league, boxes, season, is_sample=False):
    settings = league.get("settings", {})
    members = {m["id"]: m for m in league.get("members", [])}
    teams = [
        {"id": t["id"], "name": team_name(t), "abbrev": t.get("abbrev", ""),
         "manager": manager_name(t, members)}
        for t in league.get("teams", [])
    ]
    counts = settings.get("rosterSettings", {}).get("lineupSlotCounts", {})
    slot_counts = {int(k): v for k, v in counts.items() if v and int(k) not in (BENCH, IR)}

    weeks = []
    for period in decided_periods(league):
        games = [m for m in league["schedule"] if m["matchupPeriodId"] == period]
        box_games = {m["id"]: m for m in boxes.get(period, {}).get("schedule", [])
                     if m.get("matchupPeriodId") == period}
        sps = scoring_periods_for(league, period)
        matchups = []
        for g in games:
            if "away" not in g:  # bye week in playoffs
                continue
            bg = box_games.get(g["id"], {})
            sides = []
            for key in ("home", "away"):
                side = g[key]
                lu = lineup(bg.get(key, {}), sps[0]) if len(sps) == 1 else None
                sides.append({"team": side["teamId"], "score": round(float(side.get("totalPoints", 0.0)), 2),
                              "lineup": lu})
            matchups.append({"home": sides[0], "away": sides[1], "winner": g.get("winner"),
                             "playoff": g.get("playoffTierType", "NONE") not in ("NONE", None)})
        weeks.append({"week": period, "matchups": matchups})

    return {
        "name": settings.get("name", "Yowza League"),
        "season": season,
        "isSample": is_sample,
        "teams": teams,
        "slotCounts": slot_counts,
        "weeks": weeks,
    }
