import React, { useEffect, useRef } from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    label: string;
    direction: 'up' | 'down' | 'neutral';
  };
  color?: 'teal' | 'blue' | 'amber' | 'red' | 'purple' | 'emerald';
  loading?: boolean;
}

const colorMap = {
  teal: { bg: 'bg-[#0d6b66]/10', text: 'text-[#0d6b66]', iconBg: 'bg-[#0d6b66]' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', iconBg: 'bg-blue-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', iconBg: 'bg-amber-600' },
  red: { bg: 'bg-red-50', text: 'text-red-600', iconBg: 'bg-red-600' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', iconBg: 'bg-purple-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', iconBg: 'bg-emerald-600' },
};

const trendColors = {
  up: 'text-emerald-600 bg-emerald-50',
  down: 'text-red-600 bg-red-50',
  neutral: 'text-slate-500 bg-slate-100',
};

const trendArrows = {
  up: '↑',
  down: '↓',
  neutral: '→',
};

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, trend, color = 'teal', loading = false }) => {
  const colors = colorMap[color];
  const valueRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading || !valueRef.current || typeof value !== 'number') return;
    const el = valueRef.current;
    const target = value as number;
    const duration = 600;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      el.textContent = Math.round(target * eased).toLocaleString();
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, loading]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-20 rounded bg-slate-200" />
          <div className="h-10 w-10 rounded-lg bg-slate-200" />
        </div>
        <div className="h-8 w-16 rounded bg-slate-200 mb-2" />
        <div className="h-3 w-24 rounded bg-slate-200" />
      </div>
    );
  }

  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-6 hover:shadow-lg hover:border-slate-300 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</span>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colors.iconBg} text-white shadow-sm group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
      </div>
      <div className="mb-1">
        <span ref={valueRef} className="text-3xl font-bold tracking-tight text-slate-900">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
      </div>
      {trend && (
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${trendColors[trend.direction]}`}>
            {trendArrows[trend.direction]} {Math.abs(trend.value)}%
          </span>
          <span className="text-xs text-slate-400">{trend.label}</span>
        </div>
      )}
    </div>
  );
};

export default StatsCard;
