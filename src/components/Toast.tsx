'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CircleCheck } from 'lucide-react';

/** Shows `?toast=...` as a Bolt-style pill notification, then cleans the URL. */
export function Toast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const message = params.get('toast');
  const [shown, setShown] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    setShown(message);
    const next = new URLSearchParams(params.toString());
    next.delete('toast');
    router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
    const t = setTimeout(() => setShown(null), 3500);
    return () => clearTimeout(t);
  }, [message, params, pathname, router]);

  if (!shown) return null;
  return (
    <div className="toast" role="status" data-testid="toast">
      <CircleCheck className="icon" />
      {shown}
    </div>
  );
}
