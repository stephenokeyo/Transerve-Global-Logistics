import React, { useState } from 'react';
import { Shipment } from '../types/shipping';
import { WeatherData } from '../services/weatherService';
import { 
  RiskAssessmentData, 
  RiskFactor, 
  RegionalTransitPattern, 
  analyzeShippingRisk 
} from '../services/riskAssessmentService';
import { useI18n } from '../i18n/I18nContext';
import { 
  ShieldAlert, ShieldCheck, AlertTriangle, AlertOctagon, TrendingUp,
  Activity, Clock, Compass, Layers, RefreshCw, Zap, CheckCircle2, ChevronRight,
  Route, HelpCircle, Info
} from 'lucide-react';

interface RiskAssessmentProps {
  shipment: Shipment;
  weatherData?: WeatherData | null;
}

export const RiskAssessment: React.FC<RiskAssessmentProps> = ({ shipment, weatherData }) => {
  const { t } = useI18n();
  const [cacheKey, setCacheKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'corridors' | 'factors'>('overview');

  const riskData: RiskAssessmentData = React.useMemo(() => {
    // re-evaluate when shipment, weatherData, or cacheKey updates
    return analyzeShippingRisk(shipment, weatherData);
  }, [shipment, weatherData, cacheKey]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setCacheKey(prev => prev + 1);
      setIsRefreshing(false);
    }, 450);
  };

  const getRiskBadgeStyles = (level: string) => {
    switch (level) {
      case 'critical':
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          indicator: 'bg-rose-500',
          text: t('risk.levelCritical'),
          icon: <AlertOctagon className="w-4 h-4 text-rose-600" />,
          progressColor: 'bg-rose-600',
        };
      case 'elevated':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          indicator: 'bg-amber-500',
          text: t('risk.levelElevated'),
          icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
          progressColor: 'bg-amber-500',
        };
      case 'moderate':
        return {
          bg: 'bg-sky-50 text-sky-800 border-sky-200',
          indicator: 'bg-sky-500',
          text: t('risk.levelModerate'),
          icon: <ShieldAlert className="w-4 h-4 text-sky-600" />,
          progressColor: 'bg-sky-500',
        };
      case 'low':
      default:
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          indicator: 'bg-emerald-500',
          text: t('risk.levelLow'),
          icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />,
          progressColor: 'bg-emerald-600',
        };
    }
  };

  const badgeStyles = getRiskBadgeStyles(riskData.overallRiskLevel);

  return (
    <div className="p-6 border-t border-slate-100 bg-gradient-to-br from-indigo-50/30 via-white to-slate-50/60">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-100 text-indigo-800 rounded-lg border border-indigo-200">
            <Activity className="w-4 h-4 text-indigo-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                {t('risk.title')}
              </h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono border flex items-center gap-1 ${badgeStyles.bg}`}>
                {badgeStyles.icon}
                <span>{badgeStyles.text}</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {t('risk.subtitle')}
            </p>
          </div>
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-2">
          {/* Sub-tab switcher */}
          <div className="inline-flex p-1 bg-white rounded-lg border border-slate-200 text-xs font-mono shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`px-2.5 py-1 rounded transition-colors font-semibold ${
                activeTab === 'overview'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('corridors')}
              className={`px-2.5 py-1 rounded transition-colors font-semibold ${
                activeTab === 'corridors'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Corridors ({riskData.regionalPatterns.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('factors')}
              className={`px-2.5 py-1 rounded transition-colors font-semibold ${
                activeTab === 'factors'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Factors ({riskData.riskFactors.length})
            </button>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-all disabled:opacity-60 cursor-pointer"
            title={t('risk.refreshAnalysis')}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span className="font-mono text-[11px] hidden sm:inline">
              {t('risk.refreshAnalysis')}
            </span>
          </button>
        </div>
      </div>

      {/* Primary Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {/* 1. On-Time Delivery Probability (Highlighted Dial) */}
        <div className="p-3.5 bg-white rounded-xl border border-indigo-200/80 shadow-2xs hover:border-indigo-300 transition-all relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              {t('risk.onTimeProbability')}
            </span>
            <span className="font-mono text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">
              {t('risk.modelConfidence')}: {riskData.confidenceScorePct}%
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black font-mono text-slate-900 tracking-tight">
              {riskData.onTimeProbabilityPct}%
            </span>
            <span className="text-xs font-bold font-mono text-slate-500">
              Confidence
            </span>
          </div>

          {/* Probability Bar */}
          <div className="w-full h-2 bg-slate-100 rounded-full mt-2.5 overflow-hidden">
            <div 
              className={`h-full transition-all duration-700 rounded-full ${
                riskData.onTimeProbabilityPct >= 85
                  ? 'bg-emerald-500'
                  : riskData.onTimeProbabilityPct >= 70
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${riskData.onTimeProbabilityPct}%` }}
            />
          </div>

          <span className="text-[10px] text-slate-400 mt-2 block font-mono">
            {riskData.onTimeProbabilityPct >= 90
              ? 'High Probability · Greenline Velocity'
              : riskData.onTimeProbabilityPct >= 75
              ? 'Moderate Risk · Within Tolerance'
              : 'Potential Delay Vector Identified'}
          </span>
        </div>

        {/* 2. Projected Delay Metric */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-blue-200 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              {t('risk.predictedDelay')}
            </span>
            <Clock className="w-3.5 h-3.5 text-blue-600" />
          </div>

          <div className="text-2xl font-black font-mono mt-1 text-slate-900">
            {riskData.predictedDelayMinutes === 0
              ? t('risk.zeroDelay')
              : t('risk.minsDelayed', { mins: riskData.predictedDelayMinutes })}
          </div>

          <div className="text-[11px] text-slate-500 mt-2 truncate" title={riskData.projectedDeliveryWindow}>
            Window: <strong className="text-slate-800">{riskData.projectedDeliveryWindow}</strong>
          </div>
        </div>

        {/* 3. Regional Corridor Index */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-blue-200 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              {t('risk.congestion')}
            </span>
            <Route className="w-3.5 h-3.5 text-indigo-600" />
          </div>

          <div className="text-2xl font-black font-mono text-slate-900 mt-1 flex items-baseline gap-1.5">
            <span>
              {Math.round(
                riskData.regionalPatterns.reduce((acc, p) => acc + p.congestionIndex, 0) /
                  riskData.regionalPatterns.length
              )}
            </span>
            <span className="text-xs text-slate-400 font-normal">/ 100</span>
          </div>

          <span className="text-[11px] text-slate-500 mt-2 block truncate">
            {riskData.regionalPatterns[0]?.regionName || 'Intermodal Line-Haul'}
          </span>
        </div>

        {/* 4. Active Transit Factors Breakdown */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-emerald-200 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Vector Balance
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          </div>

          <div className="flex items-center gap-3 text-xs font-mono font-bold mt-1">
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              +{riskData.riskFactors.filter(f => f.riskContribution === 'positive').length} Boosters
            </span>
            <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              -{riskData.riskFactors.filter(f => f.riskContribution === 'negative' || f.riskContribution === 'critical').length} Frictions
            </span>
          </div>

          <span className="text-[10px] text-slate-400 mt-2 block font-mono">
            Telemetry Vector Analysis
          </span>
        </div>
      </div>

      {/* Tab 1: Overview Summary & Operational Mitigations */}
      {activeTab === 'overview' && (
        <div className="space-y-3">
          {/* Corridor status summary banner */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs text-slate-700 flex items-start gap-3">
            <div className="p-1.5 rounded-md bg-blue-100 text-blue-800 shrink-0 mt-0.5">
              <Info className="w-4 h-4 text-blue-700" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="font-bold text-slate-900 font-mono">
                Regional Logistics Pattern Analysis
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                {riskData.corridorStatusSummary}
              </p>
            </div>
          </div>

          {/* Recommended Mitigation Protocol Banner (if any) */}
          {riskData.recommendedMitigation && (
            <div className="bg-amber-50/80 rounded-xl p-3.5 border border-amber-200 text-xs text-amber-900 flex items-start justify-between gap-3 shadow-2xs">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-md bg-amber-200 text-amber-900 shrink-0 mt-0.5">
                  <Zap className="w-4 h-4 text-amber-800" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 font-mono block">
                    {t('risk.mitigationProtocol')}
                  </span>
                  <p className="text-xs font-semibold text-amber-950 mt-0.5">
                    {riskData.recommendedMitigation}
                  </p>
                </div>
              </div>
              <span className="px-2 py-1 rounded bg-amber-200/80 text-[10px] font-mono font-bold text-amber-900 uppercase shrink-0">
                Action Ready
              </span>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Regional Transit Corridors */}
      {activeTab === 'corridors' && (
        <div className="space-y-2.5">
          <div className="text-xs font-bold text-slate-700 font-mono mb-2 flex items-center justify-between">
            <span>{t('risk.regionalCorridors')}</span>
            <span className="text-[11px] font-normal text-slate-500">
              Evaluated against real-time hub dispatches
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {riskData.regionalPatterns.map((pattern) => (
              <div 
                key={pattern.regionCode}
                className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {pattern.regionCode}
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                    pattern.congestionIndex > 60
                      ? 'bg-rose-100 text-rose-800'
                      : pattern.congestionIndex > 40
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    Congestion: {pattern.congestionIndex}/100
                  </span>
                </div>

                <div className="font-bold text-xs text-slate-900">
                  {pattern.regionName}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-[11px] font-mono">
                  <div>
                    <span className="text-slate-400 block text-[9.5px] uppercase">
                      {t('risk.histDelay')}
                    </span>
                    <strong className="text-slate-800">{pattern.historicalDelayFrequencyPct}%</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9.5px] uppercase">
                      {t('risk.dwellTime')}
                    </span>
                    <strong className="text-slate-800">{pattern.typicalDwellMinutes} mins</strong>
                  </div>
                </div>

                {pattern.currentAnomalyNotice && (
                  <p className="text-[10.5px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 leading-snug">
                    {pattern.currentAnomalyNotice}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Detailed Risk & Velocity Factors */}
      {activeTab === 'factors' && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-700 font-mono mb-2 flex items-center justify-between">
            <span>{t('risk.riskFactorBreakdown')}</span>
            <span className="text-[11px] font-normal text-slate-500">
              Corridor Telematics, Weather & SLA Health
            </span>
          </div>

          <div className="space-y-2">
            {riskData.riskFactors.map((factor) => {
              const isPositive = factor.riskContribution === 'positive';
              const isCritical = factor.riskContribution === 'critical';
              const isNegative = factor.riskContribution === 'negative';

              return (
                <div 
                  key={factor.id}
                  className={`p-3 rounded-lg border text-xs flex items-start justify-between gap-3 transition-colors ${
                    isCritical
                      ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                      : isNegative
                      ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                      : isPositive
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 font-mono text-[11px]">
                        {factor.title}
                      </span>
                      <span className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                        isPositive ? 'bg-emerald-200 text-emerald-900' : isCritical ? 'bg-rose-200 text-rose-900' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {factor.category.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      {factor.details}
                    </p>
                  </div>

                  <div className="text-right shrink-0 font-mono">
                    <span className="text-[10px] text-slate-400 block uppercase">Impact</span>
                    <strong className="text-xs font-bold text-slate-900">{factor.impactScore}/100</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
