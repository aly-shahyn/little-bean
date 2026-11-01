export type AdminReply = { ok?: boolean; error?: string; code?: string; to?: string; username?: string | null; users?: unknown };

/** POSTs to a back-office API and always comes back with a clear message, even when the
 *  hosting network's security check intercepts the request (it answers with an HTML page, not JSON). */
export async function adminPost(path: string, body: Record<string, unknown>): Promise<{ ok: boolean; d: AdminReply }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, credentials: "same-origin", body: JSON.stringify(body) });
      if ((r.headers.get("content-type") || "").includes("application/json")) {
        const d = (await r.json()) as AdminReply;
        return { ok: r.ok && !!d.ok, d };
      }
      // The security check answered instead of the shop (the request never reached it), so one retry is safe.
      if (attempt === 0 && r.status === 403) { await new Promise((res) => setTimeout(res, 1200)); continue; }
      return { ok: false, d: { error: r.status === 403
        ? "The site's security check stopped this request. Reload the page (or open it in a new tab), wait a few seconds, then try again."
        : `The server didn't answer properly (error ${r.status}). Please try again in a minute.` } };
    } catch {
      return { ok: false, d: { error: "Could not reach the server. Check your connection and try again." } };
    }
  }
  return { ok: false, d: { error: "Please try again." } };
}
