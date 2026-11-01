import { bindings } from "./bindings.server";

const COOKIE = "tt_admin";
const enc = new TextEncoder();

export type AdminRole = "super" | "admin";
export const ROLES: AdminRole[] = ["super", "admin"];
export const ROLE_LABEL: Record<AdminRole, string> = { super: "Super Admin", admin: "Admin" };
export type AdminUser = { id: number; username: string; name: string; role: AdminRole; active: number; created_at: string; created_by: string; last_login: string | null };
type Row = AdminUser & { pass_hash: string };

/** Optional emergency password from the ADMIN_PASSWORD secret: signs in as username "superadmin" with Super Admin rights. */
function envPassword(): string {
  const env = bindings() as unknown as Record<string, unknown>;
  const v = env.ADMIN_PASSWORD;
  return typeof v === "string" && v.length >= 6 ? v : "";
}

const hex = (buf: ArrayBuffer | Uint8Array) =>
  Array.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");

async function pbkdf2(password: string, saltHex: string): Promise<string> {
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256);
  return hex(bits);
}
async function newHash(password: string): Promise<string> {
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  return `${salt}:${await pbkdf2(password, salt)}`;
}
async function matches(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  return safeEqual(await pbkdf2(password, salt), hash);
}
async function hmac(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
function readCookie(request: Request, name: string): string {
  const raw = request.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return "";
}
function cookieFor(token: string) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;
}
export function logoutCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

/** Session token tied to the user's current password hash: changing the password or deactivating signs them out. */
async function tokenFor(u: { id: number; pass_hash: string }): Promise<string> {
  return `u.${u.id}.${await hmac(u.pass_hash, `tt-admin-user:${u.id}`)}`;
}
const ENV_USER: Omit<Row, "pass_hash"> = { id: 0, username: "superadmin", name: "Owner", role: "super", active: 1, created_at: "", created_by: "", last_login: null };

async function userBy(field: "id" | "username", value: string | number): Promise<Row | null> {
  const { DB } = bindings();
  if (!DB) return null;
  try {
    return await DB.prepare(`SELECT * FROM admin_users WHERE ${field} = ?`).bind(value).first<Row>();
  } catch {
    return null;
  }
}

export async function adminConfigured(): Promise<boolean> {
  if (envPassword()) return true;
  const { DB } = bindings();
  if (!DB) return false;
  try {
    const n = await DB.prepare("SELECT COUNT(*) AS n FROM admin_users WHERE role = 'super' AND active = 1").first<{ n: number }>();
    return (n?.n ?? 0) > 0;
  } catch {
    return false;
  }
}

/** The signed-in back-office user, or null. Role and active status are read fresh on every request. */
export async function currentAdmin(request: Request): Promise<AdminUser | null> {
  const got = readCookie(request, COOKIE);
  const m = /^u\.(\d+)\.([0-9a-f]{64})$/.exec(got);
  if (!m) return null;
  const id = Number(m[1]);
  if (id === 0) {
    const pw = envPassword();
    if (!pw) return null;
    return safeEqual(got, await tokenFor({ id: 0, pass_hash: pw })) ? ENV_USER : null;
  }
  const u = await userBy("id", id);
  if (!u || !u.active) return null;
  if (!safeEqual(got, await tokenFor(u))) return null;
  const { pass_hash: _p, ...rest } = u;
  return rest;
}

export async function adminRole(request: Request): Promise<AdminRole | null> {
  return (await currentAdmin(request))?.role ?? null;
}
export async function isAdmin(request: Request): Promise<boolean> {
  return (await currentAdmin(request)) !== null;
}
export async function isSuperAdmin(request: Request): Promise<boolean> {
  return (await adminRole(request)) === "super";
}

