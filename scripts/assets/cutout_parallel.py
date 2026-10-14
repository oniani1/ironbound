"""Run ISNet cutouts for catalog entries in parallel worker processes.

Usage: python cutout_parallel.py <model.onnx> [workers]
"""
import os
import sys
from multiprocessing import Pool

from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
import catalog  # noqa: E402
import cutout  # noqa: E402

_sess = None


def init(model):
    global _sess
    import onnxruntime as ort
    so = ort.SessionOptions()
    so.intra_op_num_threads = 2
    _sess = ort.InferenceSession(model, so, providers=["CPUExecutionProvider"])


def work(oid):
    src = os.path.join(catalog.ORIG, f"{oid}.jpg")
    dst = os.path.join(catalog.CUT, f"{oid}.png")
    if os.path.exists(dst) or not os.path.exists(src):
        return oid, "skip"
    img = Image.open(src).convert("RGB")
    img.thumbnail((2200, 2200), Image.Resampling.LANCZOS)
    tmp = os.path.join(catalog.CUT, f"{oid}.src.jpg")
    img.save(tmp, quality=95)
    ok = cutout.process(_sess, tmp, dst)
    os.remove(tmp)
    return oid, "ok" if ok else "EMPTY"


if __name__ == "__main__":
    model = sys.argv[1]
    workers = int(sys.argv[2]) if len(sys.argv) > 2 else 3
    os.makedirs(catalog.CUT, exist_ok=True)
    ids = [e[0] for e in catalog.E]
    with Pool(workers, initializer=init, initargs=(model,)) as pool:
        for n, (oid, status) in enumerate(pool.imap_unordered(work, ids)):
            print(n, oid, status, flush=True)
