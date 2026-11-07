import React, { useState } from 'react';
import { calculateLiveCarrierRates } from '../services/carrierIntegration';
import { RateOption } from '../types/shipping';
import { useI18n } from '../i18n/I18nContext';
import { Calculator, ArrowRight, X, Sparkles, Check } from 'lucide-react';

interface RateCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRateForShipment?: (rate: RateOption) => void;
}

export const RateCalculatorModal: React.FC<RateCalculatorModalProps> = ({ isOpen, onClose, onSelectRateForShipment }) => {
  const { t, formatCurrency, formatWeight } = useI18n();
  const [originZip, setOriginZip] = useState('60607');
  const [destZip, setDestZip] = useState('75261');
  const [weightKg, setWeightKg] = useState(5.0);
  const [lengthCm, setLengthCm] = useState(30);
  const [widthCm, setWidthCm] = useState(25);
  const [heightCm, setHeightCm] = useState(20);
  const [isColdChain, setIsColdChain] = useState(false);
  const [requiresSignature, setRequiresSignature] = useState(false);

  if (!isOpen) return null;

  const rates = calculateLiveCarrierRates({
    originZip,
    originCountry: 'United States',
    destZip,
    destCountry: 'United States',
    weightKg,
    lengthCm,
    widthCm,
    heightCm,
    packageType: 'box',
    declaredValueUsd: 1000,
    isFragile: false,
    isColdChain,
    requiresSignature,
  });

  const dimWeightKg = Math.round(((lengthCm * widthCm * heightCm) / 5000) * 10) / 10;
  const billableWeight = Math.max(weightKg, dimWeightKg);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl relative space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{t('calc.title')}</h3>
              <p className="text-xs text-slate-500">{t('calc.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold"
          >
            ✕
          </button>
        </div>


        {/* Form Inputs */}
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">{t('calc.fromZip')}</label>
              <input
                type="text"
                value={originZip}
                onChange={(e) => setOriginZip(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">{t('calc.toZip')}</label>
              <input
                type="text"
                value={destZip}
                onChange={(e) => setDestZip(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block font-medium text-slate-700 mb-1">{t('generator.actualWeight')}</label>
              <input
                type="number"
                step="0.5"
                min="0.1"
                value={weightKg}
                onChange={(e) => setWeightKg(parseFloat(e.target.value) || 1)}
                className="w-full p-2.5 border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">{t('generator.length')}</label>
              <input
                type="number"
                value={lengthCm}
                onChange={(e) => setLengthCm(parseInt(e.target.value, 10) || 10)}
                className="w-full p-2.5 border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">{t('generator.width')}</label>
              <input
                type="number"
                value={widthCm}
                onChange={(e) => setWidthCm(parseInt(e.target.value, 10) || 10)}
                className="w-full p-2.5 border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">{t('generator.height')}</label>
              <input
                type="number"
                value={heightCm}
                onChange={(e) => setHeightCm(parseInt(e.target.value, 10) || 10)}
                className="w-full p-2.5 border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-1">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isColdChain}
                onChange={(e) => setIsColdChain(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span className="text-slate-700">{t('generator.coldChain')}</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={requiresSignature}
                onChange={(e) => setRequiresSignature(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span className="text-slate-700">{t('generator.signatureReq')}</span>
            </label>
          </div>
        </div>

        {/* Calculated Rates Comparison Table */}
        <div className="space-y-2 border-t border-slate-100 pt-4">
          <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
            <span>{t('generator.billableWeight')}: <strong className="font-mono text-slate-800">{formatWeight(billableWeight)}</strong></span>
            <span>{t('calc.results')}</span>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {rates.map((r, i) => (
              <div
                key={`${r.carrier}-${r.serviceLevel}`}
                className="p-3 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{r.carrierName}</span>
                    {i === 0 && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                        {t('generator.cheapest')}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {r.deliveryTimeWindow} · {r.transitDays} {t('generator.estTransit')}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-extrabold font-mono text-slate-900 tabular-nums">
                    {formatCurrency(r.totalCost)}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Base: {formatCurrency(r.baseCost)} + Fuel: {formatCurrency(r.fuelSurcharge)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
          >
            {t('common.close')}
          </button>
        </div>

      </div>
    </div>
  );
};
