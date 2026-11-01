import { useEffect } from "react";

/** Stops the page behind a drawer or menu from scrolling (several can be open at once). */
let locks = 0;
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;
    const html = document.documentElement;
    const body = document.body;
    if (locks++ === 0) {
      const gap = window.innerWidth - html.clientWidth; // keep desktop layout from jumping when the scrollbar hides
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
      html.style.overscrollBehavior = "none";
      if (gap > 0) body.style.paddingRight = `${gap}px`;
    }
    return () => {
      if (--locks === 0) {
        html.style.overflow = "";
        body.style.overflow = "";
        html.style.overscrollBehavior = "";
        body.style.paddingRight = "";
      }
    };
  }, [active]);
}
