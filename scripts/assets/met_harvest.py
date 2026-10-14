"""Harvest public-domain arms and armor objects from The Met Open Access API.

Resumable and gentle: every object response is cached in assets-src/met/json,
and requests run on a single worker with a pause, because the API blocks bursts.
Writes assets-src/met/objects.json and web-large images to assets-src/met/img.
"""
import io
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "assets-src", "met")
IMG = os.path.join(OUT, "img")
CACHE = os.path.join(OUT, "json")
API = "https://collectionapi.metmuseum.org/public/collection"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ironbound-mock-asset-harvest/1.1"
PAUSE = float(os.environ.get("MET_PAUSE", "0.6"))

QUERIES = [
    "sword", "two-handed sword", "arming sword", "rapier", "saber", "falchion",
    "katana", "tachi", "wakizashi", "tanto", "dagger", "rondel dagger", "stiletto",
    "helmet", "sallet", "armet", "close helmet", "burgonet", "morion", "bascinet",
    "kabuto", "shield", "buckler", "spear", "halberd", "glaive", "partisan", "pollaxe",
    "axe", "mace", "war hammer", "armor", "gauntlet", "breastplate", "crossbow",
    "arrowhead", "tsuba", "spur", "shamshir", "kris", "Viking",
]
PER_QUERY = int(os.environ.get("MET_PER_QUERY", "24"))
KEEP = (
    "objectID", "title", "objectName", "culture", "period", "objectDate", "objectBeginDate",
    "medium", "dimensions", "artistDisplayName", "artistDisplayBio", "creditLine",
    "accessionNumber", "primaryImage", "primaryImageSmall", "additionalImages",
    "objectURL", "classification", "isHighlight", "isPublicDomain",
)


class Blocked(Exception):
    pass


def fetch(url, binary=False):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for i in range(5):
        try:
            with urllib.request.urlopen(req, timeout=40) as r:
                data = r.read()
                return data if binary else json.loads(data.decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            if e.code in (403, 429):
                wait = 30 * (i + 1)
                print(f"  {e.code} on {url}; backing off {wait}s", flush=True)
                time.sleep(wait)
                continue
            time.sleep(2 * (i + 1))
        except Exception:  # noqa: BLE001
            time.sleep(2 * (i + 1))
    raise Blocked(url)


def main():
    os.makedirs(IMG, exist_ok=True)
    os.makedirs(CACHE, exist_ok=True)
    ids_path = os.path.join(OUT, "ids.json")
    ids = json.load(io.open(ids_path, encoding="utf-8")) if os.path.exists(ids_path) else {}
    if not ids:
        for q in QUERIES:
            qs = urllib.parse.urlencode({
                "departmentId": 4, "hasImages": "true", "isPublicDomain": "true",
                "q": q, "limit": PER_QUERY, "offset": 0,
            })
            res = fetch(f"{API}/v1.1/search?{qs}") or {}
            for oid in res.get("objectIDs") or []:
                ids.setdefault(str(oid), q)
            print(f"{q}: {len(res.get('objectIDs') or [])}", flush=True)
            time.sleep(PAUSE)
        json.dump(ids, io.open(ids_path, "w", encoding="utf-8"))

    objects = []
    try:
        for n, (oid, q) in enumerate(ids.items()):
            cpath = os.path.join(CACHE, f"{oid}.json")
            if os.path.exists(cpath):
                o = json.load(io.open(cpath, encoding="utf-8"))
            else:
                o = fetch(f"{API}/v1/objects/{oid}") or {"objectID": int(oid), "missing": True}
                json.dump(o, io.open(cpath, "w", encoding="utf-8"))
                time.sleep(PAUSE)
            if o.get("missing") or not o.get("isPublicDomain") or not o.get("primaryImageSmall"):
                continue
            keep = {k: o.get(k) for k in KEEP}
            keep["query"] = q
            objects.append(keep)
            ipath = os.path.join(IMG, f"{oid}.jpg")
            if not os.path.exists(ipath):
                url = urllib.parse.quote(o["primaryImageSmall"], safe=":/%")
                try:
                    data = fetch(url, binary=True)
                except Blocked:
                    print("  image failed, skipping", oid, flush=True)
                    data = None
                if data:
                    open(ipath, "wb").write(data)
            if n % 50 == 0:
                print(f"objects {n}/{len(ids)}", flush=True)
    except Blocked as e:
        print("BLOCKED, stopping early:", e, flush=True)

    with io.open(os.path.join(OUT, "objects.json"), "w", encoding="utf-8") as f:
        json.dump(objects, f, ensure_ascii=False, indent=1)
    print("saved", len(objects), flush=True)


if __name__ == "__main__":
    sys.exit(main())
