"""Build the Yowza League site.

    python build.py --sample          # made-up data, no ESPN connection needed
    python build.py                   # real league (reads LEAGUE_ID etc. from env)

Writes site/index.html. Settings come from environment variables:
    LEAGUE_ID      your ESPN league id (the number after leagueId= in the URL)
    SEASON         optional; defaults to the current NFL season
    ESPN_S2, ESPN_SWID   only needed if the league is private
"""

import argparse
import datetime as dt
import json
import os
import sys
from pathlib import Path
from zoneinfo import ZoneInfo

import espn
import sample
import stats

HERE = Path(__file__).parent
SKELETON = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
{page}
</html>
"""


def current_season(today):
    return today.year if today.month >= 3 else today.year - 1


def render(payload, full_document=True):
    template = (HERE / "template.html").read_text(encoding="utf-8")
    data = json.dumps(payload, separators=(",", ":")).replace("</", "<\\/")
    page = template.replace("__YOWZA_DATA__", data)
    return SKELETON.format(page=page) if full_document else page


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sample", action="store_true", help="use made-up data")
    ap.add_argument("--out", default="site", help="output folder")
    ap.add_argument("--fragment", help="also write a page without the html/head wrapper here")
    args = ap.parse_args()

    now = dt.datetime.now(ZoneInfo("America/New_York"))
    season = int(os.environ.get("SEASON") or current_season(now))

    if args.sample:
        raw, boxes = sample.make(season)
        league = espn.normalize(raw, boxes, season, is_sample=True)
    else:
        league_id = os.environ.get("LEAGUE_ID", "").strip()
        if not league_id:
            sys.exit("LEAGUE_ID isn't set. Add it under Settings > Secrets and variables > Actions > Variables.")
        client = espn.EspnClient(league_id, season,
                                 os.environ.get("ESPN_S2") or None, os.environ.get("ESPN_SWID") or None)
        try:
            raw, boxes = espn.fetch_raw(client)
        except espn.EspnError as e:
            sys.exit(str(e))
        league = espn.normalize(raw, boxes, season)
        if not league["weeks"]:
            print("No finished weeks yet. The site will show a pre-season page.")

    payload = stats.build_payload(league, now.isoformat(timespec="minutes"))
    out = HERE / args.out
    out.mkdir(parents=True, exist_ok=True)
    (out / "index.html").write_text(render(payload), encoding="utf-8")
    (out / "data.json").write_text(json.dumps(payload, indent=1), encoding="utf-8")
    if args.fragment:
        Path(args.fragment).write_text(render(payload, full_document=False), encoding="utf-8")
    print(f"Built {out / 'index.html'}: {len(league['teams'])} teams, {len(league['weeks'])} weeks.")


if __name__ == "__main__":
    main()
