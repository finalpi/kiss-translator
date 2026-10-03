# AMO reviewer notes

Unlisted personal fork maintained by finalpi (`finalpi@outlook.com`), based on
fishjar/kiss-translator. Original license and third-party notices are retained.
Build instructions are in `README-AMO.md`; dependency versions are locked in
`pnpm-lock.yaml`. The source ZIP corresponds to the unsigned extension ZIP.

## Data classification evidence

- `websiteContent`: `src/apis/index.js`, `src/apis/trans.js` and
  `src/libs/docInfo.js` send translation input, subtitles and configured page
  context to the selected translation/AI provider.
- `authenticationInfo`: provider authorization headers in `src/apis/trans.js`;
  Gist/Worker authorization in `src/apis/index.js`; WebDAV credentials in
  `src/libs/sync.js`. Users supply credentials; none are embedded for review.
- `browsingActivity`: page titles/context may identify visited content, and
  synchronized/shared website rules contain URL/domain patterns.
- Optional `technicalAndInteraction`: transmission of extension settings and
  rules to the user's sync provider. `src/libs/dataConsent.js` checks Firefox's
  current data permissions. Both the common sync dispatch and rule-sharing
  entry point in `src/libs/sync.js` enforce this check. It is not an analytics
  opt-in. Other browser builds without this declaration retain their behavior.

Personal sync payloads use `src/libs/syncCrypto.js` encryption. Rule sharing
is deliberately plaintext. Public subscriptions/version resources can also
contact the upstream project's hosts, which remain in the public `.env`.

Custom API support uses the bundled Sval interpreter (`src/apis/trans.js` and
other API modules). Review this existing capability alongside the user-provided
custom configuration; unlisted status does not exempt it from Mozilla policy.

## Suggested manual checks

1. Install on desktop Firefox 140+ and inspect the required data disclosure.
2. Leave optional technical/interaction consent disabled. Translation should
   work with a suitable provider; configured sync should report the consent
   requirement and send no sync request.
3. Enable optional consent in about:addons > Permissions and data. Configure a
   test sync account plus encryption passphrase, then use the sync test button.
4. Revoke consent. Subsequent sync and rule sharing must be blocked without
   restarting the extension. Previously sent requests/data cannot be recalled.

Translation services may require your own API account. No reviewer account or
credentials are included. Automated local checks do not replace AMO review or
these browser-level checks. The submitted build is unsigned; AMO adds its
signature. Updates use the GitHub Pages URL declared in the manifest.
