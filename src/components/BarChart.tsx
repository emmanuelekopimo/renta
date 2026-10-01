import { nairaShort, shortPeriod } from '@/lib/format';

/** Lightweight server-rendered SVG bar chart: expected vs collected per month. */
export function BarChart({ data }: { data: { period: string; expected: number; collected: number }[] }) {
  const W = 560;
  const H = 220;
  const pad = { l: 44, r: 8, t: 12, b: 28 };
  const max = Math.max(1, ...data.map((d) => d.expected));
  const step = (W - pad.l - pad.r) / data.length;
  const bw = Math.min(22, step / 3);
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Rent expected versus collected for the last six months">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#e7ecea" strokeDasharray="4 4" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#6b7a72">
              {nairaShort(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = pad.l + step * i + step / 2;
          return (
            <g key={d.period}>
              <rect x={cx - bw - 2} y={y(d.expected)} width={bw} height={y(0) - y(d.expected)} rx="6" fill="#d3f5e3">
                <title>{`Expected ${nairaShort(d.expected)}`}</title>
              </rect>
              <rect x={cx + 2} y={y(d.collected)} width={bw} height={y(0) - y(d.collected)} rx="6" fill="#34d186">
                <title>{`Collected ${nairaShort(d.collected)}`}</title>
              </rect>
              <text x={cx} y={H - 8} textAnchor="middle" fontSize="12" fontWeight="600" fill="#3c4a43">
                {shortPeriod(d.period)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="legend">
        <span><i style={{ background: '#d3f5e3' }} />Expected</span>
        <span><i style={{ background: '#34d186' }} />Collected</span>
      </div>
    </div>
  );
}
