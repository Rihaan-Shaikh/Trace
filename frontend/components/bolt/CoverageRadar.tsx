import { useState, useEffect, useRef } from 'react';
import { Reveal } from '@/components/Reveal';
import { useCountUp } from '@/hooks/useCountUp';
import { useInView } from '@/hooks/useInView';
import { Layers, TrendingDown, Shield, AlertTriangle, Activity } from 'lucide-react';

interface Dimension {
  id: string;
  label: string;
  short: string;
  risk: number;
  coverage: number;
  trend: number[];
  category: 'market' | 'credit' | 'operational' | 'systemic';
}

const dimensions: Dimension[] = [
  { id: 'liq',  label: 'Liquidity',       short: 'LIQ',  risk: 0.12, coverage: 96, trend: [0.14,0.13,0.15,0.12,0.11,0.12,0.12], category: 'market' },
  { id: 'cred', label: 'Credit',          short: 'CRD',  risk: 0.31, coverage: 87, trend: [0.28,0.30,0.29,0.33,0.31,0.30,0.31], category: 'credit' },
  { id: 'mkt',  label: 'Market',          short: 'MKT',  risk: 0.24, coverage: 91, trend: [0.20,0.22,0.25,0.23,0.24,0.22,0.24], category: 'market' },
  { id: 'ops',  label: 'Operational',     short: 'OPS',  risk: 0.08, coverage: 98, trend: [0.09,0.08,0.07,0.08,0.09,0.08,0.08], category: 'operational' },
  { id: 'reg',  label: 'Regulatory',      short: 'REG',  risk: 0.19, coverage: 93, trend: [0.17,0.18,0.20,0.19,0.18,0.19,0.19], category: 'operational' },
  { id: 'coun', label: 'Counterparty',    short: 'CPRT', risk: 0.41, coverage: 82, trend: [0.38,0.40,0.39,0.42,0.41,0.43,0.41], category: 'credit' },
  { id: 'conc', label: 'Concentration',   short: 'CONC', risk: 0.15, coverage: 95, trend: [0.16,0.15,0.14,0.15,0.16,0.15,0.15], category: 'systemic' },
  { id: 'cur',  label: 'Currency',        short: 'CUR',  risk: 0.22, coverage: 90, trend: [0.24,0.23,0.21,0.22,0.20,0.22,0.22], category: 'market' },
  { id: 'rate', label: 'Interest Rate',   short: 'RATE', risk: 0.17, coverage: 94, trend: [0.18,0.17,0.16,0.17,0.19,0.17,0.17], category: 'market' },
  { id: 'vol',  label: 'Volatility',      short: 'VOL',  risk: 0.35, coverage: 85, trend: [0.32,0.34,0.36,0.33,0.35,0.37,0.35], category: 'market' },
  { id: 'tail', label: 'Tail',            short: 'TAIL', risk: 0.48, coverage: 79, trend: [0.45,0.47,0.46,0.49,0.48,0.50,0.48], category: 'systemic' },
  { id: 'corr', label: 'Correlation',     short: 'CORR', risk: 0.18, coverage: 92, trend: [0.20,0.19,0.17,0.18,0.19,0.18,0.18], category: 'systemic' },
  { id: 'model',label: 'Model',           short: 'MOD',  risk: 0.29, coverage: 88, trend: [0.27,0.28,0.30,0.29,0.28,0.29,0.29], category: 'operational' },
  { id: 'cyb',  label: 'Cyber',           short: 'CYB',  risk: 0.11, coverage: 97, trend: [0.10,0.12,0.11,0.09,0.11,0.12,0.11], category: 'operational' },
];

const categories = [
  { id: 'all',         label: 'ALL',         color: 'text-ink-200',   dot: 'bg-ink-300' },
  { id: 'market',      label: 'MARKET',      color: 'text-signal-300',dot: 'bg-signal-400' },
  { id: 'credit',      label: 'CREDIT',      color: 'text-ember-300', dot: 'bg-ember-400' },
  { id: 'operational', label: 'OPERATIONAL', color: 'text-sage-300',  dot: 'bg-sage-400' },
  { id: 'systemic',    label: 'SYSTEMIC',    color: 'text-ember-400', dot: 'bg-ember-500' },
] as const;

