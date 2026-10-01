import { describe, expect, it } from 'vitest';
import { formatDate, formatPeriod, initials, lateLabel, naira, nairaShort, ordinal } from '@/lib/format';

describe('format', () => {
  it('formats Naira', () => {
    expect(naira(1250000)).toBe('₦1,250,000');
    expect(naira(0)).toBe('₦0');
  });
  it('formats compact Naira', () => {
    expect(nairaShort(6_200_000)).toBe('₦6.2M');
    expect(nairaShort(3_000_000)).toBe('₦3M');
    expect(nairaShort(450_000)).toBe('₦450K');
    expect(nairaShort(900)).toBe('₦900');
  });
  it('formats dates and periods', () => {
    expect(formatDate('2026-10-05')).toBe('5 Oct 2026');
    expect(formatDate(null)).toBe('Not set');
    expect(formatPeriod('2026-01')).toBe('January 2026');
  });
  it('builds ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 28].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '28th']);
  });
  it('describes lateness', () => {
    expect(lateLabel(3)).toBe('3 days late');
    expect(lateLabel(1)).toBe('1 day late');
    expect(lateLabel(0)).toBe('Due today');
    expect(lateLabel(-2)).toBe('Due in 2 days');
  });
  it('builds initials', () => {
    expect(initials('Chinedu  Okeke')).toBe('CO');
  });
});
