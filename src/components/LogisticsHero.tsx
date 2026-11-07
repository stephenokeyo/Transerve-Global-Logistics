import React, { useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { Search } from 'lucide-react';

interface LogisticsHeroProps {
  onQuickTrack: (trackingNumber: string) => void;
  onOpenShipmentGenerator: () => void;
}

export const LogisticsHero: React.FC<LogisticsHeroProps> = ({
  onQuickTrack,
  onOpenShipmentGenerator,
}) => {
  const { t, formatPercent } = useI18n();
  const [inputVal, setInputVal] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      onQuickTrack(inputVal.trim());
    }
  };

  return (
    <div className="space-y-12">
      {/* Cinematic Hero Split Banner */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-950 text-white border border-slate-800 shadow-xl">
        {/* Background Image with Scrim */}
        <div className="absolute inset-0 z-0">
          <img
            src="/src/assets/images/hero_cargo_logistics_1793946214753.jpg"
            alt="Transerve Global Cargo Hub at dusk"
            className="w-full h-full object-cover object-center opacity-35"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-3xl p-8 sm:p-12 lg:p-16 space-y-6">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-sky-400">
            <span>{t('hero.networkBadge')}</span>
            <span aria-hidden="true">·</span>
            <span>{t('hero.carriersBadge')}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight [text-wrap:balance]">
            {t('hero.title')}
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            {t('hero.subtitle')}
          </p>

          {/* Quick Track Input Bar */}
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-xl pt-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder={t('hero.searchPlaceholder')}
                className="w-full pl-11 pr-4 py-3 bg-white/10 hover:bg-white/15 focus:bg-white focus:text-slate-900 border border-white/20 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm whitespace-nowrap shrink-0"
            >
              {t('hero.trackBtn')}
            </button>
            <button
              type="button"
              onClick={onOpenShipmentGenerator}
              className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm rounded-xl transition-colors border border-white/20 whitespace-nowrap shrink-0"
            >
              {t('hero.generateBtn')}
            </button>
          </form>
        </div>
      </div>

      {/* Quantitative Rigor Metrics (§1.H) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {t('metric.onTimeSla')}
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums mt-1 block">
            {formatPercent(99.84, 2)}
          </span>
          <span className="text-xs text-slate-500 mt-1 block">
            {t('metric.onTimeSlaSub')}
          </span>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {t('metric.dailyScans')}
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums mt-1 block">
            4.2M+
          </span>
          <span className="text-xs text-slate-500 mt-1 block">
            {t('metric.dailyScansSub')}
          </span>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {t('metric.coldChain')}
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-cyan-700 font-mono tabular-nums mt-1 block">
            -20.0°C
          </span>
          <span className="text-xs text-slate-500 mt-1 block">
            {t('metric.coldChainSub')}
          </span>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {t('metric.carrierApi')}
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums mt-1 block">
            5 Major
          </span>
          <span className="text-xs text-slate-500 mt-1 block">
            {t('metric.carrierApiSub')}
          </span>
        </div>
      </div>

      {/* Domain Operational Pillars Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Electric Hauler Fleet */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between">
          <div className="h-48 overflow-hidden relative">
            <img
              src="/src/assets/images/fleet_telematics_truck_1793946216558.jpg"
              alt="Electric logistics transport truck"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-xs text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded">
              WGS-84 TELEMATICS
            </div>
          </div>
          <div className="p-5 space-y-2">
            <h3 className="font-bold text-base text-slate-900">
              {t('pillar.telematicsTitle')}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t('pillar.telematicsDesc')}
            </p>
          </div>
        </div>

        {/* Card 2: Cryogenic Cold Chain */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between">
          <div className="h-48 overflow-hidden relative">
            <img
              src="/src/assets/images/facility_cold_chain_1793946216661.jpg"
              alt="Pharmaceutical cold chain logistics facility"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute top-3 left-3 bg-cyan-950/90 backdrop-blur-xs text-cyan-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
              GDP CERTIFIED PHARMA
            </div>
          </div>
          <div className="p-5 space-y-2">
            <h3 className="font-bold text-base text-slate-900">
              {t('pillar.coldChainTitle')}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t('pillar.coldChainDesc')}
            </p>
          </div>
        </div>

        {/* Card 3: Automated Robotics Hub */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between">
          <div className="h-48 overflow-hidden relative">
            <img
              src="/src/assets/images/warehouse_automation_robotics_1793946216104.jpg"
              alt="Automated robotics sorting warehouse"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute top-3 left-3 bg-amber-950/80 backdrop-blur-xs text-amber-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
              SUB-SECOND SORTING
            </div>
          </div>
          <div className="p-5 space-y-2">
            <h3 className="font-bold text-base text-slate-900">
              {t('pillar.sortationTitle')}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t('pillar.sortationDesc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

