"""Cut museum photos out of their studio backgrounds with ISNet (onnxruntime).

Usage: python cutout.py <model.onnx> <src_dir> <out_dir> [id ...]

For every <id>.jpg in src_dir (or only the ids given) writes <out_dir>/<id>.png:
an RGBA image cropped to the object, with edge colors decontaminated from the
estimated background color so items sit cleanly on dark UI without halos.
"""
import os
import sys

import numpy as np
import onnxruntime as ort
from PIL import Image

SIZE = (1024, 1024)
MEAN = (0.485, 0.456, 0.406)


def load_session(model):
    so = ort.SessionOptions()
    so.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    return ort.InferenceSession(model, so, providers=["CPUExecutionProvider"])


def predict_mask(sess, img):
    im = img.convert("RGB").resize(SIZE, Image.Resampling.LANCZOS)
    a = np.asarray(im).astype(np.float32)
    a = a / max(a.max(), 1.0)
    a = (a - np.array(MEAN, dtype=np.float32)) / 1.0
    a = a.transpose(2, 0, 1)[None]
    out = sess.run(None, {sess.get_inputs()[0].name: a})[0][:, 0]
    out = (out - out.min()) / max(out.max() - out.min(), 1e-6)
    m = Image.fromarray((np.squeeze(out) * 255).astype(np.uint8), mode="L")
    return m.resize(img.size, Image.Resampling.LANCZOS)


def background_color(rgb):
    h, w, _ = rgb.shape
    b = max(4, min(h, w) // 40)
    border = np.concatenate([rgb[:b].reshape(-1, 3), rgb[-b:].reshape(-1, 3),
                             rgb[:, :b].reshape(-1, 3), rgb[:, -b:].reshape(-1, 3)])
    return np.median(border, axis=0)


def refine(rgb, alpha):
    # Steepen the soft matte so faint background haze drops out, keep edges smooth.
    a = np.clip((alpha - 0.06) / 0.88, 0.0, 1.0)
    bg = background_color(rgb)
    a3 = a[..., None]
    safe = np.maximum(a3, 0.08)
    fg = (rgb - (1.0 - a3) * bg) / safe
    fg = np.clip(fg, 0, 255)
    # Only decontaminate partially transparent pixels; leave solid pixels untouched.
    mix = np.clip((1.0 - a3) * 3.0, 0.0, 1.0)
    out_rgb = rgb * (1 - mix) + fg * mix
    return out_rgb, a


def crop_box(alpha, pad=0.04):
    ys, xs = np.where(alpha > 0.05)
    if len(xs) == 0:
        return None
    h, w = alpha.shape
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    p = int(max(x1 - x0, y1 - y0) * pad)
    return max(0, x0 - p), max(0, y0 - p), min(w, x1 + p + 1), min(h, y1 + p + 1)


def process(sess, src, dst):
    img = Image.open(src).convert("RGB")
    mask = predict_mask(sess, img)
    rgb = np.asarray(img).astype(np.float32)
    alpha = np.asarray(mask).astype(np.float32) / 255.0
    out_rgb, a = refine(rgb, alpha)
    box = crop_box(a)
    if box is None:
        return False
    rgba = np.dstack([out_rgb, a * 255.0]).astype(np.uint8)
    Image.fromarray(rgba, mode="RGBA").crop(box).save(dst)
    return True


def main():
    model, src_dir, out_dir = sys.argv[1:4]
    ids = sys.argv[4:]
    os.makedirs(out_dir, exist_ok=True)
    sess = load_session(model)
    files = [f"{i}.jpg" for i in ids] if ids else sorted(f for f in os.listdir(src_dir) if f.endswith(".jpg"))
    for n, f in enumerate(files):
        src = os.path.join(src_dir, f)
        dst = os.path.join(out_dir, f.replace(".jpg", ".png"))
        if not os.path.exists(src) or os.path.exists(dst):
            continue
        ok = process(sess, src, dst)
        print(n, f, "ok" if ok else "EMPTY", flush=True)


if __name__ == "__main__":
    main()
