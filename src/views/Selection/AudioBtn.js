import IconButton from "@mui/material/IconButton";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import { useEffect, useRef, useState } from "react";
import { useAudio } from "../../hooks/Audio";
import { canSpeak, speak } from "../../libs/speech";
import queryString from "query-string";

/**
 * Basic audio playback button.
 *
 * @param {Object} props
 * @param {string} props.src - Audio source URL.
 */
export function AudioBtn(props) {
  return (
    <AudioPlayback
      key={JSON.stringify([props.src, props.fallbackSrc])}
      {...props}
    />
  );
}

function AudioPlayback({
  src,
  fallbackSrc,
  title = "Speak",
  replayTitle = "Replay",
}) {
  const [useFallback, setUseFallback] = useState(!src && Boolean(fallbackSrc));
  // Track audio loading and playback with useAudio.
  const { error, ready, playing, onPlay } = useAudio(
    useFallback ? fallbackSrc : src
  );
  useEffect(() => {
    if (error && fallbackSrc && !useFallback) setUseFallback(true);
  }, [error, fallbackSrc, useFallback]);
  const sourceTitle = useFallback ? `${title} · Youdao fallback` : title;

  // Disable playback while loading or after an audio error.
  if (error || !ready) {
    return (
      <IconButton
        disabled
        size="small"
        title={sourceTitle}
        aria-label={sourceTitle}
        aria-busy={!error && !ready}
      >
        <VolumeUpIcon fontSize="inherit" />
      </IconButton>
    );
  }

  // Highlight the icon with the primary color during playback.
  if (playing) {
    return (
      <IconButton
        color="primary"
        size="small"
        onClick={onPlay}
        title={replayTitle}
        aria-label={replayTitle}
        aria-pressed="true"
      >
        <VolumeUpIcon fontSize="inherit" />
      </IconButton>
    );
  }

  // Start playback when the ready button is clicked.
  return (
    <IconButton
      onClick={onPlay}
      size="small"
      title={sourceTitle}
      aria-label={sourceTitle}
      aria-pressed="false"
    >
      <VolumeUpIcon fontSize="inherit" />
    </IconButton>
  );
}

/**
 * Baidu Translate TTS button.
 *
 * @param {Object} props
 * @param {string} props.text - Text to speak.
 * @param {string} [props.lan="uk"] - Accent: British "uk" or American "en".
 * @param {number} [props.spd=3] - Speech rate, defaulting to 3.
 */
export function BaiduAudioBtn({ text, lan = "uk", spd = 3 }) {
  if (!text) return null;

  // Build the public Baidu Translate TTS URL.
  const src = `https://fanyi.baidu.com/gettts?${queryString.stringify({ lan, text, spd })}`;
  return <AudioBtn src={src} />;
}

export function BrowserTtsBtn({ text, lang = "en-US", title = "Speak" }) {
  const [speaking, setSpeaking] = useState(false);
  const speakingRef = useRef(false);

  if (!text?.trim() || !canSpeak()) return null;

  const handleSpeak = () => {
    if (speakingRef.current) return;

    // Browser TTS has no audio element, so the button tracks playback itself.
    speakingRef.current = true;
    setSpeaking(true);
    const onEnd = () => {
      speakingRef.current = false;
      setSpeaking(false);
    };
    const started = speak(text, lang, { onEnd });

    if (!started) onEnd();
  };

  return (
    <IconButton
      color={speaking ? "primary" : "default"}
      // A native disabled button loses keyboard focus while speech is starting.
      aria-disabled={speaking}
      onClick={handleSpeak}
      size="small"
      title={title}
      aria-label={title}
      aria-busy={speaking}
      aria-pressed={speaking}
      sx={{
        ml: 0.5,
        verticalAlign: "middle",
        cursor: speaking ? "default" : undefined,
      }}
    >
      <VolumeUpIcon fontSize="inherit" />
    </IconButton>
  );
}
