import { STOKEY_WORDS, KV_WORDS_KEY } from "../config";
import { useCallback, useMemo } from "react";
import { useStorage } from "./Storage";
import { normalizeWordForms } from "../libs/favoriteWordForms";

const DEFAULT_FAVWORDS = {};

function normalizeSource(source) {
  if (!source || typeof source !== "object") return undefined;

  const sentence =
    typeof source.sentence === "string"
      ? source.sentence.trim().slice(0, 1000)
      : "";
  const url = typeof source.url === "string" ? source.url.trim() : "";
  if (!sentence && !url) return undefined;

  return {
    ...(sentence ? { sentence } : {}),
    ...(url ? { url } : {}),
  };
}

/** Manage favorite words with replayable storage mutations. */
export function useFavWords() {
  const {
    data: favWords,
    save,
    isLoading,
  } = useStorage(STOKEY_WORDS, DEFAULT_FAVWORDS, KV_WORDS_KEY);

  /**
   * Toggle a favorite using metadata captured once for this user action.
   */
  const toggleFav = useCallback(
    (
      word,
      timestamp = null,
      phonetic = "",
      definition = "",
      examples = [],
      formsOrSource = [],
      source = null
    ) => {
      const forms = Array.isArray(formsOrSource) ? formsOrSource : [];
      const normalizedSource = normalizeSource(
        Array.isArray(formsOrSource) ? source : formsOrSource
      );
      const wordData = {
        createdAt: Date.now(),
        timestamp,
        phonetic,
        definition,
        examples: Array.isArray(examples) ? [...examples] : examples,
        forms: normalizeWordForms(forms),
        ...(normalizedSource ? { source: normalizedSource } : {}),
      };
      Object.keys(wordData).forEach((key) => {
        if (
          wordData[key] === null ||
          wordData[key] === undefined ||
          (Array.isArray(wordData[key]) && wordData[key].length === 0) ||
          (typeof wordData[key] === "string" && wordData[key].length === 0)
        ) {
          delete wordData[key];
        }
      });
      return save((prev) => {
        if (!prev[word]) {
          return { ...prev, [word]: wordData };
        }

        const favs = { ...prev };
        delete favs[word];
        return favs;
      });
    },
    [save]
  );

  /** Merge new words while preserving metadata for existing favorites. */
  const mergeWords = useCallback(
    (words, metadata = {}) => {
      const createdAt = Date.now();
      const normalizedSource = normalizeSource(metadata?.source);
      const additions = Object.fromEntries(
        words.map((word) => {
          const forms = normalizeWordForms(metadata[word]);
          return [
            word,
            {
              createdAt,
              ...(forms.length ? { forms } : {}),
              ...(normalizedSource ? { source: normalizedSource } : {}),
            },
          ];
        })
      );
      return save((prev) => ({ ...additions, ...prev }));
    },
    [save]
  );

  const clearWords = useCallback(() => save({}), [save]);

  // Enrich existing favorites only; never resurrect a concurrently deleted word.
  const updateWordForms = useCallback(
    (word, forms) => {
      const incoming = normalizeWordForms(forms);
      return save((prev) => {
        if (!prev[word] || !incoming.length) return prev;
        const existing = normalizeWordForms(prev[word].forms);
        const merged = normalizeWordForms([...existing, ...incoming]);
        if (merged.length === existing.length) return prev;
        return { ...prev, [word]: { ...prev[word], forms: merged } };
      });
    },
    [save]
  );

  const favList = useMemo(
    () =>
      Object.entries(favWords || {}).sort((a, b) => a[0].localeCompare(b[0])),
    [favWords]
  );

  const wordList = useMemo(() => favList.map(([word]) => word), [favList]);

  return {
    favWords,
    favList,
    wordList,
    toggleFav,
    mergeWords,
    updateWordForms,
    clearWords,
    isLoading,
  };
}
