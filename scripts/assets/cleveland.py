"""Add hand-picked Cleveland Museum of Art Open Access objects to the antique catalog.

Usage: python cleveland.py <isnet.onnx> [search.json]

search.json holds the museum's records for the candidates (id, title, culture, date, meas,
tech, url, printUrl); the default is assets-src/check/cma/search.json. For each entry:
download the print image (3400 px) unless it is cached in assets-src/cma/orig, cut it out,
stand a horizontal piece upright, export public/items/<slug>.webp and
public/items/thumb/<slug>.webp, and write src/data/cleveland.json. Very long, thin pieces
(spears and bows) keep 2400 px on the long side so their heads stay sharp in close-up.
"""
import io
import json
import os
import re
import sys
import urllib.request

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

sys.path.insert(0, os.path.dirname(__file__))
import catalog  # noqa: E402
import cutout  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CMA = os.path.join(ROOT, "assets-src", "cma")
ORIG = os.path.join(CMA, "orig")
CUT = os.path.join(CMA, "cut")
PUB = os.path.join(ROOT, "public", "items")
THUMB = os.path.join(PUB, "thumb")
SEARCH_JSON = os.path.join(ROOT, "assets-src", "check", "cma", "search.json")
OUT_JSON = os.path.join(ROOT, "src", "data", "cleveland.json")
CREDIT = "The Cleveland Museum of Art, Open Access (CC0)"

# (CMA id, name, category, value_usd, origin, blurb). Values are auction comparables or
# estimates from the asset research (assets-src/check/cma-values.json).
E = [
    (95880, "Swiss Halberd", "polearm", 2300, "Switzerland",
     "Axe, beak and spike in one Swiss head, mounted on a later haft."),
    (96096, "Italian Glaive", "polearm", 2800, "Italy",
     "A broad blade of the 1400s on a carved wooden haft."),
    # The head rests in its sheath; the iron bar below it with an upturned end is the hook.
    (104199, "Kagi Yari", "polearm", 1200, "Japan",
     "The blade rests in its sheath. The iron hook below it caught an enemy's shaft."),
    (104212, "Su Yari", "polearm", 650, "Japan",
     "A straight blade on its full lacquered haft, bound in red below the head."),
    # 103345 (1921.403) is this same bow inside its bamboo press, where it reads as two
    # bamboo slats; only the strung bow (1921.403.a) is shown.
    (103346, "Edo Yumi", "bow", 400, "Japan",
     "Bound in red and black from tip to tip, strung, and taller than the archer who drew it."),
    (95901, "Scandinavian Battle Axe", "axe", 3500, "Scandinavia",
     "A northern war axe of the 1400s, its haft wound with riveted iron."),
    (97072, "Sindhi Battle Axe", "axe", 650, "Sind, India",
     "Steel from edge to butt, engraved with flowers and an elephant. Sind, around 1800."),
    (95895, "Seven-Flanged Mace", "axe", 10000, "Italy",
     "Gilded russet steel chiseled with leaves. A horseman's mace, around 1540."),
]

# The museum gives no materials for these; the photographs show them.
MATERIALS = {
    104212: "Steel blade, lacquered wooden haft",
    103346: "Bamboo and wood, lacquered and bound",
}

# Photographed lying down: degrees (CSS, clockwise) that stand the piece upright, head up.
ROTATE = {97072: -90}

# Pieces many times longer than wide (spears, bows, halberds) keep more pixels in the export.
THIN_ASPECT = 0.12
LONG_SIDE = 1400
LONG_SIDE_THIN = 2400


