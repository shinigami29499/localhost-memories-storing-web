import { Slider } from "@base-ui/react/slider";
import { SlidingNumber } from "@animate-ui/react/primitives/texts/sliding-number";
import { useShouldReduceMotion } from "@animate-ui/react/utils/motion";
import { Maximize, Minimize, Volume1, Volume2, VolumeX } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Pause } from "@/components/animate-ui/icons/pause";
import { Play } from "@/components/animate-ui/icons/play";
import { IconButton } from "@/components/ui";
import { timeLabel, useVideoPlayer, type VideoPlayerProps } from "@/features/media/components/useVideoPlayer";
import { useAnimationStore } from "@/store/animationStore";

const CONTROLS_IDLE_MS = 3000;
const SEEK_RESET_MS = 300;

function VideoTime({ value, animated }: { value: number; animated: boolean }) {
  if (!animated) return timeLabel(value);
  const seconds = Math.floor(value) % 60;
  return <>
    <SlidingNumber number={Math.floor(value / 60)} initiallyStable />:
    <SlidingNumber number={Math.floor(seconds / 10)} initiallyStable />
    <SlidingNumber number={seconds % 10} initiallyStable />
  </>;
}

export interface MobileVideoAudio {
  muted: boolean;
  volume: number;
  onChange: (volume: number, muted: boolean) => void;
}

