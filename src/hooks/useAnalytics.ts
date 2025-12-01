'use client';

import { getAnalytics, logEvent } from 'firebase/analytics';
import { useAuth } from './useAuth';
import { useCallback } from 'react';

export function useAnalytics() {
  const { app } = useAuth();

  const trackEvent = useCallback((eventName: string, eventParams?: { [key: string]: any }) => {
    if (app && process.env.NODE_ENV === 'production') {
      const analytics = getAnalytics(app);
      logEvent(analytics, eventName, eventParams);
    } else {
      console.log(`[Analytics Event]: ${eventName}`, eventParams);
    }
  }, [app]);

  return { trackEvent };
}
