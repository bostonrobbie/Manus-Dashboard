import { useMemo } from "react";

interface CorrelationHeatmapProps {
  strategyIds: number[];
  matrix: number[][];
}

const colorForValue = (value: number) => {
  const clamped = Math.max(-1, Math.min(1, value));
  const intensity = Math.round(Math.abs(clamped) * 120);
  const hue = clamped >= 0 ? 140 : 0;
  return `hsl(${hue}deg 70% ${80 - intensity / 2}%)`;
};

function CorrelationHeatmap({ strategyIds, matrix }: CorrelationHeatmapProps) {
  const hasData = strategyIds.length > 0 && matrix.length > 0;
  const labels = useMemo(() => strategyIds.map(id => `S${id}`), [strategyIds]);

  if (!hasData) {
    return <div className="rounded border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Add 2-4 strategies to view the correlation matrix.</div>;
  }

  return (
    <div className="overflow-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="px-2 py-2" />
            {labels.map(label => (
              <th key={label} className="px-2 py-2 text-center font-semibold text-slate-700">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, rowIndex) => (
            <tr key={strategyIds[rowIndex]}>
              <th className="px-2 py-2 text-left font-semibold text-slate-700">{labels[rowIndex]}</th>
              {row.map((value, colIndex) => (
                <td key={`${rowIndex}-${colIndex}`} className="px-2 py-1 text-center">
                  <div
                    className="flex h-10 items-center justify-center rounded"
                    style={{ backgroundColor: colorForValue(value) }}
                    aria-label={`corr-${rowIndex}-${colIndex}`}
                  >
                    <span className="text-xs font-semibold text-slate-900">{value.toFixed(2)}</span>
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CorrelationHeatmap;
