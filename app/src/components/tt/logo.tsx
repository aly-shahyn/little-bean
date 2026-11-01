import { getRouteApi } from "@tanstack/react-router";

const root = getRouteApi("__root__");

export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <g transform="rotate(-14 20 20)">
        <path d="M3.5 19.5C3.5 11.8 10.4 8 20 8s16.5 3.8 16.5 11.5c0 7.4-4.4 11.5-9 11.5-3.7 0-4.6-3-7.5-3s-3.8 3-7.5 3c-4.6 0-9-4.1-9-11.5Z" fill="#BFEBCF" />
        <path d="M8.4 14.6c1.6-2 4.2-3.2 7.2-3.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".8" />
        <circle cx="10.2" cy="21" r="2.3" fill="#FFB2A0" opacity=".85" />
        <circle cx="29.8" cy="21" r="2.3" fill="#FFB2A0" opacity=".85" />
        <circle cx="14.6" cy="17.4" r="1.9" fill="#2A2440" />
        <circle cx="25.4" cy="17.4" r="1.9" fill="#2A2440" />
        <path d="M16.7 21.6c1 2 2.2 3 3.3 3s2.3-1 3.3-3" fill="none" stroke="#D04128" strokeWidth="2.3" strokeLinecap="round" />
      </g>
      <path d="M30.5 10.4c.6-3.4 3.4-5.6 7-5.4-.6 3.4-3.4 5.6-7 5.4Z" fill="#2FB27D" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  const { settings } = root.useLoaderData();
  const custom = settings["c.logo_image"];
  if (custom) return <img src={custom} alt="Little Bean" className="h-10 w-auto max-w-[190px] object-contain" />;
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      {!compact && (
        <span className="whitespace-nowrap text-[1.55rem] font-semibold leading-none tracking-[-0.015em] text-tt-ink" style={{ fontFamily: "var(--font-tt-brand)" }}>
          little <span className="text-tt-leaf">bean</span>
        </span>
      )}
    </span>
  );
}
