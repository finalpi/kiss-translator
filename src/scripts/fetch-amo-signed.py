"""Read an existing approved AMO version; never submit or modify a version."""
import base64
import hashlib
import hmac
import json
import os
from pathlib import Path
import time
import urllib.parse
import urllib.request
import uuid


def encode(value):
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode()


class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if urllib.parse.urlparse(newurl).scheme != "https":
            raise ValueError("Refusing non-HTTPS redirect")
        result = super().redirect_request(req, fp, code, msg, headers, newurl)
        if urllib.parse.urlparse(newurl).netloc != urllib.parse.urlparse(req.full_url).netloc:
            result.remove_header("Authorization")
        return result


def main():
    root = Path(__file__).resolve().parents[2]
    manifest = json.loads((root / "build/firefox/manifest.json").read_text())
    version = manifest["version"]
    if os.environ["RELEASE_TAG"] != f"v{version}":
        raise ValueError("Recovery tag and original artifact version differ")
    addon = manifest["browser_specific_settings"]["gecko"]["id"]
    now = int(time.time())
    payload = {"iss": os.environ["WEB_EXT_API_KEY"], "jti": uuid.uuid4().hex, "iat": now, "exp": now + 300}
    signing_input = encode(b'{"alg":"HS256","typ":"JWT"}') + "." + encode(json.dumps(payload).encode())
    token = signing_input + "." + encode(hmac.new(os.environ["WEB_EXT_API_SECRET"].encode(), signing_input.encode(), hashlib.sha256).digest())
    opener = urllib.request.build_opener(SafeRedirect())
    def get(url):
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme != "https":
            raise ValueError("HTTPS required")
        headers = {"User-Agent": "kiss-translator-release"}
        if parsed.netloc == "addons.mozilla.org":
            headers["Authorization"] = "JWT " + token
        with opener.open(urllib.request.Request(url, headers=headers), timeout=120) as response:
            return response.read()
    url = "https://addons.mozilla.org/api/v5/addons/addon/" + urllib.parse.quote(addon, safe="") + "/versions/" + version + "/"
    info = json.loads(get(url))
    if info["version"] != version or info["channel"] != "unlisted" or info["file"]["status"] != "public":
        raise ValueError("AMO version is not approved and unlisted")
    data = get(info["file"]["url"])
    expected_hash = info["file"].get("hash", "")
    if expected_hash.startswith("sha256:") and expected_hash != "sha256:" + hashlib.sha256(data).hexdigest():
        raise ValueError("AMO file hash mismatch")
    dest = root / "build/signed"
    dest.mkdir(parents=True, exist_ok=True)
    (dest / "approved.xpi").write_bytes(data)
    original = json.loads((root / "build/firefox/manifest.json").read_text())
    from zipfile import ZipFile
    with ZipFile(dest / "approved.xpi") as archive:
        signed = json.loads(archive.read("manifest.json"))
    print("Retrieved approved version:", version)
    print("Manifest semantic equality:", original == signed)
    if original != signed:
        print("Changed manifest keys:", [k for k in original.keys() | signed.keys() if original.get(k) != signed.get(k)])


if __name__ == "__main__":
    main()