export function MobileVideoPlayer({
  immersive = false, audio, poster, stage, startTime = 0, ...props
}: VideoPlayerProps & {
  immersive?: boolean; audio?: MobileVideoAudio; poster?: string; stage?: HTMLElement | null; startTime?: number;
}) {
  const { src, name, onError } = props;
  const {
    t, video, player, playing, setPlaying, muted: localMuted, current, duration, aspect, togglePlay,
    onLoadedMetadata, onDurationChange, onTimeUpdate, onToggleMute, onToggleFullscreen,
  } = useVideoPlayer(props);
  const reduceMotion = useShouldReduceMotion();
  const motionEnabled = useAnimationStore((state) => state.enabled);
  const animate = motionEnabled && !reduceMotion;
  const previousSrc = useRef(src);
  const [surfaceHost] = useState(() => immersive ? document.createElement("div") : null);
  const [fullscreen, setFullscreen] = useState(false);
  const [localVolume, setLocalVolume] = useState(100);
  const [controlsShown, setControlsShown] = useState(true);
  const [activity, setActivity] = useState(0);
  const [controlPointer, setControlPointer] = useState<number | null>(null);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const [resettingSeek, setResettingSeek] = useState(false);
  const [failedSource, setFailedSource] = useState<string>();
  const fullView = immersive || fullscreen;
  const controlsVisible = !fullView || controlsShown;
  const muted = audio?.muted ?? localMuted;
  const volume = audio?.volume ?? localVolume;
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;
  const PlaybackIcon = playing ? Pause : Play;
  const FullscreenIcon = fullscreen ? Minimize : Maximize;
  const end = Number.isFinite(duration) && duration > 0 ? duration : 0;

  useLayoutEffect(() => {
    if (!stage || !surfaceHost) return;
    surfaceHost.style.display = "contents";
    stage.append(surfaceHost);
    return () => surfaceHost.remove();
  }, [stage, surfaceHost]);

  useLayoutEffect(() => {
    if (video.current) video.current.volume = volume / 100;
  }, [stage, video, volume]);

  useLayoutEffect(() => {
    const element = video.current;
    if (!immersive || !stage || !element) return;
    void element.play().catch(() => {});
  }, [immersive, src, stage, video]);

  useLayoutEffect(() => {
    if (previousSrc.current === src) return;
    previousSrc.current = src;
    setResettingSeek(true);
    const timer = window.setTimeout(() => setResettingSeek(false), SEEK_RESET_MS);
    return () => window.clearTimeout(timer);
  }, [src]);

  useEffect(() => {
    if (immersive) return;
    const update = () => {
      setFullscreen(document.fullscreenElement === player.current);
      showControls();
    };
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, [immersive, player]);

  useEffect(() => {
    if (!fullView || !playing || controlPointer !== null || keyboardFocus) return;
    const timer = window.setTimeout(() => setControlsShown(false), CONTROLS_IDLE_MS);
    return () => window.clearTimeout(timer);
  }, [activity, controlPointer, fullView, keyboardFocus, playing]);

  useEffect(() => {
    if (controlPointer === null) return;
    const release = (event: PointerEvent) => {
      if (event.pointerId === controlPointer) setControlPointer(null);
    };
    const blur = () => setControlPointer(null);
    window.addEventListener("pointerup", release, true);
    window.addEventListener("pointercancel", release, true);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("pointerup", release, true);
      window.removeEventListener("pointercancel", release, true);
      window.removeEventListener("blur", blur);
    };
  }, [controlPointer]);

  function showControls() {
    setControlsShown(true);
    setActivity((previous) => previous + 1);
  }

  function toggleControls() {
    setControlsShown((shown) => !shown);
    setActivity((previous) => previous + 1);
  }

  function toggleSound() {
    if (!audio) {
      onToggleMute();
      return;
    }
    if (video.current) video.current.muted = !muted;
    audio.onChange(volume, !muted);
  }

  function changeVolume(level: number) {
    if (audio) audio.onChange(level, muted);
    else setLocalVolume(level);
    showControls();
  }

  const surface = (
    <>
      <video ref={video} src={src} poster={poster} preload="metadata" playsInline aria-label={name} muted={muted}
        onClick={fullView ? toggleControls : togglePlay} onError={() => {
          setFailedSource(src);
          onError?.();
        }} onLoadedMetadata={(event) => {
          onLoadedMetadata(event);
          if (immersive && startTime > 0) event.currentTarget.currentTime = startTime;
        }}
        onDurationChange={onDurationChange} onTimeUpdate={onTimeUpdate} onPlay={() => {
          setPlaying(true);
        }} onPause={(event) => {
          if (!event.currentTarget.paused) return;
          setPlaying(false);
          showControls();
        }} />
      {failedSource === src ? (
        <p className="mobile-video-player__error" role="alert">{t("Could not load this media.")}</p>
      ) : !playing && (
        <IconButton size="fab" className="mobile-video-player__center" data-video-controls
          onClick={() => { showControls(); togglePlay(); }} aria-label={t("Play video")}>
          <Play animate={false} />
        </IconButton>
      )}
    </>
  );
  const dock = (
      <div className="mobile-video-player__controls" data-video-controls
        data-visible={controlsVisible} data-resetting-seek={resettingSeek || undefined}
        aria-hidden={!controlsVisible} inert={!controlsVisible}
        onPointerDownCapture={(event) => {
          if (!fullView || !event.isPrimary || event.button !== 0) return;
          setKeyboardFocus(false);
          setControlPointer(event.pointerId);
        }}
        onPointerMove={fullView ? showControls : undefined} onClick={fullView ? showControls : undefined}
        onFocus={(event) => {
          if (!fullView) return;
          setKeyboardFocus(controlPointer === null && event.target.matches(":focus-visible"));
          showControls();
        }}
        onBlur={() => setKeyboardFocus(false)}
        onKeyDown={fullView ? showControls : undefined}>
        <Slider.Root className="mobile-video-player__seek" value={Math.min(current, end)} min={0} max={end || 1}
          step={0.1} disabled={end === 0} thumbAlignment="edge" onValueChange={(time) => {
            if (video.current) video.current.currentTime = time;
          }}>
          <Slider.Control className="mobile-video-player__seek-control">
            <Slider.Track className="mobile-video-player__seek-track">
            <Slider.Indicator className="mobile-video-player__seek-fill mobile-video-player__progress-fill" />
            </Slider.Track>
            <Slider.Thumb className="mobile-video-player__seek-thumb" aria-label={t("Video progress")}
              getAriaValueText={(_formatted, time) => timeLabel(time)} />
          </Slider.Control>
        </Slider.Root>
        <div className="mobile-video-player__row">
          <IconButton onClick={togglePlay} aria-label={t(playing ? "Pause video" : "Play video")}>
            <PlaybackIcon animate={false} />
          </IconButton>
          <div className="mobile-video-player__time">
            <span className="sr-only">{timeLabel(current)} / {timeLabel(end)}</span>
            <span aria-hidden="true">
              <VideoTime value={current} animated={fullView && animate} /> / <VideoTime value={end} animated={fullView && animate} />
            </span>
          </div>
          <div className="mobile-video-player__sound">
            {fullView && !muted && (
              <Slider.Root className="mobile-video-player__volume" value={volume} min={0} max={100} step={1}
                orientation="vertical" thumbAlignment="edge" onValueChange={changeVolume}>
                <Slider.Control className="mobile-video-player__volume-control">
                  <Slider.Track className="mobile-video-player__volume-track">
                    <Slider.Indicator className="mobile-video-player__seek-fill" />
                  </Slider.Track>
                  <Slider.Thumb className="mobile-video-player__seek-thumb" aria-label={t("Video volume")} />
                </Slider.Control>
              </Slider.Root>
            )}
            <IconButton onClick={toggleSound} aria-label={t(muted ? "Unmute video" : "Mute video")}>
              <VolumeIcon />
            </IconButton>
          </div>
          {!immersive && (
            <IconButton onClick={onToggleFullscreen} aria-label={t("Toggle fullscreen")}>
              <FullscreenIcon />
            </IconButton>
          )}
        </div>
      </div>
  );

  if (immersive) return <>
    {surfaceHost && createPortal(
      <div className="video-player mobile-video-player" data-immersive-video data-carousel-swipe>{surface}</div>,
      surfaceHost,
    )}
    {dock}
  </>;

  return (
    <div ref={player} className="video-player mobile-video-player" style={{ "--media-aspect": aspect } as CSSProperties}>
      {surface}
      {dock}
    </div>
  );
}
