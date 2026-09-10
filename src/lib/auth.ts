import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "survey_admin";

function password() {
  return process.env.ADMIN_PASSWORD ?? "";
}

/** Cookie value is an HMAC of the password, so the password itself never sits in the browser. */
function token() {
  return createHmac("sha256", password()).update("survey-admin-v1").digest("hex");
}

export function checkPassword(input: string) {
  const expected = Buffer.from(password());
  const given = Buffer.from(input ?? "");
  if (!expected.length) return false;
  if (expected.length !== given.length) return false;
  return timingSafeEqual(expected, given);
}

export async function isAuthed() {
  if (!password()) return false;
  const jar = await cookies();
  const c = jar.get(ADMIN_COOKIE)?.value;
  if (!c) return false;
  const expected = Buffer.from(token());
  const given = Buffer.from(c);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export async function signIn() {
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function signOut() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
}

export function adminConfigured() {
  return password().length > 0;
}
