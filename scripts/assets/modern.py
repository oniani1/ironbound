"""Build the modern half of the Ironbound catalog: new pieces from working makers.

Usage: python modern.py <isnet.onnx> [research/modern-makers.json] [--only id1,id2,...]

Reads the maker research (real makers, models, retail prices and freely licensed photos),
downloads each photo, cuts it out with ISNet, stands long pieces upright, exports
public/items/<id>.webp and public/items/thumb/<id>.webp, and writes src/data/modern.json.
Most photos are examples of the type rather than the exact model; the catalog says so.

With --only, just those ids are processed and merged into the existing modern.json: every
other entry and image is left as it is, ids listed in SKIP leave the catalog (with a record in
retired.json), and a maker is listed while the catalog holds a piece of theirs. Photos already in
assets-src/modern/orig and cuts in assets-src/modern/cut are reused, not fetched again.
"""
import io
import json
import os
import sys
import time
import urllib.request

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

sys.path.insert(0, os.path.dirname(__file__))
import catalog  # noqa: E402
import cutout  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.join(ROOT, "assets-src", "modern")
ORIG = os.path.join(SRC, "orig")
CUT = os.path.join(SRC, "cut")
PUB = os.path.join(ROOT, "public", "items")
THUMB = os.path.join(PUB, "thumb")
OUT_JSON = os.path.join(ROOT, "src", "data", "modern.json")
UA = "IronboundDemo/0.1 (front-end design mock; contact nikaoniani12 at gmail dot com)"

# Shorter display names; the maker and the details carry the rest.
NAMES = {
    "regenyei-harbinger": "Harbinger Longsword",
    "darksword-german-longsword-1337": "German Longsword",
    "windlass-arbedo": "Arbedo Sword",
    "windlass-towton": "Towton Sword",
    "deepeeka-roman-mainz-gladius": "Mainz Gladius",
    "deepeeka-fulham-gladius": "Fulham Gladius",
    "albion-royal-armouries-i33": "I.33 Practice Sword",
    "tods-english-rondel": "English Rondel Dagger",
    "tods-burgundian-rondel": "Burgundian Rondel Dagger",
    "arms-armor-burgundian-poleaxe": "Burgundian Poleaxe",
    "deepeeka-gothic-sallet": "Gothic Sallet",
    "deepeeka-kettle-helm": "Kettle Helm",
    "deepeeka-great-helm": "Great Helm",
    "deepeeka-corinthian-brass": "Corinthian Helm",
    "deepeeka-morion": "Combed Morion",
    "deepeeka-close-helm": "Close Helm",
    "armstreet-kings-guard-bascinet": "Houndskull Bascinet",
    "windlass-soldiers-buckler": "Soldier's Buckler",
    "lord-of-battles-rotella-rodela-16-gauge": "Rotella Shield",
    "lord-of-battles-steel-round-shield-20-gauge": "Steel Round Shield",
    "deepeeka-crusader-shield": "Crusader Heater Shield",
    "steel-mastery-sixteenth-century-knight": "Knight's Armor, 16th-Century Pattern",
    "steel-mastery-german-gothic": "German Gothic Armor",
    "steel-mastery-landsknecht": "Landsknecht Armor",
    "steel-mastery-interior-knight": "Display Knight Armor",
    "steel-mastery-english-1483": "English Armor, 1483 Pattern",
    "tods-bow-irons-crossbow": "Crossbow with Bow Irons",
    "tods-lashed-munition-crossbow": "Lashed Munition Crossbow",
    "tods-windlass-crossbow": "Windlass Crossbow",
    "tods-sporting-crossbow": "Sporting Crossbow",
    "lord-of-battles-clamshell-gauntlets-16-gauge": "Clamshell Gauntlets",
    "lord-of-battles-gorget-standing-collar": "Gorget with Standing Collar",
    "cold-steel-boar-spear": "Boar Spear",
    "deepeeka-unpainted-medieval-wooden-shield": "Wooden Heater Shield",
    "deepeeka-beaten-round-shield": "Beaten Round Shield",
    "deepeeka-odonovan-targe": "O'Donovan Targe",
    "tod-cutler-rude-bollock": "Rude Bollock Dagger",
    "tod-cutler-dresden-rondel": "Dresden Rondel Dagger",
    "tod-cutler-late16-main-gauche": "Main Gauche",
    "tomioka-yoshimasa-commissioned-katana": "Yoshimasa Katana",
    "balaur-arms-italian-longsword": "Italian Longsword",
    "deepeeka-writhen-gothic": "Writhen Gothic Sword",
    "epic-armoury-visored-barbuta": "Visored Barbuta",
    "steel-mastery-great-helm-ah05": "Fitted Great Helm",
    "steel-mastery-houndskull-ah13": "Fitted Houndskull Bascinet",
    "steel-mastery-armet-ah27": "Armet",
    "steel-mastery-burgonet-ah46": "Landsknecht Burgonet",
    "steel-mastery-english-pauldrons-as08": "English Pauldrons",
    "steel-mastery-churburg-breastplate-ab01": "Churburg Breastplate",
    "steel-mastery-kasten-brust-ab14": "Kastenbrust Cuirass",
    "toth-attila": "Attila Horse Bow",
    "adrian-hayes-three-laminate-osage": "Osage Longbow",
}