def era_from(date):
    """'1600s' reads as '17th century', 'early to mid-1800s' as 'Early to mid-19th century'."""
    d = re.sub(r"\s+", " ", (date or "").strip())

    def century(m):
        n = int(m.group(1)) // 100 + 1
        suffix = "th" if 11 <= n % 100 <= 13 else {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
        return f"{n}{suffix} century"

    d = re.sub(r"\b(\d{2}00)s\b", century, d)
    return d[0].upper() + d[1:] if d and not d.startswith("c. ") else d


def content_aspect(rgba):
    """Width over height of the piece itself, without the margin the cutout leaves around it."""
    a = np.asarray(rgba)[..., 3] > 40
    ys, xs = np.where(a)
    if not len(xs):
        return 1.0
    return (xs.max() - xs.min() + 1) / (ys.max() - ys.min() + 1)


def length_from(meas):
    m = re.search(r"Overall:\s*([\d.]+)\s*cm", meas or "")
    return f"{float(m.group(1)):.0f} cm" if m else None


def materials_from(cid, tech):
    if cid in MATERIALS:
        return MATERIALS[cid]
    m = (tech or "").strip().rstrip(".")
    return (m[0].upper() + m[1:])[:80] if m else "Steel"


def cut(sess, src, dst):
    """cutout.process with the backdrop modeled per pixel instead of as one color: haze the
    matte keeps in narrow gaps (between a bow and its string, under a flange) is dropped where
    it matches the backdrop, small pockets it leaves inside the metal are filled, and soft
    edges are unmixed from the gradient behind them."""
    img = Image.open(src).convert("RGB")
    rgb = np.asarray(img).astype(np.float32)
    alpha = np.asarray(cutout.predict_mask(sess, img)).astype(np.float32) / 255.0
    a = np.clip((alpha - 0.06) / 0.88, 0.0, 1.0)
    bg = cutout.backdrop(rgb, a)
    # Distance from the backdrop, smoothed so film grain does not leave a speckled matte.
    near = ndi.uniform_filter(np.linalg.norm(rgb - bg, axis=2), size=5)
    soft = a < 0.9
    a[soft] *= np.clip((near[soft] - 8.0) / 16.0, 0.0, 1.0)
    # A pocket that is enclosed by metal, small, and unlike the backdrop is part of the piece.
    pockets, n = ndi.label(a < 0.95)
    if n:
        ids = np.arange(1, n + 1)
        area = ndi.sum(np.ones_like(a), pockets, ids)
        far = ndi.median(near, pockets, ids)
        edge = np.unique(np.concatenate([pockets[0], pockets[-1], pockets[:, 0], pockets[:, -1]]))
        fill = ids[(area < 2500) & (far > 24) & ~np.isin(ids, edge)]
        a[np.isin(pockets, fill)] = 1.0
    return cutout.save_cut(cutout.unmix(rgb, a, bg), a, dst)


def download(meta):
    path = os.path.join(ORIG, f"{meta['id']}.jpg")
    if os.path.exists(path) and os.path.getsize(path) > 10000:
        return path
    req = urllib.request.Request(meta["printUrl"], headers={"User-Agent": "ironbound-mock-asset-harvest/1.1"})
    with urllib.request.urlopen(req, timeout=120) as r, open(path, "wb") as f:
        f.write(r.read())
    return path


def main():
    model = sys.argv[1]
    search = sys.argv[2] if len(sys.argv) > 2 else SEARCH_JSON
    metas = {o["id"]: o for o in json.load(io.open(search, encoding="utf-8"))}
    for d in (ORIG, CUT, PUB, THUMB):
        os.makedirs(d, exist_ok=True)
    sess = None
    items = []
    for cid, name, cat, value, origin, blurb in E:
        meta = metas.get(cid)
        if not meta:
            print("MISSING META", cid, name)
            continue
        src = download(meta)
        cut_path = os.path.join(CUT, f"{cid}.png")
        if not os.path.exists(cut_path):
            # Cut at the full print size: the hafts and bows are only a few dozen pixels wide.
            sess = sess or cutout.load_session(model)
            if not cut(sess, src, cut_path):
                print("EMPTY CUTOUT", cid, name)
                continue
        rgba = Image.open(cut_path).convert("RGBA")
        rot = ROTATE.get(cid) or catalog.orientation(rgba, cat)
        if rot:
            rgba = rgba.rotate(-rot, expand=True, resample=Image.Resampling.BICUBIC)
            box = rgba.getbbox()
            if box:
                rgba = rgba.crop(box)
        slug = catalog.slugify(name, cid)
        thin = content_aspect(rgba) < THIN_ASPECT
        full = rgba.copy()
        side = LONG_SIDE_THIN if thin else LONG_SIDE
        full.thumbnail((side, side), Image.Resampling.LANCZOS)
        full.save(os.path.join(PUB, f"{slug}.webp"), "WEBP", quality=85, method=4)
        th = rgba.copy()
        th.thumbnail((440, 440), Image.Resampling.LANCZOS)
        th.save(os.path.join(THUMB, f"{slug}.webp"), "WEBP", quality=80, method=4)
        item = {
            "id": slug,
            "name": name,
            "category": cat,
            "era": era_from(meta.get("date")),
            "origin": origin,
            "provenance": "antique",
            "materials": materials_from(cid, meta.get("tech")),
            "value": value,
            "blurb": blurb,
            "image": f"/items/{slug}.webp",
            "thumb": f"/items/thumb/{slug}.webp",
            "aspect": round(full.width / full.height, 4),
            "credit": CREDIT,
            "sourceUrl": meta.get("url") or "",
        }
        length = length_from(meta.get("meas"))
        if length:
            item["length"] = length
        items.append(item)
        print(f"{cid:>7} {rot:>4} {item['aspect']:>6} {full.width}x{full.height} {slug}", flush=True)

    items.sort(key=lambda i: i["value"])
    with io.open(OUT_JSON, "w", encoding="utf-8", newline="\n") as f:
        json.dump(items, f, ensure_ascii=False, indent=1)
    print("cleveland items", len(items))


if __name__ == "__main__":
    main()
