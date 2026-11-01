import type { ReactNode } from "react";

import { useReveal } from "../../lib/cart";

export function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={`tt-reveal ${className}`}>
      {children}
    </div>
  );
}
