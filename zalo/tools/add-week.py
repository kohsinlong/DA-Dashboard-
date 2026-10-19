#!/usr/bin/env python3
"""Add (or refresh) one week of training decks on the dashboard's Resources page.

    python3 zalo/tools/add-week.py 2026-10-14 --vi Deck_VN.pptx --en Deck_EN.pptx --zh Deck_CN.pptx [--title "MSG DA Training"]

For each deck: converts it to PDF with LibreOffice, renders every page as a JPEG 1600 px wide
into zalo/resources/<date>/<lang>/NN.jpg, copies the .pptx next to them as <lang>.pptx (the
original file name is kept for the download button), and updates zalo/resources/manifest.json,
which the page reads. A deck given as a .pdf skips LibreOffice. Run again with the same date to
replace a week; commit zalo/resources afterwards.

Needs: LibreOffice (soffice on PATH, or --soffice "<command>") and Poppler's pdftoppm.
"""
import argparse, hashlib, json, os, re, shlex, shutil, subprocess, sys, tempfile
from pathlib import Path

LANGS = ["vi", "en", "zh"]

def sha8(p):
    h = hashlib.sha1()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()[:8]

def to_pdf(src, outdir, soffice):
    if src.suffix.lower() == ".pdf":
        return src
    env = dict(os.environ, SAL_USE_VCLPLUGIN="svp")
    profile = Path(tempfile.mkdtemp(prefix="lo-profile-"))
    cmd = shlex.split(soffice) + ["-env:UserInstallation=" + profile.as_uri(), "--headless", "--convert-to", "pdf", "--outdir", str(outdir), str(src)]
    subprocess.run(cmd, env=env, check=True, timeout=600, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    pdf = outdir / (src.stem + ".pdf")
    if not pdf.exists():
        sys.exit("LibreOffice produced no PDF for " + str(src))
    return pdf

def render(pdf, outdir, width, quality):
    for old in outdir.glob("*.jpg"):
        old.unlink()
    outdir.mkdir(parents=True, exist_ok=True)
    tmp = Path(tempfile.mkdtemp(prefix="slides-"))
    subprocess.run(["pdftoppm", "-jpeg", "-jpegopt", "quality=%d" % quality, "-scale-to-x", str(width), "-scale-to-y", "-1", str(pdf), str(tmp / "s")], check=True, stderr=subprocess.DEVNULL)
    pages = sorted(tmp.glob("s-*.jpg"), key=lambda p: int(re.search(r"-(\d+)\.jpg$", p.name).group(1)))
    for i, p in enumerate(pages, 1):
        shutil.move(str(p), str(outdir / ("%02d.jpg" % i)))
    shutil.rmtree(tmp, ignore_errors=True)
    size = None
    try:
        from PIL import Image
        with Image.open(outdir / "01.jpg") as im:
            size = im.size
    except Exception:
        pass
    return len(pages), size

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("date", help="the week's date, YYYY-MM-DD (also the folder name)")
    for l in LANGS:
        ap.add_argument("--" + l, help="deck in this language (.pptx or .pdf)")
    ap.add_argument("--title", default="", help="shown under the week heading")
    ap.add_argument("--root", default=str(Path(__file__).resolve().parent.parent / "resources"), help="resources folder (default: zalo/resources)")
    ap.add_argument("--soffice", default="soffice", help='LibreOffice command (default "soffice")')
    ap.add_argument("--width", type=int, default=1600)
    ap.add_argument("--quality", type=int, default=82)
    a = ap.parse_args()
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", a.date):
        sys.exit("date must be YYYY-MM-DD")
    decks = {l: Path(getattr(a, l)) for l in LANGS if getattr(a, l)}
    if not decks:
        sys.exit("give at least one deck: --vi, --en or --zh")
    root = Path(a.root); week = root / a.date; week.mkdir(parents=True, exist_ok=True)
    manifest_path = root / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {"weeks": []}
    entry = {"date": a.date, "title": a.title, "decks": {}}
    for l, src in decks.items():
        if not src.exists():
            sys.exit("missing " + str(src))
        work = Path(tempfile.mkdtemp(prefix="week-"))
        pdf = to_pdf(src, work, a.soffice)
        n, size = render(pdf, week / l, a.width, a.quality)
        d = {"slides": n, "w": size[0] if size else a.width, "h": size[1] if size else round(a.width * 9 / 16)}
        if src.suffix.lower() == ".pptx":
            shutil.copyfile(src, week / (l + ".pptx")); d["file"] = l + ".pptx"; d["name"] = src.name; d["rev"] = sha8(src)
        else:
            shutil.copyfile(src, week / (l + ".pdf")); d["file"] = l + ".pdf"; d["name"] = src.name; d["rev"] = sha8(src)
        shutil.rmtree(work, ignore_errors=True)
        entry["decks"][l] = d
        print("%s %s: %d slides, %s" % (a.date, l, n, d["name"]))
    manifest["weeks"] = [w for w in manifest.get("weeks", []) if w.get("date") != a.date] + [entry]
    manifest["weeks"].sort(key=lambda w: w["date"])
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print("manifest: %d weeks" % len(manifest["weeks"]))

if __name__ == "__main__":
    main()
