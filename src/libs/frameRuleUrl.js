// about:srcdoc/blank, blob and data documents have no useful site path.
// Resolve their creator for rule matching only; runtime/document identity stays
// bound to the actual document URL and frame ID.
const inheritedUrl = /^(?:about:(?:blank|srcdoc)(?:[?#]|$)|blob:|data:)/i;
const siteUrl = /^(?:https?:|file:)/i;

export function getFrameRuleUrl(win = window) {
  const href = win.document?.location?.href || "";
  if (win.parent === win || !inheritedUrl.test(href)) return href;
  let parent = win.parent;
  for (let depth = 0; depth < 32; depth++) {
    try {
      const url = parent.location.href;
      if (siteUrl.test(url)) return url;
      if (parent.parent === parent) break;
      parent = parent.parent;
    } catch {
      break;
    }
  }
  const referrer = win.document?.referrer || "";
  if (siteUrl.test(referrer)) return referrer;
  if (href.startsWith("blob:")) {
    try {
      const origin = new URL(href).origin;
      if (/^https?:/.test(origin)) return origin + "/";
    } catch {
      /* Keep the original URL when its creator cannot be resolved. */
    }
  }
  return href;
}