function riskHex(risk: number): string {
  if (risk < 0.15) return '#22c55e';
  if (risk < 0.25) return '#06b6d4';
  if (risk < 0.35) return '#f97316';
  return '#ea580c';
}

function riskLabel(risk: number): string {
  if (risk < 0.15) return 'LOW';
  if (risk < 0.25) return 'MOD';
  if (risk < 0.35) return 'HIGH';
  return 'CRIT';
}

function riskDescription(risk: number): string {
  if (risk < 0.15) return 'Within normal parameters. No hedge overlay required for this dimension.';
  if (risk < 0.25) return 'Moderate risk. Monitored continuously. Contributes to aggregate coverage calculation.';
  if (risk < 0.35) return 'Elevated risk. Hedge overlay recommended. Partial contribution to tail-risk exposure.';
  return 'Critical risk. Manual review triggered. Full hedge overlay required before clearance.';
}

// Radar chart geometry
const CX = 160;
const CY = 160;
const R_MAX = 120;
const N = dimensions.length;

function polarAngle(i: number): number {
  return (i / N) * 2 * Math.PI - Math.PI / 2;
}

function polarPoint(angle: number, radius: number): [number, number] {
  return [CX + radius * Math.cos(angle), CY + radius * Math.sin(angle)];
}

function radarPath(values: number[]): string {
  return values
    .map((v, i) => {
      const [x, y] = polarPoint(polarAngle(i), v * R_MAX);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ') + ' Z';
}

export function CoverageRadar() {
  const [selected, setSelected] = useState<Dimension>(dimensions[5]);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [ref, inView] = useInView<HTMLDivElement>();

  const avgCoverage = useCountUp(89.7, 2200, inView);
  const totalTraces = useCountUp(2401, 2200, inView);
  const avgRisk = useCountUp(0.041, 2200, inView);
  const coverageGauge = useCountUp(94.2, 2000, inView);

  const filtered = activeFilter === 'all'
    ? dimensions
    : dimensions.filter((d) => d.category === activeFilter);

  const radarValues = dimensions.map((d) => d.risk);

  return (
    <section id="coverage" className="relative py-20 lg:py-32 overflow-hidden bg-[#0A0A0C] text-ink-50 -mx-6 px-6 sm:-mx-12 sm:px-12 md:-mx-24 md:px-24 rounded-lg my-16">
      <div className="absolute inset-0 opacity-40"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 60% 30%, rgba(6,182,212,0.05), transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-[1400px]">
        {/* Section header */}
        <Reveal>
          <div className="flex items-center gap-4 mb-12">
            <span className="font-mono text-xs text-vermilion-500 tracking-[0.3em]">
              004 / COVERAGE
            </span>
            <div className="flex-1 h-px bg-gradient-to-r from-ink-700 to-transparent" />
          </div>
        </Reveal>

        <Reveal delay={100}>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-parchment-100 mb-4 text-balance max-w-3xl">
            Fourteen dimensions. One envelope.
          </h2>
        </Reveal>
        <Reveal delay={200}>
          <p className="text-ink-400 text-lg max-w-2xl mb-16">
            Every trace scans fourteen risk dimensions in parallel. Each
            contributes to the final coverage envelope. Hover the radar or a
            card to inspect any dimension.
          </p>
        </Reveal>

        {/* Top row: radar + gauge */}
        <div className="grid lg:grid-cols-12 gap-8 mb-8">
          {/* Radar chart */}
          <Reveal delay={200} className="lg:col-span-7">
            <div className="relative rounded-xl border border-ink-700/60 bg-ink-900/40 backdrop-blur-sm p-6 lg:p-8 h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-vermilion-400" />
                  <span className="font-mono text-xs text-ink-300 tracking-wider">
                    RISK RADAR — 14 DIMENSIONS
                  </span>
                </div>
                <span className="font-mono text-[10px] text-ink-500">LIVE</span>
              </div>

              <div className="relative flex items-center justify-center">
                <RadarChart
                  values={radarValues}
                  selectedId={selected.id}
                  onSelect={(d) => setSelected(d)}
                  inView={inView}
                />
              </div>

              {/* Category filter */}
              <div className="mt-4 flex flex-wrap gap-2 justify-center pt-4 border-t border-ink-700/40">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveFilter(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-mono text-[10px] tracking-wider transition-all duration-300 ${
                      activeFilter === cat.id
                        ? 'border-ink-400 bg-ink-800/60 ' + cat.color
                        : 'border-ink-700/50 text-ink-500 hover:border-ink-600 hover:text-ink-300'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${cat.dot}`} />
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Right column: gauge + stats */}
          <div className="lg:col-span-5 space-y-6">
            {/* Coverage gauge */}
            <Reveal delay={300}>
              <div className="relative rounded-xl border border-ink-700/60 bg-ink-900/40 backdrop-blur-sm p-6 lg:p-8">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-4 h-4 text-[#22c55e]" />
                  <span className="font-mono text-xs text-ink-300 tracking-wider">
                    COVERAGE ENVELOPE
                  </span>
                </div>

                <CoverageGauge value={coverageGauge} inView={inView} />

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-ink-800/40 border border-ink-700/30">
                    <div className="font-mono text-[10px] text-ink-500 tracking-wider mb-1">MAX LOSS BOUND</div>
                    <div className="font-mono text-lg text-ink-50">$1.2M</div>
                  </div>
                  <div className="p-3 rounded-lg bg-ink-800/40 border border-ink-700/30">
                    <div className="font-mono text-[10px] text-ink-500 tracking-wider mb-1">HEDGE OVERLAY</div>
                    <div className="font-mono text-lg text-vermilion-400">12%</div>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Live counters */}
            <Reveal delay={400}>
              <div ref={ref} className="grid grid-cols-3 gap-px bg-ink-700/40 rounded-xl overflow-hidden border border-ink-700/60">
                {[
                  { val: avgCoverage.toFixed(1) + '%', label: 'AVG COV', icon: Shield, iconColor: 'text-[#22c55e]' },
                  { val: Math.floor(totalTraces).toLocaleString(), label: 'TRACES', icon: Activity, iconColor: 'text-[#06b6d4]' },
                  { val: avgRisk.toFixed(3), label: 'AVG RISK', icon: TrendingDown, iconColor: 'text-vermilion-400' },
                ].map((s) => (
                  <div key={s.label} className="bg-ink-900/60 p-4 text-center">
                    <s.icon className={`w-3.5 h-3.5 mx-auto mb-2 ${s.iconColor}`} strokeWidth={1.5} />
                    <div className="font-mono text-lg lg:text-xl text-ink-50 font-medium">
                      {s.val}
                    </div>
                    <div className="font-mono text-[9px] text-ink-500 mt-1 tracking-wider">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>

        {/* Bottom row: dimension grid + detail */}
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Dimension cards */}
          <Reveal delay={200} className="lg:col-span-8">
            <div className="rounded-xl border border-ink-700/60 bg-ink-900/40 backdrop-blur-sm p-6 lg:p-8">
              <div className="flex items-center justify-between mb-6">
                <span className="font-mono text-xs text-ink-300 tracking-wider">
                  DIMENSION CARDS
                </span>
                <span className="font-mono text-[10px] text-ink-500">
                  {filtered.length} / {dimensions.length} SHOWN
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filtered.map((d) => (
                  <DimensionCard
                    key={d.id}
                    dim={d}
                    selected={selected.id === d.id}
                    onSelect={() => setSelected(d)}
                  />
                ))}
              </div>
            </div>
          </Reveal>

          {/* Detail panel */}
          <Reveal delay={300} className="lg:col-span-4">
            <DetailPanel dim={selected} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ---------- Radar Chart ----------

function RadarChart({
  values,
  selectedId,
  onSelect,
  inView,
}: {
  values: number[];
  selectedId: string;
  onSelect: (d: Dimension) => void;
  inView: boolean;
}) {
  const [animProgress, setAnimProgress] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf: number | undefined;
    const start = performance.now();
    const dur = 1400;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      setAnimProgress(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [inView]);

  const animatedValues = values.map((v) => v * animProgress);
  const rings = [0.25, 0.5, 0.75, 1.0];

  return (
    <svg viewBox="0 0 320 320" className="w-full max-w-[400px] h-auto">
      {/* Background rings */}
      {rings.map((r) => {
        const pts = Array.from({ length: N }, (_, i) => {
          const [x, y] = polarPoint(polarAngle(i), r * R_MAX);
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');
        return (
          <polygon
            key={r}
            points={pts}
            fill="none"
            stroke="#1a2029"
            strokeWidth="1"
          />
        );
      })}

      {/* Spokes */}
      {dimensions.map((d, i) => {
        const [x, y] = polarPoint(polarAngle(i), R_MAX);
        const isActive = d.id === selectedId;
        return (
          <line
            key={d.id}
            x1={CX}
            y1={CY}
            x2={x}
            y2={y}
            stroke={isActive ? '#252d39' : '#12161e'}
            strokeWidth="1"
          />
        );
      })}

      {/* Filled radar area */}
      <path
        d={radarPath(animatedValues)}
        fill="rgba(250,90,55,0.08)"
        stroke="#FA5A37"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {dimensions.map((d, i) => {
        const [x, y] = polarPoint(polarAngle(i), d.risk * R_MAX * animProgress);
        const color = riskHex(d.risk);
        const isSelected = d.id === selectedId;
        return (
          <g key={d.id}>
            {/* Invisible hit area */}
            <circle
              cx={x}
              cy={y}
              r="14"
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => onSelect(d)}
              onClick={() => onSelect(d)}
            />
            {isSelected && (
              <circle cx={x} cy={y} r="10" fill="none" stroke={color} strokeWidth="1" opacity="0.3">
                <animate attributeName="r" from="6" to="14" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.5" to="0" dur="1.5s" repeatCount="indefinite" />
              </circle>
            )}
            <circle
              cx={x}
              cy={y}
              r={isSelected ? 5 : 3}
              fill={color}
              fillOpacity={isSelected ? 1 : 0.7}
              stroke="#07090c"
              strokeWidth="1.5"
              style={{ transition: 'r 0.3s' }}
            />
            <text
              x={x}
              y={y - 10}
              textAnchor="middle"
              fill={isSelected ? '#eef1f6' : '#525c70'}
              fontSize="7"
              fontFamily="sans-serif"
              fontWeight={isSelected ? '600' : '400'}
              style={{ transition: 'fill 0.3s', pointerEvents: 'none' }}
            >
              {d.short}
            </text>
          </g>
      )})}
    </svg>
  );
}

// ---------- Coverage Gauge ----------

function CoverageGauge({ value, inView }: { value: number; inView: boolean }) {
  const size = 180;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = value / 100;
  const dash = circ * pct;

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1a2029"
          strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 0.1s linear' }}
        />
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#FA5A37" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-3xl text-ink-50 font-medium">
          {value.toFixed(1)}%
        </span>
        <span className="font-mono text-[10px] text-ink-500 tracking-wider mt-1">
          COVERAGE
        </span>
      </div>
    </div>
  );
}

// ---------- Dimension Card ----------

function DimensionCard({
  dim,
  selected,
  onSelect,
}: {
  dim: Dimension;
  selected: boolean;
  onSelect: () => void;
}) {
  const color = riskHex(dim.risk);

  return (
    <button
      onClick={onSelect}
      onMouseEnter={onSelect}
      className={`group relative rounded-lg border p-3.5 text-left transition-all duration-300 overflow-hidden ${
        selected
          ? 'border-ink-300 scale-[1.03] bg-ink-800/50'
          : 'border-ink-700/40 hover:border-ink-500 bg-ink-800/20'
      }`}
    >
      {/* Color stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-0.5 transition-all duration-300"
        style={{ background: color, opacity: selected ? 1 : 0.4 }}
      />

      <div className="flex items-start justify-between mb-2">
        <span className="font-mono text-[10px] text-ink-300 tracking-wider uppercase">
          {dim.label}
        </span>
        <span
          className="font-mono text-[9px] px-1.5 py-0.5 rounded tracking-wider"
          style={{ color, background: `${color}15` }}
        >
          {riskLabel(dim.risk)}
        </span>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="font-mono text-lg font-medium" style={{ color }}>
            {dim.risk.toFixed(2)}
          </div>
          <div className="font-mono text-[10px] text-ink-500">
            {dim.coverage}% cov
          </div>
        </div>

        {/* Mini sparkline */}
        <Sparkline data={dim.trend} color={color} width={36} height={20} />
      </div>
    </button>
  );
}

// ---------- Detail Panel ----------

function DetailPanel({ dim }: { dim: Dimension }) {
  const color = riskHex(dim.risk);

  return (
    <div className="rounded-xl border border-ink-700/60 bg-ink-900/40 backdrop-blur-sm p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-xs text-ink-400 tracking-wider">
          DIMENSION DETAIL
        </span>
        <span
          className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider"
          style={{ color }}
        >
          {dim.risk >= 0.35 && <AlertTriangle className="w-3 h-3" />}
          {riskLabel(dim.risk)}
        </span>
      </div>

      <h3 className="font-serif text-2xl text-ink-50 mb-1">{dim.label}</h3>
      <span className="font-mono text-[10px] text-ink-500 uppercase tracking-wider">
        {dim.category}
      </span>

      {/* Bars */}
      <div className="mt-6 space-y-5">
        <div>
          <div className="flex justify-between text-xs font-mono mb-2">
            <span className="text-ink-400">RISK SCORE</span>
            <span style={{ color }}>{dim.risk.toFixed(2)}</span>
          </div>
          <div className="h-2 bg-ink-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${dim.risk * 100}%`, background: color }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs font-mono mb-2">
            <span className="text-ink-400">COVERAGE</span>
            <span className="text-[#22c55e]">{dim.coverage}%</span>
          </div>
          <div className="h-2 bg-ink-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${dim.coverage}%`,
                background: 'linear-gradient(90deg, #22c55e, #06b6d4)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Trend chart */}
      <div className="mt-6 pt-5 border-t border-ink-700/40">
        <div className="flex justify-between text-xs font-mono mb-3">
          <span className="text-ink-400">7-PERIOD TREND</span>
          <span className="text-ink-500">
            {dim.trend[0].toFixed(2)} → {dim.trend[dim.trend.length - 1].toFixed(2)}
          </span>
        </div>
        <Sparkline data={dim.trend} color={color} width={240} height={50} full />
      </div>

      {/* Description */}
      <div className="mt-6 pt-5 border-t border-ink-700/40">
        <p className="text-sm text-ink-400 leading-relaxed">
          {riskDescription(dim.risk)}
        </p>
      </div>

      {/* Footer metrics */}
      <div className="mt-6 pt-5 border-t border-ink-700/40 grid grid-cols-3 gap-3">
        <div>
          <div className="font-mono text-[9px] text-ink-500 tracking-wider mb-0.5">MAX</div>
          <div className="font-mono text-sm" style={{ color }}>
            {Math.max(...dim.trend).toFixed(2)}
          </div>
        </div>
        <div>
          <div className="font-mono text-[9px] text-ink-500 tracking-wider mb-0.5">MIN</div>
          <div className="font-mono text-sm text-[#22c55e]">
            {Math.min(...dim.trend).toFixed(2)}
          </div>
        </div>
        <div>
          <div className="font-mono text-[9px] text-ink-500 tracking-wider mb-0.5">VAR</div>
          <div className="font-mono text-sm text-[#06b6d4]">
            {(Math.max(...dim.trend) - Math.min(...dim.trend)).toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Sparkline ----------

function Sparkline({
  data,
  color,
  width,
  height,
  full = false,
}: {
  data: number[];
  color: string;
  width: number;
  height: number;
  full?: boolean;
}) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const path = `M ${pts.join(' L ')}`;
  const areaPath = `${path} L ${width},${height} L 0,${height} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible flex-shrink-0">
      {full && (
        <path d={areaPath} fill={color} fillOpacity="0.08" />
      )}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={full ? 1.5 : 1}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={full ? 0.9 : 0.6}
      />
      {full && (
        <>
          <circle
            cx={width}
            cy={height - ((data[data.length - 1] - min) / range) * (height - 4) - 2}
            r="3"
            fill={color}
          />
          <circle
            cx={width}
            cy={height - ((data[data.length - 1] - min) / range) * (height - 4) - 2}
            r="6"
            fill="none"
            stroke={color}
            strokeWidth="1"
            opacity="0.3"
          >
            <animate attributeName="r" from="3" to="8" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.4" to="0" dur="2s" repeatCount="indefinite" />
          </circle>
        </>
      )}
    </svg>
  );
}
