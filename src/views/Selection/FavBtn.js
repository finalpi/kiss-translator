import IconButton from "@mui/material/IconButton";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFavWords } from "../../hooks/FavWords";
import { kissLog } from "../../libs/log";
import { useSetting } from "../../hooks/Setting";
import { EVENT_FAVORITE_WORD_CHANGE } from "../../config";
import { normalizeWordForms } from "../../libs/favoriteWordForms";

const EMPTY_FORMS = [];
function notifyFavorite(word, receipt) {
  const data = receipt.value[word];
  document.dispatchEvent(
    new CustomEvent(EVENT_FAVORITE_WORD_CHANGE, {
      detail: {
        word,
        isFavorite: Boolean(data),
        ...(data?.forms ? { forms: data.forms } : {}),
      },
    })
  );
}

/**
 * Favorite word button with a heart icon.
 *
 * @param {Object} props
 * @param {string} props.word - Word to add to or remove from favorites.
 * @param {string} props.title - Hover tooltip text.
 */
export default function FavBtn({
  word,
  title,
  forms = EMPTY_FORMS,
  ready = true,
}) {
  // Read favorite words and the toggle action from useFavWords.
  const { favWords, toggleFav, mergeWords, updateWordForms, isLoading } =
    useFavWords();
  const { context, setting } = useSetting();
  const [loading, setLoading] = useState(false);
  const pending = useRef(false);
  const autoAttempt = useRef(null);
  const enrichmentAttempt = useRef(null);
  const isFavorite = Boolean(favWords[word]);
  const autoCollect =
    context === "tranbox" && setting?.tranboxSetting?.autoFavWord;

  // Toggle the favorite state on click.
  const saveFavorite = useCallback(
    async (collectOnly = false) => {
      if (!ready || isLoading || pending.current) return;
      pending.current = true;
      try {
        setLoading(true);
        const receipt = await (collectOnly
          ? forms.length
            ? mergeWords([word], { [word]: forms })
            : mergeWords([word])
          : forms.length
            ? toggleFav(word, null, "", "", [], forms)
            : toggleFav(word));
        notifyFavorite(word, receipt);
      } catch (err) {
        kissLog("set fav", err);
      } finally {
        pending.current = false;
        setLoading(false);
      }
    },
    [mergeWords, toggleFav, word, isLoading, forms, ready]
  );

  useEffect(() => {
    if (!autoCollect) autoAttempt.current = null;
    if (
      !isLoading &&
      ready &&
      !loading &&
      !pending.current &&
      autoCollect &&
      word &&
      !favWords[word] &&
      autoAttempt.current !== word
    ) {
      // Automatic collection is additive and a failed attempt requires an explicit retry.
      autoAttempt.current = word;
      void saveFavorite(true);
    }
  }, [autoCollect, favWords, saveFavorite, word, isLoading, loading, ready]);

  useEffect(() => {
    if (
      !ready ||
      isLoading ||
      pending.current ||
      !isFavorite ||
      !updateWordForms
    )
      return;
    const incoming = normalizeWordForms(forms);
    const existing = normalizeWordForms(favWords[word]?.forms);
    if (!incoming.some((form) => !existing.includes(form))) return;
    const attempt = JSON.stringify([word, incoming]);
    if (enrichmentAttempt.current === attempt) return;
    enrichmentAttempt.current = attempt;
    pending.current = true;
    setLoading(true);
    void updateWordForms(word, incoming)
      .then((receipt) => {
        if (receipt.changed) notifyFavorite(word, receipt);
      })
      .catch((err) => kissLog("update favorite forms", err))
      .finally(() => {
        pending.current = false;
        setLoading(false);
      });
  }, [
    ready,
    isLoading,
    isFavorite,
    forms,
    favWords,
    word,
    updateWordForms,
    loading,
  ]);

  return (
    <IconButton
      disabled={!ready || loading || isLoading}
      size="small"
      onClick={() => saveFavorite()}
      title={title}
      aria-label={title}
      aria-pressed={isFavorite}
    >
      {/* Use a filled heart for favorite words and an outline otherwise. */}
      {isFavorite ? (
        <FavoriteIcon fontSize="inherit" />
      ) : (
        <FavoriteBorderIcon fontSize="inherit" />
      )}
    </IconButton>
  );
}
