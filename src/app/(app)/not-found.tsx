import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { Empty } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="card">
      <Empty Icon={SearchX} title="Not found">
        <p>That record doesn’t exist or isn’t yours.</p>
        <Link className="btn" href="/">Back to dashboard</Link>
      </Empty>
    </div>
  );
}
