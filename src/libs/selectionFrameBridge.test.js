import {
  createSelectionFrameBridge,
  mapFrameSelection,
  sanitizeFrameSelection,
} from "./selectionFrameBridge";

const channel = "kiss-translator:selection:v1";
const snapshot = {
  text: "looking",
  context: "He was looking at the mud.",
  rect: { left: 100, right: 150, top: 30, bottom: 50 },
  lastRect: { left: 100, right: 150, top: 30, bottom: 50 },
  pointerPosition: { x: 150, y: 50 },
};
const flush = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};

function fakeWindow() {
  const win = new EventTarget();
  Object.assign(win, {
    document,
    MutationObserver,
    setTimeout,
    clearTimeout,
    getSelection: () => ({ isCollapsed: false }),
  });
  win.parent = win;
  return win;
}
function frameAt(left, top, scale = 1) {
  const frame = document.createElement("iframe");
  document.body.appendChild(frame);
  Object.defineProperties(frame, {
    offsetWidth: { value: 400 },
    offsetHeight: { value: 300 },
    clientLeft: { value: 2 },
    clientTop: { value: 2 },
  });
  frame.getBoundingClientRect = () => ({
    left,
    top,
    width: 400 * scale,
    height: 300 * scale,
  });
  return frame;
}

afterEach(() => {
  document.body.innerHTML = "";
  jest.useRealTimers();
});

test("nested frames accumulate border, scale and negative pagination offsets", () => {
  const inner = frameAt(-600, 10, 2);
  const outer = frameAt(1000, 40, 0.5);
  const mapped = mapFrameSelection(
    mapFrameSelection(sanitizeFrameSelection(snapshot), inner),
    outer
  );
  expect(mapped.pointerPosition).toEqual({ x: 853, y: 98 });
  expect(mapped.rect).toMatchObject({
    left: 803,
    top: 78,
    right: 853,
    bottom: 98,
  });
  inner.remove();
  outer.remove();
});

test("child pointerdown relays dismissal despite an existing selection and cleans up", () => {
  const win = fakeWindow();
  win.getSelection = () => ({ toString: () => "old selection" });
  const postMessage = jest.fn();
  win.parent = { postMessage };
  const bridge = createSelectionFrameBridge({ win });
  win.dispatchEvent(new MouseEvent("pointerdown", { button: 0 }));
  expect(postMessage).toHaveBeenCalledWith(
    { channel, kind: "click-away", hasSelection: false },
    "*"
  );
  postMessage.mockClear();
  win.dispatchEvent(new MouseEvent("pointerdown", { button: 2 }));
  expect(postMessage).not.toHaveBeenCalled();
  bridge.dispose();
  win.dispatchEvent(new MouseEvent("pointerdown", { button: 0 }));
  expect(postMessage).not.toHaveBeenCalled();
});

test("top receiver only accepts a connected child and cleans up when it is removed", async () => {
  const win = fakeWindow();
  const accepted = jest.fn().mockResolvedValue(true),
    clear = jest.fn();
  const bridge = createSelectionFrameBridge({
    win,
    onSelection: accepted,
    onClear: clear,
  });
  const frame = frameAt(100, 80);
  const reply = jest.spyOn(frame.contentWindow, "postMessage");
  const data = {
    channel,
    kind: "selection",
    id: "one",
    session: "child",
    snapshot,
  };
  win.dispatchEvent(new MessageEvent("message", { source: window, data }));
  expect(accepted).not.toHaveBeenCalled();
  win.dispatchEvent(
    new MessageEvent("message", { source: frame.contentWindow, data })
  );
  await flush();
  expect(accepted).toHaveBeenCalledWith(
    expect.objectContaining({
      text: "looking",
      context: snapshot.context,
      pointerPosition: { x: 252, y: 132 },
    })
  );
  expect(reply).toHaveBeenCalledWith(
    expect.objectContaining({ kind: "ack", accepted: true }),
    "*"
  );
  frame.remove();
  await flush();
  expect(clear).toHaveBeenCalledWith(true);
  bridge.dispose();
  reply.mockRestore();
});

test("child waits for parent acknowledgment and falls back if parent is absent", async () => {
  jest.useFakeTimers();
  const win = fakeWindow();
  win.setTimeout = setTimeout;
  win.clearTimeout = clearTimeout;
  win.parent = { postMessage: jest.fn() };
  const bridge = createSelectionFrameBridge({ win });
  const pending = bridge.forward(snapshot);
  const message = win.parent.postMessage.mock.calls[0][0];
  win.dispatchEvent(
    new MessageEvent("message", {
      source: window,
      data: { channel, kind: "ack", id: message.id, accepted: true },
    })
  );
  win.dispatchEvent(
    new MessageEvent("message", {
      source: win.parent,
      data: { channel, kind: "ack", id: message.id, accepted: true },
    })
  );
  await expect(pending).resolves.toBe(true);
  const fallback = bridge.forward(snapshot);
  jest.advanceTimersByTime(400);
  await expect(fallback).resolves.toBe(false);
  bridge.dispose();
});

test("only the current child session can invalidate its selection", async () => {
  const win = fakeWindow(),
    clear = jest.fn();
  const bridge = createSelectionFrameBridge({
    win,
    onSelection: () => true,
    onClear: clear,
  });
  const frame = frameAt(0, 0);
  win.dispatchEvent(
    new MessageEvent("message", {
      source: frame.contentWindow,
      data: {
        channel,
        kind: "selection",
        id: "one",
        session: "current",
        snapshot,
      },
    })
  );
  await flush();
  win.dispatchEvent(
    new MessageEvent("message", {
      source: frame.contentWindow,
      data: { channel, kind: "clear", session: "old" },
    })
  );
  expect(clear).not.toHaveBeenCalled();
  win.dispatchEvent(
    new MessageEvent("message", {
      source: frame.contentWindow,
      data: { channel, kind: "clear", session: "current" },
    })
  );
  expect(clear).toHaveBeenCalledWith(false);
  bridge.dispose();
});

test("payload validation strips HTML and commands and rejects oversized inputs", () => {
  const safe = sanitizeFrameSelection({
    ...snapshot,
    source: "panel",
    action: "settings",
    html: "<script>test</script>",
    context: "a".repeat(2000),
  });
  expect(safe.source).toBe("page");
  expect(safe.context).toHaveLength(1000);
  expect(safe).not.toHaveProperty("action");
  expect(safe).not.toHaveProperty("html");
  expect(sanitizeFrameSelection({ text: "a".repeat(100001) })).toBeNull();
});

test("a disappearing parent fails back without an unhandled message error", async () => {
  const win = fakeWindow();
  win.parent = {
    postMessage: () => {
      throw new Error("closed");
    },
  };
  const bridge = createSelectionFrameBridge({ win });
  await expect(bridge.forward(snapshot)).resolves.toBe(false);
  bridge.dispose();
});
