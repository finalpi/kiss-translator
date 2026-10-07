import {
  lookupWithPronunciationFallback,
  mergeDictionaryPronunciation,
  pronunciationAudioUrl,
} from "./dictionaryPronunciation";
const bing = {
  word: "steadiness",
  trs: [{ def: "original" }],
  presents: ["steadiness"],
  aus: [
    { key: "英", audio: "https://www.bing.com/uk.mp3" },
    { key: "美", phonetic: "original", audio: "https://www.bing.com/us.mp3" },
  ],
};
const youdao = {
  ec: {
    word: {
      "return-phrase": "steadiness",
      ukphone: "ˈstedinəs",
      usphone: "other",
      ukspeech: "steadiness&type=1",
      usspeech: "steadiness&type=2",
    },
  },
};
test("fills only missing pronunciation fields and preserves definitions/forms", () => {
  const merged = mergeDictionaryPronunciation(bing, youdao);
  expect(merged.aus[0]).toMatchObject({
    phonetic: "ˈstedinəs",
    audio: bing.aus[0].audio,
    phoneticSource: "Youdao",
  });
  expect(merged.aus[1]).toMatchObject({
    phonetic: "original",
    audio: bing.aus[1].audio,
    phoneticSource: "Bing",
  });
  expect(merged.trs).toBe(bing.trs);
  expect(merged.presents).toBe(bing.presents);
  expect(bing.aus[0].phonetic).toBeUndefined();
});
test("fills both absent accents using matching Youdao audio", () => {
  const merged = mergeDictionaryPronunciation({ ...bing, aus: [] }, youdao);
  expect(merged.aus.map((a) => a.audio)).toEqual([
    "https://dict.youdao.com/dictvoice?audio=steadiness&type=1",
    "https://dict.youdao.com/dictvoice?audio=steadiness&type=2",
  ]);
});
test("does not borrow another headword's phonetics or audio", () => {
  const merged = mergeDictionaryPronunciation(
    { ...bing, aus: [] },
    { ec: { word: { ...youdao.ec.word, "return-phrase": "steady" } } }
  );
  expect(merged.aus.every((a) => !a.phonetic && !a.audio)).toBe(true);
});
test("skips optional lookups for complete entries, and uses the lemma for missing entries", async () => {
  const extra = jest.fn().mockResolvedValue(youdao);
  await lookupWithPronunciationFallback(
    "steadiness",
    async () => ({
      ...bing,
      aus: bing.aus.map((a) => ({ ...a, phonetic: "valid" })),
    }),
    extra
  );
  expect(extra).not.toHaveBeenCalled();
  await lookupWithPronunciationFallback("variant", async () => bing, extra);
  expect(extra).toHaveBeenCalledWith("steadiness");
});
test("a failed optional lookup keeps the usable primary dictionary", async () => {
  const result = await lookupWithPronunciationFallback(
    "steadiness",
    async () => bing,
    async () => {
      throw new Error("offline");
    }
  );
  expect(result.trs).toBe(bing.trs);
  expect(result.aus[0].audio).toBe(bing.aus[0].audio);
});
test("rejects missing/unsafe/broken audio links and resolves real relative links", () => {
  expect(
    pronunciationAudioUrl(undefined, "https://www.bing.com")
  ).toBeUndefined();
  expect(pronunciationAudioUrl("javascript:alert(1)")).toBeUndefined();
  expect(
    pronunciationAudioUrl("https://www.bing.comundefined")
  ).toBeUndefined();
  expect(pronunciationAudioUrl("/dict/a.mp3", "https://www.bing.com")).toBe(
    "https://www.bing.com/dict/a.mp3"
  );
});
