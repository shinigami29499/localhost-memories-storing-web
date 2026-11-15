import { Play } from "@/components/animate-ui/icons/play";
import { Pause } from "@/components/animate-ui/icons/pause";
import { timeLabel, useVideoPlayer, type VideoPlayerProps } from "@/features/media/components/useVideoPlayer";

export function MobileVideoPlayer(props: VideoPlayerProps) {
  const { src, name, onError } = props;
  const { t, video, player, playing, setPlaying, muted, current, duration, aspect, togglePlay, handleClick, onLoadedMetadata, onDurationChange, onTimeUpdate, onSeek, onToggleMute, onToggleFullscreen } = useVideoPlayer(props);
  return (
    <div ref={player} className="video-player" style={{ "--media-aspect": aspect } as React.CSSProperties}>
      <video ref={video} src={src} preload="metadata" playsInline aria-label={name}
        onClick={handleClick} onError={onError}
        onLoadedMetadata={onLoadedMetadata}
        onDurationChange={onDurationChange}
        onTimeUpdate={onTimeUpdate}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
      {!playing && <button className="video-player__center" type="button" onClick={handleClick} aria-label={t("Play video")}><Play size={28} animate={false} aria-hidden="true" /></button>}
      <div className="video-player__controls">
        <input className="video-player__seek" type="range" min={0} max={Number.isFinite(duration) ? duration : 0} step="any" value={Math.min(current, Number.isFinite(duration) ? duration : 0)} aria-label={t("Video progress")} onChange={onSeek} />
        <div className="video-player__row">
          <button type="button" onClick={togglePlay} aria-label={t(playing ? "Pause video" : "Play video")}>{playing ? <Pause size={20} animate={false} aria-hidden="true" /> : <Play size={20} animate={false} aria-hidden="true" />}</button>
          <span className="video-player__time">{timeLabel(current)} / {timeLabel(duration)}</span>
          <span className="video-player__spacer" />
          <button type="button" onClick={onToggleMute} aria-label={t(muted ? "Unmute video" : "Mute video")}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z" />{muted ? <path d="m16 9 5 6m0-6-5 6" /> : <path d="M15 9a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12" />}</svg></button>
          <button type="button" onClick={onToggleFullscreen} aria-label={t("Toggle fullscreen")}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 9V4h5m6 0h5v5M20 15v5h-5M9 20H4v-5" /></svg></button>
        </div>
      </div>
    </div>
  );
}
