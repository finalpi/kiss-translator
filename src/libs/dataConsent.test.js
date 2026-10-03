jest.mock("./browser", () => ({
  browser: {
    runtime: { getManifest: jest.fn() },
    permissions: { getAll: jest.fn() },
  },
}));

import { browser } from "./browser";
import { requireSyncDataConsent } from "./dataConsent";

beforeEach(() => {
  jest.clearAllMocks();
  browser.runtime.getManifest.mockReturnValue({
    browser_specific_settings: {
      gecko: {
        data_collection_permissions: { optional: ["technicalAndInteraction"] },
      },
    },
  });
});

test("sync follows consent and its revocation without caching", async () => {
  browser.permissions.getAll
    .mockResolvedValueOnce({ data_collection: ["technicalAndInteraction"] })
    .mockResolvedValueOnce({ data_collection: [] });
  await expect(requireSyncDataConsent()).resolves.toBeUndefined();
  await expect(requireSyncDataConsent()).rejects.toThrow("about:addons");
});

test("missing data consent API result fails closed", async () => {
  browser.permissions.getAll.mockResolvedValue({ permissions: [] });
  await expect(requireSyncDataConsent()).rejects.toThrow("about:addons");
});

test("other builds do not need Firefox data consent", async () => {
  browser.runtime.getManifest.mockReturnValue({ manifest_version: 3 });
  await expect(requireSyncDataConsent()).resolves.toBeUndefined();
  expect(browser.permissions.getAll).not.toHaveBeenCalled();
});
