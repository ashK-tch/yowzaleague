"""Checks the Hall of Fame math on a tiny made-up history."""

import tempfile
from pathlib import Path

import history

SEASONS = """season,place,team,wins,losses,ties
2023,1,Old Name,10,3,0
2023,2,Rival,9,4,0
2023,3,Third Wheel,7,6,0
2024,1,New Name,11,2,0
2024,2,Third Wheel,8,5,0
2024,3,Rival,2,11,0
2025,1,Rival,6,7,0
2025,2,New Name,12,1,0
2025,3,Third Wheel,5,8,0
"""
MANAGERS = """manager,team,seasons
Sam,Old Name,
Sam,New Name,
"""


def build(managers=True):
    folder = Path(tempfile.mkdtemp())
    (folder / "seasons.csv").write_text(SEASONS)
    if managers:
        (folder / "managers.csv").write_text(MANAGERS)
    league = {"season": 2026, "teams": [{"id": 1, "name": "Newest Name", "_aliases": ["Sam"]},
                                        {"id": 2, "name": "Rival", "_aliases": ["Pat"]}]}
    return history.hall_of_fame(league, [], folder)


hall, careers = build()
people = {p["name"]: p for p in hall["people"]}
assert people["Sam"]["titles"] == [2023, 2024], people["Sam"]
assert people["Sam"]["w"] == 33 and people["Sam"]["l"] == 6
assert hall["people"][0]["name"] == "Sam"
lore = {l["label"]: l for l in hall["lore"]}
assert "Sam (2023–2024)" in lore["Back-to-back champions"]["text"]
assert lore["Worst to first"]["text"].startswith("Rival: last in 2024, champion in 2025")
assert lore["Worst record to win it all"]["value"] == "6–7"
assert "Third Wheel" in lore["Always the bridesmaid"]["text"]
assert careers[1]["name"] == "Sam" and careers[1]["titles"] == [2023, 2024]  # matched by ESPN first name
assert careers[2]["name"] == "Rival" and careers[2]["titles"] == [2025]      # matched by team name

hall, careers = build(managers=False)
names = [p["name"] for p in hall["people"]]
assert "Old Name" in names and "New Name" in names and not hall["byPerson"]
assert 1 not in careers  # "Newest Name" has no history under that name

print("Hall of Fame checks passed.")
