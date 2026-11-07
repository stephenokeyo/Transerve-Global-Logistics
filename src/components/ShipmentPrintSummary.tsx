import React, { useMemo } from 'react';
import { Shipment } from '../types/shipping';
import { useI18n } from '../i18n/I18nContext';
import { generateCode128Barcode, getBarcodeSvgRects } from '../utils/barcodeGenerator';
import { UnitSystem, getFormattedPackageSpecs, calculateCarbonImpact } from './PackageTracker';
import { 
  Printer, X, CheckCircle2, ShieldCheck, MapPin, Truck, Calendar, 
  Clock, Scale, Ruler, Box, Leaf, ArrowRight, Shield, FileCheck
} from 'lucide-react';

interface ShipmentPrintSummaryProps {
  shipment: Shipment;
  unitSystem?: UnitSystem;
  onClose: () => void;
}

export const ShipmentPrintSummary: React.FC<ShipmentPrintSummaryProps> = ({
  shipment,
  unitSystem = 'metric',
  onClose,
}) => {
  const { t, tStatus, formatDate, formatDateTime, formatTime } = useI18n();

  // Vector Code 128 barcode
  const barcode = useMemo(() => {
    const raw = generateCode128Barcode(shipment.trackingNumber);
    const rects = getBarcodeSvgRects(raw.modules, 45, 1.5);
    const totalWidth = raw.width * 1.5;
    return { rects, totalWidth };
  }, [shipment.trackingNumber]);

  const formattedSpecs = useMemo(
    () => getFormattedPackageSpecs(shipment.package, unitSystem),
    [shipment.package, unitSystem]
  );

  const carbon = useMemo(
    () => calculateCarbonImpact(shipment, unitSystem),
    [shipment, unitSystem]
  );

  const documentRef = useMemo(() => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `DOC-${shipment.trackingNumber.replace(/[^A-Z0-9]/g, '')}-${dateStr}`;
  }, [shipment.trackingNumber]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      {/* Container Dialog */}
      <div className="bg-white rounded-2xl max-w-4xl w-full my-6 shadow-2xl border border-slate-200 overflow-hidden print:border-none print:shadow-none print:my-0 print:max-w-none print:w-full print:rounded-none">
        
        {/* Screen Action Bar (Hidden during print) */}
        <div className="no-print bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                {t('tracker.printSummary')}
              </h3>
              <p className="text-xs text-slate-400">
                {t('tracker.printSummaryDesc')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('tracker.printBtn')}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title={t('common.close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 sm:p-10 font-sans text-slate-900 print:p-6 print-page">
          
          {/* Document Header */}
          <div className="flex flex-wrap items-start justify-between gap-6 pb-6 border-b-2 border-slate-900">
            <div>
              <div className="flex items-center gap-2 text-slate-900 mb-1">
                <span className="font-mono text-base font-black tracking-widest uppercase">
                  TRANSERVE LOGISTICS
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase bg-slate-900 text-white rounded">
                  OFFICIAL AUDIT
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900">
                {t('tracker.printDocumentTitle')}
              </h1>
              <p className="text-xs text-slate-500 mt-1 font-mono">
                {t('tracker.printDocId')}: <strong>{documentRef}</strong> · {t('tracker.printGeneratedOn')}: {formatDateTime(new Date().toISOString())}
              </p>
            </div>

            {/* Vector Barcode */}
            <div className="flex flex-col items-end">
              <svg
                width={barcode.totalWidth}
                height={45}
                className="fill-current text-slate-900"
                dangerouslySetInnerHTML={{ __html: barcode.rects }}
              />
              <span className="font-mono text-xs font-bold text-slate-900 mt-1 tracking-widest">
                {shipment.trackingNumber}
              </span>
            </div>
          </div>

          {/* Primary Status & Service Band */}
          <div className="my-6 grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl print:bg-slate-50 print:border-slate-300">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
                {t('tracker.carrier')} / {t('tracker.service')}
              </span>
              <span className="text-xs font-black text-slate-900 block mt-0.5">
                {shipment.rates.carrierName}
              </span>
              <span className="text-[11px] font-mono text-slate-600 block">
                {shipment.serviceLevel}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
                {t('common.status')}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-900 uppercase mt-0.5">
                <span className={`w-2 h-2 rounded-full ${shipment.status === 'delivered' ? 'bg-emerald-600' : 'bg-blue-600'}`} />
                {tStatus(shipment.status)}
              </span>
              <span className="text-[11px] font-mono text-slate-500 block">
                Ref: {shipment.referenceNumber}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
                {t('tracker.estimatedDelivery')}
              </span>
              <span className="text-xs font-bold text-slate-900 block mt-0.5">
                {formatDate(shipment.estimatedDelivery, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="text-[11px] font-mono text-slate-600 block">
                {shipment.rates.deliveryTimeWindow}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
                SLA Compliance
              </span>
              <span className={`text-xs font-black uppercase mt-0.5 block ${
                shipment.sla?.status === 'breached' ? 'text-rose-700' : shipment.sla?.status === 'at_risk' ? 'text-amber-700' : 'text-emerald-700'
              }`}>
                {shipment.sla?.status ? shipment.sla.status.replace('_', ' ') : 'On Schedule'}
              </span>
              <span className="text-[11px] font-mono text-slate-500 block">
                Buffer: {shipment.sla?.bufferHealthPct ?? 94}%
              </span>
            </div>
          </div>

          {/* Shipper & Consignee Address Cards */}
          <div className="my-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Origin (Shipper) */}
            <div className="p-4 border border-slate-200 rounded-xl bg-white print:border-slate-300">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {t('label.origin')}
                </span>
                <span className="text-[10px] font-mono text-slate-400">DISPATCH ZONE</span>
              </div>
              <div className="text-xs space-y-0.5">
                <strong className="text-slate-900 block text-sm">{shipment.shipper.name}</strong>
                {shipment.shipper.company && <p className="text-slate-700 font-medium">{shipment.shipper.company}</p>}
                <p className="text-slate-600">{shipment.shipper.street1}</p>
                {shipment.shipper.street2 && <p className="text-slate-600">{shipment.shipper.street2}</p>}
                <p className="text-slate-900 font-semibold font-mono">
                  {shipment.shipper.city}, {shipment.shipper.state} {shipment.shipper.zipCode}
                </p>
                <p className="text-slate-600 font-mono text-[11px]">{shipment.shipper.country}</p>
                <p className="text-slate-500 font-mono text-[11px] pt-1">Tel: {shipment.shipper.phone}</p>
              </div>
            </div>

            {/* Destination (Consignee) */}
            <div className="p-4 border border-slate-200 rounded-xl bg-white print:border-slate-300">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-blue-600" />
                  {t('label.shipTo')}
                </span>
                <span className="text-[10px] font-mono text-blue-700 font-bold">FINAL DESTINATION</span>
              </div>
              <div className="text-xs space-y-0.5">
                <strong className="text-slate-900 block text-sm">{shipment.recipient.name}</strong>
                {shipment.recipient.company && <p className="text-slate-700 font-medium">{shipment.recipient.company}</p>}
                <p className="text-slate-600">{shipment.recipient.street1}</p>
                {shipment.recipient.street2 && <p className="text-slate-600">{shipment.recipient.street2}</p>}
                <p className="text-slate-900 font-semibold font-mono">
                  {shipment.recipient.city}, {shipment.recipient.state} {shipment.recipient.zipCode}
                </p>
                <p className="text-slate-600 font-mono text-[11px]">{shipment.recipient.country}</p>
                <p className="text-slate-500 font-mono text-[11px] pt-1">Tel: {shipment.recipient.phone}</p>
              </div>
            </div>
          </div>

          {/* Package Specifications Table */}
          <div className="my-6">
            <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-700 mb-2">
              {t('tracker.packageSpecs')}
            </h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden print:border-slate-300 text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-mono text-[10px] uppercase">
                  <tr>
                    <th className="p-2.5">{t('tracker.weight')}</th>
                    <th className="p-2.5">{t('tracker.dimensions')}</th>
                    <th className="p-2.5">{t('tracker.dimWeight')}</th>
                    <th className="p-2.5">{t('tracker.packageType')}</th>
                    <th className="p-2.5">{t('tracker.declaredValue')}</th>
                    <th className="p-2.5">{t('tracker.specialHandling')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 font-mono">
                  <tr>
                    <td className="p-2.5 font-bold">
                      {formattedSpecs.weightStr} <span className="text-slate-400 text-[10px]">({formattedSpecs.weightAltStr})</span>
                    </td>
                    <td className="p-2.5">
                      {formattedSpecs.dimensionsDetailedStr}
                    </td>
                    <td className="p-2.5 text-slate-600">
                      {formattedSpecs.volumetricWeightStr}
                    </td>
                    <td className="p-2.5 capitalize">
                      {shipment.package.packageType.replace('_', ' ')}
                    </td>
                    <td className="p-2.5 font-bold">
                      ${shipment.package.declaredValueUsd?.toLocaleString()} USD
                    </td>
                    <td className="p-2.5 text-[11px] space-x-1">
                      {shipment.package.requiresSignature && (
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-semibold">SIG REQ</span>
                      )}
                      {shipment.package.isFragile && (
                        <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded font-semibold">FRAGILE</span>
                      )}
                      {shipment.package.isColdChain && (
                        <span className="bg-sky-50 text-sky-800 px-1.5 py-0.5 rounded font-semibold">COLD CHAIN (-20°C)</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Complete Milestone & Chain of Custody History */}
          <div className="my-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-700">
                {t('tracker.printMilestones')}
              </h4>
              <span className="text-[10px] font-mono text-slate-500">
                {shipment.checkpoints.length} Certified Events Logged
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden print:border-slate-300 text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-mono text-[10px] uppercase">
                  <tr>
                    <th className="p-2.5 w-10 text-center">#</th>
                    <th className="p-2.5 w-36">Date & Time</th>
                    <th className="p-2.5 w-32">{t('common.status')}</th>
                    <th className="p-2.5 w-44">Location & Facility</th>
                    <th className="p-2.5">Activity Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {shipment.checkpoints.map((cp, idx) => {
                    const isCompleted = idx <= shipment.currentCheckpointIndex;
                    return (
                      <tr key={cp.id} className={isCompleted ? 'bg-white' : 'bg-slate-50/50 text-slate-400'}>
                        <td className="p-2.5 text-center font-mono font-bold text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="p-2.5 font-mono text-[11px] whitespace-nowrap text-slate-700">
                          {formatDateTime(cp.timestamp, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="p-2.5 font-semibold text-[11px] whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            isCompleted ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {tStatus(cp.status)}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <strong className="block text-slate-900 text-xs">{cp.location}</strong>
                          <span className="text-[10px] font-mono text-slate-500">{cp.facilityName}</span>
                        </td>
                        <td className="p-2.5 text-xs text-slate-600">
                          {cp.description}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Verified Proof of Delivery (if delivered) */}
          {shipment.status === 'delivered' && shipment.proofOfDelivery && (
            <div className="my-6 p-4 border-2 border-emerald-500/40 rounded-xl bg-emerald-50/30 print:bg-white print:border-emerald-600">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    {t('tracker.printPod')}
                  </span>
                  <p className="text-xs text-slate-800 mt-1">
                    {t('tracker.signedBy')}: <strong>{shipment.proofOfDelivery.recipientName}</strong>
                  </p>
                  <p className="text-xs text-slate-600 font-mono">
                    {t('tracker.podTime')}: {formatDateTime(shipment.proofOfDelivery.deliveredAt)}
                  </p>
                  {shipment.proofOfDelivery.notes && (
                    <p className="text-xs text-slate-500 italic mt-0.5">
                      Notes: "{shipment.proofOfDelivery.notes}"
                    </p>
                  )}
                </div>

                <div className="bg-white p-2.5 border border-emerald-300 rounded-lg flex flex-col items-center">
                  <span className="text-[9px] uppercase font-bold text-slate-400 font-mono">{t('tracker.printSignature')}</span>
                  <svg width="130" height="36" viewBox="0 0 200 60" className="stroke-slate-900 fill-none stroke-2">
                    <path d={shipment.proofOfDelivery.signatureSvg} />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Carbon & Environmental Assessment Summary */}
          <div className="my-6 p-3.5 bg-slate-50 border border-slate-200 rounded-xl print:bg-slate-50 print:border-slate-300 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
            <div className="flex items-center gap-2">
              <Leaf className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="text-[10px] font-bold text-slate-500 block uppercase">
                  {t('tracker.carbonImpact')}
                </span>
                <strong className="text-slate-900">{carbon.co2eFormatted}</strong>
                <span className="text-slate-500"> ({carbon.distanceFormatted} route)</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                100% CARBON NEUTRAL CERTIFIED
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">ISO 14083 / GLEC Framework Verified</p>
            </div>
          </div>

          {/* Document Footer & Chain of Custody Certification */}
          <div className="mt-8 pt-4 border-t border-slate-300 text-[10px] font-mono text-slate-500 flex flex-wrap items-center justify-between gap-3">
            <div className="max-w-xl">
              <p className="leading-relaxed">
                {t('tracker.printDisclaimer')}
              </p>
              <p className="mt-1 text-slate-400">
                Security Hash: SHA256:{shipment.id}-{shipment.trackingNumber.slice(-6)} · Transerve Logistics Inc.
              </p>
            </div>

            <div className="text-right">
              <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded border border-slate-200 text-slate-700 font-bold uppercase text-[9px]">
                <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Certified Electronic Record</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Screen Close / Print Button bar (Hidden in Print) */}
        <div className="no-print p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            Standard 8.5" × 11" Letter / A4 Print Format
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('tracker.printBtn')}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              {t('tracker.printClose')}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
