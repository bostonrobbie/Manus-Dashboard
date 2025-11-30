import React, {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";

interface Margin {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface ResponsiveContainerProps {
  width?: string | number;
  height?: string | number;
  children: ReactElement<any>;
}

export function ResponsiveContainer({ width = "100%", height = 240, children }: ResponsiveContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>();

  useEffect(() => {
    if (typeof width === "number") {
      setContainerWidth(width);
      return;
    }
    const el = ref.current;
    if (!el) return;

    const resize = () => setContainerWidth(el.getBoundingClientRect().width);
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [width]);

  const resolvedWidth = typeof width === "number" ? width : containerWidth;
  const resolvedHeight = height ?? 240;

  return (
    <div ref={ref} style={{ width, height: resolvedHeight }} className="relative">
      {resolvedWidth && isValidElement(children)
        ? cloneElement(children as ReactElement<any>, { width: resolvedWidth, height: resolvedHeight } as any)
        : null}
    </div>
  );
}
ResponsiveContainer.displayName = "ResponsiveContainer";

export interface LineProps {
  dataKey: string;
  stroke?: string;
  name?: string;
  type?: string;
  strokeWidth?: number;
  dot?: boolean;
}

export function Line(_props: LineProps) {
  return null;
}
(Line as any).role = "Line";

export interface CartesianGridProps {
  strokeDasharray?: string;
  vertical?: boolean;
  stroke?: string;
}

export function CartesianGrid(_props: CartesianGridProps) {
  return null;
}
(CartesianGrid as any).role = "CartesianGrid";

export interface AxisProps {
  dataKey?: string;
  tick?: { fontSize?: number } | boolean;
  tickLine?: boolean;
  axisLine?: boolean;
  tickFormatter?: (value: any) => string;
}

export function XAxis(_props: AxisProps) {
  return null;
}
(XAxis as any).role = "XAxis";

export function YAxis(_props: AxisProps) {
  return null;
}
(YAxis as any).role = "YAxis";

export interface TooltipProps {
  formatter?: (value: any) => string;
}

export function Tooltip(_props: TooltipProps = {}) {
  return null;
}
(Tooltip as any).role = "Tooltip";

export function Legend() {
  return null;
}
(Legend as any).role = "Legend";

interface LineChartProps<T> {
  data: T[];
  width?: number;
  height?: number;
  children?: ReactNode;
  margin?: Margin;
}

function getRole(child: ReactNode): string | null {
  if (!isValidElement(child)) return null;
  const role = (child.type as any)?.role;
  return typeof role === "string" ? role : null;
}

export function LineChart<T extends Record<string, any>>({
  data,
  width = 400,
  height = 240,
  children,
  margin,
}: LineChartProps<T>) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const childArray = useMemo(() => Children.toArray(children), [children]);

  const lineChildren = childArray.filter(child => getRole(child) === "Line") as ReactElement<LineProps>[];
  const hasGrid = childArray.some(child => getRole(child) === "CartesianGrid");
  const hasLegend = childArray.some(child => getRole(child) === "Legend");
  const hasTooltip = childArray.some(child => getRole(child) === "Tooltip");

  const padding = {
    top: margin?.top ?? 16,
    right: margin?.right ?? 16,
    bottom: margin?.bottom ?? 24,
    left: margin?.left ?? 48,
  };

  const innerWidth = Math.max(width - padding.left - padding.right, 1);
  const innerHeight = Math.max(height - padding.top - padding.bottom, 1);

  const valueDomain = useMemo(() => {
    const values = lineChildren
      .flatMap(line => data.map(d => Number((d as any)[line.props.dataKey] ?? 0)))
      .filter(v => Number.isFinite(v));
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 0;
    const span = max - min || 1;
    return { min, max, span };
  }, [data, lineChildren]);

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const xForIndex = (idx: number) => {
    if (data.length <= 1) return padding.left + innerWidth / 2;
    return padding.left + (idx / (data.length - 1)) * innerWidth;
  };

  const yForValue = (value: number) => {
    const { min, span } = valueDomain;
    const ratio = span !== 0 ? (value - min) / span : 0.5;
    return padding.top + (1 - ratio) * innerHeight;
  };

  const onMouseMove = (evt: React.MouseEvent<SVGSVGElement>) => {
    if (data.length === 0 || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = evt.clientX - rect.left - padding.left;
    const ratio = Math.max(0, Math.min(1, x / innerWidth));
    const idx = Math.round(ratio * (data.length - 1));
    setHoverIndex(idx);
  };

  const onMouseLeave = () => setHoverIndex(null);

  if (!data || data.length === 0) {
    return <div className="w-full h-full text-slate-500 text-sm">No data</div>;
  }

  return (
    <div className="w-full h-full text-xs text-slate-700">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        role="img"
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      >
        {hasGrid
          ? Array.from({ length: 4 }).map((_, idx) => {
              const y = padding.top + (innerHeight / 3) * idx;
              return (
                <line
                  key={idx}
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + innerWidth}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                />
              );
            })
          : null}

        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + innerHeight} stroke="#cbd5e1" />
        <line
          x1={padding.left}
          y1={padding.top + innerHeight}
          x2={padding.left + innerWidth}
          y2={padding.top + innerHeight}
          stroke="#cbd5e1"
        />

        {lineChildren.map((line, lineIdx) => {
          const stroke = line.props.stroke ?? ["#0f172a", "#1d4ed8", "#f97316"][lineIdx % 3];
          const points = data
            .map((row, idx) => {
              const value = Number((row as any)[line.props.dataKey] ?? 0);
              const x = xForIndex(idx);
              const y = yForValue(value);
              return `${x},${y}`;
            })
            .join(" ");
          return <polyline key={lineIdx} points={points} fill="none" stroke={stroke} strokeWidth={2} />;
        })}

        {data.map((row, idx) => {
          if (idx % Math.max(1, Math.floor(data.length / 6)) !== 0 && idx !== data.length - 1) return null;
          const x = xForIndex(idx);
          const label = String((row as any).date ?? "");
          return (
            <text key={idx} x={x} y={padding.top + innerHeight + 16} textAnchor="middle" className="fill-slate-500">
              {label}
            </text>
          );
        })}

        {[valueDomain.min, valueDomain.min + valueDomain.span / 2, valueDomain.max].map((val, idx) => (
          <text
            key={idx}
            x={8}
            y={yForValue(val) + 4}
            className="fill-slate-500"
          >
            {val.toFixed(0)}
          </text>
        ))}

        {hoverIndex != null
          ? lineChildren.map((line, lineIdx) => {
              const stroke = line.props.stroke ?? ["#0f172a", "#1d4ed8", "#f97316"][lineIdx % 3];
              const value = Number((data[hoverIndex] as any)[line.props.dataKey] ?? 0);
              const x = xForIndex(hoverIndex);
              const y = yForValue(value);
              return <circle key={lineIdx} cx={x} cy={y} r={3} fill={stroke} />;
            })
          : null}
      </svg>

      {hasLegend ? (
        <div className="flex gap-4 text-xs mt-2">
          {lineChildren.map((line, idx) => {
            const stroke = line.props.stroke ?? ["#0f172a", "#1d4ed8", "#f97316"][idx % 3];
            return (
              <div key={idx} className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: stroke }} aria-hidden />
                <span>{line.props.name ?? line.props.dataKey}</span>
              </div>
            );
          })}
        </div>
      ) : null}

      {hasTooltip && hoverIndex != null ? (
        <div className="mt-2 rounded border border-slate-200 bg-white p-2 shadow-sm">
          <div className="font-medium text-slate-800">{String((data[hoverIndex] as any).date ?? "")}</div>
          {lineChildren.map((line, idx) => {
            const value = Number((data[hoverIndex] as any)[line.props.dataKey] ?? 0);
            const stroke = line.props.stroke ?? ["#0f172a", "#1d4ed8", "#f97316"][idx % 3];
            return (
              <div key={idx} className="flex items-center gap-2 text-slate-700">
                <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: stroke }} aria-hidden />
                <span>{line.props.name ?? line.props.dataKey}</span>
                <span className="ml-auto font-semibold">{value.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
(LineChart as any).role = "LineChart";

export default {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
};
