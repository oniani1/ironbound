"""Score harvested photos for clean studio backgrounds and build labeled contact sheets.

Usage: python contact_sheets.py <out_dir>
Writes <out_dir>/candidates.json and sheet_<category>_<n>.jpg files.
"""
import io
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MET = os.path.join(ROOT, "assets-src", "met")

CATS = {
    "sword": ["sword", "saber", "sabre", "rapier", "katana", "tachi", "wakizashi", "falchion", "shamshir", "kilij", "backsword", "broadsword", "hanger", "smallsword", "small-sword", "estoc", "talwar", "spatha", "scimitar"],
    "dagger": ["dagger", "knife", "tanto", "stiletto", "kris", "dirk", "khanjar", "jambiya", "poniard", "baselard", "main-gauche", "kard", "seax"],
    "polearm": ["halberd", "glaive", "partisan", "spear", "pike", "pollaxe", "poleaxe", "bill", "ranseur", "naginata", "yari", "guisarme", "lance", "fork"],
    "axe": ["axe", "mace", "hammer", "flail", "club", "war hammer"],
    "helmet": ["helmet", "sallet", "armet", "burgonet", "morion", "bascinet", "helm", "kabuto", "cabasset", "close helmet", "barbute", "zischagge", "spangenhelm", "khula khud"],
    "shield": ["shield", "buckler", "targe", "pavise", "rondache", "dhal"],
    "armor": ["armor", "armour", "breastplate", "cuirass", "gauntlet", "vambrace", "pauldron", "gorget", "mail", "cuisse", "greave", "tasset", "brigandine", "harness", "haubergeon"],
    "fitting": ["tsuba", "spur", "stirrup", "arrowhead", "arrow", "bolt", "kozuka", "menuki", "fuchi", "kashira", "pommel", "crossbow", "bit"],
}


def category(o):
    name = f"{o.get('objectName') or ''} {o.get('title') or ''}".lower()
    for cat, words in CATS.items():
        for w in words:
            if w in name:
                return cat
    return None


def border_score(img):
    a = np.asarray(img.convert("L").resize((200, 200))).astype(np.float32)
    b = np.concatenate([a[:6].ravel(), a[-6:].ravel(), a[:, :6].ravel(), a[:, -6:].ravel()])
    return float(b.std()), float(b.mean())


def main():
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    objs = json.load(io.open(os.path.join(MET, "objects.json"), encoding="utf-8"))
    cands = []
    for o in objs:
        p = os.path.join(MET, "img", f"{o['objectID']}.jpg")
        if not os.path.exists(p):
            continue
        cat = category(o)
        if not cat:
            continue
        try:
            img = Image.open(p)
            img.load()
        except Exception:  # noqa: BLE001
            continue
        std, mean = border_score(img)
        o2 = {k: o.get(k) for k in ("objectID", "title", "objectName", "culture", "objectDate", "medium", "dimensions", "artistDisplayName", "primaryImage", "objectURL", "creditLine", "accessionNumber")}
        o2.update(category=cat, bstd=round(std, 1), bmean=round(mean, 1), w=img.width, h=img.height)
        cands.append(o2)
    clean = [c for c in cands if c["bstd"] < 14]
    print("candidates", len(cands), "clean", len(clean))
    json.dump(clean, io.open(os.path.join(out, "candidates.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    try:
        font = ImageFont.truetype("arial.ttf", 13)
    except Exception:  # noqa: BLE001
        font = ImageFont.load_default()
    tile, cols, rows = 220, 6, 5
    for cat in CATS:
        group = [c for c in clean if c["category"] == cat]
        for n in range(0, len(group), cols * rows):
            chunk = group[n:n + cols * rows]
            sheet = Image.new("RGB", (cols * tile, rows * (tile + 34)), (24, 20, 17))
            d = ImageDraw.Draw(sheet)
            for i, c in enumerate(chunk):
                im = Image.open(os.path.join(MET, "img", f"{c['objectID']}.jpg")).convert("RGB")
                im.thumbnail((tile - 10, tile - 10))
                x, y = (i % cols) * tile, (i // cols) * (tile + 34)
                sheet.paste(im, (x + (tile - im.width) // 2, y + (tile - im.height) // 2))
                label = f"{c['objectID']} {str(c['objectName'])[:18]}"
                d.text((x + 6, y + tile + 2), label, fill=(240, 220, 180), font=font)
                d.text((x + 6, y + tile + 17), f"{str(c['culture'])[:16]} {str(c['objectDate'])[:12]}", fill=(170, 160, 140), font=font)
            sheet.save(os.path.join(out, f"sheet_{cat}_{n // (cols * rows)}.jpg"), quality=82)
    for cat in CATS:
        print(cat, sum(1 for c in clean if c["category"] == cat))


if __name__ == "__main__":
    main()
