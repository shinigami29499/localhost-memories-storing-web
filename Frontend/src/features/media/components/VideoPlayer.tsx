import { useEffect, useRef, useState } from "react";
import { Play } from "@/components/animate-ui/icons/play";
import { Pause } from "@/components/animate-ui/icons/pause";
import { useLocale } from "../../../context/LocaleContext";

interface Props {
  src: string;
  name: string;
  onError: () => void;
}

function timeLabel(value: number) {
  const seconds = Number.isFinite(value) ? Math.floor(value) : 0;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function VideoPlayer({ src, name, onError }: Props) {
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
  const togglePlay = () => {
    const element = video.current;
    if (!element) return;
    if (element.paused) void element.play().catch(() => undefined);
    else element.pause();
  };
  const handleClick = () => {
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => { clickTimer.current = null; togglePlay(); }, 300);
  };
  return (
    <div ref={player} className="video-player" style={{ "--media-aspect": aspect } as React.CSSProperties}>
      <video ref={video} src={src} preload="metadata" playsInline aria-label={name}
        onClick={handleClick} onError={onError}
        onLoadedMetadata={(event) => { const element = event.currentTarget; setDuration(element.duration); if (element.videoHeight) setAspect(element.videoWidth / element.videoHeight); }}
        onDurationChange={(event) => setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
      {!playing && <button className="video-player__center" type="button" onClick={handleClick} aria-label={t("Play video")}><Play size={28} animate={false} aria-hidden="true" /></button>}
      <div className="video-player__controls">
        <input className="video-player__seek" type="range" min={0} max={Number.isFinite(duration) ? duration : 0} step="any" value={Math.min(current, Number.isFinite(duration) ? duration : 0)} aria-label={t("Video progress")} onChange={(event) => { if (video.current) video.current.currentTime = Number(event.target.value); }} />
        <div className="video-player__row">
          <button type="button" onClick={togglePlay} aria-label={t(playing ? "Pause video" : "Play video")}>{playing ? <Pause size={20} animate={false} aria-hidden="true" /> : <Play size={20} animate={false} aria-hidden="true" />}</button>
          <span className="video-player__time">{timeLabel(current)} / {timeLabel(duration)}</span>
          <span className="video-player__spacer" />
          <button type="button" onClick={() => { if (video.current) { video.current.muted = !video.current.muted; setMuted(video.current.muted); } }} aria-label={t(muted ? "Unmute video" : "Mute video")}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z" />{muted ? <path d="m16 9 5 6m0-6-5 6" /> : <path d="M15 9a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12" />}</svg></button>
          <button type="button" onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void player.current?.requestFullscreen(); }} aria-label={t("Toggle fullscreen")}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 9V4h5m6 0h5v5M20 15v5h-5M9 20H4v-5" /></svg></button>
        </div>
      </div>
    </div>
  );
}
