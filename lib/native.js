'use client';

// Helpers for when the site is running inside the iOS app (Capacitor shell
// loading fieldsandfloors.com). On the plain website every check here is false
// and nothing native is ever loaded.
//
// Apple rule of thumb: inside the app, Base is bought with Apple in-app
// purchase (via RevenueCat), never Stripe — and the app must not link out to
// the web checkout. Anything that would open Stripe checks isNativeApp() first.

import { Capacitor } from '@capacitor/core';

export function isNativeApp() {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function nativePlatform() {
  return isNativeApp() ? Capacitor.getPlatform() : 'web';
}

// RevenueCat public SDK keys are safe to ship to clients. Set in Vercel.
const REVENUECAT_IOS_KEY = process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY;

// Entitlement identifier configured in the RevenueCat dashboard.
export const RC_ENTITLEMENT = 'base';

let purchasesReady = null;

// Configure RevenueCat once per app launch, identified as the Supabase user so
// the webhook can map purchases straight back to a profile.
export async function getPurchases(userId) {
  if (!isNativeApp()) return null;
  if (!REVENUECAT_IOS_KEY) throw new Error('In-app purchase is not configured yet.');
  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  if (!purchasesReady) {
    purchasesReady = Purchases.configure({ apiKey: REVENUECAT_IOS_KEY, appUserID: userId || undefined });
  }
  await purchasesReady;
  if (userId) {
    const { customerInfo } = await Purchases.getCustomerInfo();
    if (customerInfo.originalAppUserId !== userId) await Purchases.logIn({ appUserID: userId });
  }
  return Purchases;
}

// Ask our server to re-read the subscriber from RevenueCat and update the
// profile tier right away, instead of waiting for the webhook.
export async function syncPurchases() {
  const res = await fetch('/api/revenuecat/sync', { method: 'POST' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Could not confirm your purchase');
  return data;
}

// Buy the Base plan. Returns the refreshed tier from our server.
export async function purchaseBase(userId, plan = 'monthly') {
  const Purchases = await getPurchases(userId);
  const { current } = await Purchases.getOfferings();
  const pkg = plan === 'annual' ? current?.annual : (current?.monthly || current?.availablePackages?.[0]);
  if (!pkg) throw new Error('The Base plan is not available right now.');
  try {
    await Purchases.purchasePackage({ aPackage: pkg });
  } catch (e) {
    if (e?.userCancelled || e?.code === '1' || e?.code === 1) return { cancelled: true };
    throw e;
  }
  return syncPurchases();
}

export async function restorePurchases(userId) {
  const Purchases = await getPurchases(userId);
  await Purchases.restorePurchases();
  return syncPurchases();
}

// Opens Apple's own subscription management sheet / page.
export async function openAppleSubscriptions(userId) {
  const Purchases = await getPurchases(userId);
  const { customerInfo } = await Purchases.getCustomerInfo();
  window.location.assign(customerInfo.managementURL || 'https://apps.apple.com/account/subscriptions');
}

// Native Sign in with Apple → Supabase session. Apple gets the SHA-256 of a
// random nonce; Supabase gets the raw nonce and checks they match.
export async function signInWithAppleNative(supabase) {
  const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
  const rawNonce = crypto.randomUUID() + crypto.randomUUID();
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawNonce));
  const hashedNonce = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');

  const { response } = await SignInWithApple.authorize({
    clientId: 'com.fieldsandfloors.app',
    redirectURI: 'https://fieldsandfloors.com/auth/callback',
    scopes: 'email name',
    nonce: hashedNonce,
  });

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: response.identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;
}

// ── Push notifications ──────────────────────────────────────────────
// The APNs device token is stored locally so sign-out can unregister it.
const PUSH_TOKEN_KEY = 'ff_push_token';

export function storedPushToken() {
  try {
    return localStorage.getItem(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
}

let pushListenersAdded = false;

// Ask for permission (iOS shows its prompt only once) and register this
// device with /api/push/register. `onOpen(path)` runs when a notification is
// tapped.
export async function enablePush(onOpen) {
  if (!isNativeApp()) return;
  const { PushNotifications } = await import('@capacitor/push-notifications');

  if (!pushListenersAdded) {
    pushListenersAdded = true;
    await PushNotifications.addListener('registration', async ({ value }) => {
      try {
        localStorage.setItem(PUSH_TOKEN_KEY, value);
      } catch {}
      await fetch('/api/push/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: value, platform: nativePlatform() }),
      }).catch(() => {});
    });
    await PushNotifications.addListener('registrationError', (err) => {
      console.warn('Push registration failed:', err?.error);
    });
    await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
      const path = notification?.data?.url;
      // Only follow our own relative paths.
      if (typeof path === 'string' && path.startsWith('/') && !path.startsWith('//')) onOpen?.(path);
    });
  }

  let { receive } = await PushNotifications.checkPermissions();
  if (receive === 'prompt' || receive === 'prompt-with-rationale') {
    ({ receive } = await PushNotifications.requestPermissions());
  }
  if (receive === 'granted') await PushNotifications.register();
}

export async function unregisterPush() {
  const token = storedPushToken();
  if (!isNativeApp() || !token) return;
  await fetch('/api/push/register', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  }).catch(() => {});
  try {
    localStorage.removeItem(PUSH_TOKEN_KEY);
  } catch {}
}
