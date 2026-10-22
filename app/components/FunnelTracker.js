'use client';

import { useEffect } from 'react';
import { trackOnce, visitSource } from '../../lib/track';

// Renders nothing. Records one "landed" event per browser tab session.
export default function FunnelTracker() {
  useEffect(() => {
    trackOnce('landed', 'landed', undefined, visitSource());
  }, []);
  return null;
}
