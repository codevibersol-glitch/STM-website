import { useEffect, useRef, useState } from 'react';
import { PREFS_EVENT, motionReduced } from '../lib/prefs';

const FILM = '/media/hero-film.mp4';
const POSTER = '/media/hero-film-poster.jpg';
const LABEL = 'Promotional animation made with Grok Imagine. Not gameplay, and not a picture of STM.';

function savesData(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return connection?.saveData === true;
}

/**
 * The film sits in its own frame. The figure in the picture is left of centre, so no text is laid on top of it.
 * The file has no audio. It is not requested when motion is reduced or data saver is on.
 */
export function HeroFilm() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hold, setHold] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const decide = () => {
      const wide = window.matchMedia('(min-width: 64rem)').matches;
      const blocked = motionReduced() || savesData() || !wide;
      setHold(blocked);
      if (blocked) setPlaying(false);
      else setPlaying(true);
    };
    decide();
    window.addEventListener(PREFS_EVENT, decide);
    return () => window.removeEventListener(PREFS_EVENT, decide);
  }, []);

  const play = () => {
    if (motionReduced() || savesData()) return;
    setPlaying(true);
    const video = videoRef.current;
    if (video) void video.play();
  };
  const pause = () => {
    videoRef.current?.pause();
    setPlaying(false);
  };

  return (
    <figure className="hero-film">
      {playing ? (
        <video
          ref={videoRef}
          className="hero-film-frame"
          poster={POSTER}
          muted
          playsInline
          autoPlay
          loop
          preload="none"
          onPlay={() => setPlaying(true)}
        >
          <source src={FILM} type="video/mp4" />
        </video>
      ) : (
        <img className="hero-film-frame" src={POSTER} width={848} height={480} alt="" />
      )}
      <figcaption className="hero-film-caption">
        <p>{LABEL}{hold ? ' The film stays a still while motion is reduced or data saver is on.' : ''}</p>
        {hold ? null : (
          <button type="button" className="btn btn-ghost btn-sm" onClick={playing ? pause : play}>
            {playing ? 'Pause the film' : 'Play the film'}
          </button>
        )}
      </figcaption>
    </figure>
  );
}
