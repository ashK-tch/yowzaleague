"""Build the Yowza League site.

    python build.py --sample          # made-up data, no ESPN connection needed
    python build.py                   # real league (reads LEAGUE_ID etc. from env)

Writes site/index.html. Settings come from environment variables:
    LEAGUE_ID      your ESPN league id (the number after leagueId= in the URL)
    SEASON         optional; defaults to the current NFL season
    ESPN_S2, ESPN_SWID   only needed if the league is private
"""

import argparse
import base64
import datetime as dt
import hashlib
import html
import json
import os
import re
import shutil
import sys
from pathlib import Path
from zoneinfo import ZoneInfo

import espn
import sample
import stats

HERE = Path(__file__).parent
SITE_URL = (os.environ.get("SITE_URL") or "https://yowzaleague.com").rstrip("/")
SKELETON = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
{page}
</html>
"""


DEFAULT_QUESTION = "Who is the most dominant sith lord in the air?"
LOCK_ROUNDS = 200_000
LOCK_STYLE = ("<style>html:not(.unlocked) .ticker, html:not(.unlocked) main, html:not(.unlocked) .odometer, "
              "html:not(.unlocked) .taskbar, html:not(.unlocked) .jukebox, html:not(.unlocked) .sample-note, "
              "html:not(.unlocked) .footer p { display: none !important; } "
              "html:not(.unlocked) .tagline { visibility: hidden; }</style>")


def normalize_answer(text):
    """Answers match ignoring case, spaces and punctuation: 'Darth Vexar' == 'darthvexar!'."""
    return re.sub(r"[^a-z0-9]", "", text.lower())


def make_lock(data_json):
    """Encrypt the league data so only someone who knows an answer can read it.

    SITE_PASSWORDS holds the accepted answers, separated by | or new lines. It lives in
    the repo's Actions secrets, never in this public code. Without it the site is open."""
    answers = [a for a in re.split(r"[|\n]", os.environ.get("SITE_PASSWORDS", "")) if normalize_answer(a)]
    if not answers:
        return None
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    b64 = lambda b: base64.b64encode(b).decode()
    data_key, iv, salt = os.urandom(32), os.urandom(12), os.urandom(16)
    keys = []
    for answer in answers:
        kek = hashlib.pbkdf2_hmac("sha256", normalize_answer(answer).encode(), salt, LOCK_ROUNDS, 32)
        wrap_iv = os.urandom(12)
        keys.append({"iv": b64(wrap_iv), "key": b64(AESGCM(kek).encrypt(wrap_iv, data_key, None))})
    return {
        "q": (os.environ.get("SITE_QUESTION") or DEFAULT_QUESTION).strip(),
        "iter": LOCK_ROUNDS,
        "salt": b64(salt),
        "keys": keys,
        "iv": b64(iv),
        "ct": b64(AESGCM(data_key).encrypt(iv, data_json.encode(), None)),
    }


