"""Build src/components/ui/charges.ts: the charges a player can set on a shield.

Usage: python charges.py

Three kinds of source, all openly licensed and credited in the footer:
- silhouettes from game-icons.net (CC BY 3.0), taken as drawn;
- heraldic figures from Wikimedia Commons, taken as 1920 px PNG renderings (Wikimedia asks tools
  for its standard thumbnail sizes rather than originals) and traced with potrace into one shape;
  a dark figure keeps its light details (eye, tusk, teeth) as cuts;
- the rose, drawn here and rendered with PyMuPDF: five petals with barbs between them, an inner
  rose and a seeded boss.

Every path is fitted to a 512 by 512 box, and every beast faces dexter (the viewer's left), as
heraldry draws them: a figure that faces the other way is mirrored. Downloads are cached in
assets-src/charges/ and reused.
"""
import io
import json
import math
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

import fitz
import numpy as np
import potrace
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CACHE = os.path.join(ROOT, "assets-src", "charges")
OUT = os.path.join(ROOT, "src", "components", "ui", "charges.ts")
UA = "IronboundDemo/1.0 (heraldry for a demo; github.com/oniani1/ironbound)"
BOX = 512
MARGIN = 24
RENDER = 2000  # px on the long side when the rose is rendered
THUMB = 1920  # px wide, a standard Wikimedia thumbnail size
API = "https://commons.wikimedia.org/w/api.php"

# id, name, source, author, license. Sources: ("icon", "author/name", mirror),
# ("commons", "File title", ink mode, mirror), ("drawn", "rose").
CHARGES = [
    ("lion", "Lion", ("commons", "Heraldic Lion Rampant - Sable.svg", "dark", False), "Rode raaf and Tom-L", "CC0"),
    ("crown", "Crown", ("icon", "lorc/queen-crown", False), "Lorc", "CC BY 3.0"),
    ("eagle", "Eagle", ("icon", "lorc/eagle-emblem", True), "Lorc", "CC BY 3.0"),
    ("stag", "Stag", ("icon", "lorc/stag-head", False), "Lorc", "CC BY 3.0"),
    ("boar", "Boar", ("commons", "Heraldic figure - Boar.svg", "dark", False), "Jacek FH", "CC BY-SA 3.0"),
    ("wolf", "Wolf", ("commons", "Meuble héraldique loup passant.svg", "dark", False), "AtonX", "CC BY 2.5"),
    ("bear", "Bear", ("commons", "Герб.svg", "dark", False), "Рытикова Людмила", "CC BY-SA 4.0"),
    ("griffin", "Griffin", ("icon", "delapouite/griffin-symbol", True), "Delapouite", "CC BY 3.0"),
    ("unicorn", "Unicorn", ("icon", "delapouite/unicorn", True), "Delapouite", "CC BY 3.0"),
    ("horse", "Horse", ("commons", "BlackHeraldicHorse.svg", "dark", False), "ClkerFreeVectorImages and David Leigh Ellis", "CC0"),
    ("raven", "Raven", ("icon", "lorc/raven", True), "Lorc", "CC BY 3.0"),
    ("castle", "Castle", ("icon", "delapouite/castle", False), "Delapouite", "CC BY 3.0"),
    ("fleur", "Fleur-de-lis", ("icon", "delapouite/fleur-de-lys", False), "Delapouite", "CC BY 3.0"),
    ("swords", "Crossed swords", ("icon", "lorc/crossed-swords", False), "Lorc", "CC BY 3.0"),
    ("rose", "Rose", ("drawn", "rose"), "Ironbound", "Original"),
    ("sun", "Sun", ("icon", "caro-asercion/heraldic-sun", False), "Caro Asercion", "CC BY 3.0"),
]


def download(url):
    """Wikimedia answers 429 when asked too fast: wait and retry."""
    for attempt in range(6):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(request, timeout=60) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            if error.code != 429 or attempt == 5:
                raise
            time.sleep(15 * (attempt + 1))


def fetch(url, name):
    """A download cached in assets-src/charges/ under the given name."""
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, name)
    if not os.path.exists(path):
        data = download(url() if callable(url) else url)
        with open(path, "wb") as f:
            f.write(data)
        time.sleep(2)
    with open(path, "rb") as f:
        return f.read()


# --- game-icons.net: the icon's own path, without the black square the set draws behind it.

