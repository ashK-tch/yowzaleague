"""The picture iMessage (and other apps) show when someone pastes the site's link:
this week's Yowza of the Week as a late-90s error dialog on a turf desktop,
plus the small app icon."""

import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
TURF, TURF_2, CHALK = (46, 122, 62), (39, 107, 53), (238, 246, 232)
SILVER, WHITE, LITE, GREY, DARK = (192, 192, 192), (255, 255, 255), (223, 223, 223), (128, 128, 128), (10, 10, 10)
NAVY, BLUE, FLAG = (0, 0, 128), (16, 132, 208), (255, 210, 0)

FONT_URLS = {
    "anton": "https://raw.githubusercontent.com/google/fonts/main/ofl/anton/Anton-Regular.ttf",
    "pixel": "https://raw.githubusercontent.com/google/fonts/main/ofl/pixelifysans/PixelifySans%5Bwght%5D.ttf",
}
FALLBACKS = ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
             "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"]

FLAG_SPRITE = ["KK..............", "KWK.............", "KWKKKKKK.....KK.", "KWKYYYYYKK..KYK.", "KWKYYYYYYYKKYYK.",
               "KWKYYYYYYYYYYYK.", "KWKYYYYYYYYYYYK.", "KWKYYOOYYYYYYYK.", "KWKYYYYOOYYYYYK.", "KWKKKYYYYYKKYYK.",
               "KWK..KKYYK..KKK.", "KWK....KK.......", "KWK.............", "KWK.............", "KWK.............",
               "KKK............."]
PAL = {"K": (0, 0, 0), "W": WHITE, "Y": FLAG, "O": (176, 136, 0)}


def _font_file(kind, cache):
    path = cache / (kind + ".ttf")
    if not path.exists():
        try:
            cache.mkdir(parents=True, exist_ok=True)
            with urllib.request.urlopen(FONT_URLS[kind], timeout=20) as r:
                path.write_bytes(r.read())
        except Exception as e:  # no network: fall back to a system font
            print(f"Couldn't download the {kind} font ({e}); using a fallback.")
            return next((p for p in FALLBACKS if Path(p).exists()), None)
    return str(path)


def _font(path, size, weight=None):
    if not path:
        return ImageFont.load_default(size)
    f = ImageFont.truetype(path, size)
    if weight:
        try:
            f.set_variation_by_axes([weight])
        except Exception:
            pass
    return f


def _sprite(draw, rows, x, y, scale):
    for r, row in enumerate(rows):
        for c, ch in enumerate(row):
            if ch in PAL:
                draw.rectangle([x + c * scale, y + r * scale, x + (c + 1) * scale - 1, y + (r + 1) * scale - 1], fill=PAL[ch])


def _raised(draw, box, fill=SILVER):
    x0, y0, x1, y1 = box
    draw.rectangle(box, fill=fill)
    draw.line([(x0, y1), (x0, y0), (x1, y0)], fill=WHITE, width=2)
    draw.line([(x0 + 2, y1 - 2), (x0 + 2, y0 + 2), (x1 - 2, y0 + 2)], fill=LITE, width=2)
    draw.line([(x0, y1), (x1, y1), (x1, y0)], fill=DARK, width=2)
    draw.line([(x0 + 2, y1 - 2), (x1 - 2, y1 - 2), (x1 - 2, y0 + 2)], fill=GREY, width=2)


def _desktop(img):
    d = ImageDraw.Draw(img)
    stripe = 48
    for i, x in enumerate(range(0, W, stripe)):
        d.rectangle([x, 0, x + stripe - 1, H], fill=TURF)
        if i % 2:  # dithered stripe, like an old tiled wallpaper
            for yy in range(0, H, 4):
                for xx in range(x, x + stripe, 4):
                    d.rectangle([xx, yy, xx + 1, yy + 1], fill=TURF_2)
                    d.rectangle([xx + 2, yy + 2, xx + 3, yy + 3], fill=TURF_2)
        if i % 2 == 0:
            d.rectangle([x, 0, x + 1, H], fill=CHALK)


def _fit(draw, text, path, max_w, max_lines, start, floor=44):
    size = start
    while size >= floor:
        f = _font(path, size)
        words, lines, cur = text.split(), [], ""
        for w in words:
            trial = (cur + " " + w).strip()
            if draw.textlength(trial, font=f) <= max_w or not cur:
                cur = trial
            else:
                lines.append(cur)
                cur = w
        lines.append(cur)
        if len(lines) <= max_lines and all(draw.textlength(l, font=f) <= max_w for l in lines):
            return f, lines
        size -= 6
    return _font(path, floor), [text]


