'use client';

import { Printer } from 'lucide-react';

export function PrintButton() {
  return (
    <button className="btn btn-dark" type="button" onClick={() => window.print()}>
      <Printer className="icon" />
      Print receipt
    </button>
  );
}
