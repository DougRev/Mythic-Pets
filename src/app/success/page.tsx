import React, { Suspense } from 'react';
import { SuccessDisplay } from '@/components/SuccessDisplay';

export default function SuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SuccessDisplay />
    </Suspense>
  );
}
