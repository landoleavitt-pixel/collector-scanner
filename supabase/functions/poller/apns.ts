// Apple Push Notification service (APNs) sender for the iOS app.
//
// Uses token-based auth: a .p8 key from Apple Developer → Keys, signed into a
// short-lived ES256 JWT. No third-party push service needed.
//
// Secrets (supabase secrets set ...):
//   APNS_KEY_ID       — 10-char Key ID of the .p8 key
//   APNS_TEAM_ID      — 10-char Apple Developer Team ID
//   APNS_PRIVATE_KEY  — full contents of the .p8 file (BEGIN/END lines included)
//   APNS_BUNDLE_ID    — com.fieldsandfloors.app
//
// Builds run from Xcode get sandbox tokens; TestFlight/App Store get production
// tokens. We try production first and fall back to sandbox on BadDeviceToken,
// so both kinds work without tracking which is which.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const KEY_ID = Deno.env.get("APNS_KEY_ID");
const TEAM_ID = Deno.env.get("APNS_TEAM_ID");
const PRIVATE_KEY = Deno.env.get("APNS_PRIVATE_KEY");
const BUNDLE_ID = Deno.env.get("APNS_BUNDLE_ID") ?? "com.fieldsandfloors.app";

const HOSTS = ["https://api.push.apple.com", "https://api.sandbox.push.apple.com"];

export const apnsConfigured = Boolean(KEY_ID && TEAM_ID && PRIVATE_KEY);

export interface PushMessage {
  title: string;
  body: string;
  url?: string; // relative path opened when tapped
}

// --- JWT (cached ~50 min; Apple rejects tokens older than 1 hour) ---
let cachedJwt: { token: string; issuedAt: number } | null = null;
let signingKey: CryptoKey | null = null;

function b64url(data: Uint8Array | string): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getSigningKey(): Promise<CryptoKey> {
  if (signingKey) return signingKey;
  const pem = PRIVATE_KEY!.replace(/\\n/g, "\n")
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  signingKey = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  return signingKey;
}

async function getJwt(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedJwt && now - cachedJwt.issuedAt < 50 * 60) return cachedJwt.token;
  const header = b64url(JSON.stringify({ alg: "ES256", kid: KEY_ID }));
  const claims = b64url(JSON.stringify({ iss: TEAM_ID, iat: now }));
  const input = `${header}.${claims}`;
  // WebCrypto ECDSA returns the raw r||s signature JWS expects.
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, await getSigningKey(), new TextEncoder().encode(input)),
  );
  const token = `${input}.${b64url(sig)}`;
  cachedJwt = { token, issuedAt: now };
  return token;
}

// Returns "ok", "gone" (token should be deleted) or "error".
async function sendToToken(token: string, msg: PushMessage): Promise<"ok" | "gone" | "error"> {
  const payload = JSON.stringify({
    aps: { alert: { title: msg.title, body: msg.body }, sound: "default" },
    url: msg.url,
  });

  for (const host of HOSTS) {
    const res = await fetch(`${host}/3/device/${token}`, {
      method: "POST",
      headers: {
        authorization: `bearer ${await getJwt()}`,
        "apns-topic": BUNDLE_ID,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "content-type": "application/json",
      },
      body: payload,
    });
    if (res.ok) return "ok";

    const reason = (await res.json().catch(() => ({})))?.reason ?? "";
    if (res.status === 410 || reason === "Unregistered") return "gone";
    if (reason === "BadDeviceToken") continue; // wrong environment — try sandbox
    console.error(`APNs ${res.status} ${reason} for token ${token.slice(0, 8)}…`);
    return "error";
  }
  return "gone"; // bad in both environments
}

// Push to every iOS device a user has signed in on. Never throws — push is a
// bonus on top of email, so a push failure must not block the email path.
export async function sendPushToUser(
  supabase: SupabaseClient,
  userId: string,
  msg: PushMessage,
): Promise<number> {
  if (!apnsConfigured) return 0;
  try {
    const { data: rows } = await supabase
      .from("push_tokens")
      .select("token")
      .eq("user_id", userId)
      .eq("platform", "ios");

    let delivered = 0;
    for (const { token } of rows ?? []) {
      const result = await sendToToken(token, msg);
      if (result === "ok") delivered++;
      if (result === "gone") await supabase.from("push_tokens").delete().eq("token", token);
    }
    return delivered;
  } catch (err) {
    console.error(`Push to ${userId} failed:`, err instanceof Error ? err.message : err);
    return 0;
  }
}

