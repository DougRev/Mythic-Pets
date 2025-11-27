'use client';

import React, { useEffect } from 'react';
import { Analytics } from 'firebase/analytics';

interface FirebaseAnalyticsProps {
  analytics: Analytics;
}

export function FirebaseAnalytics({ analytics }: FirebaseAnalyticsProps) {
  useEffect(() => {
    // The presence of this component ensures that getAnalytics() is called
    // on the client, which is sufficient to initialize it.
    // We don't need to do anything with the 'analytics' prop itself.
  }, [analytics]);

  return null; // This component does not render anything
}