def make_card(payload, out_dir, cache_dir, site_label="yowzaleague.com"):
    anton = _font_file("anton", cache_dir)
    pixel = _font_file("pixel", cache_dir)
    teams = {t["id"]: t for t in payload["teams"]}
    weeks = payload["weeks"]
    y = weeks[-1]["awards"].get("yowza") if weeks else None

    if y and y["left"] > 0.005:
        title = f"Yowza of the Week {weeks[-1]['week']}"
        kicker = "This team has performed an illegal lineup."
        headline = teams.get(y["team"], {}).get("name", "Somebody")
        pre, num, post = "Left ", f"{y['left']:.2f}", " points on the bench."
    elif weeks:
        top = weeks[-1]["awards"]["top"]
        title = f"Week {weeks[-1]['week']}"
        kicker = "Top score of the week."
        headline = teams.get(top["team"], {}).get("name", "Somebody")
        pre, num, post = "Put up ", f"{top['score']:.2f}", " points."
    else:
        title = f"{payload['league']['season']} season"
        kicker = "Please wait."
        headline = payload["league"]["name"]
        pre, num, post = "The first flag gets thrown after Week 1.", "", ""

    img = Image.new("RGB", (W, H))
    _desktop(img)
    d = ImageDraw.Draw(img)

    box = (100, 80, 1100, 550)
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rectangle([box[0] + 12, box[1] + 12, box[2] + 12, box[3] + 12], fill=(0, 0, 0, 90))
    img.paste(shadow, (0, 0), shadow)
    _raised(d, box)

    # title bar
    tb = (box[0] + 6, box[1] + 6, box[2] - 6, box[1] + 58)
    for x in range(tb[0], tb[2] + 1):
        t = (x - tb[0]) / (tb[2] - tb[0])
        d.line([(x, tb[1]), (x, tb[3])], fill=tuple(int(NAVY[i] + (BLUE[i] - NAVY[i]) * t) for i in range(3)))
    _sprite(d, FLAG_SPRITE, tb[0] + 12, tb[1] + 10, 2)
    d.text((tb[0] + 54, tb[1] + 9), title, font=_font(pixel, 30, 700), fill=WHITE)
    close = (tb[2] - 44, tb[1] + 8, tb[2] - 8, tb[1] + 42)
    _raised(d, close)
    d.text(((close[0] + close[2]) / 2, (close[1] + close[3]) / 2), "x", font=_font(pixel, 26, 700), fill=DARK, anchor="mm")

    # body
    _sprite(d, FLAG_SPRITE, box[0] + 40, box[1] + 100, 7)
    left, text_w = box[0] + 190, box[2] - box[0] - 230
    d.text((left, box[1] + 96), kicker, font=_font(pixel, 30, 700), fill=DARK)
    h_font, lines = _fit(d, headline.upper(), anton, text_w, 2, 104)
    yy = box[1] + 142
    for ln in lines:
        d.text((left, yy), ln, font=h_font, fill=DARK)
        yy += int(h_font.size * 1.02)
    body = _font(pixel, 34, 500)
    x = left
    yy += 30
    d.text((x, yy), pre, font=body, fill=DARK)
    x += d.textlength(pre, font=body)
    if num:
        nw = d.textlength(num, font=body)
        d.rectangle([x - 2, yy + 2, x + nw + 4, yy + 44], fill=FLAG)
        d.text((x + 1, yy), num, font=body, fill=DARK)
        x += nw + 4
        d.text((x, yy), post, font=body, fill=DARK)

    ok = (box[2] - 190, box[3] - 74, box[2] - 40, box[3] - 26)
    _raised(d, ok)
    d.rectangle([ok[0] - 2, ok[1] - 2, ok[2] + 2, ok[3] + 2], outline=DARK, width=2)
    d.text(((ok[0] + ok[2]) / 2, (ok[1] + ok[3]) / 2), "OK", font=_font(pixel, 28, 700), fill=DARK, anchor="mm")
    d.text((box[0] + 40, box[3] - 66), site_label, font=_font(pixel, 28, 700), fill=NAVY)

    out_dir.mkdir(parents=True, exist_ok=True)
    img.save(out_dir / "og.png", optimize=True)

    icon = Image.new("RGB", (180, 180), SILVER)
    di = ImageDraw.Draw(icon)
    _raised(di, (0, 0, 179, 179))
    _sprite(di, FLAG_SPRITE, 18, 18, 9)
    icon.save(out_dir / "apple-touch-icon.png", optimize=True)

    line = f"{headline} left {num} points on the bench." if (y and y["left"] > 0.005) else (pre + num + post)
    return {"title": f"{title}: {headline}" if weeks else headline, "line": line}
