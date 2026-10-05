import { act } from "react";
import { createRoot } from "react-dom/client";
import { useAudio } from "./Audio";
import { fetchData } from "../libs/fetch";

jest.mock("../libs/fetch", () => ({ fetchData: jest.fn() }));
jest.mock("../libs/log", () => ({ logger: { info: jest.fn() } }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("audio replay", () => {
  let root, state, audio, originalAudio;
  function Probe() {
    state = useAudio("https://example.com/word.mp3");
    return null;
  }
  beforeEach(async () => {
    originalAudio = globalThis.Audio;
    globalThis.Audio = jest.fn(() => {
      audio = new EventTarget();
      audio.currentTime = 0;
      audio.play = jest.fn(() => {
        audio.dispatchEvent(new Event("play"));
        return Promise.resolve();
      });
      audio.pause = jest.fn();
      audio.removeAttribute = jest.fn();
      return audio;
    });
    fetchData.mockResolvedValue("data:audio/mp3;base64,test");
    root = createRoot(document.createElement("div"));
    await act(async () => root.render(<Probe />));
    act(() => audio.dispatchEvent(new Event("canplaythrough")));
  });
  afterEach(() => {
    act(() => root.unmount());
    globalThis.Audio = originalAudio;
  });

  test("restarts while playing and after ending without pausing or fetching again", async () => {
    await act(async () => state.onPlay());
    expect(state.playing).toBe(true);
    audio.currentTime = 1.5;
    await act(async () => state.onPlay());
    expect(audio.currentTime).toBe(0);
    expect(state.playing).toBe(true);
    audio.currentTime = 2;
    act(() => audio.dispatchEvent(new Event("ended")));
    expect(state.playing).toBe(false);
    await act(async () => state.onPlay());
    expect(audio.currentTime).toBe(0);
    expect(audio.play).toHaveBeenCalledTimes(3);
    expect(audio.pause).not.toHaveBeenCalled();
    expect(fetchData).toHaveBeenCalledTimes(1);
  });

  test("an earlier play rejection cannot clear a newer playback state", async () => {
    let reject;
    audio.play.mockImplementationOnce(
      () =>
        new Promise((resolve, fail) => {
          reject = fail;
        })
    );
    let pending;
    act(() => {
      pending = state.onPlay();
    });
    await act(async () => state.onPlay());
    await act(async () => {
      reject(new Error("interrupted"));
      await pending;
    });
    expect(state.playing).toBe(true);
  });
});
