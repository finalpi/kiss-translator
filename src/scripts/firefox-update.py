"""Validate AMO output and prepare the self-hosted Firefox update feed."""
import hashlib
import json
import os
import re
import shutil
import sys
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[2]


def version_key(value):
    if not re.fullmatch(r"\d+\.\d+\.\d+", value):
        raise ValueError(f"Expected stable x.y.z version: {value}")
    return tuple(map(int, value.split(".")))


def make_feed(xpi, unsigned_dir, repository, tag):
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository):
        raise ValueError("Invalid repository")
    manifest = json.loads((unsigned_dir / "manifest.json").read_text(encoding="utf-8"))
    version = manifest["version"]
    version_key(version)
    if tag != f"v{version}":
        raise ValueError("Tag does not match extension version")
    gecko = manifest["browser_specific_settings"]["gecko"]
    owner, repo = repository.split("/")
    expected_url = f"https://{owner}.github.io/{repo}/firefox-updates.json"
    if gecko.get("update_url") != expected_url:
        raise ValueError("Extension update_url does not match Pages destination")
    with ZipFile(xpi) as archive:
        names = archive.namelist()
        if len(names) != len(set(names)):
            raise ValueError("Duplicate XPI entries")
        # Structural check only: signature authenticity is supplied by AMO and
        # enforced by Firefox, not cryptographically verified by this script.
        if not {"META-INF/mozilla.rsa", "META-INF/mozilla.sf"}.issubset(names):
            raise ValueError("XPI has no Mozilla signature files")
        payload = {n for n in names if not n.endswith("/") and not n.startswith("META-INF/")}
        expected = {p.relative_to(unsigned_dir).as_posix(): p for p in unsigned_dir.rglob("*") if p.is_file()}
        # web-ext omits packaging-only hidden files such as .nojekyll.
        expected = {n: p for n, p in expected.items() if not any(part.startswith(".") for part in Path(n).parts)}
        if payload != set(expected):
            raise ValueError(f"Signed payload file set differs: {payload ^ set(expected)}")
        for name, path in expected.items():
            if archive.read(name) != path.read_bytes():
                raise ValueError(f"Signed payload changed: {name}")
    asset = f"kiss-translator_{tag}_firefox.xpi"
    update = {
        "version": version,
        "update_link": f"https://github.com/{repository}/releases/download/{tag}/{asset}",
        "update_hash": "sha256:" + hashlib.sha256(xpi.read_bytes()).hexdigest(),
        "applications": {"gecko": {k: gecko[k] for k in ("strict_min_version", "strict_max_version") if k in gecko}},
    }
    return asset, {"addons": {gecko["id"]: {"updates": [update]}}}


def check_feed(new, old):
    if set(new["addons"]) != set(old["addons"]):
        raise ValueError("Refusing to replace feed for a different add-on")
    for addon_id, info in old["addons"].items():
        candidate = new["addons"][addon_id]["updates"][0]
        for previous in info["updates"]:
            if version_key(previous["version"]) > version_key(candidate["version"]):
                raise ValueError("Refusing to publish an older Firefox version")
            if previous["version"] == candidate["version"] and previous != candidate:
                raise ValueError("Refusing to replace an existing version with different content")


def main():
    if sys.argv[1:] and sys.argv[1] == "check-feed":
        check_feed(*(json.loads(Path(p).read_text(encoding="utf-8")) for p in sys.argv[2:4]))
        return
    if sys.argv[1:] != ["prepare"]:
        raise ValueError("Usage: firefox-update.py prepare | check-feed NEW OLD")
    files = list((ROOT / "build/signed").glob("*.xpi"))
    if len(files) != 1:
        raise ValueError("Expected exactly one signed XPI; approval may still be pending")
    asset, feed = make_feed(files[0], ROOT / "build/firefox", os.environ["GITHUB_REPOSITORY"], os.environ["GITHUB_REF_NAME"])
    output = ROOT / "build/firefox-release"
    output.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(files[0], output / asset)
    (output / "firefox-updates.json").write_text(json.dumps(feed, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