def icon_path(source):
    svg = fetch(f"https://raw.githubusercontent.com/game-icons/icons/master/{source}.svg", source.replace("/", "__") + ".svg").decode("utf-8")
    paths = re.findall(r'<path\b[^>]*\bd="([^"]+)"', svg)
    return "".join(d for d in paths if d.strip() != "M0 0h512v512H0z")


ARGS = {"M": 2, "L": 2, "H": 1, "V": 1, "C": 6, "S": 4, "Q": 4, "T": 2, "A": 7, "Z": 0}
NUMBER = re.compile(r"[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?")


def commands(d):
    """Split a path into (command, arguments), keeping arc flags apart (the set writes "a5 5 0 0110 10")."""
    out = []
    i = 0
    while i < len(d):
        c = d[i]
        if c in " ,\t\r\n":
            i += 1
        elif c.isalpha():
            out.append([c, []])
            i += 1
        else:
            cmd, args = out[-1]
            size = ARGS[cmd.upper()]
            if len(args) == size:
                # Repeated arguments: another command of the same kind (a moveto repeats as a lineto).
                cmd = {"M": "L", "m": "l"}.get(cmd, cmd)
                out.append([cmd, []])
                args = out[-1][1]
            if cmd in "Aa" and len(args) in (3, 4):
                args.append(float(c))
                i += 1
                continue
            match = NUMBER.match(d, i)
            args.append(float(match.group()))
            i = match.end()
    return out


def number(v):
    text = f"{v:.3f}".rstrip("0").rstrip(".")
    return "0" if text in ("-0", "") else text


def mirror(d):
    """The path reflected left to right in the 512 box."""
    out = []
    for n, (cmd, args) in enumerate(commands(d)):
        up, rel = cmd.upper(), cmd.islower() and n > 0
        if up in "MLTCSQ":
            args = [(-v if rel else BOX - v) if k % 2 == 0 else v for k, v in enumerate(args)]
        elif up == "H":
            args = [-v if rel else BOX - v for v in args]
        elif up == "A":
            rx, ry, rot, large, sweep, x, y = args
            args = [rx, ry, -rot, large, 1 - sweep, -x if rel else BOX - x, y]
        out.append(cmd + " ".join(number(v) for v in args))
    return "".join(out)


# --- Traced figures: render, keep the ink, trace, fit to the box.

def raster(svg):
    """The rose, rendered by PyMuPDF."""
    doc = fitz.open(stream=svg.encode("utf-8"), filetype="svg")
    page = doc[0]
    zoom = RENDER / max(page.rect.width, page.rect.height)
    pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=True)
    return np.asarray(Image.frombytes("RGBA", (pix.width, pix.height), pix.samples)).astype(np.int32)


def ink(rgba, mode):
    lum = (rgba[..., 0] * 299 + rgba[..., 1] * 587 + rgba[..., 2] * 114) // 1000
    opaque = rgba[..., 3] > 128
    if mode == "dark":
        return opaque & (lum < 128)
    return opaque & (lum > 70)


