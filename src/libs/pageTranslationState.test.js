import { browser } from "./browser";
import { isCurrentPopupDocument } from "./popupDocument";
import { getPageTranslationState } from "./pageTranslationState";
jest.mock("./browser", () => ({
  browser: { tabs: { sendMessage: jest.fn() } },
}));
jest.mock("./popupDocument", () => ({ isCurrentPopupDocument: jest.fn() }));
const response = {
  pageTranslationControlled: true,
  document: { frameId: 0, token: "reader" },
  rule: {
    transOpen: "true",
    apiSlug: "openai",
    fromLang: "en",
    toLang: "zh-CN",
    injectJs: "private",
  },
  setting: { key: "private" },
};
beforeEach(() => {
  browser.tabs.sendMessage.mockReset().mockResolvedValue(response);
  isCurrentPopupDocument.mockReset().mockResolvedValue(true);
});
test.each([true, false])(
  "reads a verified explicit page state enabled=%s without settings",
  async (enabled) => {
    browser.tabs.sendMessage.mockResolvedValue({
      ...response,
      rule: { ...response.rule, transOpen: String(enabled) },
    });
    await expect(getPageTranslationState(7)).resolves.toEqual({
      enabled,
      rule: { apiSlug: "openai", fromLang: "en", toLang: "zh-CN" },
    });
    expect(browser.tabs.sendMessage).toHaveBeenCalledWith(
      7,
      { action: "trans_getrule" },
      { frameId: 0 }
    );
  }
);
test("does not impose a top frame's defaults without an explicit command", async () => {
  browser.tabs.sendMessage.mockResolvedValue({
    ...response,
    pageTranslationControlled: false,
  });
  await expect(getPageTranslationState(7)).resolves.toBeNull();
});
test("rejects a replaced top document", async () => {
  isCurrentPopupDocument.mockResolvedValue(false);
  await expect(getPageTranslationState(7)).resolves.toBeNull();
});
test("ignores unavailable and invalid states", async () => {
  await expect(getPageTranslationState(undefined)).resolves.toBeNull();
  browser.tabs.sendMessage.mockRejectedValue(new Error("removed"));
  await expect(getPageTranslationState(7)).resolves.toBeNull();
  browser.tabs.sendMessage.mockResolvedValue({
    ...response,
    document: { frameId: 9, token: "child" },
  });
  await expect(getPageTranslationState(7)).resolves.toBeNull();
});
