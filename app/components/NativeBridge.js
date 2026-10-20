'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '../../lib/useUser';
import { createClient } from '../../lib/supabaseClient';
import { isNativeApp, enablePush, getPurchases } from '../../lib/native';

// Runs only inside the iOS app; renders nothing. Once a signed-in user is
// known it:
//   - identifies them to RevenueCat (so purchases map to their profile)
//   - registers the device for push alerts if their plan includes alerts
//   - routes notification taps to the right page
export default function NativeBridge() {
  const router = useRouter();
  const { user } = useUser();

  useEffect(() => {
    if (!isNativeApp()) return;
    document.documentElement.classList.add('native-app');
    // Hand off from the native launch screen. On the home page the web intro
    // is already showing the identical seal in the identical spot, so the
    // swap is instant; elsewhere a short fade. Two frames in, so the page
    // has definitely painted underneath.
    const instant = window.location.pathname === '/';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      import('@capacitor/splash-screen')
        .then(({ SplashScreen }) => SplashScreen.hide({ fadeOutDuration: instant ? 0 : 200 }))
        .catch(() => {});
    }));
    import('@capacitor/status-bar')
      .then(({ StatusBar, Style }) => StatusBar.setStyle({ style: Style.Dark }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isNativeApp() || !user) return;
    let cancelled = false;

    getPurchases(user.id).catch((e) => console.warn('RevenueCat init failed:', e?.message));

    (async () => {
      const { data } = await createClient()
        .from('profiles')
        .select('tier, is_founding_member')
        .eq('id', user.id)
        .single();
      if (cancelled) return;
      if (data?.tier === 'base' || data?.is_founding_member) {
        enablePush((path) => router.push(path)).catch(() => {});
      }
    })();

    return () => { cancelled = true; };
  }, [user, router]);

  return null;
}
