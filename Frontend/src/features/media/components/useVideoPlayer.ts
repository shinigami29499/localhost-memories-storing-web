import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type SyntheticEvent } from "react";
import { useLocale } from "../../../context/LocaleContext";

export interface VideoPlayerProps {
  src: string;
  name: string;
  onError?: () => void;
}

export function timeLabel(value: number) {
  const seconds = Number.isFinite(value) ? Math.floor(value) : 0;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function useVideoPlayer({ src, onError }: VideoPlayerProps) {
  const { t } = useLocale();
  const video = useRef<HTMLVideoElement>(null);
  const player = useRef<HTMLDivElement>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (clickTimer.current) clearTimeout(clickTimer.current); }, []);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [aspect, setAspect] = useState(1);
  useLayoutEffect(() => {
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
  }, [src]);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (element.getAttribute("src") !== src) element.setAttribute("src", src);
    const pauseWhenHidden = () => {
      if (document.hidden) element.pause();
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => {
      document.removeEventListener("visibilitychange", pauseWhenHidden);
      if (element.getAttribute("src") !== src) return;
      element.pause();
      element.removeAttribute("src");
      element.load();
    };
  }, [src]);
  const togglePlay = () => {
    const element = video.current;
    if (!element) return;
    if (element.paused) void element.play().catch((error: unknown) => {
      if (video.current !== element) return;
      console.warn("Media playback failed", error);
      onError?.();
    });
    else element.pause();
  };
  const handleClick = () => {
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => { clickTimer.current = null; togglePlay(); }, 300);
  };
  const onLoadedMetadata = (event: SyntheticEvent<HTMLVideoElement>) => {
    const element = event.currentTarget;
    setDuration(element.duration);
    if (element.videoHeight) setAspect(element.videoWidth / element.videoHeight);
  };
  const onDurationChange = (event: SyntheticEvent<HTMLVideoElement>) => setDuration(event.currentTarget.duration);
  const onTimeUpdate = (event: SyntheticEvent<HTMLVideoElement>) => setCurrent(event.currentTarget.currentTime);
  const onSeek = (event: ChangeEvent<HTMLInputElement>) => { if (video.current) video.current.currentTime = Number(event.target.value); };
  const onToggleMute = () => { if (video.current) { video.current.muted = !video.current.muted; setMuted(video.current.muted); } };
  const onToggleFullscreen = () => { if (document.fullscreenElement) void document.exitFullscreen(); else void player.current?.requestFullscreen(); };
  return { t, video, player, playing, setPlaying, muted, current, duration, aspect, togglePlay, handleClick, onLoadedMetadata, onDurationChange, onTimeUpdate, onSeek, onToggleMute, onToggleFullscreen };
}
