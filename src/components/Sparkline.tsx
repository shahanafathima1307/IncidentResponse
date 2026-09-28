import React from 'react';

interface SparklineProps {
  label?: string;
  value?: string;
  points?: number[];
  thresholdLabel?: string;
  thresholdValue?: number;
}

export const Sparkline: React.FC<SparklineProps> = ({
  label = '5XX RATE (LAST 30M)',
  value = '12.4% max',
  points = [1.2, 1.4, 1.3, 1.8, 2.4, 3.8, 6.2, 8.5, 11.4, 12.4],
  thresholdLabel,
}) => {
  const min = 0;
  const max = Math.max(...points, 14);
  const width = 280;
  const height = 44;
  const paddingY = 6;

  const getX = (index: number) => (index / (points.length - 1)) * (width - 10) + 5;
  const getY = (val: number) => height - paddingY - ((val - min) / (max - min)) * (height - paddingY * 2);

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p).toFixed(1)}`)
    .join(' ');

  const areaD = `${pathD} L ${getX(points.length - 1)} ${height} L ${getX(0)} ${height} Z`;

  return (
    <div className="rounded-[5px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3 space-y-2 font-jetbrains">
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-[var(--text-muted)] tracking-wider uppercase font-semibold">{label}</span>
        <span className="text-[var(--sem-red)] font-bold tabular-nums">{value}</span>
      </div>

      <div className="relative pt-1">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-11 overflow-visible">
          {thresholdLabel && (
            <line
              x1="0"
              y1={height * 0.35}
              x2={width}
              y2={height * 0.35}
              stroke="#B23A3A"
              strokeDasharray="2 2"
              strokeWidth="1"
              opacity="0.6"
            />
          )}

          {/* Area fill */}
          <path d={areaD} fill="#B23A3A" fillOpacity="0.08" />

          {/* Stroke line */}
          <path
            d={pathD}
            fill="none"
            stroke="#B23A3A"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Peak dot */}
          <circle
            cx={getX(points.length - 1)}
            cy={getY(points[points.length - 1])}
            r="3"
            fill="#B23A3A"
          />
        </svg>

        <div className="flex items-center justify-between text-[11px] font-jetbrains text-[var(--text-dim)] pt-1">
          <span>14:08 UTC</span>
          <span>14:24 UTC</span>
          <span>14:38 UTC</span>
        </div>
      </div>
    </div>
  );
};
