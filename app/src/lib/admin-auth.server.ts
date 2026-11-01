import { ADMIN_RESET_MINUTES, adminConfigured, adminResetUser, changeOwnPassword, createAdminResetLink, currentAdmin, finishAdminReset, json, listAdminUsers, login, logoutCookie, manageUsers, setupFirstUser } from "./admin.server";
import { bindings } from "./bindings.server";
import { readSettings } from "./shop.server";
import { notifyOwner, ownerAlertsReady, ownerPhone } from "./whatsapp.server";

const MAX_FAILS = 8;
const LOCK_MINUTES = 15;

/** Sign-in, sign-out, first-time setup, password reset and password change for the back office.
 *  Served at /api/admin/session (and the older /api/admin/login). */
export async function adminAuthPost(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  // Credentials travel as login_name/secret (older clients: username/password).
  const password = String(body.secret ?? body.password ?? "");
  const uname = String(body.login_name ?? body.username ?? "");
  if (body.logout) return json({ ok: true }, { headers: { "set-cookie": logoutCookie() } });
  if (body.users) {
    const err = await manageUsers(request, body);
    if (err) return json({ ok: false, error: err }, { status: 400 });
    return json({ ok: true, users: await listAdminUsers() });
  }
  if (body.setup) {
    if (await adminConfigured()) return json({ ok: false, code: "already_configured", error: "The owner login already exists. Taking you to sign in..." }, { status: 409 });
    const cookie = await setupFirstUser(uname, String(body.name ?? ""), password);
    if (!cookie) return json({ ok: false, error: "Could not create that login. Use a simple username and a password of 8+ characters." }, { status: 400 });
    return json({ ok: true }, { headers: { "set-cookie": cookie } });
  }
  if (body.forgot) {
    // Forgot password: a one-time link goes to the shop owner's WhatsApp, never to the browser.
    const settings = await readSettings();
    const phone = ownerPhone(settings);
    if (!ownerAlertsReady(settings)) return json({ ok: false, error: "Shop WhatsApp alerts aren't set up, so a reset link can't be sent. Ask another Super Admin to reset your password in Logins & roles." }, { status: 400 });
    const made = await createAdminResetLink(uname, new URL(request.url).origin);
    if (made) await notifyOwner(settings, `Little Bean admin: password reset link for "${made.user.username}" (${made.user.name || made.user.username}). Works once, for ${ADMIN_RESET_MINUTES} minutes:\n${made.link}\nIf you didn't ask for this, ignore it.`).catch(() => undefined);
    // Same answer either way, so usernames can't be guessed.
    return json({ ok: true, to: phone ? `•••${phone.slice(-4)}` : "", minutes: ADMIN_RESET_MINUTES });
  }
  if (body.reset_check) return json({ ok: true, username: await adminResetUser(String(body.token ?? "")) });
  if (body.reset) {
    const cookie = await finishAdminReset(String(body.token ?? ""), password);
    if (!cookie) return json({ ok: false, error: password.length < 8 ? "Use at least 8 characters." : "This reset link has expired or was already used. Ask for a new one." }, { status: 400 });
    return json({ ok: true }, { headers: { "set-cookie": cookie } });
  }
  if (body.change) {
    const cookie = await changeOwnPassword(request, password);
    if (!cookie) return json({ ok: false, error: "Use at least 8 characters." }, { status: 400 });
    return json({ ok: true }, { headers: { "set-cookie": cookie } });
  }
  const key = uname.trim().toLowerCase().slice(0, 60);
  const { DB } = bindings();
  if (DB && key) {
    const fails = await DB.prepare("SELECT COUNT(*) AS n FROM admin_login_fails WHERE username = ? AND at > datetime('now', ?)").bind(key, `-${LOCK_MINUTES} minutes`).first<{ n: number }>();
    if ((fails?.n ?? 0) >= MAX_FAILS) return json({ ok: false, error: `Too many wrong passwords for this username. Wait ${LOCK_MINUTES} minutes, or use "Forgot password?".` }, { status: 429 });
  }
  const r = await login(uname, password);
  if (!r) {
    if (DB && key) await DB.prepare("INSERT INTO admin_login_fails (username) VALUES (?)").bind(key).run();
    return json({ ok: false, error: "Wrong username or password." }, { status: 401 });
  }
  if (DB) await DB.prepare("DELETE FROM admin_login_fails WHERE username = ? OR at < datetime('now', '-1 day')").bind(key).run();
  return json({ ok: true, user: r.user }, { headers: { "set-cookie": r.cookie } });
}

export async function adminAuthGet(request: Request): Promise<Response> {
  return json({ ok: true, user: await currentAdmin(request) });
}
