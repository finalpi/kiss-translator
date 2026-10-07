const accents = [
  { key: "英", phone: "ukphone", speech: "ukspeech", type: 1 },
  { key: "美", phone: "usphone", speech: "usspeech", type: 2 },
];
export function pronunciationAudioUrl(value, base) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    const url = new URL(value, base);
    if (
      !/^https?:$/.test(url.protocol) ||
      ["www.bing.comundefined", "www.bing.comnull"].includes(url.hostname)
    )
      return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}
export function youdaoVoiceUrl(word, type) {
  return word?.trim()
    ? `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word.trim())}&type=${type}`
    : undefined;
}
export function needsPronunciationFallback(data) {
  return accents.some(({ key }) => {
    const row = data.aus?.find((a) => a.key === key);
    return !row?.phonetic?.trim() || !pronunciationAudioUrl(row.audio);
  });
}
export function mergeDictionaryPronunciation(data, supplement) {
  const word = data.word?.trim();
  const entry = supplement?.ec?.word;
  const match =
    typeof entry?.["return-phrase"] === "string" &&
    entry["return-phrase"].trim().toLowerCase() === word?.toLowerCase();
  return {
    ...data,
    aus: accents.map(({ key, phone, speech, type }) => {
      const original = data.aus?.find((a) => a.key === key) || { key };
      const primary = pronunciationAudioUrl(original.audio);
      const phonetic =
        original.phonetic?.trim() || (match ? entry[phone]?.trim() : "") || "";
      const fallback = youdaoVoiceUrl(word, type);
      // A speech marker from this exact Youdao entry confirms its pronunciation.
      const audio = primary || (match && entry[speech] ? fallback : undefined);
      return {
        ...original,
        key,
        phonetic,
        audio,
        phoneticSource: original.phonetic?.trim()
          ? "Bing"
          : phonetic
            ? "Youdao"
            : undefined,
        audioSource: primary ? "Bing" : audio ? "Youdao" : undefined,
        fallbackAudio: primary ? fallback : undefined,
      };
    }),
  };
}

export async function lookupWithPronunciationFallback(text, bing, youdao) {
  const data = await bing(text);
  if (!data) return data;
  let supplement;
  if (needsPronunciationFallback(data)) {
    try {
      supplement = await youdao(data.word || text);
    } catch {
      /* Keep the Bing entry when optional lookup fails. */
    }
  }
  return mergeDictionaryPronunciation(data, supplement);
}