def trace(mask, flip=False):
    if flip:
        mask = mask[:, ::-1]
    ys, xs = np.nonzero(mask)
    mask = np.pad(mask[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 4)
    h, w = mask.shape[0] - 8, mask.shape[1] - 8
    scale = (BOX - 2 * MARGIN) / max(h, w)
    ox = (BOX - w * scale) / 2 - 4 * scale
    oy = (BOX - h * scale) / 2 - 4 * scale
    # potracer fills where the bitmap is false: it is handed the paper, not the ink.
    curves = potrace.Bitmap(~mask).trace(turdsize=40, alphamax=1.0, opticurve=True, opttolerance=0.4)

    def point(p):
        return f"{ox + p.x * scale:.0f} {oy + p.y * scale:.0f}"

    d = []
    for curve in curves:
        d.append(f"M{point(curve.start_point)}")
        for seg in curve.segments:
            if seg.is_corner:
                d.append(f"L{point(seg.c)}L{point(seg.end_point)}")
            else:
                d.append(f"C{point(seg.c1)} {point(seg.c2)} {point(seg.end_point)}")
        d.append("Z")
    return "".join(d)


def commons_path(title, mode, flip):
    def thumbnail():
        query = {"action": "query", "format": "json", "prop": "imageinfo", "iiprop": "url", "iiurlwidth": THUMB, "titles": f"File:{title}"}
        pages = json.loads(download(f"{API}?{urllib.parse.urlencode(query)}"))["query"]["pages"]
        return next(iter(pages.values()))["imageinfo"][0]["thumburl"]

    name = "commons__" + re.sub(r"[^\w.-]+", "_", title) + ".png"
    image = Image.open(io.BytesIO(fetch(thumbnail, name))).convert("RGBA")
    return trace(ink(np.asarray(image).astype(np.int32), mode), flip)


def rose_svg():
    """A heraldic rose, barbed and seeded, in black on white: white lines become cuts."""
    c = 256
    body = []
    for k in range(5):
        a = math.radians(-90 + 72 * k)
        for side in (-1, 1):
            # Each petal is two discs side by side, so its tip carries a small notch.
            x = c + 132 * math.cos(a) + side * 26 * math.cos(a + math.pi / 2)
            y = c + 132 * math.sin(a) + side * 26 * math.sin(a + math.pi / 2)
            body.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="80"/>')
    body.append(f'<circle cx="{c}" cy="{c}" r="140"/>')
    for k in range(5):
        a = math.radians(-90 + 36 + 72 * k)
        ux, uy, nx, ny = math.cos(a), math.sin(a), -math.sin(a), math.cos(a)
        base, tip = 150, 242

        def at(r, n):
            return f"{c + r * ux + n * nx:.1f} {c + r * uy + n * ny:.1f}"

        body.append(f'<path d="M{at(base, 36)} Q{at(208, 15)} {at(tip, 0)} Q{at(208, -15)} {at(base, -36)} Z"/>')

    def scallop(radius, distance, core, fill):
        shapes = [f'<circle cx="{c}" cy="{c}" r="{core}" fill="{fill}"/>']
        for k in range(5):
            a = math.radians(-90 + 36 + 72 * k)
            shapes.append(f'<circle cx="{c + distance * math.cos(a):.1f}" cy="{c + distance * math.sin(a):.1f}" r="{radius}" fill="{fill}"/>')
        return "".join(shapes)

    # The inner rose, set between the outer petals, as a white scalloped line.
    cuts = [scallop(54, 66, 68, "#fff"), scallop(44, 66, 60, "#000")]
    for k in range(5):
        a = math.radians(-90 + 36 + 72 * k)
        x1, y1 = c + 122 * math.cos(a), c + 122 * math.sin(a)
        x2, y2 = c + 150 * math.cos(a), c + 150 * math.sin(a)
        cuts.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="#fff" stroke-width="10" stroke-linecap="round"/>')
    cuts.append(f'<circle cx="{c}" cy="{c}" r="34" fill="none" stroke="#fff" stroke-width="9"/>')
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">'
        f'<rect width="512" height="512" fill="#fff"/><g fill="#000">{"".join(body)}</g>{"".join(cuts)}</svg>'
    )


def build(source):
    kind = source[0]
    if kind == "icon":
        _, name, flip = source
        d = icon_path(name)
        return (mirror(d) if flip else d), f"game-icons.net/{name}"
    if kind == "commons":
        _, title, mode, flip = source
        return commons_path(title, mode, flip), f"commons.wikimedia.org/wiki/File:{title.replace(' ', '_')}"
    return trace(ink(raster(rose_svg()), "dark")), "drawn for Ironbound"


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    rows = []
    for cid, name, source, by, license in CHARGES:
        d, where = build(source)
        rows.append(f"  {cid}: {{ name: '{name}', by: '{by}', license: '{license}', source: '{where}', d: '{d}' }},")
        print(f"{cid:8} {len(d):6} {where}")
    head = '''/**
 * Charges for the shield, built by scripts/assets/charges.py; never edit by hand. Silhouettes from
 * game-icons.net, heraldic figures from Wikimedia Commons traced to one shape, and a rose drawn for
 * Ironbound, each under the license given here and credited in the footer. A traced figure is an
 * adaptation under its source's license: the boar's tracing is CC BY-SA 3.0, as its source is.
 * Each path is drawn in a 512 by 512 box, every beast facing dexter. The ids are ours.
 */
import type { Charge } from '../../types'

export const CHARGES: Record<Exclude<Charge, 'none'>, { name: string; by: string; license: string; source: string; d: string }> = {
'''
    order = "export const CHARGE_ORDER: Charge[] = ['none', " + ", ".join(f"'{c[0]}'" for c in CHARGES) + "]\n"
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write(head + "\n".join(rows) + "\n}\n\n" + order)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
