import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { 
  BarChart3, TrendingUp, Layers, Calendar, 
  ArrowUpRight, Filter, Download, Package 
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

// Generate 30 days of daily shipment volume data
export function generate30DayCarrierData(language: string = 'en') {
  const data = [];
  const now = new Date(2026, 10, 5); // Nov 5, 2026
  const locale = language === 'es' ? 'es-ES' : language === 'fr' ? 'fr-FR' : 'en-US';

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayOfWeek = d.getDay(); // 0 is Sunday, 6 is Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Weekend baseline is lower than mid-week peak
    const weekdayMultiplier = isWeekend ? 0.45 : 1.0 + (dayOfWeek === 2 || dayOfWeek === 4 ? 0.25 : 0);

    const monthStr = d.toLocaleDateString(locale, { month: 'short' });
    const dayNum = d.getDate().toString().padStart(2, '0');
    const label = `${monthStr} ${dayNum}`;

    // Base counts with realistic variance
    const fedex = Math.round((240 + Math.sin(i * 0.8) * 45 + ((i * 7) % 30)) * weekdayMultiplier);
    const ups = Math.round((310 + Math.cos(i * 0.7) * 55 + ((i * 11) % 40)) * weekdayMultiplier);
    const usps = Math.round((190 + Math.sin(i * 1.1) * 35 + ((i * 5) % 25)) * weekdayMultiplier);
    const vanguard = Math.round((120 + Math.cos(i * 0.5) * 25 + ((i * 3) % 20)) * weekdayMultiplier);

    data.push({
      date: label,
      fullDate: d.toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' }),
      FedEx: fedex,
      UPS: ups,
      USPS: usps,
      Vanguard: vanguard,
      Total: fedex + ups + usps + vanguard,
    });
  }

  return data;
}

const CARRIER_COLORS = {
  FedEx: '#7c3aed', // Purple
  UPS: '#d97706',   // Amber
  USPS: '#2563eb',  // Royal Blue
  Vanguard: '#0f172a', // Slate Dark
};

