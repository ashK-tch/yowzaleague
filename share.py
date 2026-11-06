"""The picture iMessage (and other apps) show when someone pastes the site's link:
this week's Yowza of the Week on a football field, plus the small app icon."""

import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
TURF, TURF_2, SIDELINE = (39, 102, 49), (34, 91, 43), (22, 58, 30)
CHALK, FLAG, FLAG_EDGE = (244, 247, 242), (242, 194, 0), (143, 113, 0)

FONT_URLS = {
    "display": "https://raw.githubusercontent.com/google/fonts/main/ofl/bigshouldersdisplay/BigShouldersDisplay%5Bwght%5D.ttf",
    "body": "https://raw.githubusercontent.com/google/fonts/main/ofl/barlow/Barlow-SemiBold.ttf",
}
FALLBACKS = ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
             "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"]


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


def _bezier(p0, p1, p2, p3, steps=24):
    pts = []
    for i in range(steps + 1):
        t = i / steps
        a, b, c, d = (1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t ** 2, t ** 3
        pts.append((a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]))
    return pts


def _flag(draw, x, y, s):
    """The penalty flag from the site's hero, drawn at (x, y) scaled from its 120-unit box."""
    P = lambda px, py: (x + px * s, y + py * s)
    cloth = (_bezier(P(26, 28), P(46, 16), P(70, 40), P(100, 24)) + [P(106, 82)]
             + _bezier(P(106, 82), P(80, 98), P(54, 72), P(30, 86)))
    draw.polygon(cloth, fill=FLAG, outline=FLAG_EDGE, width=max(2, int(3 * s)))
    fold = _bezier(P(44, 46), P(58, 40), P(72, 56), P(90, 46))
    draw.line(fold, fill=FLAG_EDGE, width=max(2, int(2 * s)))
    r = 10 * s
    cx, cy = P(24, 30)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=FLAG, outline=FLAG_EDGE, width=max(2, int(3 * s)))
    draw.line([P(18, 38), P(10, 58)], fill=FLAG_EDGE, width=max(2, int(3 * s)))
    draw.line([P(26, 40), P(24, 62)], fill=FLAG_EDGE, width=max(2, int(3 * s)))


def _field(img):
    d = ImageDraw.Draw(img)
    stripe = 100
    for i, x in enumerate(range(0, W, stripe)):
        d.rectangle([x, 0, x + stripe, H], fill=TURF if i % 2 == 0 else TURF_2)
        d.rectangle([x, 0, x + 2, H], fill=(*CHALK, 90))
    # darken the left side so the words stay readable over the stripes
    shade = Image.new("L", (W, 1))
    for x in range(W):
        shade.putpixel((x, 0), int(190 * max(0.0, 1 - x / (W * 0.85))))
    overlay = Image.new("RGBA", (W, H), (*SIDELINE, 0))
    overlay.putalpha(shade.resize((W, H)))
    img.alpha_composite(overlay)


def _fit(draw, text, path, max_w, max_lines, start, weight=None, floor=48):
    size = start
    while size >= floor:
        f = _font(path, size, weight)
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
    f = _font(path, floor, weight)
    return f, [text]


def make_card(payload, out_dir, cache_dir, site_label="yowzaleague.com"):
    display = _font_file("display", cache_dir)
    body = _font_file("body", cache_dir)
    teams = {t["id"]: t for t in payload["teams"]}
    weeks = payload["weeks"]
    y = weeks[-1]["awards"].get("yowza") if weeks else None

    img = Image.new("RGBA", (W, H))
    _field(img)
    d = ImageDraw.Draw(img)
    _flag(d, 820, 150, 3.0)
    left, text_w = 72, 720

    if y and y["left"] > 0.005:
        kicker = f"YOWZA OF THE WEEK {weeks[-1]['week']}"
        headline = teams.get(y["team"], {}).get("name", "Somebody")
        line = f"Left {y['left']:.2f} points on the bench."
    elif weeks:
        top = weeks[-1]["awards"]["top"]
        kicker = f"WEEK {weeks[-1]['week']} TOP SCORE"
        headline = teams.get(top["team"], {}).get("name", "Somebody")
        line = f"Put up {top['score']:.2f} points."
    else:
        kicker = f"{payload['league']['season']} SEASON"
        headline = payload["league"]["name"]
        line = "Kickoff is coming. The first flag gets thrown after Week 1."

    k_font = _font(display, 46, 700)
    d.text((left, 70), kicker, font=k_font, fill=FLAG)
    h_font, lines = _fit(d, headline, display, text_w, 2, 150, 900)
    yy = 140
    for ln in lines:
        d.text((left, yy), ln, font=h_font, fill=CHALK)
        yy += int(h_font.size * 0.92)
    b_font = _font(body, 40)
    d.text((left, yy + 40), line, font=b_font, fill=CHALK)
    s_font = _font(display, 40, 700)
    d.text((left, H - 92), site_label, font=s_font, fill=(*CHALK, 200))

    out_dir.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(out_dir / "og.png", optimize=True)

    icon = Image.new("RGBA", (180, 180), (*SIDELINE, 255))
    _flag(ImageDraw.Draw(icon), 6, 8, 1.45)
    icon.convert("RGB").save(out_dir / "apple-touch-icon.png", optimize=True)
    return {"title": f"{kicker.title().replace('Of The', 'of the')}: {headline}" if (y or weeks) else headline,
            "line": line}
