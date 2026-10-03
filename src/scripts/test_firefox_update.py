import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile

spec = importlib.util.spec_from_file_location("firefox_update", Path(__file__).with_name("firefox-update.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class UpdateFeedTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / "unsigned"
        self.source.mkdir()
        self.manifest = {
            "version": "2.1.1",
            "browser_specific_settings": {"gecko": {
                "id": "finalpi@outlook.com", "strict_min_version": "140.0",
                "update_url": "https://finalpi.github.io/kiss-translator/firefox-updates.json",
            }},
        }
        (self.source / "manifest.json").write_text(json.dumps(self.manifest))
        (self.source / "background.js").write_text("/* test fixture */")
        self.xpi = self.root / "fixture.xpi"

    def archive(self, signed=True, changed=False):
        with ZipFile(self.xpi, "w") as archive:
            for path in self.source.iterdir():
                archive.write(path, path.name)
            if changed:
                archive.writestr("unexpected.js", "unexpected")
            if signed:
                # Presence-only fixture; deliberately not a real AMO signature.
                archive.writestr("META-INF/mozilla.rsa", "fixture")
                archive.writestr("META-INF/mozilla.sf", "fixture")

    def feed(self, tag="v2.1.1"):
        return module.make_feed(self.xpi, self.source, "finalpi/kiss-translator", tag)[1]

    def test_matching_signed_payload_generates_hash_and_compatibility(self):
        self.archive()
        update = self.feed()["addons"]["finalpi@outlook.com"]["updates"][0]
        self.assertTrue(update["update_link"].endswith("/v2.1.1/kiss-translator_v2.1.1_firefox.xpi"))
        self.assertEqual(len(update["update_hash"]), 71)
        self.assertEqual(update["applications"]["gecko"]["strict_min_version"], "140.0")

    def test_unsigned_archive_rejected(self):
        self.archive(signed=False)
        with self.assertRaisesRegex(ValueError, "signature"):
            self.feed()

    def test_changed_payload_rejected(self):
        self.archive(changed=True)
        with self.assertRaisesRegex(ValueError, "file set"):
            self.feed()

    def test_tag_mismatch_rejected(self):
        self.archive()
        with self.assertRaisesRegex(ValueError, "Tag"):
            self.feed("v2.1.2")

    def test_old_and_replaced_versions_rejected(self):
        self.archive()
        new = self.feed()
        module.check_feed(new, copy.deepcopy(new))
        old = copy.deepcopy(new)
        update = old["addons"]["finalpi@outlook.com"]["updates"][0]
        update["version"] = "2.2.0"
        with self.assertRaisesRegex(ValueError, "older"):
            module.check_feed(new, old)
        update["version"] = "2.1.1"
        update["update_hash"] = "sha256:changed"
        with self.assertRaisesRegex(ValueError, "different content"):
            module.check_feed(new, old)


if __name__ == "__main__":
    unittest.main()
