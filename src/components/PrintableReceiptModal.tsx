import React, { useMemo } from 'react';
import { Shipment } from '../types/shipping';
import { useI18n } from '../i18n/I18nContext';
import { generateCode128Barcode, getBarcodeSvgRects } from '../utils/barcodeGenerator';
import { 
  Printer, X, Receipt, CheckCircle2, ShieldCheck, MapPin, 
  CreditCard, Calendar, Clock, DollarSign, FileCheck, Package
} from 'lucide-react';

interface PrintableReceiptModalProps {
  shipment: Shipment;
  onClose: () => void;
}

export const PrintableReceiptModal: React.FC<PrintableReceiptModalProps> = ({
  shipment,
  onClose,
}) => {
  const { t, formatCurrency, formatDate, formatDateTime, formatWeight } = useI18n();

  const receiptId = useMemo(() => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = shipment.trackingNumber.slice(-4).replace(/[^0-9]/g, '88');
    return `REC-${dateStr}-${suffix}`;
  }, [shipment.trackingNumber]);

  const barcode = useMemo(() => {
    const raw = generateCode128Barcode(shipment.trackingNumber);
    const rects = getBarcodeSvgRects(raw.modules, 40, 1.4);
    const totalWidth = raw.width * 1.4;
    return { rects, totalWidth };
  }, [shipment.trackingNumber]);

  // Financial breakdown calculations
  const rates = shipment.rates;
  const baseCost = rates.baseCost || 45.00;
  const fuelSurcharge = rates.fuelSurcharge || 8.50;
  const insuranceCost = rates.insuranceCost || (shipment.package.declaredValueUsd > 1000 ? 25.00 : 0);
  const specialHandlingCost = shipment.package.isColdChain ? 40.00 : shipment.package.isFragile ? 15.00 : 0;
  const subtotal = baseCost + fuelSurcharge + insuranceCost + specialHandlingCost;
  const taxEst = Math.round(subtotal * 0.0825 * 100) / 100;
  const grandTotal = Math.round((subtotal + taxEst) * 100) / 100;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden print:border-none print:shadow-none print:my-0 print:max-w-none print:w-full print:rounded-none printable-document">
        
        {/* Screen Action Bar (Hidden in Print) */}
        <div className="no-print bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 rounded-lg text-white">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Official Shipping Receipt & Tax Invoice
              </h3>
              <p className="text-xs text-slate-400">
                Print or export electronic proof of freight payment
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Close receipt"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-8 sm:p-10 font-sans text-slate-900 print:p-6 print-page">
          
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-6 pb-6 border-b-2 border-slate-900">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-base font-black tracking-widest uppercase text-slate-900">
                  TRANSERVE LOGISTICS
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase bg-emerald-600 text-white rounded">
                  PAID IN FULL
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900">
                FREIGHT SHIPPING RECEIPT
              </h1>
              <p className="text-xs text-slate-500 mt-1 font-mono">
                Receipt #: <strong>{receiptId}</strong> · Date: {formatDateTime(shipment.createdAt)}
              </p>
            </div>

            {/* Barcode */}
            <div className="flex flex-col items-end">
              <svg
                width={barcode.totalWidth}
                height={40}
                className="fill-current text-slate-900"
                dangerouslySetInnerHTML={{ __html: barcode.rects }}
              />
              <span className="font-mono text-[11px] font-bold text-slate-900 mt-1 tracking-wider">
                {shipment.trackingNumber}
              </span>
            </div>
          </div>

          {/* Quick Meta Grid */}
          <div className="my-6 grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl print:bg-slate-50 print:border-slate-300 text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">CARRIER</span>
              <strong className="text-slate-900 block mt-0.5">{rates.carrierName || shipment.carrier.toUpperCase()}</strong>
              <span className="text-slate-600 text-[11px]">{shipment.serviceLevel}</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">TRANSACTION REF</span>
              <strong className="text-slate-900 block mt-0.5 font-mono">{shipment.referenceNumber}</strong>
              <span className="text-slate-600 text-[11px]">Auth: #AP-992140</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">PAYMENT METHOD</span>
              <strong className="text-slate-900 block mt-0.5 flex items-center gap-1">
                <CreditCard className="w-3 h-3 text-slate-600" />
                <span>Corporate Account</span>
              </strong>
              <span className="text-slate-600 text-[11px]">Ending in •••• 4091</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">STATUS</span>
              <strong className="text-emerald-700 block mt-0.5 flex items-center gap-1 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>ELECTRONICALLY SETTLED</span>
              </strong>
              <span className="text-slate-500 text-[11px]">Zero Balance Due</span>
            </div>
          </div>

          {/* Parties: Shipper (Billed To) & Consignee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
            <div className="p-4 border border-slate-200 rounded-xl bg-white print:border-slate-300 text-xs">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block pb-1 border-b border-slate-100 mb-2">
                BILLED TO / ORIGIN SHIPPER
              </span>
              <strong className="text-slate-900 text-sm block">{shipment.shipper.name}</strong>
              {shipment.shipper.company && <p className="text-slate-700 font-medium">{shipment.shipper.company}</p>}
              <p className="text-slate-600">{shipment.shipper.street1}</p>
              <p className="text-slate-900 font-semibold font-mono">
                {shipment.shipper.city}, {shipment.shipper.state} {shipment.shipper.zipCode}
              </p>
              <p className="text-slate-600">{shipment.shipper.country}</p>
              <p className="text-slate-500 font-mono pt-1 text-[11px]">Email: {shipment.shipper.email}</p>
            </div>

            <div className="p-4 border border-slate-200 rounded-xl bg-white print:border-slate-300 text-xs">
              <span className="text-[10px] font-mono font-bold uppercase text-blue-600 block pb-1 border-b border-slate-100 mb-2">
                DELIVER TO / CONSIGNEE RECIPIENT
              </span>
              <strong className="text-slate-900 text-sm block">{shipment.recipient.name}</strong>
              {shipment.recipient.company && <p className="text-slate-700 font-medium">{shipment.recipient.company}</p>}
              <p className="text-slate-600">{shipment.recipient.street1}</p>
              <p className="text-slate-900 font-semibold font-mono">
                {shipment.recipient.city}, {shipment.recipient.state} {shipment.recipient.zipCode}
              </p>
              <p className="text-slate-600">{shipment.recipient.country}</p>
              <p className="text-slate-500 font-mono pt-1 text-[11px]">Phone: {shipment.recipient.phone}</p>
            </div>
          </div>

          {/* Itemized Line Items Table */}
          <div className="my-6">
            <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-700 mb-2">
              Itemized Freight Charges & Service Details
            </h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden print:border-slate-300 text-xs font-mono">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 text-[10px] uppercase">
                  <tr>
                    <th className="p-2.5">Item Description</th>
                    <th className="p-2.5 text-center">Qty / Weight</th>
                    <th className="p-2.5 text-right">Rate</th>
                    <th className="p-2.5 text-right">Amount (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  <tr>
                    <td className="p-2.5">
                      <strong className="block text-slate-900">{rates.serviceLevel} Linehaul Freight</strong>
                      <span className="text-slate-500 text-[11px]">{shipment.package.contentsDescription} ({shipment.package.lengthCm}×{shipment.package.widthCm}×{shipment.package.heightCm} cm)</span>
                    </td>
                    <td className="p-2.5 text-center">{formatWeight(shipment.package.weightKg)}</td>
                    <td className="p-2.5 text-right">${(baseCost / Math.max(1, shipment.package.weightKg)).toFixed(2)}/kg</td>
                    <td className="p-2.5 text-right font-bold">${baseCost.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5">
                      <span>Variable Fuel Index Surcharge (FAA/GLEC Index)</span>
                    </td>
                    <td className="p-2.5 text-center">1 Unit</td>
                    <td className="p-2.5 text-right">Indexed</td>
                    <td className="p-2.5 text-right font-bold">${fuelSurcharge.toFixed(2)}</td>
                  </tr>
                  {insuranceCost > 0 && (
                    <tr>
                      <td className="p-2.5">
                        <span>Declared Value Transit Cargo Insurance (Covered: ${shipment.package.declaredValueUsd?.toLocaleString()})</span>
                      </td>
                      <td className="p-2.5 text-center">1 Policy</td>
                      <td className="p-2.5 text-right">Tier 1</td>
                      <td className="p-2.5 text-right font-bold">${insuranceCost.toFixed(2)}</td>
                    </tr>
                  )}
                  {specialHandlingCost > 0 && (
                    <tr>
                      <td className="p-2.5">
                        <span>{shipment.package.isColdChain ? 'Certified Cryogenic Cold-Chain Sensor Protocol (-20°C)' : 'Fragile Precision Cargo Handling'}</span>
                      </td>
                      <td className="p-2.5 text-center">Active</td>
                      <td className="p-2.5 text-right">Certified</td>
                      <td className="p-2.5 text-right font-bold">${specialHandlingCost.toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200 font-mono text-xs">
                  <tr>
                    <td colSpan={3} className="p-2.5 text-right font-bold text-slate-600">Subtotal:</td>
                    <td className="p-2.5 text-right font-bold text-slate-900">${subtotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="p-2.5 text-right text-slate-500">Estimated Sales Tax / VAT (8.25%):</td>
                    <td className="p-2.5 text-right text-slate-900">${taxEst.toFixed(2)}</td>
                  </tr>
                  <tr className="border-t-2 border-slate-900 bg-slate-100 text-sm">
                    <td colSpan={3} className="p-3 text-right font-black uppercase text-slate-900">Total Paid (USD):</td>
                    <td className="p-3 text-right font-black text-slate-950 text-base">${grandTotal.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Security & Verification Stamp */}
          <div className="mt-8 pt-4 border-t border-slate-300 text-[10px] font-mono text-slate-500 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p>Certified Tax Invoice & Official Carrier Receipt</p>
              <p className="text-slate-400 mt-0.5">Transerve Global Logistics Inc. · Tax ID: 94-8201948 · Electronic Cash Register Record</p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-300 rounded text-emerald-800 font-bold uppercase text-[9.5px]">
              <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>OFFICIALLY AUDITED & PAID</span>
            </div>
          </div>

        </div>

        {/* Screen Bottom Controls (Hidden in Print) */}
        <div className="no-print p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            Standard 8.5" × 11" Letter / A4 Receipt Format
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
