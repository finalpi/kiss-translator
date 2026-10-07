// UI-only frame bridge. Parent receivers only accept messages from a live,
// direct child frame. Never relay extension commands, configuration or HTML.
const CHANNEL = "kiss-translator:selection:v1";
let sequence = 0;

function findFrame(doc, source) {
  try {
    const frame = source?.frameElement;
    if (frame?.ownerDocument === doc && frame.isConnected) return frame;
  } catch {
    /* Cross-origin frames are found by their WindowProxy instead. */
  }
  const roots = [doc];
  while (roots.length) {
    for (const element of roots.pop().querySelectorAll("*")) {
      if (
        (element.localName === "iframe" || element.localName === "frame") &&
        element.contentWindow === source
      )
        return element;
      if (element.shadowRoot) roots.push(element.shadowRoot);
    }
  }
  return null;
}

function point(value) {
  return value &&
    Number.isFinite(value.x) &&
    Number.isFinite(value.y) &&
    Math.abs(value.x) < 1e8 &&
    Math.abs(value.y) < 1e8
    ? { x: value.x, y: value.y }
    : null;
}

function rect(value) {
  if (
    !value ||
    !["left", "right", "top", "bottom"].every(
      (k) => Number.isFinite(value[k]) && Math.abs(value[k]) < 1e8
    )
  )
    return null;
  return {
    left: value.left,
    right: value.right,
    top: value.top,
    bottom: value.bottom,
    width: value.right - value.left,
    height: value.bottom - value.top,
  };
}

export function sanitizeFrameSelection(value) {
  if (
    !value ||
    typeof value.text !== "string" ||
    !value.text.trim() ||
    value.text.length > 100000
  )
    return null;
  return {
    text: value.text,
    context:
      typeof value.context === "string" ? value.context.slice(0, 1000) : "",
    source: "page",
    rect: rect(value.rect),
    lastRect: rect(value.lastRect),
    pointerPosition: point(value.pointerPosition),
    open: value.open === true,
  };
}

export function mapFrameSelection(snapshot, frame) {
  const bounds = frame.getBoundingClientRect();
  const sx = frame.offsetWidth > 0 ? bounds.width / frame.offsetWidth : 1;
  const sy = frame.offsetHeight > 0 ? bounds.height / frame.offsetHeight : 1;
  if (!(sx > 0 && sy > 0)) return null;
  const x = bounds.left + (frame.clientLeft || 0) * sx;
  const y = bounds.top + (frame.clientTop || 0) * sy;
  const mapRect = (r) =>
    r && {
      left: x + r.left * sx,
      right: x + r.right * sx,
      top: y + r.top * sy,
      bottom: y + r.bottom * sy,
      width: r.width * sx,
      height: r.height * sy,
    };
  return {
    ...snapshot,
    rect: mapRect(snapshot.rect),
    lastRect: mapRect(snapshot.lastRect),
    pointerPosition: snapshot.pointerPosition && {
      x: x + snapshot.pointerPosition.x * sx,
      y: y + snapshot.pointerPosition.y * sy,
    },
  };
}