# Pieces that look right as photographed (loose heads, round shields, crossbows).
NO_ROTATE = {"windlass-european-spear-head"}

# Photographed on a diagonal or upside down: degrees (CSS, clockwise) that stand the piece
# upright with the hilt on top, measured from the cutout's long axis.
ROTATE = {
    "regenyei-standard-feder": -45,
    "tod-cutler-rude-bollock": 31.74,
    "tod-cutler-dresden-rondel": -80.89,
    "tod-cutler-mary-rose-bollock": -179.52,
    "minosaka-tokusei-koshirae": -107.37,
    "minosaka-hon-koshirae": 90.08,
    "tomioka-yoshimasa-commissioned-katana": 89.98,
    "albion-ljubljana": -103.22,
    "balaur-arms-italian-longsword": -90.18,
    "regenyei-tournament-saber": 180,
}

# Photos that show the piece twice: the part of the frame (fractions of the original, left,
# top, right, bottom) that holds one view, cut before the matte.
CROP = {
    "toth-attila": (0.0, 0.0, 0.58, 1.0),  # the same bow from two sides; the left view
    "tomioka-yoshimasa-commissioned-katana": (0.0, 0.0, 1.0, 0.5),  # both faces of one blade; the upper
}

# The matte keeps only part of this bow's string; the string is redrawn along the line it runs.
STRUNG = {"adrian-hayes-three-laminate-osage"}

# Photographed in a gallery: room lights show through the eye slit and breaths. Pale, colorless
# patches inside these rows (fractions of the cutout's height) are openings, not steel.
LIGHTS_IN_OPENINGS = {"steel-mastery-great-helm-ah05": (0.42, 0.92)}

# Stray traces beside the piece (a string the matte half kept): only the piece itself is kept.
LARGEST_ONLY = {"toth-attila"}

# Photos whose cutout is not clean enough to show, dropped after review: a rack of several
# swords, museum labels or other objects in frame, a shield cut down to its emblem, corroded
# excavated heads standing in for new steel.
SKIP = {
    "hanwei-practical-katana",
    "arms-armor-rondel-dagger",
    "arms-armor-celtic-spear",
    "arms-armor-norseman-spear",
    "windlass-european-spear-head",
    "cold-steel-viking-hand-axe",
    "deepeeka-crusader-shield",
    "deepeeka-roman-centurion-shield",
    # Retired in the fourth founder review: the example photo shows only the head, no haft.
    "windlass-viking-throwing-axe",  # a bare axe head
    "cold-steel-viking-battle-axe",  # a bare axe head
    "cold-steel-viking-great-axe",  # a bare axe head
    "cold-steel-boar-spear",  # a spearhead without its shaft
    "arms-armor-italian-bill",  # a bill head without its haft
    "arms-armor-burgundian-poleaxe",  # a poleaxe head without its haft
    # Researched for the fourth review, dropped when their cutouts were checked.
    "deepeeka-fenrir-wolf-shield",  # a fur rug covers the bottom of the shield
    "lord-of-battles-antiqued-heater-shield",  # behind display glass: reflected labels across it
    "lord-of-battles-medieval-crescent-axe",  # a detail shot: the haft runs out of the frame
    "lord-of-battles-sagaris",  # the same axe as the crescent axe, from the back, haft cut off
    "tod-cutler-whittle-tang",  # the same knife as the rude bollock's photo, a second view
    "minosaka-higo-koshirae",  # the scabbard and a separate bare blade, its pale handle lost
    "tsuji-kazuyoshi-commissioned-katana",  # only the tang and the foot of the blade
    "nezu-hidehira-commissioned-katana",  # a blade on a cloth stand beside a museum card
    "albion-brescia",  # a close-up of the hilt; pommel and blade out of frame
    "albion-cluny",  # the polished blade vanishes into the white backdrop
    "albion-sture",  # the polished blade vanishes into the white backdrop
    "balaur-arms-bastard-15th",  # a close-up of the hilt; the blade out of frame
    "koyama-renshin-nisun",  # its photo could not be fetched (rate-limited)
    "epic-armoury-visored-barbuta",  # its maker, Epic Armoury, reads as a rarity in the reveal
    # Bare blades with the tang showing, no grip or guard: the founder wants whole pieces (an iaito
    # is sold mounted, so a bare blade misstates it).
    "minosaka-hon-koshirae",  # a bare blade standing in for a mounted iaito
    "tomioka-yoshimasa-commissioned-katana",  # a bare blade and tang
}

