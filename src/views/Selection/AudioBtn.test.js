import { act } from "react";
import { createRoot } from "react-dom/client";
import { AudioBtn, BrowserTtsBtn } from "./AudioBtn";
import { canSpeak, speak } from "../../libs/speech";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("../../libs/speech", () => ({
  canSpeak: jest.fn(),
  speak: jest.fn(),
}));

let mockAudioState;
let mockAudioBySrc;

jest.mock("../../hooks/Audio", () => ({
  useAudio: (src) =>
    mockAudioBySrc?.(src) ||
    mockAudioState || {
      error: null,
      ready: true,
      playing: false,
      onPlay: jest.fn(),
      onPause: jest.fn(),
    },
}));

jest.mock("query-string", () => ({
  stringify: jest.fn(() => ""),
}));

function renderBrowserTtsBtn(props = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<BrowserTtsBtn text="hello" lang="en" {...props} />);
  });

  return { container, root };
}

describe("BrowserTtsBtn", () => {
  beforeEach(() => {
    canSpeak.mockReturnValue(true);
    speak.mockReset();
    mockAudioState = undefined;
    document.body.innerHTML = "";
  });

  test("does not render when browser speech is unsupported", () => {
    canSpeak.mockReturnValue(false);

    const { container, root } = renderBrowserTtsBtn();

    expect(container.querySelector("button")).toBeNull();

    act(() => {
      root.unmount();
    });
  });

  test("keeps focus while speaking and ignores repeated activations until speech ends", () => {
    let onEnd;
    speak.mockImplementation((text, lang, callbacks) => {
      onEnd = callbacks.onEnd;
      return true;
    });

    const { container, root } = renderBrowserTtsBtn();
    const button = container.querySelector("button");

    act(() => {
      button.focus();
      button.click();
      // The second activation arrives before React renders the busy state.
      button.click();
    });

    expect(speak).toHaveBeenCalledTimes(1);
    expect(button.className).toContain("MuiIconButton-colorPrimary");
    expect(button.disabled).toBe(false);
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(document.activeElement).toBe(button);
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.getAttribute("aria-pressed")).toBe("true");

    act(() => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(speak).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(button);

    act(() => {
      onEnd();
    });

    expect(button.className).not.toContain("MuiIconButton-colorPrimary");
    expect(button.disabled).toBe(false);
    expect(button.getAttribute("aria-disabled")).toBe("false");
    expect(document.activeElement).toBe(button);

    act(() => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(speak).toHaveBeenCalledTimes(2);

    act(() => {
      root.unmount();
    });
  });

  test("releases its activation guard when speech cannot start", () => {
    speak.mockReturnValue(false);
    const { container, root } = renderBrowserTtsBtn();
    const button = container.querySelector("button");
    act(() => {
      button.focus();
      button.click();
    });
    expect(button.getAttribute("aria-disabled")).toBe("false");
    expect(button.getAttribute("aria-busy")).toBe("false");
    expect(document.activeElement).toBe(button);
    act(() => button.click());
    expect(speak).toHaveBeenCalledTimes(2);
    act(() => root.unmount());
  });
});

describe("AudioBtn", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    mockAudioBySrc = null;
  });

  test("failed primary audio switches once to fallback and resets for a new word", () => {
    const seen = [];
    mockAudioBySrc = (src) => {
      seen.push(src);
      return {
        error: src === "broken" ? new Error("network") : null,
        ready: src !== "broken",
        playing: false,
        onPlay: jest.fn(),
      };
    };
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => root.render(<AudioBtn src="broken" fallbackSrc="youdao" />));
    expect(seen).toContain("youdao");
    expect(container.querySelector("button").disabled).toBe(false);
    expect(container.querySelector("button").title).toContain("Youdao");
    act(() =>
      root.render(<AudioBtn src="next-word" fallbackSrc="next-fallback" />)
    );
    expect(seen[seen.length - 1]).toBe("next-word");
    act(() => root.unmount());
  });

  test("exposes a named ready action and replays from the playing state", () => {
    const onPlay = jest.fn();
    const onPause = jest.fn();
    mockAudioState = {
      error: null,
      ready: true,
      playing: false,
      onPlay,
      onPause,
    };
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => root.render(<AudioBtn src="audio" title="Speak word" />));
    const button = container.querySelector("button");
    expect(button.getAttribute("aria-label")).toBe("Speak word");
    expect(button.getAttribute("aria-pressed")).toBe("false");
    act(() => button.click());
    expect(onPlay).toHaveBeenCalledTimes(1);

    mockAudioState = { ...mockAudioState, playing: true };
    act(() =>
      root.render(
        <AudioBtn src="audio" title="Speak word" replayTitle="Replay word" />
      )
    );
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.getAttribute("aria-label")).toBe("Replay word");
    act(() => button.click());
    expect(onPlay).toHaveBeenCalledTimes(2);
    expect(onPause).not.toHaveBeenCalled();

    act(() => root.unmount());
  });
});
