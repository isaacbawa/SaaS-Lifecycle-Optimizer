'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import EmailBuilder from '@/components/email-builder/email-builder';
import { Skeleton } from '@/components/ui/skeleton';

function BuilderInner() {
  const params = useSearchParams();
  return (
    <EmailBuilder
      templateId={params.get('id') ?? undefined}
      context={params.get('context') as 'standalone' | 'campaign' | 'flow' | undefined}
      campaignId={params.get('campaignId') ?? undefined}
    />
  );
}

export default function EmailBuilderPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Skeleton className="h-12 w-48" /></div>}>
      <BuilderInner />
    </Suspense>
  );
}
