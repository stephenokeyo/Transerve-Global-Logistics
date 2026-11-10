import React, { useMemo, useState } from 'react';
import { Shipment, Carrier } from '../types/shipping';
import { generateCode128Barcode, getBarcodeSvgRects, generate2DMatrix } from '../utils/barcodeGenerator';
import { useI18n } from '../i18n/I18nContext';
import { Printer, Download, Copy, Check, ShieldAlert, Snowflake, Package, FileText } from 'lucide-react';

interface ShippingLabelProps {
  shipment: Shipment;
  onPrint?: () => void;
  allowCarrierSwitch?: boolean;
}

export const ShippingLabel: React.FC<ShippingLabelProps> = ({
  shipment,
  onPrint,
  allowCarrierSwitch = true,
}) => {
  const { t, formatDate, formatWeight, formatCurrency } = useI18n();
  const [selectedCarrier, setSelectedCarrier] = useState<Carrier>(shipment.carrier);
  const [copied, setCopied] = useState(false);

  // Generate primary tracking barcode
  const primaryBarcode = useMemo(() => {
    const raw = generateCode128Barcode(shipment.trackingNumber);
    const rects = getBarcodeSvgRects(raw.modules, 75, 1.8);
    const totalWidth = raw.width * 1.8;
    return { rects, totalWidth };
  }, [shipment.trackingNumber]);

  // Generate secondary routing postal barcode
  const postalBarcode = useMemo(() => {
    const postalCode = shipment.recipient.zipCode.replace(/[^0-9]/g, '') || '75261';
    const routingCode = `420${postalCode.padStart(5, '0')}`;
    const raw = generateCode128Barcode(routingCode);
    const rects = getBarcodeSvgRects(raw.modules, 40, 1.4);
    const totalWidth = raw.width * 1.4;
    return { rects, totalWidth, routingCode };
  }, [shipment.recipient.zipCode]);

  // Generate 2D DataMatrix
  const matrix2D = useMemo(() => {
    return generate2DMatrix(shipment.trackingNumber + '|' + shipment.recipient.zipCode, 18);
  }, [shipment.trackingNumber, shipment.recipient.zipCode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(shipment.trackingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const carrierThemes: Record<Carrier, { name: string; brandColor: string; accentColor: string; headerText: string }> = {
    vanguard: {
      name: 'VANGUARD EXPRESS',
      brandColor: 'bg-slate-950 text-white',
      accentColor: 'border-slate-900',
      headerText: 'VANGUARD PRIORITY AIR & GROUND',
    },
    fedex: {
      name: 'FedEx Express',
      brandColor: 'bg-purple-900 text-white',
      accentColor: 'border-purple-900',
      headerText: 'FEDEX PRIORITY OVERNIGHT',
    },
    dhl: {
      name: 'DHL EXPRESS',
      brandColor: 'bg-amber-400 text-red-900 font-black',
      accentColor: 'border-amber-500',
      headerText: 'DHL EXPRESS WORLDWIDE',
    },
    ups: {
      name: 'UPS NEXT DAY AIR',
      brandColor: 'bg-amber-900 text-amber-100',
      accentColor: 'border-amber-900',
      headerText: 'UPS NEXT DAY AIR SAVER',
    },
    usps: {
      name: 'USPS PRIORITY MAIL',
      brandColor: 'bg-blue-900 text-white',
      accentColor: 'border-blue-900',
      headerText: 'UNITED STATES POSTAL SERVICE',
    },
  };

  const theme = carrierThemes[selectedCarrier];

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 w-full max-w-[440px] px-2">
        <div className="flex items-center gap-2">
          {allowCarrierSwitch && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-700">
              <span className="px-2 text-slate-400">{t('common.carrier')}:</span>
              {(['vanguard', 'fedex', 'dhl', 'ups'] as Carrier[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCarrier(c)}
                  className={`px-2 py-1 rounded capitalize transition-colors ${
                    selectedCarrier === c ? 'bg-white shadow-xs font-semibold text-slate-900' : 'hover:text-slate-900'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            title={t('common.copy')}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? t('common.copied') : t('common.copy')}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t('label.printPrompt')}</span>
          </button>
        </div>
      </div>


      {/* 4" x 6" Physical Label Container */}
      <div
        id="shipping-label-print-area"
        className="w-[384px] min-h-[576px] bg-white text-black p-4 border-2 border-black rounded-sm shadow-md font-sans text-xs flex flex-col justify-between select-text"
        style={{ aspectRatio: '4/6' }}
      >
        {/* Top Carrier Header */}
        <div className="border-b-2 border-black pb-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight leading-none uppercase">
                {theme.name}
              </span>
              <span className="text-[10px] font-bold tracking-wider uppercase text-neutral-700 mt-0.5">
                {shipment.serviceLevel}
              </span>
            </div>
            <div className="text-right">
              <span className="font-mono text-sm font-bold border-2 border-black px-2 py-0.5">
                ZONE {shipment.recipient.zipCode.slice(0, 1) || '4'}
              </span>
            </div>
          </div>
        </div>

        {/* Origin (FROM) and Routing Matrix Block */}
        <div className="grid grid-cols-3 border-b-2 border-black py-2 gap-2">
          <div className="col-span-2 text-[10px] leading-tight flex flex-col justify-between">
            <div>
              <span className="font-bold uppercase text-[9px] text-neutral-500">{t('label.origin')}:</span>
              <p className="font-bold text-xs truncate">{shipment.shipper.company || shipment.shipper.name}</p>
              <p className="truncate">{shipment.shipper.street1}</p>
              {shipment.shipper.street2 && <p className="truncate">{shipment.shipper.street2}</p>}
              <p className="font-semibold">
                {shipment.shipper.city}, {shipment.shipper.state} {shipment.shipper.zipCode}
              </p>
              <p className="text-[9px] text-neutral-600">TEL: {shipment.shipper.phone}</p>
            </div>
            <div className="pt-1 text-[9px]">
              <span className="text-neutral-500">{t('label.ref')}: </span>
              <span className="font-mono font-bold">{shipment.referenceNumber}</span>
            </div>
          </div>

          {/* 2D Routing DataMatrix & Service Flags */}
          <div className="col-span-1 flex flex-col items-center justify-center border-l border-neutral-300 pl-2">
            <svg
              viewBox={`0 0 ${matrix2D.length} ${matrix2D.length}`}
              className="w-14 h-14"
              shapeRendering="crispEdges"
            >
              {matrix2D.map((row, r) =>
                row.map((cell, c) =>
                  cell ? (
                    <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#000" />
                  ) : null
                )
              )}
            </svg>
            <span className="font-mono text-[8px] text-neutral-600 mt-1">2D ROUTING</span>
          </div>
        </div>

        {/* Consignee (SHIP TO) Section */}
        <div className="border-b-2 border-black py-2.5">
          <div className="flex items-start justify-between">
            <span className="font-bold text-[9px] uppercase tracking-wider text-neutral-500">{t('label.shipTo')}:</span>
            <span className="text-[9px] font-mono font-bold">ACCT: VG-NET-88</span>
          </div>
          <div className="mt-1 leading-snug">
            <p className="text-base font-extrabold uppercase tracking-tight">{shipment.recipient.name}</p>
            {shipment.recipient.company && (
              <p className="font-bold text-xs uppercase text-neutral-800">{shipment.recipient.company}</p>
            )}
            <p className="text-xs font-medium">{shipment.recipient.street1}</p>
            {shipment.recipient.street2 && <p className="text-xs font-medium">{shipment.recipient.street2}</p>}
            <div className="mt-1 flex items-baseline justify-between">
              <p className="text-sm font-black uppercase">
                {shipment.recipient.city}, {shipment.recipient.state} {shipment.recipient.zipCode}
              </p>
              <span className="text-xs font-bold uppercase">{shipment.recipient.country}</span>
            </div>
          </div>

          {/* Large Destination Postal Box */}
          <div className="mt-2 p-1.5 bg-neutral-100 border border-black flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase">{t('manifest.colRoute')}:</span>
            <span className="font-mono text-lg font-black tracking-widest">{shipment.recipient.zipCode}</span>
            <span className="text-[10px] font-mono font-bold border border-black px-1.5 bg-white">
              {shipment.recipient.state}
            </span>
          </div>
        </div>

        {/* Package Specifications & Handling Indicators */}
        <div className="border-b-2 border-black py-1.5 grid grid-cols-4 gap-1 text-[10px] font-mono">
          <div>
            <span className="block text-[8px] text-neutral-500 uppercase">{t('label.weight')}</span>
            <span className="font-bold">{formatWeight(shipment.package.weightKg)}</span>
          </div>
          <div>
            <span className="block text-[8px] text-neutral-500 uppercase">DIMS (CM)</span>
            <span className="font-bold">
              {shipment.package.lengthCm}×{shipment.package.widthCm}×{shipment.package.heightCm}
            </span>
          </div>
          <div>
            <span className="block text-[8px] text-neutral-500 uppercase">DECLARED</span>
            <span className="font-bold tabular-nums">{formatCurrency(shipment.package.declaredValueUsd)}</span>
          </div>
          <div>
            <span className="block text-[8px] text-neutral-500 uppercase">{t('label.deliverBy')}</span>
            <span className="font-bold">{formatDate(shipment.estimatedDelivery, { month: 'short', day: 'numeric' })}</span>
          </div>
        </div>

        {/* Special Handling Badges */}
        {(shipment.package.isFragile || shipment.package.isColdChain || shipment.package.requiresSignature || shipment.package.isHazardous) && (
          <div className="border-b-2 border-black py-1 px-1 bg-neutral-50 flex items-center justify-between text-[9px] font-bold">
            {shipment.package.isFragile && (
              <span className="flex items-center gap-1 border border-black px-1 py-0.5 bg-white">
                <Package className="w-3 h-3 text-red-600" /> {t('label.fragile')}
              </span>
            )}
            {shipment.package.isColdChain && (
              <span className="flex items-center gap-1 border border-black px-1 py-0.5 bg-cyan-100">
                <Snowflake className="w-3 h-3 text-cyan-800" /> {t('label.coldChain')} ({shipment.package.targetTempC || -20}°C)
              </span>
            )}
            {shipment.package.requiresSignature && (
              <span className="flex items-center gap-1 border border-black px-1 py-0.5 bg-white">
                {t('label.directSig')}
              </span>
            )}
          </div>
        )}

        {/* Primary Code 128 Barcode Section */}
        <div className="py-2.5 flex flex-col items-center justify-center">
          <div className="w-full flex justify-center overflow-hidden">
            <svg
              width="100%"
              height="65"
              viewBox={`0 0 ${primaryBarcode.totalWidth} 75`}
              preserveAspectRatio="xMidYMid meet"
              dangerouslySetInnerHTML={{ __html: primaryBarcode.rects }}
            />
          </div>
          <div className="mt-1 text-center font-mono text-sm font-black tracking-widest">
            {shipment.trackingNumber}
          </div>
        </div>

        {/* Secondary Routing Postal Barcode */}
        <div className="border-t-2 border-black pt-1.5 flex items-center justify-between">
          <div className="w-48 overflow-hidden">
            <svg
              width="100%"
              height="30"
              viewBox={`0 0 ${postalBarcode.totalWidth} 40`}
              preserveAspectRatio="xMidYMid meet"
              dangerouslySetInnerHTML={{ __html: postalBarcode.rects }}
            />
            <span className="font-mono text-[8px] text-neutral-600 block text-center">
              (420) {postalBarcode.routingCode}
            </span>
          </div>

          <div className="text-right text-[8px] leading-tight font-mono">
            <p className="font-bold">STANDARD 4×6 THERMAL</p>
            <p>CYCLE: {new Date().getFullYear()}.W45</p>
            <p>DISPATCH: HUB-ALPHA</p>
          </div>
        </div>
      </div>
    </div>
  );
};
