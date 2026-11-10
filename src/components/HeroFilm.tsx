import { useEffect, useRef, useState } from 'react';
import { PREFS_EVENT, motionReduced } from '../lib/prefs';

const FILM = '/media/hero-film.mp4';
const POSTER = '/media/hero-film-poster.jpg';
const LABEL = 'Trailer made with AI (Grok Imagine). Not gameplay. STM is not affiliated with Blizzard Entertainment.';

function savesData(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return connection?.saveData === true;
}

function shouldHold(): boolean {
  const wide = window.matchMedia('(min-width: 64rem)').matches;
  return motionReduced() || savesData() || !wide;
}

/**
 * The trailer stays a poster until it is allowed to play.
 * Phones, reduced motion and data saver do not request the file until the visitor taps play.
 * It starts muted. Sound waits for the unmute button.
 */
export function HeroFilm() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showFilm, setShowFilm] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const decide = () => {
      if (shouldHold()) return;
      setShowFilm(true);
      setPaused(false);
      setMuted(true);
    };
    decide();
    window.addEventListener(PREFS_EVENT, decide);
    return () => window.removeEventListener(PREFS_EVENT, decide);
  }, []);

  const play = () => {
    setShowFilm(true);
    setPaused(false);
    const video = videoRef.current;
    if (video) {
      video.muted = muted;
      void video.play();
    }
  };

  const pause = () => {
    videoRef.current?.pause();
    setPaused(true);
  };

  const toggleSound = () => {
    const video = videoRef.current;
    const next = !muted;
    setMuted(next);
    if (video) {
      video.muted = next;
      if (!next) video.loop = false;
    }
  };

  return (
    <figure className="hero-film">
      {showFilm ? (
        <video
          ref={videoRef}
          className="hero-film-frame"
          poster={POSTER}
          muted={muted}
          playsInline
          autoPlay
          loop={muted}
          preload="none"
          onPlay={() => setPaused(false)}
          onPause={() => setPaused(true)}
        >
          <source src={FILM} type="video/mp4" />
        </video>
      ) : (
        <img className="hero-film-frame film-still" src={POSTER} width={960} height={540} alt="AI trailer still: a host under the STM wordmark. Not gameplay." />
      )}
      <div className="hero-film-controls">
        {showFilm && !paused ? (
          <button type="button" className="hero-film-play" onClick={pause}>
            Pause
          </button>
        ) : (
          <button type="button" className="hero-film-play" onClick={play}>
            Play trailer
          </button>
        )}
        {showFilm ? (
          <button type="button" className="hero-film-play" onClick={toggleSound}>
            {muted ? 'Unmute' : 'Mute'}
          </button>
        ) : null}
      </div>
      <figcaption className="film-label">{LABEL}</figcaption>
    </figure>
  );
}