AUDIO_TYPES = {".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".aac": "audio/aac", ".ogg": "audio/ogg", ".wav": "audio/wav"}


def add_music(out):
    """Publish the audio file in music/ (if there is one) for the jukebox to play.
    With no file there, the page plays its built-in theme song instead."""
    for old in out.glob("theme.*"):
        old.unlink()
    folder = HERE / "music"
    files = sorted(p for p in folder.glob("*") if p.is_file() and p.suffix.lower() in AUDIO_TYPES) if folder.is_dir() else []
    if not files:
        return None
    if len(files) > 1:
        print(f"More than one audio file in music/. Playing {files[0].name}; remove the others to choose a different one.")
    src = files[0]
    dest = out / ("theme" + src.suffix.lower())
    shutil.copyfile(src, dest)
    title = re.sub(r"[_]+", " ", src.stem)
    title = re.sub(r"\s+", " ", title).strip() or "Theme song"
    print(f"Jukebox will play {src.name} ({src.stat().st_size / 1e6:.1f} MB).")
    return {"file": dest.name, "type": AUDIO_TYPES[src.suffix.lower()], "title": title}


def add_art(out):
    """Publish the art/ folder (Glorbo's sprite sheet and any other pictures) next to the page."""
    dest = out / "art"
    if dest.exists():
        shutil.rmtree(dest)
    if (HERE / "art").is_dir():
        shutil.copytree(HERE / "art", dest)
    sounds = out / "sounds"          # Yowza Bowl's recordings (credits in games/sounds/CREDITS.md)
    if sounds.exists():
        shutil.rmtree(sounds)
    if (HERE / "games" / "sounds").is_dir():
        shutil.copytree(HERE / "games" / "sounds", sounds)


def bowl_settings():
    """Online settings for Yowza Bowl. The Firebase web config is not a secret (it only says where the database is).
    What keeps the lanes league-only is the "space": every read and write happens under a key made from the
    members-only answers, and that key only ever leaves here inside the encrypted league data."""
    path = HERE / "games" / "firebase.json"
    if os.environ.get("BOWL_OFFLINE") or not path.exists():
        return None
    secret = os.environ.get("SITE_PASSWORDS", "").strip()
    space = hashlib.sha256(("yowza-bowl|" + secret).encode()).hexdigest()[:24] if secret else "open"
    if os.environ.get("BOWL_MOCK"):
        return {"firebase": "mock", "space": "test"}
    return {"firebase": json.loads(path.read_text(encoding="utf-8")), "space": space}


def current_season(today):
    return today.year if today.month >= 3 else today.year - 1


def render(payload, full_document=True, card=None, site_url=SITE_URL, lock=None):
    template = (HERE / "template.html").read_text(encoding="utf-8")
    data = "null" if lock else json.dumps(payload, separators=(",", ":")).replace("</", "<\\/")
    template = template.replace("__LOCK_STYLE__", LOCK_STYLE if lock else "")
    template = template.replace("__YOWZA_LOCK__", json.dumps(lock, separators=(",", ":")) if lock else "null")
    card = card or {"title": "Yowza League", "line": ""}
    last = payload["weeks"][-1]["week"] if payload["weeks"] else 0
    desc = (card["line"] + " Standings, playoff odds and the Yowza of the Week.").strip()
    swaps = {
        "__OG_TITLE__": html.escape(card["title"]),
        "__OG_DESC__": html.escape(desc),
        "__OG_IMAGE__": html.escape(f"{site_url}/og.png?v={payload['league']['season']}-{last}"),
        "__SITE_URL__": html.escape(site_url),
    }
    for k, v in swaps.items():
        template = template.replace(k, v)
    parts = [HERE / "games" / name for name in ("yb-engine.js", "yb-sound.js", "yb-art.js", "yb-net.js", "yb-ui.js")]
    game = "\n".join(p.read_text(encoding="utf-8") for p in parts) if all(p.exists() for p in parts) else ""
    template = template.replace("__BOWL_JS__", game.replace("</", "<\\/"))
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
    payload["music"] = add_music(out)
    payload["bowl"] = bowl_settings()
    add_art(out)
    card = None
    try:
        import share
        card = share.make_card(payload, out, HERE / ".fonts", SITE_URL.split("//")[-1])
    except Exception as e:  # the site still builds without its link preview picture
        print(f"Skipped the share picture: {e}")
    lock = make_lock(json.dumps(payload, separators=(",", ":")))
    (out / "index.html").write_text(render(payload, card=card, lock=lock), encoding="utf-8")
    if lock:
        (out / "data.json").unlink(missing_ok=True)  # never publish the league data unencrypted
        print("Site is members-only: league data is encrypted behind the question.")
    else:
        (out / "data.json").write_text(json.dumps(payload, indent=1), encoding="utf-8")
    if args.fragment:
        Path(args.fragment).write_text(render(payload, full_document=False, card=card), encoding="utf-8")
    print(f"Built {out / 'index.html'}: {len(league['teams'])} teams, {len(league['weeks'])} weeks.")


if __name__ == "__main__":
    main()
