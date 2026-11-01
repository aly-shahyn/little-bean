import { useEffect, useRef } from "react";

/**
 * Home page film: always plays on a silent loop, no controls. iPhones in Low Power Mode block
 * autoplay, so we also start it on the first tap/scroll and whenever the page comes back into view.
 */
export function FamilyFilm() {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = true;
    const play = () => { if (el.paused) void el.play().catch(() => undefined); };
    play();
    const events = ["touchstart", "pointerdown", "scroll", "keydown"] as const;
    events.forEach((e) => window.addEventListener(e, play, { passive: true }));
    document.addEventListener("visibilitychange", play);
    el.addEventListener("pause", play); // never stay paused (e.g. after the OS pauses it)
    return () => {
      events.forEach((e) => window.removeEventListener(e, play));
      document.removeEventListener("visibilitychange", play);
      el.removeEventListener("pause", play);
    };
  }, []);
  return (
    <figure className="tt-family-film">
      <div className="tt-film-frame">
        <video
          ref={ref}
          src="/assets/family-breakfast.mp4"
          poster="/assets/family-breakfast.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          controls={false}
          aria-label="A mother and her toddler enjoying breakfast together in slow motion"
        />
      </div>
      <figcaption><span>Little bites.</span> <span>Happy moments.</span></figcaption>
    </figure>
  );
}
