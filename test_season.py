"""Sanity checks for playoff odds, the schedule swap grid and the record book.
Run with: python test_season.py"""

import espn
import sample
import season
import stats


def build(weeks_done=8):
    sample.WEEKS_DONE = weeks_done
    raw, boxes = sample.make(2026)
    league = espn.normalize(raw, boxes, 2026, is_sample=True)
    summaries = [stats.week_summary(w, league["slotCounts"]) for w in league["weeks"]]
    standings, _ = stats.season_table(league, summaries)
    return league, summaries, standings


def main():
    league, summaries, standings = build()
    n = len(league["teams"])

    # Schedule swap: the diagonal is each team's real record.
    swap = season.schedule_swap(league, summaries)
    for r in standings:
        assert swap["records"][r["team"]][r["team"]] == [r["w"], r["l"], r["t"]], r["team"]
    for a in swap["records"].values():
        for w, l, t in a.values():
            assert w + l + t == swap["weeks"]

    # Playoff odds: every simulated season fills exactly the playoff spots, byes and one champion.
    race = season.playoff_odds(league, standings, summaries)
    teams = race["teams"].values()
    assert abs(sum(t["playoffs"] for t in teams) - race["spots"]) < 1e-9
    assert abs(sum(t["first"] for t in teams) - 1) < 1e-9
    if race["byes"]:
        assert abs(sum(t["bye"] for t in teams) - race["byes"]) < 1e-9
    for t in teams:
        assert t["winOut"] >= t["playoffs"] - 1e-9, t
        if t["next"]:
            assert t["next"]["ifWin"] >= t["next"]["ifLoss"] - 0.02, t
    assert race["gameOfWeek"]

    # Season over: no odds to show.
    league_done, summaries_done, standings_done = build(weeks_done=14)
    assert season.playoff_odds(league_done, standings_done, summaries_done) is None

    rec = season.season_records(league, summaries)
    assert sum(f["count"] for f in rec["flags"]) <= len(summaries)
    assert rec["records"]["high"]["score"] >= rec["records"]["low"]["score"]
    print(f"Season checks pass: {n} teams, {race['spots']} playoff spots, {race['byes']} byes.")


if __name__ == "__main__":
    main()