export const CarrierVolumeAnalytics: React.FC = () => {
  const { t, language, formatNumber, formatPercent } = useI18n();
  const data = useMemo(() => generate30DayCarrierData(language), [language]);

  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [selectedCarriers, setSelectedCarriers] = useState({
    FedEx: true,
    UPS: true,
    USPS: true,
    Vanguard: true,
  });

  // Calculate 30-day totals
  const totals = useMemo(() => {
    let fedex = 0;
    let ups = 0;
    let usps = 0;
    let vanguard = 0;

    data.forEach((d) => {
      fedex += d.FedEx;
      ups += d.UPS;
      usps += d.USPS;
      vanguard += d.Vanguard;
    });

    const sum = fedex + ups + usps + vanguard;
    return {
      fedex,
      ups,
      usps,
      vanguard,
      sum,
      fedexPct: Math.round((fedex / sum) * 100),
      upsPct: Math.round((ups / sum) * 100),
      uspsPct: Math.round((usps / sum) * 100),
      vanguardPct: Math.round((vanguard / sum) * 100),
    };
  }, [data]);

  // Donut chart dataset
  const pieData = [
    { name: 'FedEx', value: totals.fedex, color: CARRIER_COLORS.FedEx },
    { name: 'UPS', value: totals.ups, color: CARRIER_COLORS.UPS },
    { name: 'USPS', value: totals.usps, color: CARRIER_COLORS.USPS },
    { name: 'Vanguard', value: totals.vanguard, color: CARRIER_COLORS.Vanguard },
  ];

  const toggleCarrier = (key: keyof typeof selectedCarriers) => {
    setSelectedCarriers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const exportAnalyticsCsv = () => {
    const headers = ['Date', 'FullDate', 'FedEx', 'UPS', 'USPS', 'Vanguard', 'Total'];
    const rows = data.map((d) => [d.date, `"${d.fullDate}"`, d.FedEx, d.UPS, d.USPS, d.Vanguard, d.Total]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `Carrier_Volume_30Days_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Custom high-contrast tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dayTotal = payload.reduce((acc: number, curr: any) => acc + (curr.value || 0), 0);
      return (
        <div className="bg-slate-950 text-white border border-slate-800 rounded-xl p-3 text-xs shadow-2xl font-sans min-w-[200px]">
          <div className="text-[11px] font-mono text-slate-400 border-b border-slate-800 pb-1 mb-2 flex justify-between">
            <span>{payload[0]?.payload?.fullDate || label}</span>
            <span className="font-bold text-slate-200">
              {t('analytics.dayTotal').toUpperCase()}: {formatNumber(dayTotal)}
            </span>
          </div>
          <div className="space-y-1.5">
            {payload.map((p: any) => (
              <div key={p.dataKey} className="flex items-center justify-between font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
                  <span className="font-bold text-slate-300">{p.dataKey}</span>
                </div>
                <span className="font-extrabold text-white tabular-nums">
                  {formatNumber(p.value)} {t('analytics.pkgs')}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* 30-Day KPI Metrics Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total 30D Volume */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px]">{t('analytics.total30dVolume')}</span>
            <span className="text-emerald-700 font-bold font-mono text-[11px] flex items-center">
              <ArrowUpRight className="w-3 h-3" /> +14.2%
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 tabular-nums">
            {formatNumber(totals.sum)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {t('analytics.total30dDesc')}
          </span>
        </div>

        {/* FedEx Volume */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px] text-purple-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-600" />
              FedEx Express & Ground
            </span>
            <span className="font-mono text-purple-700 font-bold text-[11px]">{formatPercent(totals.fedexPct / 100)}</span>
          </div>
          <div className="text-2xl font-black font-mono text-purple-950 tabular-nums">
            {formatNumber(totals.fedex)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {t('analytics.fedexDesc')}
          </span>
        </div>

        {/* UPS Volume */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px] text-amber-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-600" />
              UPS Next Day & Ground
            </span>
            <span className="font-mono text-amber-700 font-bold text-[11px]">{formatPercent(totals.upsPct / 100)}</span>
          </div>
          <div className="text-2xl font-black font-mono text-amber-950 tabular-nums">
            {formatNumber(totals.ups)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {t('analytics.upsDesc')}
          </span>
        </div>

        {/* USPS Volume */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px] text-blue-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              USPS Priority Mail
            </span>
            <span className="font-mono text-blue-700 font-bold text-[11px]">{formatPercent(totals.uspsPct / 100)}</span>
          </div>
          <div className="text-2xl font-black font-mono text-blue-950 tabular-nums">
            {formatNumber(totals.usps)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {t('analytics.uspsDesc')}
          </span>
        </div>
      </div>

      {/* Main Chart Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
        {/* Controls and Title */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                {t('analytics.chartTrendTitle')}
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                {data[0]?.date} – {data[data.length - 1]?.date}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('analytics.chartTrendDesc')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Carrier Filter Toggles */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
              {(['FedEx', 'UPS', 'USPS', 'Vanguard'] as const).map((c) => {
                const active = selectedCarriers[c];
                return (
                  <button
                    key={c}
                    onClick={() => toggleCarrier(c)}
                    className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                      active
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-400 hover:text-slate-700 line-through'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: active ? CARRIER_COLORS[c] : '#94a3b8' }}
                    />
                    <span>{c === 'Vanguard' ? 'Transerve' : c}</span>
                  </button>
                );
              })}
            </div>

            {/* Area vs Bar Switcher */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setChartType('area')}
                className={`px-3 py-1 rounded transition-colors ${
                  chartType === 'area' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('analytics.areaTrend')}
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`px-3 py-1 rounded transition-colors ${
                  chartType === 'bar' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('analytics.stackedBar')}
              </button>
            </div>

            <button
              onClick={exportAnalyticsCsv}
              className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-700 transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('manifest.exportCsv')}</span>
            </button>
          </div>
        </div>

        {/* Recharts Visualization Viewport */}
        <div className="w-full h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFedEx" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="5%" stopColor={CARRIER_COLORS.FedEx} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={CARRIER_COLORS.FedEx} stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorUPS" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="5%" stopColor={CARRIER_COLORS.UPS} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={CARRIER_COLORS.UPS} stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorUSPS" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="5%" stopColor={CARRIER_COLORS.USPS} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={CARRIER_COLORS.USPS} stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorVanguard" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="5%" stopColor={CARRIER_COLORS.Vanguard} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={CARRIER_COLORS.Vanguard} stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickMargin={8}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val}`}
                />
                <Tooltip content={<CustomTooltip />} />

                {selectedCarriers.UPS && (
                  <Area
                    type="monotone"
                    dataKey="UPS"
                    stackId="1"
                    stroke={CARRIER_COLORS.UPS}
                    fill="url(#colorUPS)"
                    strokeWidth={2}
                  />
                )}
                {selectedCarriers.FedEx && (
                  <Area
                    type="monotone"
                    dataKey="FedEx"
                    stackId="1"
                    stroke={CARRIER_COLORS.FedEx}
                    fill="url(#colorFedEx)"
                    strokeWidth={2}
                  />
                )}
                {selectedCarriers.USPS && (
                  <Area
                    type="monotone"
                    dataKey="USPS"
                    stackId="1"
                    stroke={CARRIER_COLORS.USPS}
                    fill="url(#colorUSPS)"
                    strokeWidth={2}
                  />
                )}
                {selectedCarriers.Vanguard && (
                  <Area
                    type="monotone"
                    dataKey="Vanguard"
                    stackId="1"
                    stroke={CARRIER_COLORS.Vanguard}
                    fill="url(#colorVanguard)"
                    strokeWidth={2}
                  />
                )}
              </AreaChart>
            ) : (
              <BarChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickMargin={8}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />

                {selectedCarriers.UPS && (
                  <Bar dataKey="UPS" stackId="a" fill={CARRIER_COLORS.UPS} radius={[0, 0, 0, 0]} />
                )}
                {selectedCarriers.FedEx && (
                  <Bar dataKey="FedEx" stackId="a" fill={CARRIER_COLORS.FedEx} radius={[0, 0, 0, 0]} />
                )}
                {selectedCarriers.USPS && (
                  <Bar dataKey="USPS" stackId="a" fill={CARRIER_COLORS.USPS} radius={[0, 0, 0, 0]} />
                )}
                {selectedCarriers.Vanguard && (
                  <Bar dataKey="Vanguard" stackId="a" fill={CARRIER_COLORS.Vanguard} radius={[3, 3, 0, 0]} />
                )}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Carrier Share Breakdown & Insights Footer */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Donut Distribution */}
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={44}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                {t('analytics.marketShare')}
              </span>
              <div className="text-sm font-extrabold text-slate-900">
                {t('analytics.upsLead', { pct: formatPercent(totals.upsPct / 100) })}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {t('analytics.shareSummary', {
                  fedex: formatPercent(totals.fedexPct / 100),
                  usps: formatPercent(totals.uspsPct / 100),
                })}
              </p>
            </div>
          </div>

          {/* SLA Performance metrics */}
          <div className="space-y-1 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
              {t('analytics.onTimePerformance')}
            </span>
            <div className="flex justify-between font-mono">
              <span className="text-slate-600">FedEx Priority:</span>
              <strong className="text-purple-900">99.8% {t('analytics.onTime')}</strong>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-slate-600">UPS Air/Ground:</span>
              <strong className="text-amber-900">99.5% {t('analytics.onTime')}</strong>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-slate-600">USPS Priority:</span>
              <strong className="text-blue-900">98.9% {t('analytics.onTime')}</strong>
            </div>
          </div>

          {/* Operational Takeaways */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              <span>{t('analytics.volumeInsights')}</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              {t('analytics.insightsText')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

