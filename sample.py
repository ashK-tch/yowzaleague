"""Made-up league data in ESPN's raw JSON shape, so the site can be built and
previewed before it's connected to the real league. Every team, manager and
player here is invented."""

import random

TEAMS = [
    ("Bench Pressure", "BP", "Alex"), ("Waiver Wire Wizards", "WWW", "Bri"),
    ("Practice Squad Goals", "PSG", "Chris"), ("The Late Scratches", "TLS", "Dana"),
    ("Fourth and Forever", "4TH", "Eli"), ("Garbage Time Heroes", "GTH", "Farah"),
    ("Hail Mary Poppins", "HMP", "Gus"), ("Ship of Theseus", "SOT", "Hana"),
    ("Kick Six Pack", "K6P", "Ivan"), ("Taco Bell Bowl", "TBB", "Jo"),
]
FIRST = ["Marcus", "Devin", "Tre", "Rashad", "Colby", "Isaiah", "Nate", "Quincy", "Dom",
         "Jaylon", "Reggie", "Cam", "Mason", "Tavon", "Brent", "Luka", "Omar", "Kade"]
LAST = ["Whitlock", "Okafor", "Brannigan", "Castellano", "Lindqvist", "Pruitt", "Delacroix",
        "Mbeki", "Halvorsen", "Treadwell", "Quarles", "Abernathy", "Vasquez", "Kimbrough",
        "Stroud-Ellis", "Fairbanks", "Nakamura", "Oyelaran", "Pemberton", "Ruiz"]
CITIES = ["Harbor City", "Ironvale", "Bay Ridge", "Redfield", "Summit", "Lakeshore",
          "Granite Falls", "Westport", "Cedar Point", "Northgate"]

# position id, eligible slots (ESPN ids), mean points, spread
POS = {
    1: ([0, 7, 20, 21], 18, 6),
    2: ([2, 3, 23, 7, 20, 21], 11, 6),
    3: ([4, 3, 5, 23, 7, 20, 21], 11, 6.5),
    4: ([6, 5, 23, 7, 20, 21], 8, 5),
    5: ([17, 20, 21], 8, 3.5),
    16: ([16, 20, 21], 7, 5),
}
ROSTER = [1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 5, 16]
SLOTS = {"0": 1, "2": 2, "4": 2, "6": 1, "23": 1, "16": 1, "17": 1, "20": 7, "21": 1}
WEEKS_DONE, WEEKS_TOTAL = 8, 14


def _round_robin(team_ids, weeks):
    ids = list(team_ids)
    out = []
    for _ in range(weeks):
        half = len(ids) // 2
        out.append(list(zip(ids[:half], reversed(ids[half:]))))
        ids = [ids[0]] + [ids[-1]] + ids[1:-1]
    return out


