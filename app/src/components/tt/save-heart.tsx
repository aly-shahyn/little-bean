import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { useAccount } from "../../lib/account";

export function SaveHeart({ id, className = "", big = false }: { id: string; className?: string; big?: boolean }) {
  const { isSaved, toggleSaved } = useAccount();
  const navigate = useNavigate();
  const [pop, setPop] = useState(0);
  const on = isSaved(id);
  const size = big ? 22 : 18;
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? "Remove from saved" : "Save for later"}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const r = await toggleSaved(id);
        if (r === "login") void navigate({ to: "/account" });
        else setPop((p) => p + 1);
      }}
      className={`grid place-items-center rounded-full bg-white/95 shadow-sm backdrop-blur transition-transform hover:scale-110 ${big ? "h-12 w-12" : "h-9 w-9"} ${className}`}
    >
      <svg key={pop} className={pop ? "tt-bump" : ""} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"
          fill={on ? "#FF7A59" : "none"}
          stroke={on ? "#FF7A59" : "#2A2440"}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
