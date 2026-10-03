# Firefox source submission — finalpi

This is finalpi's fork of https://github.com/fishjar/kiss-translator, licensed
under GPL-3.0. Extension ID: `finalpi@outlook.com`.

## Build environment

The initial local submission used Windows x64 with Node.js **22.22.0**; automated
releases use Ubuntu 24.04 with Node.js **24**. Both use pnpm **9.14.4**.
Use `BUILD-ENVIRONMENT.json` in each source ZIP for its exact OS, architecture
and Node version. Node is available from https://nodejs.org/en/download
and pnpm installation is documented at https://pnpm.io/installation.

Reproduce the specific submission using its recorded environment.

## Reproduce the extension

Extract the source ZIP into an empty directory. Use a clean shell without
custom `REACT_APP_*`, `BUILD_PATH`, `NODE_ENV` or `CI` environment overrides.
The included `.env` contains public build constants, not credentials. Do not
add `.env.local` or other local environment overrides.

Run from the extracted source root:

```sh
npm install --global pnpm@9.14.4
pnpm install --frozen-lockfile
pnpm sync-version
pnpm build:firefox
```

Internet access is needed to download public npm dependencies. No translation
account, API key, private package, or Mozilla credential is needed to build.
Do not run the all-platform `pnpm build`: it also formats source files and
builds unrelated targets.

The result is `build/firefox/`. ZIP its contents with `manifest.json` at the
archive root, not inside a `firefox/` directory. `FIREFOX-FILES.sha256.json`
in the source submission contains SHA-256 hashes of the submitted unsigned
extension files. Compare rebuilt files to these hashes, ignoring ZIP timestamps
and Mozilla signature files added later.

## Prepare submission archives (maintainer only)

After building, run `python src/scripts/package-firefox-amo.py` with Python 3.
This packages the current working files, including uncommitted changes, using
an explicit source allowlist. It does not upload, sign, commit or publish.
Outputs are under `build/amo/`:

- `kiss-translator-<version>-firefox-unsigned.zip`: upload as the extension.
- `kiss-translator-<version>-source.zip`: upload when AMO asks for source code.

Build immediately before packaging. Review both ZIPs before uploading. Do not
include local credentials. Source inputs include `src/`, `public/`, lockfile,
build configuration, the public `.env`, license, and these submission documents.

## Reviewer notes and data transmission

See `docs/firefox-privacy.md` for user-facing disclosure and
`docs/firefox-reviewer-notes.md` for source pointers and test instructions.
This build requires desktop Firefox 140+ (Android minimum 142; Android runtime
compatibility has not been verified). Submit for desktop unless Android is
separately tested.

It declares website content, authentication information, and browsing activity
as required data types. Settings transmission is declared as optional technical
and interaction data; Firefox sync and rule sharing check this consent on each
operation. Users can enable or revoke it in `about:addons`, under this add-on's
Permissions and data section. No analytics collection is added by this change.

This package is for unlisted signing. Its update URL is
https://finalpi.github.io/kiss-translator/firefox-updates.json.
See `docs/firefox-release.md` for automated signing and publishing setup.
