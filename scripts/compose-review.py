"""Compose review screenshots into a few labeled contact sheets for the Codex reviewer.

Usage: python scripts/compose-review.py .playwright-mcp/review <out_dir>
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

GROUPS = {
    "A-landing": ["01", "02", "03", "04"],
    "B-first-chest": ["05", "06", "07", "08", "09", "10", "11"],
    "C-opening": ["12", "13", "14", "15", "16", "17", "18", "19", "20"],
    "D-batch": ["21", "22", "23", "24"],
    "E-vault": ["25", "26"],
}


def main():
    src, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    try:
        font = ImageFont.truetype("arial.ttf", 18)
    except Exception:  # noqa: BLE001
        font = ImageFont.load_default()
    files = sorted(f for f in os.listdir(src) if f.endswith(".png"))
    made = []
    for tag, tw in (("d", 720), ("m", 300)):
        for name, nums in GROUPS.items():
            picks = [f for f in files if f.startswith(f"{tag}-") and f.split("-")[1] in nums]
            if not picks:
                continue
            ims = [Image.open(os.path.join(src, f)).convert("RGB") for f in picks]
            tiles = [im.resize((tw, int(im.height * tw / im.width))) for im in ims]
            cols = 2 if tag == "d" else 4
            th = max(t.height for t in tiles) + 30
            rows = (len(tiles) + cols - 1) // cols
            sheet = Image.new("RGB", (cols * (tw + 12), rows * th), (60, 60, 60))
            d = ImageDraw.Draw(sheet)
            for i, (t, f) in enumerate(zip(tiles, picks)):
                x, y = (i % cols) * (tw + 12), (i // cols) * th
                sheet.paste(t, (x, y + 28))
                d.text((x + 6, y + 4), f.replace(".png", ""), fill=(255, 230, 160), font=font)
            path = os.path.join(out, f"{'desktop' if tag == 'd' else 'phone'}-{name}.jpg")
            sheet.save(path, quality=80)
            made.append(path)
    print("\n".join(made))


if __name__ == "__main__":
    main()
