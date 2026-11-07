"use client";

type Point = { batch: string; average: number; responses: number };
type Series = { trainer: string; points: Point[]; delta: number | null };

const COLORS = ["#b8860b", "#2b1129", "#0f766e", "#b45309", "#4338ca", "#be123c", "#15803d", "#7c3aed", "#0891b2", "#a16207", "#db2777", "#475569"];

export default function TrainerTrendChart({ series, batches }: { series: Series[]; batches: string[] }) {
  if (!batches.length || !series.length) {
    return <p className="py-10 text-center text-sm text-rei-900/50">Belum ada data untuk digambarkan.</p>;
  }

  const width = 780;
  const height = 300;
  const padding = { top: 24, right: 24, bottom: 46, left: 46 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const xAt = (index: number) => padding.left + (batches.length === 1 ? plotWidth / 2 : (plotWidth * index) / (batches.length - 1));
  const yAt = (value: number) => padding.top + ((5 - Math.min(5, Math.max(1, value))) / 4) * plotHeight;
  const gridValues = [1, 2, 3, 4, 5];

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Grafik tren nilai trainer per batch" className="h-auto w-full min-w-[620px]">
        {gridValues.map((value) => (
          <g key={value}>
            <line x1={padding.left} x2={width - padding.right} y1={yAt(value)} y2={yAt(value)} stroke="#2b1129" strokeOpacity={value === 3 ? 0.25 : 0.1} strokeDasharray={value === 3 ? "4 4" : undefined} />
            <text x={padding.left - 10} y={yAt(value) + 4} textAnchor="end" className="fill-rei-900/50" fontSize="11">{value}</text>
          </g>
        ))}
        {batches.map((batch, index) => (
          <text key={batch} x={xAt(index)} y={height - 18} textAnchor="middle" className="fill-rei-900/60" fontSize="11" fontWeight="600">
            {/^\d+$/.test(batch) ? `Batch ${batch}` : batch}
          </text>
        ))}
        {series.map((entry, seriesIndex) => {
          const color = COLORS[seriesIndex % COLORS.length];
          const points = entry.points.map((point) => ({ ...point, x: xAt(batches.indexOf(point.batch)), y: yAt(point.average) }));
          const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
          return (
            <g key={entry.trainer}>
              {points.length > 1 && <path d={path} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />}
              {points.map((point) => (
                <circle key={point.batch} cx={point.x} cy={point.y} r="4.5" fill="#fff" stroke={color} strokeWidth="2.4">
                  <title>{`${entry.trainer} · Batch ${point.batch}: ${point.average.toFixed(2)}/5 (${point.responses} penilaian)`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
        {series.map((entry, index) => (
          <li key={entry.trainer} className="flex items-center gap-2 text-xs font-semibold text-rei-900/75">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
            {entry.trainer}
            {entry.delta !== null && (
              <span className={entry.delta >= 0 ? "font-bold text-emerald-700" : "font-bold text-rose-700"}>
                {entry.delta >= 0 ? "▲" : "▼"} {Math.abs(entry.delta).toFixed(2)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