def make(season, seed=7):
    rng = random.Random(seed)
    names = set()

    def person():
        while True:
            n = f"{rng.choice(FIRST)} {rng.choice(LAST)}"
            if n not in names:
                names.add(n)
                return n

    players, pid = {}, 1
    rosters = {}
    for tid in range(1, len(TEAMS) + 1):
        rosters[tid] = []
        for pos in ROSTER:
            name = f"{CITIES[tid - 1]} D/ST" if pos == 16 else person()
            talent = rng.uniform(0.75, 1.3)
            players[pid] = {"id": pid, "fullName": name, "defaultPositionId": pos,
                            "eligibleSlots": POS[pos][0], "talent": talent}
            rosters[tid].append(pid)
            pid += 1
    # each manager is good or bad at setting lineups
    skill = {tid: rng.uniform(0.2, 1.0) for tid in rosters}

    members = [{"id": f"{{MEMBER-{i}}}", "firstName": m, "displayName": m.lower()}
               for i, (_, _, m) in enumerate(TEAMS, 1)]
    moves = random.Random(seed + 1)  # separate stream so the scores don't change
    teams = [{"id": i, "name": n, "abbrev": a, "primaryOwner": f"{{MEMBER-{i}}}",
              "transactionCounter": {"acquisitions": moves.randint(0, 30), "trades": moves.choice([0, 0, 0, 1, 1, 2, 3])}}
             for i, (n, a, _) in enumerate(TEAMS, 1)]

    pairings = _round_robin(range(1, len(TEAMS) + 1), WEEKS_TOTAL)
    schedule, boxes, mid = [], {}, 1
    for week in range(1, WEEKS_TOTAL + 1):
        week_games = []
        for home, away in pairings[week - 1]:
            game = {"id": mid, "matchupPeriodId": week, "playoffTierType": "NONE",
                    "home": {"teamId": home, "totalPoints": 0.0},
                    "away": {"teamId": away, "totalPoints": 0.0}, "winner": "UNDECIDED"}
            mid += 1
            if week <= WEEKS_DONE:
                box = {"id": game["id"], "matchupPeriodId": week}
                for key, tid in (("home", home), ("away", away)):
                    entries, total = _play_week(rng, week, rosters[tid], players, skill[tid])
                    game[key]["totalPoints"] = total
                    box[key] = {"teamId": tid, "totalPoints": total,
                                "rosterForCurrentScoringPeriod": {"entries": entries}}
                h, a = game["home"]["totalPoints"], game["away"]["totalPoints"]
                game["winner"] = "HOME" if h > a else "AWAY" if a > h else "TIE"
                week_games.append(box)
            schedule.append(game)
        if week <= WEEKS_DONE:
            boxes[week] = {"schedule": week_games}

    league = {
        "id": 0, "seasonId": season,
        "settings": {"name": "Yowza League", "rosterSettings": {"lineupSlotCounts": SLOTS},
                     "scheduleSettings": {"matchupPeriodCount": WEEKS_TOTAL, "playoffTeamCount": 6,
                                          "divisions": [{"id": 0, "name": "League"}],
                                          "matchupPeriods": {str(w): [w] for w in range(1, WEEKS_TOTAL + 1)}}},
        "members": members, "teams": teams, "schedule": schedule,
        "status": {"currentMatchupPeriod": WEEKS_DONE + 1},
    }
    return league, boxes


def _play_week(rng, week, roster, players, skill):
    rows = []
    for pid in roster:
        p = players[pid]
        _, mean, spread = POS[p["defaultPositionId"]]
        bye = rng.random() < 0.06
        pts = 0.0 if bye else max(-4.0, rng.gauss(mean * p["talent"], spread))
        # what the manager expected: better managers guess closer to reality
        guess = mean * p["talent"] + rng.gauss(0, spread * (1.25 - skill)) - (20 if bye and rng.random() < skill else 0)
        rows.append({"pid": pid, "pts": round(pts, 1), "guess": guess})

    # fill starting slots greedily by the manager's guesses
    order = [(0, 1), (2, 2), (4, 2), (6, 1), (16, 1), (17, 1), (23, 1)]
    used, slot_of = set(), {}
    for slot, n in order:
        cands = sorted((r for r in rows if r["pid"] not in used and slot in players[r["pid"]]["eligibleSlots"]),
                       key=lambda r: -r["guess"])
        for r in cands[:n]:
            used.add(r["pid"])
            slot_of[r["pid"]] = slot
    entries, total = [], 0.0
    for r in rows:
        p = players[r["pid"]]
        slot = slot_of.get(r["pid"], 20)
        if slot != 20:
            total += r["pts"]
        entries.append({
            "playerId": r["pid"], "lineupSlotId": slot,
            "playerPoolEntry": {"appliedStatTotal": r["pts"], "player": {
                "id": r["pid"], "fullName": p["fullName"], "defaultPositionId": p["defaultPositionId"],
                "eligibleSlots": p["eligibleSlots"],
                "stats": [{"scoringPeriodId": week, "statSourceId": 0, "appliedTotal": r["pts"]}],
            }},
        })
    return entries, round(total, 2)
