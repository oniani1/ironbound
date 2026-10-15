"""Cut the openings of tsuba back out of their photographs.

The cut-out model removes the backdrop around a piece but not inside its openings, so a sword
guard's central hole and side holes kept the grey studio backdrop. Each opening is named here by a
seed point (fractions of the image width and height, from the top left); the backdrop around the
seed is grown out to the metal and made transparent, with a soft rim like the outline's.

A seed must land on smooth, light, neutral backdrop or it is skipped with a warning, so a wrong
seed can never eat into the metal.

Usage: python scripts/assets/openings.py [--review out.png]
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

ROOT = os.path.join(os.path.dirname(__file__), "..", "..")

SEEDS = {
    "iron-tsuba-30094": [(0.50, 0.45), (0.49, 0.61), (0.47, 0.53), (0.705, 0.496)],
    "openwork-iron-tsuba-26295": [(0.32, 0.484), (0.683, 0.169), (0.679, 0.277), (0.834, 0.422), (0.721, 0.407), (0.50, 0.50)],
    "tsuba-sage-in-the-waves-34470": [(0.50, 0.531), (0.304, 0.494)],
    "tsuba-with-golden-grapes-30089": [(0.503, 0.518), (0.308, 0.499)],
    "enamel-tsuba-24711": [(0.241, 0.497), (0.501, 0.137)],
    "tsuba-with-herons-30090": [(0.283, 0.49), (0.496, 0.536), (0.496, 0.45)],
    # Only the two openings: the mother-of-pearl petals are smooth and pale too.
    "mother-of-pearl-tsuba-34385": [(0.501, 0.535), (0.281, 0.501), (0.27, 0.46), (0.29, 0.55)],
}


def measures(rgba):
    rgb = rgba[..., :3].astype(np.float32)
    lum = rgb.mean(axis=2)
    chroma = rgb.max(axis=2) - rgb.min(axis=2)
    mean = ndi.uniform_filter(lum, 9)
    sq = ndi.uniform_filter(lum * lum, 9)
    rough = np.sqrt(np.maximum(sq - mean * mean, 0))
    # The plate's edge is a sharp step; the backdrop, even in the plate's shadow, changes slowly.
    soft = ndi.gaussian_filter(lum, 1.0)
    edge = np.hypot(ndi.sobel(soft, 0), ndi.sobel(soft, 1)) / 8
    return lum, chroma, rough, edge


def opening_mask(rgba, seeds):
    """The backdrop grown from each seed, and the soft rim around it."""
    alpha = rgba[..., 3]
    # Some openings came out half transparent: still backdrop, still to go.
    present = alpha > 30
    lum, chroma, rough, edge = measures(rgba)
    h, w = alpha.shape
    keep = np.zeros((h, w), bool)
    for fx, fy in seeds:
        x, y = int(fx * w), int(fy * h)
        patch = (slice(max(0, y - 4), y + 5), slice(max(0, x - 4), x + 5))
        l0, c0, r0 = float(np.median(lum[patch])), float(np.median(chroma[patch])), float(np.median(rough[patch]))
        if not (present[y, x] and r0 < 6 and l0 > 105 and c0 < 32):
            print(f"  skip seed ({fx}, {fy}): not backdrop (L {l0:.0f}, chroma {c0:.0f}, rough {r0:.1f})")
            continue
        # Grow while the backdrop stays smooth and paler than iron; stop at the plate's sharp edge.
        similar = present & (lum > 95) & (chroma < max(36, c0 + 14)) & (rough < 10) & (edge < 7)
        lab, _ = ndi.label(similar)
        if lab[y, x]:
            keep |= lab == lab[y, x]
    keep = ndi.binary_closing(keep, iterations=2) & present
    # The pale border where backdrop and metal blend, never the dark iron or the gold.
    rim = ndi.binary_dilation(keep, iterations=4) & present & ~keep & (lum > 85) & (chroma < 42)
    return keep, rim


def cut(path, keep, rim):
    im = Image.open(path).convert("RGBA")
    arr = np.asarray(im).copy()
    if keep.shape != arr.shape[:2]:
        keep = np.asarray(Image.fromarray(keep.astype(np.uint8) * 255).resize(im.size, Image.BILINEAR)) > 127
        rim = np.asarray(Image.fromarray(rim.astype(np.uint8) * 255).resize(im.size, Image.BILINEAR)) > 127
    alpha = arr[..., 3].astype(np.float32)
    # The rim keeps a little of its cover but takes the colour of the nearest solid metal, so the
    # opening ends in a soft edge of the plate, not a pale line of backdrop.
    solid = (alpha > 200) & ~keep & ~rim
    _, (iy, ix) = ndi.distance_transform_edt(~solid, return_indices=True)
    arr[rim, :3] = arr[iy[rim], ix[rim], :3]
    alpha[keep] = 0
    alpha[rim] *= 0.35
    soft = ndi.gaussian_filter(alpha, 0.7)
    touched = ndi.binary_dilation(keep | rim, iterations=1)
    arr[..., 3] = np.where(touched, soft, arr[..., 3]).clip(0, 255).astype(np.uint8)
    arr[keep, :3] = 0
    Image.fromarray(arr).save(path, "WEBP", quality=90, method=6)


def main():
    review = sys.argv[2] if len(sys.argv) > 2 and sys.argv[1] == "--review" else None
    tiles = []
    for slug, seeds in SEEDS.items():
        full = os.path.join(ROOT, "public", "items", f"{slug}.webp")
        rgba = np.asarray(Image.open(full).convert("RGBA"))
        print(slug)
        keep, rim = opening_mask(rgba, seeds)
        share = 100 * keep.sum() / max(1, (rgba[..., 3] > 30).sum())
        print(f"  openings {share:.1f}% of the piece")
        if review:
            base = Image.open(full).convert("RGBA")
            bg = Image.new("RGBA", base.size, (20, 60, 30, 255))
            bg.alpha_composite(base)
            ov = np.asarray(bg).copy()
            ov[keep] = (ov[keep] * 0.3 + np.array([255, 0, 0, 255]) * 0.7).astype(np.uint8)
            ov[rim] = (ov[rim] * 0.4 + np.array([255, 200, 0, 255]) * 0.6).astype(np.uint8)
            t = Image.fromarray(ov).convert("RGB")
            t.thumbnail((420, 420))
            canvas = Image.new("RGB", (420, 440), (40, 40, 40))
            canvas.paste(t, (0, 20))
            ImageDraw.Draw(canvas).text((4, 2), slug, fill=(255, 255, 255))
            tiles.append(canvas)
            continue
        cut(full, keep, rim)
        thumb = os.path.join(ROOT, "public", "items", "thumb", f"{slug}.webp")
        if os.path.exists(thumb):
            cut(thumb, keep, rim)
    if review and tiles:
        cols = 4
        rows = (len(tiles) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * 424, rows * 444), (0, 0, 0))
        for i, t in enumerate(tiles):
            sheet.paste(t, ((i % cols) * 424, (i // cols) * 444))
        sheet.save(review)


if __name__ == "__main__":
    main()
