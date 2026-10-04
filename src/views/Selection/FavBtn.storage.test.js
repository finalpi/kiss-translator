import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import FavBtn from "./FavBtn";
import { browser } from "../../libs/browser";
import { STOKEY_WORDS, STOKEY_SYNC, KV_WORDS_KEY } from "../../config";
import { EVENT_FAVORITE_WORD_CHANGE } from "../../config";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("../../hooks/Setting", () => ({
  useSetting: () => ({
    context: "tranbox",
    setting: { tranboxSetting: { autoFavWord: true } },
  }),
}));
jest.mock("../../libs/client", () => ({ isExt: true, isGm: false }));
jest.mock("../../libs/browser", () => ({
  isOptions: () => false,
  browser: {
    storage: { local: { get: jest.fn(), set: jest.fn(), remove: jest.fn() } },
  },
}));
jest.mock("../../libs/storageCoordination", () => {
  let queue = Promise.resolve();
  return {
    withStorageLock: (operation) => {
      const pending = queue.then(() => operation());
      queue = pending.catch(() => {});
      return pending;
    },
  };
});
jest.mock("../../libs/sync", () => ({ syncData: jest.fn() }));
jest.mock("../../libs/gm", () => ({ getGmMethod: jest.fn() }));
jest.mock("../../libs/log", () => ({
  kissLog: jest.fn(),
  LogLevel: { INFO: { value: 1 } },
}));

test.each([false, true])(
  "automatic collection preserves hydrated words (StrictMode=%s)",
  async (strict) => {
    jest.useFakeTimers();
    const existing = {
      existing: { createdAt: 1, definition: "Preserved definition" },
    };
    const values = new Map([[STOKEY_WORDS, JSON.stringify(existing)]]);
    browser.storage.local.get.mockImplementation(async (keys) =>
      Object.fromEntries(keys.map((key) => [key, values.get(key)]))
    );
    browser.storage.local.set.mockImplementation(async (next) => {
      Object.entries(next).forEach(([key, value]) => values.set(key, value));
    });
    const root = createRoot(document.createElement("div"));
    try {
      const button = <FavBtn word="library" title="Collect" />;
      act(() =>
        root.render(strict ? <StrictMode>{button}</StrictMode> : button)
      );
      await act(async () => {
        await Promise.resolve();
      });
      expect(JSON.parse(values.get(STOKEY_WORDS))).toEqual(
        expect.objectContaining(existing)
      );
      expect(JSON.parse(values.get(STOKEY_WORDS))).toHaveProperty("library");
      const wordWrites = browser.storage.local.set.mock.calls.filter(
        ([entries]) =>
          Object.prototype.hasOwnProperty.call(entries, STOKEY_WORDS)
      );
      expect(wordWrites).toHaveLength(1);
      expect(
        JSON.parse(values.get(STOKEY_SYNC)).syncMeta[KV_WORDS_KEY].updateAt
      ).toBeGreaterThan(0);
    } finally {
      act(() => root.unmount());
      jest.useRealTimers();
    }
  }
);

test("automatic collection does not toggle an already saved word during hydration", async () => {
  jest.useFakeTimers();
  const existing = {
    library: { createdAt: 1, definition: "Preserved definition" },
  };
  browser.storage.local.get.mockResolvedValue({
    [STOKEY_WORDS]: JSON.stringify(existing),
  });
  const root = createRoot(document.createElement("div"));
  try {
    act(() =>
      root.render(
        <StrictMode>
          <FavBtn word="library" title="Collect" />
        </StrictMode>
      )
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(browser.storage.local.set).not.toHaveBeenCalled();
  } finally {
    act(() => root.unmount());
    jest.useRealTimers();
  }
});

test.each([false, true])(
  "persists dictionary forms for new/existing favorites (existing=%s)",
  async (saved) => {
    jest.useFakeTimers();
    const original = saved
      ? { compost: { createdAt: 1, definition: "keep me" } }
      : {};
    const values = new Map([[STOKEY_WORDS, JSON.stringify(original)]]);
    browser.storage.local.get.mockImplementation(async (keys) =>
      Object.fromEntries(keys.map((key) => [key, values.get(key)]))
    );
    browser.storage.local.set.mockImplementation(async (entries) =>
      Object.entries(entries).forEach(([key, value]) => values.set(key, value))
    );
    const notify = jest.fn();
    document.addEventListener(EVENT_FAVORITE_WORD_CHANGE, notify);
    const root = createRoot(document.createElement("div"));
    try {
      await act(async () =>
        root.render(<FavBtn word="compost" ready={false} title="Collect" />)
      );
      expect(JSON.parse(values.get(STOKEY_WORDS))).toEqual(original);
      await act(async () =>
        root.render(
          <FavBtn
            word="compost"
            forms={["composts", "composting", "composted"]}
            title="Collect"
          />
        )
      );
      const result = JSON.parse(values.get(STOKEY_WORDS));
      expect(Object.keys(result)).toEqual(["compost"]);
      expect(result.compost.forms).toEqual([
        "composts",
        "composting",
        "composted",
      ]);
      if (saved) expect(result.compost).toMatchObject(original.compost);
      expect(notify).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: {
            word: "compost",
            isFavorite: true,
            forms: result.compost.forms,
          },
        })
      );
      expect(
        JSON.parse(values.get(STOKEY_SYNC)).syncMeta[KV_WORDS_KEY].updateAt
      ).toBeGreaterThan(0);
    } finally {
      act(() => root.unmount());
      document.removeEventListener(EVENT_FAVORITE_WORD_CHANGE, notify);
      jest.useRealTimers();
    }
  }
);