LUMA = np.array([0.299, 0.587, 0.114], np.float32)


def display_name(it):
    if it["id"] in NAMES:
        return NAMES[it["id"]]
    name = it["name"]
    if it["makerId"] == "akamatsu-taro":
        # "Kanemitsu Katana (75.2 cm, 2025)" reads as "Kanemitsu Katana, 75 cm".
        smith = name.split(" ")[0]
        cm = it.get("length") or ""
        num = cm.split(" ")[0]
        try:
            return f"{smith} Katana, {round(float(num))} cm"
        except ValueError:
            return f"{smith} Katana"
    return name


def download(it):
    os.makedirs(ORIG, exist_ok=True)
    path = os.path.join(ORIG, f"{it['id']}.jpg")
    if os.path.exists(path) and os.path.getsize(path) > 10000:
        return path
    url = it["image"]["url"]
    for attempt in range(6):
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                data = r.read()
            with open(path, "wb") as f:
                f.write(data)
            time.sleep(1.2)
            return path
        except Exception as ex:  # noqa: BLE001
            wait = 5 * (attempt + 1)
            print(f"  retry {it['id']} in {wait}s: {ex}", flush=True)
            time.sleep(wait)
    return None


# Makers whose research names the country but not the place, where the usual reading
# (United Kingdom as England) is not known to hold.
ORIGIN = {"adrian-hayes-longbows": "United Kingdom"}


def origin_of(maker):
    if maker["id"] in ORIGIN:
        return ORIGIN[maker["id"]]
    city, country = maker.get("city"), maker.get("country") or ""
    country = {"United States": "USA", "United Kingdom": "England"}.get(country, country)
    return f"{city}, {country}" if city else country


def fit_curve(xs, ys, rounds=6):
    """A quadratic through points along a nearly straight line, refit without the far ones."""
    keep = np.ones(len(xs), bool)
    coef = np.polyfit(xs, ys, 2)
    for _ in range(rounds):
        r = np.abs(ys - np.polyval(coef, xs))
        keep = r < max(1.0, np.percentile(r[keep], 85))
        coef = np.polyfit(xs[keep], ys[keep], 2)
    return coef