export async function login(username: string, password: string): Promise<{ cookie: string; user: AdminUser } | null> {
  const uname = username.trim().toLowerCase();
  const pw = envPassword();
  if (pw && uname === "superadmin" && safeEqual(password, pw)) return { cookie: cookieFor(await tokenFor({ id: 0, pass_hash: pw })), user: ENV_USER };
  const u = await userBy("username", uname);
  if (!u || !u.active || !(await matches(password, u.pass_hash))) return null;
  await bindings().DB!.prepare("UPDATE admin_users SET last_login = datetime('now') WHERE id = ?").bind(u.id).run();
  const { pass_hash: _p, ...user } = u;
  return { cookie: cookieFor(await tokenFor(u)), user };
}

const USERNAME = /^[a-z0-9._-]{3,30}$/;

/** First-time setup: creates the first Super Admin, only while none exists. */
export async function setupFirstUser(username: string, name: string, password: string): Promise<string | null> {
  const { DB } = bindings();
  const uname = username.trim().toLowerCase();
  if (!DB || (await adminConfigured()) || password.length < 8 || !USERNAME.test(uname)) return null;
  await DB.prepare("INSERT INTO admin_users (username, name, role, pass_hash, created_by) VALUES (?, ?, 'super', ?, 'setup')").bind(uname, name.trim().slice(0, 60), await newHash(password)).run();
  const u = await userBy("username", uname);
  return u ? cookieFor(await tokenFor(u)) : null;
}

/** Change the password of the signed-in user. */
export async function changeOwnPassword(request: Request, password: string): Promise<string | null> {
  const { DB } = bindings();
  const me = await currentAdmin(request);
  if (!DB || !me || me.id === 0 || password.length < 8) return null;
  const hash = await newHash(password);
  await DB.prepare("UPDATE admin_users SET pass_hash = ? WHERE id = ?").bind(hash, me.id).run();
  return cookieFor(await tokenFor({ id: me.id, pass_hash: hash }));
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const { DB } = bindings();
  if (!DB) return [];
  try {
    return (await DB.prepare("SELECT id, username, name, role, active, created_at, created_by, last_login FROM admin_users ORDER BY CASE role WHEN 'super' THEN 0 ELSE 1 END, username").all<AdminUser>()).results ?? [];
  } catch {
    return [];
  }
}

async function activeSupers(DB: NonNullable<ReturnType<typeof bindings>["DB"]>, exceptId = -1) {
  return (await DB.prepare("SELECT COUNT(*) AS n FROM admin_users WHERE role = 'super' AND active = 1 AND id != ?").bind(exceptId).first<{ n: number }>())?.n ?? 0;
}

/** Super Admin user management. Returns an error message, or "" on success. */
export async function manageUsers(request: Request, b: Record<string, unknown>): Promise<string> {
  const { DB } = bindings();
  const me = await currentAdmin(request);
  if (!DB || !me || me.role !== "super") return "Only a Super Admin can manage logins.";
  const action = String(b.action ?? "");
  const role = ROLES.includes(b.role as AdminRole) ? (b.role as AdminRole) : "admin";
  const password = String(b.secret ?? b.password ?? "");

  if (action === "create") {
    const uname = String(b.login_name ?? b.username ?? "").trim().toLowerCase();
    if (!USERNAME.test(uname)) return "Username: 3 to 30 letters, numbers, dots, dashes or underscores.";
    if (password.length < 8) return "Password needs at least 8 characters.";
    if (await userBy("username", uname)) return "That username is already taken.";
    await DB.prepare("INSERT INTO admin_users (username, name, role, pass_hash, created_by) VALUES (?, ?, ?, ?, ?)")
      .bind(uname, String(b.name ?? "").trim().slice(0, 60), role, await newHash(password), me.username)
      .run();
    return "";
  }

  const id = Math.floor(Number(b.id) || 0);
  const u = await userBy("id", id);
  if (!u) return "Login not found.";
  const isSelf = u.id === me.id;

  if (action === "update") {
    const active = b.active === false ? 0 : 1;
    if (isSelf && (role !== "super" || !active)) return "You can't remove your own Super Admin access. Ask another Super Admin.";
    if (u.role === "super" && u.active && (role !== "super" || !active) && (await activeSupers(DB, u.id)) === 0) return "There must always be at least one active Super Admin.";
    await DB.prepare("UPDATE admin_users SET name = ?, role = ?, active = ? WHERE id = ?").bind(String(b.name ?? u.name).trim().slice(0, 60), role, active, id).run();
    return "";
  }
  if (action === "password") {
    if (password.length < 8) return "Password needs at least 8 characters.";
    await DB.prepare("UPDATE admin_users SET pass_hash = ? WHERE id = ?").bind(await newHash(password), id).run();
    return "";
  }
  if (action === "delete") {
    if (isSelf) return "You can't delete your own login.";
    if (u.role === "super" && u.active && (await activeSupers(DB, u.id)) === 0) return "There must always be at least one active Super Admin.";
    await DB.prepare("DELETE FROM admin_users WHERE id = ?").bind(id).run();
    return "";
  }
  return "Unknown action.";
}

