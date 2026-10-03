"""Package current Firefox build and matching review sources; never upload."""
import hashlib
import json
import platform
import subprocess
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[2]
BUILD = ROOT / "build" / "firefox"
OUT = ROOT / "build" / "amo"
FILES = [
    "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", ".pnpm-version",
    ".env", ".babelrc", "config-overrides.js", "LICENSE", "README-AMO.md",
    "docs/firefox-privacy.md", "docs/firefox-reviewer-notes.md",
    "docs/firefox-release.md",
]


def file_map(directory):
    result = {}
    for file in sorted(directory.rglob("*")):
        if "__pycache__" in file.parts or file.suffix == ".pyc":
            continue
        if file.is_symlink():
            raise RuntimeError(f"Symlink not allowed: {file}")
        if file.is_file():
            result[file.relative_to(directory).as_posix()] = file
    return result


def main():
    manifest = json.loads((BUILD / "manifest.json").read_text(encoding="utf-8"))
    source_manifest = json.loads(
        (ROOT / "public/manifest.firefox.json").read_text(encoding="utf-8")
    )
    if manifest != source_manifest:
        raise RuntimeError("Built manifest differs from source; rebuild first")
    version = manifest["version"]
    if not all(c in "0123456789." for c in version):
        raise RuntimeError("Unexpected version format")
    sources = {name: ROOT / name for name in FILES}
    for directory in ("src", "public"):
        sources.update({f"{directory}/{k}": v for k, v in file_map(ROOT / directory).items()})
    for name, file in sources.items():
        if not file.is_file() or file.is_symlink():
            raise RuntimeError(f"Missing or unsafe source: {name}")
    built = file_map(BUILD)
    hashes = {name: hashlib.sha256(file.read_bytes()).hexdigest() for name, file in built.items()}
    environment = {
        "os": platform.platform(), "architecture": platform.machine(),
        "node": subprocess.check_output(["node", "--version"], text=True).strip(),
        "pnpm": "9.14.4 (use README-AMO.md build commands)",
    }
    OUT.mkdir(parents=True, exist_ok=True)
    prefix = f"kiss-translator-{version}"
    with ZipFile(OUT / f"{prefix}-firefox-unsigned.zip", "w", ZIP_DEFLATED) as archive:
        for name, file in built.items():
            archive.write(file, name)
    with ZipFile(OUT / f"{prefix}-source.zip", "w", ZIP_DEFLATED) as archive:
        for name, file in sorted(sources.items()):
            archive.write(file, name)
        archive.writestr("BUILD-ENVIRONMENT.json", json.dumps(environment, indent=2))
        archive.writestr("FIREFOX-FILES.sha256.json", json.dumps(hashes, indent=2))
    print(json.dumps({"output": str(OUT), "source_files": len(sources), "extension_files": len(built)}, indent=2))


if __name__ == "__main__":
    main()
