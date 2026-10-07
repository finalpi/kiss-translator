import { browser } from "./browser";
import { MSG_TRANS_GETRULE } from "../config/msg";
import { isCurrentPopupDocument } from "./popupDocument";

// Only return the explicit page command's state, from the current top document.
// This is extension-internal; no settings or API credentials cross page messages.
export async function getPageTranslationState(tabId) {
  if (!Number.isInteger(tabId)) return null;
  try {
    const response = await browser.tabs.sendMessage(
      tabId,
      { action: MSG_TRANS_GETRULE },
      { frameId: 0 }
    );
    if (
      response?.error ||
      !response?.pageTranslationControlled ||
      response.document?.frameId !== 0 ||
      !(await isCurrentPopupDocument(tabId, response.document))
    )
      return null;
    const rule = response.rule;
    if (![true, false, "true", "false"].includes(rule?.transOpen)) return null;
    return {
      enabled: rule.transOpen === true || rule.transOpen === "true",
      rule: Object.fromEntries(
        ["apiSlug", "fromLang", "toLang"]
          .filter((key) => typeof rule[key] === "string")
          .map((key) => [key, rule[key]])
      ),
    };
  } catch {
    return null;
  }
}