export function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...(init.headers ?? {}) },
  });
}

/* ---------- Forgot password: one-time link sent to the shop owner's WhatsApp ---------- */
async function sha(s: string) { return hex(await crypto.subtle.digest("SHA-256", enc.encode(s))); }
export const ADMIN_RESET_MINUTES = 30;

/** Creates a reset link for an active login. Returns the link, or "" if the username is unknown or one was sent in the last minute. */
export async function createAdminResetLink(username: string, origin: string): Promise<{ link: string; user: AdminUser } | null> {
  const { DB } = bindings();
  if (!DB) return null;
  const u = await userBy("username", username.trim().toLowerCase());
  if (!u || !u.active) return null;
  const recent = await DB.prepare("SELECT 1 AS x FROM admin_resets WHERE user_id = ? AND created_at > datetime('now', '-60 seconds')").bind(u.id).first();
  if (recent) return null;
  const token = hex(crypto.getRandomValues(new Uint8Array(24)));
  await DB.batch([
    DB.prepare("UPDATE admin_resets SET used_at = datetime('now') WHERE user_id = ? AND used_at IS NULL").bind(u.id),
    DB.prepare(`INSERT INTO admin_resets (user_id, token_hash, expires_at) VALUES (?, ?, datetime('now', '+${ADMIN_RESET_MINUTES} minutes'))`).bind(u.id, await sha(token)),
  ]);
  const { pass_hash: _p, ...user } = u;
  return { link: `${origin}/admin?reset=${token}`, user };
}

/** Checks a reset link: returns the username it is for, or null. */
export async function adminResetUser(token: string): Promise<string | null> {
  const { DB } = bindings();
  if (!DB || token.length < 20) return null;
  const r = await DB.prepare("SELECT u.username FROM admin_resets r JOIN admin_users u ON u.id = r.user_id WHERE r.token_hash = ? AND r.used_at IS NULL AND r.expires_at > datetime('now') AND u.active = 1").bind(await sha(token)).first<{ username: string }>();
  return r?.username ?? null;
}

/** Sets a new password from a valid link (single use) and signs that person in. */
export async function finishAdminReset(token: string, password: string): Promise<string | null> {
  const { DB } = bindings();
  if (!DB || token.length < 20 || password.length < 8) return null;
  const r = await DB.prepare("SELECT r.id, r.user_id FROM admin_resets r JOIN admin_users u ON u.id = r.user_id WHERE r.token_hash = ? AND r.used_at IS NULL AND r.expires_at > datetime('now') AND u.active = 1").bind(await sha(token)).first<{ id: number; user_id: number }>();
  if (!r) return null;
  const hash = await newHash(password);
  await DB.batch([
    DB.prepare("UPDATE admin_users SET pass_hash = ?, last_login = datetime('now') WHERE id = ?").bind(hash, r.user_id),
    DB.prepare("UPDATE admin_resets SET used_at = datetime('now') WHERE user_id = ? AND used_at IS NULL").bind(r.user_id),
  ]);
  return cookieFor(await tokenFor({ id: r.user_id, pass_hash: hash }));
}
