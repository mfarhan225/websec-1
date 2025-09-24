// app/reset/page.tsx  (SERVER COMPONENT)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Suspense } from 'react';
import ResetInner from './ResetInner';

export default function ResetPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-neutral-500">Loading…</div>}>
      <ResetInner />
    </Suspense>
  );
}