def cut_strung(sess, src, dst):
    """Cutout for a bow photographed lying across the frame whose pale string the matte half
    loses. The string is found where colorless pixels beside the stave differ from the backdrop,
    fit as one gently curving line, and redrawn from nock to nock in its own colors; the dark
    horn nocks at the tips are kept."""
    img = Image.open(src).convert("RGB")
    rgb = np.asarray(img).astype(np.float32)
    a = np.clip((np.asarray(cutout.predict_mask(sess, img)).astype(np.float32) / 255.0 - 0.06) / 0.88, 0.0, 1.0)
    bg = cutout.backdrop(rgb, a, step=4, degree=4)
    lum = rgb @ LUMA
    excess = lum - bg @ LUMA
    sat = rgb.max(axis=2) - rgb.min(axis=2)
    stave = a > 0.5
    _, sx = np.where(stave)
    x0, x1 = sx.min(), sx.max()

    def columns(mask):
        ys, xs = np.where(mask)
        w = np.abs(excess[ys, xs])
        cols = np.unique(xs)
        cy = np.array([np.average(ys[xs == c], weights=w[xs == c]) for c in cols])
        return cols.astype(float), cy

    # First pass: the pale string where it stands clear of the stave; then every pixel along it,
    # the darker serving at the middle included.
    cx, cy = columns((excess > 30) & (sat < 45) & ~ndi.binary_dilation(stave, iterations=6))
    coef = fit_curve(cx, cy)
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    near = np.abs(yy - np.polyval(coef, xx)) < 8
    cx, cy = columns(near & (np.abs(excess) > 25) & (sat < 60))
    coef = fit_curve(cx, cy)
    # Nocks: dark horn at either tip.
    tips = (lum < 50) & ((np.abs(xx - x0) < 60) | (np.abs(xx - x1) < 60))
    tips = ndi.binary_dilation(tips, iterations=1)
    _, nx = np.where(tips)
    left, right = (nx.min(), nx.max()) if len(nx) else (x0, x1)
    string = np.clip(1.5 - np.abs(yy - np.polyval(coef, xx)), 0.0, 1.0) * ((xx >= left) & (xx <= right))
    a = np.maximum(a, np.maximum(string, tips.astype(np.float32)))
    return cutout.save_cut(cutout.unmix(rgb, a, bg), a, dst)


def clear_lights(rgba, band):
    """Pale, colorless patches inside a band of rows are openings showing the room behind."""
    c = np.asarray(rgba).copy()
    h = c.shape[0]
    rgb = c[..., :3].astype(np.int16)
    lo, hi = int(h * band[0]), int(h * band[1])
    pale = (rgb.min(axis=2) > 170) & (rgb.max(axis=2) - rgb.min(axis=2) < 28) & (c[..., 3] > 0)
    pale[:lo] = False
    pale[hi:] = False
    lab, n = ndi.label(pale)
    if n:
        area = ndi.sum(np.ones(pale.shape), lab, np.arange(1, n + 1))
        holes = ndi.binary_dilation(np.isin(lab, np.arange(1, n + 1)[area >= 25]), iterations=2)
        c[..., 3][holes] = 0
    return Image.fromarray(c, "RGBA")


def largest_part(rgba):
    """The piece without stray traces beside it."""
    c = np.asarray(rgba).copy()
    lab, n = ndi.label(c[..., 3] > 24, structure=np.ones((3, 3)))
    if n > 1:
        area = ndi.sum(np.ones(lab.shape), lab, np.arange(1, n + 1))
        main = ndi.binary_dilation(lab == (np.argmax(area) + 1), iterations=3)
        c[..., 3][~main] = 0
    im = Image.fromarray(c, "RGBA")
    box = im.getbbox()
    return im.crop(box) if box else im


