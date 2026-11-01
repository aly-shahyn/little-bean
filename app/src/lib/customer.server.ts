import { bindings } from "./bindings.server";
import type { Customer } from "./catalog";
import { randomToken, readCookie, sha256 } from "./crypto.server";

const COOKIE = "tt_cust";
const DAYS = 60;

export const CUSTOMER_COLS = "id, name, phone, email, island, address, status, created_at";

export async function createSession(customerId: number): Promise<string> {
  const { DB } = bindings();
  const token = randomToken();
  await DB!.prepare(
    `INSERT INTO customer_sessions (token_hash, customer_id, expires_at) VALUES (?, ?, datetime('now', '+${DAYS} days'))`,
  ).bind(await sha256(token), customerId).run();
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${DAYS * 86400}`;
}

export async function currentCustomer(request: Request): Promise<Customer | null> {
  const { DB } = bindings();
  if (!DB) return null;
  const token = readCookie(request, COOKIE);
  if (!token) return null;
  const row = await DB.prepare(
    `SELECT c.id, c.name, c.phone, c.email, c.island, c.address, c.status, c.created_at, c.avatar, c.baby_name, c.baby_birth, c.baby_gender FROM customer_sessions s
     JOIN customers c ON c.id = s.customer_id WHERE s.token_hash = ? AND s.expires_at > datetime('now')`,
  ).bind(await sha256(token)).first<Customer>();
  return row ?? null;
}

export async function destroySession(request: Request): Promise<string> {
  const { DB } = bindings();
  const token = readCookie(request, COOKIE);
  if (DB && token) await DB.prepare("DELETE FROM customer_sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
