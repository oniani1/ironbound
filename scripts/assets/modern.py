"""Build the modern half of the Ironbound catalog: new pieces from working makers.

Usage: python modern.py <isnet.onnx> [research/modern-makers.json]

Reads the maker research (real makers, models, retail prices and freely licensed photos),
downloads each photo, cuts it out with ISNet, stands long pieces upright, exports
public/items/<id>.webp and public/items/thumb/<id>.webp, and writes src/data/modern.json.
Most photos are examples of the type rather than the exact model; the catalog says so.
"""
import io
import json
import os
import sys
import time
import urllib.request

from PIL import Image

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
}

# Pieces that look right as photographed (loose heads, round shields, crossbows).
NO_ROTATE = {"windlass-european-spear-head"}

# Photographed on a diagonal: degrees (CSS, clockwise) that stand the piece upright.
ROTATE = {"regenyei-standard-feder": -45}

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
}


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


def origin_of(maker):
    city, country = maker.get("city"), maker.get("country") or ""
    country = {"United States": "USA", "United Kingdom": "England"}.get(country, country)
    return f"{city}, {country}" if city else country


def main():
    model = sys.argv[1]
    research = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, "research", "modern-makers.json")
    data = json.load(io.open(research, encoding="utf-8"))
    makers = {m["id"]: m for m in data["makers"]}
    for d in (ORIG, CUT, PUB, THUMB):
        os.makedirs(d, exist_ok=True)
    sess = cutout.load_session(model)
    items = []
    for it in data["items"]:
        if it["id"] in SKIP:
            continue
        src = download(it)
        if not src:
            print("DOWNLOAD FAILED", it["id"], flush=True)
            continue
        cut_path = os.path.join(CUT, f"{it['id']}.png")
        if not os.path.exists(cut_path):
            img = Image.open(src).convert("RGB")
            img.thumbnail((2200, 2200), Image.Resampling.LANCZOS)
            tmp = os.path.join(CUT, f"{it['id']}.src.jpg")
            img.save(tmp, quality=95)
            ok = cutout.process(sess, tmp, cut_path)
            os.remove(tmp)
            if not ok:
                print("EMPTY CUTOUT", it["id"], flush=True)
                continue
        rgba = Image.open(cut_path).convert("RGBA")
        cat = it["category"]
        if cat in ("helmet", "armor"):
            rgba = catalog.strip_stand(rgba)
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
        maker = makers[it["makerId"]]
        img = it["image"]
        exact = bool(img.get("exact"))
        item = {
            "id": slug,
            "name": display_name(it),
            "category": cat,
            "era": "New",
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
        items.append(item)
        print(f"{rot:>4} {item['aspect']:>6} ${item['value']:>6} {slug}", flush=True)

    items.sort(key=lambda i: i["value"])
    out = {
        "makers": [
            {k: m.get(k) for k in ("id", "name", "country", "city", "founded", "specialty", "priceRange", "reputation", "resale", "website")}
            for m in data["makers"]
        ],
        "items": items,
    }
    with io.open(OUT_JSON, "w", encoding="utf-8", newline="\n") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print("modern items", len(items))


if __name__ == "__main__":
    main()
