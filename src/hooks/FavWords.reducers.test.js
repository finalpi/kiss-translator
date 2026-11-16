/* eslint-disable testing-library/no-container, testing-library/no-unnecessary-act */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { useFavWords } from "./FavWords";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockSave = jest.fn();
jest.mock("./Storage", () => ({
  useStorage: () => ({ data: {}, isLoading: false, save: mockSave }),
}));

describe("favorite word mutation inputs", () => {
  let container;
  let root;
  let favorites;

  function Probe() {
    favorites = useFavWords();
    return null;
  }

  beforeEach(() => {
    mockSave.mockReset();
    mockSave.mockResolvedValue({ changed: true });
    jest.spyOn(Date, "now").mockReturnValue(100);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<Probe />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    jest.restoreAllMocks();
  });

  test("replays a toggle with fixed metadata against the latest favorites", () => {
    const examples = ["An example."];
    const pending = Promise.resolve({ changed: true });
    mockSave.mockReturnValueOnce(pending);
    expect(favorites.toggleFav("word", null, "", "", examples)).toBe(pending);
    const reduce = mockSave.mock.calls[0][0];
    const preview = reduce({});

    Date.now.mockReturnValue(200);
    examples.push("A later change.");
    const previous = { unrelated: { createdAt: 150 } };
    const committed = reduce(previous);

    expect(committed).toEqual({
      ...previous,
      word: { createdAt: 100, examples: ["An example."] },
    });
    expect(committed.word).toEqual(preview.word);
    expect(previous).toEqual({ unrelated: { createdAt: 150 } });
    expect(reduce(committed)).toEqual(previous);
  });

  test("captures imported words once and preserves existing word metadata", () => {
    const words = ["added", "retained"];
    favorites.mergeWords(words);
    const reduce = mockSave.mock.calls[0][0];
    const preview = reduce({});
    words.push("late");
    Date.now.mockReturnValue(200);
    const previous = {
      retained: { createdAt: 10, definition: "Keep this definition." },
      unrelated: { createdAt: 20 },
    };

    expect(reduce(previous)).toEqual({
      ...previous,
      added: { createdAt: 100 },
    });
    expect(reduce({})).toEqual(preview);
  });

  test("stores dictionary forms and enriches without resurrecting a deleted favorite", () => {
    favorites.toggleFav(
      "compost",
      null,
      "",
      "",
      [],
      ["composts", "composting"]
    );
    expect(mockSave.mock.calls[0][0]({}).compost.forms).toEqual([
      "composts",
      "composting",
    ]);
    favorites.updateWordForms("compost", ["composted"]);
    const enrich = mockSave.mock.calls[1][0];
    expect(enrich({})).toEqual({});
    const previous = {
      compost: { createdAt: 1, definition: "saved", forms: ["composts"] },
    };
    const enriched = enrich(previous);
    expect(enriched.compost).toEqual({
      createdAt: 1,
      definition: "saved",
      forms: ["composts", "composted"],
    });
    expect(enrich(enriched)).toBe(enriched);
  });
  test("stores source metadata for newly collected and imported words", () => {
    const source = {
      sentence: "The library is open.",
      url: "https://example.com/article",
    };

    favorites.toggleFav("word", null, "", "", [], source);
    const toggleReduce = mockSave.mock.calls[0][0];
    expect(toggleReduce({})).toEqual({
      word: { createdAt: 100, source },
    });

    favorites.mergeWords(["imported"], { source });
    const mergeReduce = mockSave.mock.calls[1][0];
    expect(mergeReduce({})).toEqual({
      imported: { createdAt: 100, source },
    });
  });

  test("keeps word forms and webpage source together after merging upstream", () => {
    const source = { sentence: "He was looking.", url: "https://example.com" };
    favorites.toggleFav("look", null, "", "", [], ["looking"], source);
    expect(mockSave.mock.calls[0][0]({}).look).toMatchObject({
      forms: ["looking"],
      source,
    });
    favorites.mergeWords(["look"], { look: ["looked"], source });
    expect(mockSave.mock.calls[1][0]({}).look).toMatchObject({
      forms: ["looked"],
      source,
    });
  });

  test("returns the persistence result for an explicit full clear", () => {
    const pending = Promise.resolve({ value: {}, changed: true });
    mockSave.mockReturnValueOnce(pending);

    expect(favorites.clearWords()).toBe(pending);
    expect(mockSave).toHaveBeenCalledWith({});
  });
});