def build(it, maker, sess):
    """Cuts out and exports one piece; returns its catalog entry, or None."""
    src = download(it)
    if not src:
        print("DOWNLOAD FAILED", it["id"], flush=True)
        return None
    cut_path = os.path.join(CUT, f"{it['id']}.png")
    if not os.path.exists(cut_path):
        img = Image.open(src).convert("RGB")
        if it["id"] in CROP:
            l, t, r, b = CROP[it["id"]]
            img = img.crop((round(l * img.width), round(t * img.height), round(r * img.width), round(b * img.height)))
        img.thumbnail((2200, 2200), Image.Resampling.LANCZOS)
        tmp = os.path.join(CUT, f"{it['id']}.src.jpg")
        img.save(tmp, quality=95)
        ok = (cut_strung if it["id"] in STRUNG else cutout.process)(sess(), tmp, cut_path)
        os.remove(tmp)
        if not ok:
            print("EMPTY CUTOUT", it["id"], flush=True)
            return None
    rgba = Image.open(cut_path).convert("RGBA")
    cat = it["category"]
    if it["id"] in LIGHTS_IN_OPENINGS:
        rgba = clear_lights(rgba, LIGHTS_IN_OPENINGS[it["id"]])
    if it["id"] in LARGEST_ONLY:
        rgba = largest_part(rgba)
    if cat in ("helmet", "armor"):
        rgba = catalog.strip_stand(rgba)
    if cat == "helmet":
        rgba = catalog.strip_pole(rgba)
    rot = ROTATE.get(it["id"]) or (0 if it["id"] in NO_ROTATE else catalog.orientation(rgba, cat))
    if rot:
        rgba = rgba.rotate(-rot, expand=True, resample=Image.Resampling.BICUBIC)
        box = rgba.getbbox()
        if box:
            rgba = rgba.crop(box)
    slug = it["id"]
    full = rgba.copy()
    full.thumbnail((1400, 1400), Image.Resampling.LANCZOS)
    full.save(os.path.join(PUB, f"{slug}.webp"), "WEBP", quality=85, method=4)
    th = rgba.copy()
    th.thumbnail((440, 440), Image.Resampling.LANCZOS)
    th.save(os.path.join(THUMB, f"{slug}.webp"), "WEBP", quality=80, method=4)
    img = it["image"]
    exact = bool(img.get("exact"))
    item = {
        "id": slug,
        "name": display_name(it),
        "category": cat,
        "era": "Contemporary",
        "origin": origin_of(maker),
        "provenance": "forged",
        "maker": maker["name"],
        "makerId": maker["id"],
        "materials": (it.get("materials") or "Steel").capitalize(),
        "value": int(round(float(it["priceUsd"]))),
        "blurb": it["blurb"],
        "image": f"/items/{slug}.webp",
        "thumb": f"/items/thumb/{slug}.webp",
        "aspect": round(full.width / full.height, 4),
        "credit": f"{'Photo' if exact else 'Example photo'}: {img['author']}, {img['license']}",
        "sourceUrl": img["page"],
        "photoExact": exact,
        "priceSource": it["priceSource"],
        "resale": maker.get("resale") or "low",
    }
    if it.get("length"):
        item["length"] = it["length"]
    if it.get("weight"):
        item["weight"] = it["weight"]
    print(f"{rot:>8} {item['aspect']:>6} ${item['value']:>6} {slug}", flush=True)
    return item


def maker_entry(m):
    return {k: m.get(k) for k in ("id", "name", "country", "city", "founded", "specialty", "priceRange", "reputation", "resale", "website")}


def main():
    args = sys.argv[1:]
    only = None
    if "--only" in args:
        k = args.index("--only")
        only = {i for i in args[k + 1].split(",") if i}
        del args[k:k + 2]
    model = args[0]
    research = args[1] if len(args) > 1 else os.path.join(ROOT, "research", "modern-makers.json")
    data = json.load(io.open(research, encoding="utf-8"))
    makers = {m["id"]: m for m in data["makers"]}
    for d in (ORIG, CUT, PUB, THUMB):
        os.makedirs(d, exist_ok=True)
    session = []

    def sess():
        if not session:
            session.append(cutout.load_session(model))
        return session[0]

    if only is not None:
        missing = only - {it["id"] for it in data["items"]}
        if missing:
            print("NOT IN RESEARCH", sorted(missing), flush=True)
    items = []
    for it in data["items"]:
        if it["id"] in SKIP or (only is not None and it["id"] not in only):
            continue
        item = build(it, makers[it["makerId"]], sess)
        if item:
            items.append(item)

    if only is None:
        out_makers = [maker_entry(m) for m in data["makers"]]
    else:
        old = json.load(io.open(OUT_JSON, encoding="utf-8"))
        fresh = {i["id"] for i in items}
        merged = [i for i in old["items"] if i["id"] not in fresh and i["id"] not in SKIP] + items
        # A piece that leaves the catalog keeps a short record, so vaults that hold it still show
        # it; its images go.
        catalog.archive_retired(merged, old=old["items"])
        for gone in {i["id"] for i in old["items"]} - {i["id"] for i in merged}:
            for path in (os.path.join(PUB, f"{gone}.webp"), os.path.join(THUMB, f"{gone}.webp")):
                if os.path.exists(path):
                    os.remove(path)
            print("retired", gone, flush=True)
        items = merged
        used = {i["makerId"] for i in items}
        known = {m["id"] for m in old["makers"]}
        out_makers = [m for m in old["makers"] if m["id"] in used] + [maker_entry(m) for m in data["makers"] if m["id"] in used and m["id"] not in known]
    items.sort(key=lambda i: i["value"])
    out = {"makers": out_makers, "items": items}
    with io.open(OUT_JSON, "w", encoding="utf-8", newline="\n") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print("modern items", len(items))


if __name__ == "__main__":
    main()