export function createSelectionFrameBridge({
  win = window,
  onSelection,
  onClear,
  onClickAway,
  timeout = 400,
}) {
  let active = true;
  let currentChild = null;
  let lastForward = null;
  const pending = new Map();
  const session = `${Date.now()}-${Math.random()}-${++sequence}`;
  const send = (target, data) => {
    try {
      target.postMessage({ channel: CHANNEL, ...data }, "*");
      return true;
    } catch {
      return false;
    }
  };
  const clear = (dispose = false) => {
    if (lastForward && win.parent !== win)
      send(win.parent, { kind: "clear", session, dispose });
  };
  const forward = (snapshot) => {
    if (!active || win.parent === win) return Promise.resolve(false);
    const value = sanitizeFrameSelection(snapshot);
    if (!value) return Promise.resolve(false);
    const id = `${session}-${++sequence}`;
    lastForward = id;
    return new Promise((resolve) => {
      const timer = win.setTimeout(() => {
        pending.delete(id);
        resolve(false);
      }, timeout);
      pending.set(id, { resolve, timer });
      if (
        !send(win.parent, { kind: "selection", id, session, snapshot: value })
      ) {
        win.clearTimeout(timer);
        pending.delete(id);
        resolve(false);
      }
    });
  };
  const receive = async (event) => {
    const data = event.data;
    if (!active || data?.channel !== CHANNEL) return;
    if (data.kind === "ack") {
      if (event.source !== win.parent) return;
      const request = pending.get(data.id);
      if (!request) return;
      pending.delete(data.id);
      win.clearTimeout(request.timer);
      request.resolve(data.accepted === true);
      return;
    }
    const frame = findFrame(win.document, event.source);
    if (!frame) return;
    if (data.kind === "click-away" && data.hasSelection === false) {
      if (win.parent !== win)
        send(win.parent, { kind: "click-away", hasSelection: false });
      else onClickAway?.();
      return;
    }
    if (data.kind === "clear") {
      if (
        currentChild?.frame === frame &&
        currentChild.session === data.session
      ) {
        onClear?.(data.dispose === true);
        clear(data.dispose === true);
      }
      return;
    }
    if (
      data.kind !== "selection" ||
      typeof data.id !== "string" ||
      data.id.length > 200 ||
      typeof data.session !== "string" ||
      data.session.length > 200
    )
      return;
    const sanitized = sanitizeFrameSelection(data.snapshot);
    const snapshot = sanitized && mapFrameSelection(sanitized, frame);
    if (!snapshot) return;
    currentChild = { frame, session: data.session };
    const child = currentChild;
    const accepted =
      win.parent !== win
        ? await forward(snapshot)
        : await onSelection(snapshot);
    if (!active || !frame.isConnected) return;
    send(event.source, {
      kind: "ack",
      id: data.id,
      accepted: currentChild !== child || accepted !== false,
    });
  };
  const scroll = () => {
    if (currentChild) onClear?.(false);
    clear(false);
  };
  const pagehide = () => clear(true);
  const selectionchange = () => {
    if (win.getSelection()?.isCollapsed) clear(false);
  };
  const click = (event) => {
    if (win.parent === win) return;
    if (event.type === "pointerdown" && event.button !== 0) return;
    // A fallback panel/trigger inside this frame is not an outside click.
    if (
      event
        .composedPath()
        .some(
          (node) =>
            node?.hasAttribute?.("data-kiss-translator-shadow-host") ||
            node?.classList?.contains("KT-tranbtn")
        )
    )
      return;
    // An old selection often survives until the reader handles mousedown.
    // Pointerdown capture must dismiss the panel before that overlay consumes
    // the gesture. Keep click as a fallback for keyboard activation.
    if (event.type !== "pointerdown" && win.getSelection()?.toString().trim())
      return;
    send(win.parent, { kind: "click-away", hasSelection: false });
  };
  const observer = new win.MutationObserver(() => {
    if (currentChild && !currentChild.frame.isConnected) {
      currentChild = null;
      onClear?.(true);
      clear(true);
    }
  });
  observer.observe(win.document, { childList: true, subtree: true });
  win.addEventListener("message", receive);
  win.addEventListener("scroll", scroll, true);
  win.addEventListener("resize", scroll);
  win.addEventListener("pagehide", pagehide);
  win.document.addEventListener("selectionchange", selectionchange);
  win.addEventListener("click", click, true);
  win.addEventListener("pointerdown", click, true);
  return {
    forward,
    clear,
    release() {
      currentChild = null;
    },
    dispose() {
      clear(true);
      active = false;
      observer.disconnect();
      win.removeEventListener("message", receive);
      win.removeEventListener("scroll", scroll, true);
      win.removeEventListener("resize", scroll);
      win.removeEventListener("pagehide", pagehide);
      win.document.removeEventListener("selectionchange", selectionchange);
      win.removeEventListener("click", click, true);
      win.removeEventListener("pointerdown", click, true);
      pending.forEach(({ resolve, timer }) => {
        win.clearTimeout(timer);
        resolve(false);
      });
      pending.clear();
    },
  };
}
