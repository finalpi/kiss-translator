import { browser } from "./browser";

// Firefox requires optional consent for transmitting extension settings.
// Read permission on every sync operation so revocation takes effect without
// restarting. Other builds do not declare this Firefox-only permission.
export async function requireSyncDataConsent() {
  const declared =
    browser?.runtime?.getManifest?.()?.browser_specific_settings?.gecko
      ?.data_collection_permissions?.optional;
  if (!declared?.includes("technicalAndInteraction")) return;

  const permissions = await browser.permissions.getAll();
  if (!permissions.data_collection?.includes("technicalAndInteraction")) {
    throw new Error(
      "Firefox: enable Technical and interaction data in about:addons > " +
        "KISS Translator (finalpi) > Permissions and data to sync settings/rules/words. " +
        "请在 Firefox 插件的“权限和数据”中允许“技术和交互数据”后再同步。"
    );
  }
}
