'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface OrientationData {
  beta: number;  // front-back tilt
  gamma: number; // left-right tilt
}

interface UseDeviceOrientationReturn {
  orientation: OrientationData;
  isSupported: boolean;
  permissionState: 'unknown' | 'granted' | 'denied' | 'not_required';
  requestPermission: () => Promise<boolean>;
}

// iOS 13+ requires explicit permission for DeviceOrientationEvent
function requiresPermission(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function'
  );
}

export function useDeviceOrientation(): UseDeviceOrientationReturn {
  const [orientation, setOrientation] = useState<OrientationData>({ beta: 45, gamma: 0 });
  const [isSupported, setIsSupported] = useState(false);
  const [permissionState, setPermissionState] = useState<'unknown' | 'granted' | 'denied' | 'not_required'>('unknown');
  const listeningRef = useRef(false);

  const startListening = useCallback(() => {
    if (listeningRef.current) return;
    listeningRef.current = true;

    const handler = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return;
      setOrientation({ beta: e.beta, gamma: e.gamma });
    };

    window.addEventListener('deviceorientation', handler, true);
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('DeviceOrientationEvent' in window)) {
      setIsSupported(false);
      return false;
    }

    setIsSupported(true);

    if (requiresPermission()) {
      try {
        const result = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
        if (result === 'granted') {
          setPermissionState('granted');
          startListening();
          return true;
        } else {
          setPermissionState('denied');
          return false;
        }
      } catch {
        setPermissionState('denied');
        return false;
      }
    } else {
      // Chrome / non-iOS — no permission needed
      setPermissionState('not_required');
      startListening();
      return true;
    }
  }, [startListening]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('DeviceOrientationEvent' in window)) return;

    setIsSupported(true);

    if (!requiresPermission()) {
      setPermissionState('not_required');
      startListening();
    }
    // iOS stays at 'unknown' until requestPermission() is called
  }, [startListening]);

  return { orientation, isSupported, permissionState, requestPermission };
}
