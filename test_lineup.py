"""Checks the best-lineup solver against brute force on random rosters.
Run with: python test_lineup.py"""

import itertools
import random

from stats import optimal_lineup

SLOT_COUNTS = {0: 1, 2: 2, 4: 2, 6: 1, 23: 1, 16: 1, 17: 1}
ELIG = {"QB": [0, 7], "RB": [2, 3, 23, 7], "WR": [4, 3, 5, 23, 7], "TE": [6, 5, 23, 7], "K": [17], "D/ST": [16]}


def brute(players, slot_counts):
    slots = [s for s, n in sorted(slot_counts.items()) for _ in range(n)]
    best = 0.0
    options = [[None] + [p for p in players if s in p["eligible"]] for s in slots]

    def go(i, used, total):
        nonlocal best
        if i == len(slots):
            best = max(best, total)
            return
        for p in options[i]:
            if p is None:
                go(i + 1, used, total)
            elif id(p) not in used:
                go(i + 1, used | {id(p)}, total + p["points"])
    go(0, frozenset(), 0.0)
    return round(best, 2)


def main():
    rng = random.Random(1)
    for trial in range(300):
        roster = []
        for pos in rng.choices(list(ELIG), k=rng.randint(6, 11)):
            roster.append({"name": f"p{len(roster)}", "pos": pos, "slot": 20, "eligible": ELIG[pos],
                           "points": round(rng.uniform(-3, 30), 1)})
        fast, _ = optimal_lineup(roster, SLOT_COUNTS)
        slow = brute(roster, SLOT_COUNTS)
        assert abs(fast - slow) < 1e-6, (trial, fast, slow)
    print("300 random rosters: solver matches brute force.")


if __name__ == "__main__":
    main()
