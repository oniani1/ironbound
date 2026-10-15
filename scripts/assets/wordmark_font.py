"""Build the wordmark's capital I as a one-letter font.

Usage: python scripts/assets/wordmark_font.py

Grenze Gotisch's capital I is a closed form, a heavy stem and a hairline joined top and
bottom, and in "Ironbound" it reads as a D (the founder, fourth review). This takes the face's
own capital stem (the left stem of its H: 137 units, the flag at the top left, the foot at the
bottom right), adds a serif on the other side of each end so it reads as a capital I, and
writes a font that holds only that letter. CSS loads it for U+0049 alone and sends every other
letter to Grenze Gotisch, so the I is rendered as text, at the face's weight, like its
neighbours.

Grenze Gotisch is licensed under the SIL Open Font License 1.1 with no reserved font name; the
derived font keeps its copyright and license and is renamed Ironbound Gothic.
"""
import os

from fontTools import subset
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.join(ROOT, "node_modules", "@fontsource", "grenze-gotisch", "files", "grenze-gotisch-latin-700-normal.woff2")
LICENSE = os.path.join(ROOT, "node_modules", "@fontsource", "grenze-gotisch", "LICENSE")
OUT_DIR = os.path.join(ROOT, "src", "assets", "fonts")
OUT = os.path.join(OUT_DIR, "ironbound-gothic-i.woff2")

FAMILY = "Ironbound Gothic"


def draw_i(pen):
    # The H's left stem, as drawn by the face: flag, top edge, stem, foot, bottom edge.
    pen.moveTo((82, 530))
    pen.lineTo((27, 550))
    pen.lineTo((27, 605))
    pen.qCurveTo((44, 607), (91, 612), (138, 617), (173, 620), (178, 619))
    # A serif to the right at the top, cut at the pen's angle.
    pen.lineTo((250, 622))
    pen.qCurveTo((268, 618), (284, 600))
    pen.lineTo((277, 571))
    pen.lineTo((219, 557))
    pen.lineTo((219, 77))
    pen.lineTo((293, 57))
    pen.lineTo((265, 3))
    pen.qCurveTo((249, 2), (204, -4), (161, -9), (129, -12), (124, -11))
    # And one to the left at the foot.
    pen.lineTo((54, -7))
    pen.qCurveTo((36, -3), (24, 18))
    pen.lineTo((32, 44))
    pen.lineTo((82, 56))
    pen.closePath()


def main():
    font = TTFont(SRC)
    pen = TTGlyphPen(font.getGlyphSet())
    draw_i(pen)
    font["glyf"]["I"] = pen.glyph()
    font["hmtx"]["I"] = (318, 24)
    # Only the I travels.
    opts = subset.Options()
    opts.layout_features = []
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=[0x49])
    sub.subset(font)
    names = font["name"]
    for rec in list(names.names):
        if rec.nameID in (1, 3, 4, 6, 16, 17):
            names.removeNames(nameID=rec.nameID)
    names.setName(FAMILY, 1, 3, 1, 0x409)
    names.setName("Ironbound Gothic Bold: the wordmark's capital I", 3, 3, 1, 0x409)
    names.setName(f"{FAMILY} Bold", 4, 3, 1, 0x409)
    names.setName("IronboundGothic-Bold", 6, 3, 1, 0x409)
    names.setName("Derived from Grenze Gotisch Bold for the Ironbound wordmark: a drawn capital I.", 10, 3, 1, 0x409)
    os.makedirs(OUT_DIR, exist_ok=True)
    font.flavor = "woff2"
    font.save(OUT)
    with open(LICENSE, encoding="utf-8") as src, open(os.path.join(OUT_DIR, "OFL.txt"), "w", encoding="utf-8", newline="\n") as dst:
        dst.write("ironbound-gothic-i.woff2 is a Modified Version of Grenze Gotisch Bold, renamed Ironbound Gothic:\n")
        dst.write("one glyph, the capital I, redrawn from the face's own capital stem. Built by scripts/assets/wordmark_font.py.\n\n")
        dst.write(src.read())
    print(OUT, os.path.getsize(OUT), "bytes")


if __name__ == "__main__":
    main()
