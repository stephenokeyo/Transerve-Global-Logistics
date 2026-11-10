import React, { useState, useMemo } from 'react';
import { Shipment, Carrier, ShipmentStatus, SlaStatus, SlaInfo } from '../types/shipping';
import { User } from '../types/user';
import { ShippingLabel } from './ShippingLabel';
import { getShipmentSla, formatTimeRemaining } from '../utils/slaMonitor';
import { useI18n } from '../i18n/I18nContext';
import { 
  Search, Filter, Printer, Download, Eye, ArrowUpRight, 
  CheckSquare, Square, FileText, CheckCircle2, Truck, ShieldAlert, Check, 
  AlertTriangle, Clock, AlertCircle, Sparkles, Send, BellRing
} from 'lucide-react';

interface ShipmentManifestProps {
  shipments: Shipment[];
  onSelectShipment: (shipment: Shipment) => void;
  currentUser?: User;
}

export const ShipmentManifest: React.FC<ShipmentManifestProps> = ({ 
  shipments, 
  onSelectShipment,
  currentUser,
}) => {
  const { t, tStatus, tSla, formatDate, formatWeight, formatPercent } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [carrierFilter, setCarrierFilter] = useState<string>('all');
  const [slaFilter, setSlaFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewingLabelShipment, setViewingLabelShipment] = useState<Shipment | null>(null);
  const [inspectingSlaShipment, setInspectingSlaShipment] = useState<{ shipment: Shipment; sla: SlaInfo } | null>(null);
  const [showManifestSummary, setShowManifestSummary] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [mitigationNotice, setMitigationNotice] = useState<string | null>(null);


  // Check if current user is authorized (Admin or Shipper)
  const isAuthorized = !currentUser || currentUser.role === 'admin' || currentUser.role === 'shipper';

  // Compute SLA stats across all shipments
  const slaMetrics = useMemo(() => {
    let onSchedule = 0;
    let atRisk = 0;
    let breached = 0;
    let deliveredOnTime = 0;

    shipments.forEach((s) => {
      const sla = getShipmentSla(s);
      if (sla.status === 'at_risk') atRisk++;
      else if (sla.status === 'breached') breached++;
      else if (sla.status === 'delivered_on_time') deliveredOnTime++;
      else onSchedule++;
    });

    const compliant = onSchedule + deliveredOnTime;
    const adherenceRate = shipments.length > 0 ? ((compliant / shipments.length) * 100).toFixed(1) : '100.0';

    return {
      onSchedule,
      atRisk,
      breached,
      deliveredOnTime,
      total: shipments.length,
      adherenceRate,
    };
  }, [shipments]);

  // Filter shipments
  const filteredShipments = useMemo(() => {
    return shipments.filter((s) => {
      const sla = getShipmentSla(s);

      const matchesSearch =
        s.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.recipient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.recipient.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.shipper.city.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      const matchesCarrier = carrierFilter === 'all' || s.carrier === carrierFilter;
      const matchesSla =
        slaFilter === 'all' ||
        (slaFilter === 'at_risk' && sla.status === 'at_risk') ||
        (slaFilter === 'breached' && sla.status === 'breached') ||
        (slaFilter === 'on_schedule' && (sla.status === 'on_schedule' || sla.status === 'delivered_on_time'));

      return matchesSearch && matchesStatus && matchesCarrier && matchesSla;
    });
  }, [shipments, searchTerm, statusFilter, carrierFilter, slaFilter]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredShipments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredShipments.map((s) => s.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Helper to escape values per RFC 4180 CSV standard
  const escapeCsv = (val: any): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  // Download manifest list as a formatted CSV file for record-keeping
  const handleExportCsv = (mode: 'current' | 'selected' | 'all' = 'current') => {
    let targetShipments: Shipment[];
    if (mode === 'selected') {
      targetShipments = shipments.filter((s) => selectedIds.includes(s.id));
    } else if (mode === 'all') {
      targetShipments = shipments;
    } else {
      targetShipments = filteredShipments;
    }

    if (targetShipments.length === 0) {
      setExportNotice(t('manifest.noShipmentsToExport'));
      setTimeout(() => setExportNotice(null), 3500);
      return;
    }

    const headers = [
      'Tracking Number',
      'Reference Number',
      'Carrier',
      'Service Level',
      'Shipment Status',
      'SLA Status',
      'SLA Risk Reason',
      'Shipper Name',
      'Shipper Company',
      'Origin Address',
      'Origin City',
      'Origin State',
      'Origin ZipCode',
      'Origin Country',
      'Origin Phone',
      'Recipient Name',
      'Recipient Company',
      'Destination Address',
      'Destination City',
      'Destination State',
      'Destination ZipCode',
      'Destination Country',
      'Destination Phone',
      'Weight (kg)',
      'Dimensions (cm)',
      'Package Type',
      'Special Handling',
      'Declared Value (USD)',
      'Base Freight Cost (USD)',
      'Fuel Surcharge (USD)',
      'Total Billed Cost (USD)',
      'Created Date',
      'Estimated Delivery Window',
      'Latest Checkpoint Location',
    ];

    const rows = targetShipments.map((s) => {
      const sla = getShipmentSla(s);
      const specialHandling = [
        s.package.isColdChain ? 'Cold-Chain (-20°C)' : null,
        s.package.isFragile ? 'Fragile' : null,
        s.package.requiresSignature ? 'Direct-Signature' : null,
        s.package.isHazardous ? 'Hazmat' : null,
      ].filter(Boolean).join('; ') || 'Standard';

      const originAddr = `${s.shipper.street1}${s.shipper.street2 ? ', ' + s.shipper.street2 : ''}`;
      const destAddr = `${s.recipient.street1}${s.recipient.street2 ? ', ' + s.recipient.street2 : ''}`;
      const latestCheckpoint = s.checkpoints && s.checkpoints.length > 0
        ? s.checkpoints[s.checkpoints.length - 1]
        : null;

      return [
        escapeCsv(s.trackingNumber),
        escapeCsv(s.referenceNumber),
        escapeCsv(s.carrier.toUpperCase()),
        escapeCsv(s.serviceLevel),
        escapeCsv(s.status.replace(/_/g, ' ').toUpperCase()),
        escapeCsv(sla.status.toUpperCase()),
        escapeCsv(sla.riskReason || 'Nominal'),
        escapeCsv(s.shipper.name),
        escapeCsv(s.shipper.company || ''),
        escapeCsv(originAddr),
        escapeCsv(s.shipper.city),
        escapeCsv(s.shipper.state),
        escapeCsv(s.shipper.zipCode || ''),
        escapeCsv(s.shipper.country || 'USA'),
        escapeCsv(s.shipper.phone || ''),
        escapeCsv(s.recipient.name),
        escapeCsv(s.recipient.company || ''),
        escapeCsv(destAddr),
        escapeCsv(s.recipient.city),
        escapeCsv(s.recipient.state),
        escapeCsv(s.recipient.zipCode || ''),
        escapeCsv(s.recipient.country || 'USA'),
        escapeCsv(s.recipient.phone || ''),
        escapeCsv(s.package.weightKg),
        escapeCsv(`${s.package.lengthCm}x${s.package.widthCm}x${s.package.heightCm}`),
        escapeCsv((s.package.packageType || 'box').toUpperCase()),
        escapeCsv(specialHandling),
        escapeCsv(s.package.declaredValueUsd ? s.package.declaredValueUsd.toFixed(2) : '0.00'),
        escapeCsv(s.rates?.baseCost ? s.rates.baseCost.toFixed(2) : '0.00'),
        escapeCsv(s.rates?.fuelSurcharge ? s.rates.fuelSurcharge.toFixed(2) : '0.00'),
        escapeCsv(s.rates?.totalCost ? s.rates.totalCost.toFixed(2) : '0.00'),
        escapeCsv(s.createdAt),
        escapeCsv(s.estimatedDelivery),
        escapeCsv(latestCheckpoint ? `${latestCheckpoint.city}, ${latestCheckpoint.state} (${latestCheckpoint.description})` : 'Pending Dispatch Scan'),
      ].join(',');
    });

    // Prepend UTF-8 BOM (\uFEFF) for compatibility with Excel, Numbers, and Sheets
    const csvContent = '\uFEFF' + [headers.map((h) => `"${h}"`).join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    link.setAttribute('href', url);
    link.setAttribute('download', `Transerve_Shipment_Manifest_${timestampStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportNotice(t('manifest.exportedSuccess', { count: targetShipments.length }));
    setTimeout(() => setExportNotice(null), 4000);
  };

  const handleExecuteMitigation = (actionName: string) => {
    setMitigationNotice(`Initiated: "${actionName}" for shipment ${inspectingSlaShipment?.shipment.trackingNumber}. Carrier dispatch alerted.`);
    setTimeout(() => setMitigationNotice(null), 4000);
    setInspectingSlaShipment(null);
  };

  return (
    <div className="space-y-6">
      {/* SLA Status Monitor Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Overall SLA Adherence */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px]">{t('sla.slaCompliance')}</span>
            <span className="font-mono text-emerald-700 font-bold text-[11px] flex items-center">
              Target: 98.0%
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 tabular-nums">
            {slaMetrics.adherenceRate}%
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {slaMetrics.onSchedule + slaMetrics.deliveredOnTime} / {slaMetrics.total} compliant
          </span>
        </div>

        {/* Metric 2: On Schedule */}
        <div 
          onClick={() => setSlaFilter(slaFilter === 'on_schedule' ? 'all' : 'on_schedule')}
          className={`rounded-xl border p-4 shadow-xs cursor-pointer transition-all ${
            slaFilter === 'on_schedule'
              ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-200'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              {t('sla.on_schedule')}
            </span>
            <span className="text-[10px] text-emerald-700 font-bold">NOMINAL</span>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-950 tabular-nums">
            {slaMetrics.onSchedule}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {t('manifest.onScheduleCount')}
          </span>
        </div>

        {/* Metric 3: AT RISK (Critical Monitor) */}
        <div 
          onClick={() => setSlaFilter(slaFilter === 'at_risk' ? 'all' : 'at_risk')}
          className={`rounded-xl border p-4 shadow-xs cursor-pointer transition-all ${
            slaFilter === 'at_risk'
              ? 'bg-amber-100/70 border-amber-400 ring-2 ring-amber-300'
              : 'bg-amber-50/50 border-amber-200 hover:bg-amber-50 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px] text-amber-900 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              {t('sla.at_risk')}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-200 text-amber-900">
              URGENT
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-amber-950 tabular-nums">
            {slaMetrics.atRisk}
          </div>
          <span className="text-[11px] text-amber-800 mt-1 block font-medium">
            {t('manifest.atRiskCount')}
          </span>
        </div>

        {/* Metric 4: SLA BREACHED */}
        <div 
          onClick={() => setSlaFilter(slaFilter === 'breached' ? 'all' : 'breached')}
          className={`rounded-xl border p-4 shadow-xs cursor-pointer transition-all ${
            slaFilter === 'breached'
              ? 'bg-rose-100/70 border-rose-400 ring-2 ring-rose-300'
              : 'bg-rose-50/40 border-rose-200 hover:bg-rose-50 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px] text-rose-900 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              {t('sla.breached')}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-200 text-rose-900">
              OVERDUE
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-rose-950 tabular-nums">
            {slaMetrics.breached}
          </div>
          <span className="text-[11px] text-rose-800 mt-1 block font-medium">
            {t('manifest.breachedCount')}
          </span>
        </div>
      </div>

      {/* Manifest Header & Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {t('manifest.title')}
              </h2>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold uppercase font-mono">
                {currentUser?.role ? `${currentUser.role.toUpperCase()} DISPATCH` : 'DISPATCH OPERATIONS'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('manifest.subtitle')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Primary Export CSV Button */}
            <button
              type="button"
              onClick={() => handleExportCsv('current')}
              disabled={filteredShipments.length === 0}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-xs ${
                filteredShipments.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700 active:scale-95'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
              title={t('manifest.exportCsvDesc')}
            >
              <Download className="w-3.5 h-3.5 text-white" />
              <span>{t('manifest.exportCsv')}</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-700/80 text-emerald-100">
                {filteredShipments.length}
              </span>
            </button>

            {/* If filters applied and there are more total shipments, offer quick Export All option */}
            {filteredShipments.length < shipments.length && (
              <button
                type="button"
                onClick={() => handleExportCsv('all')}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                title={t('manifest.exportAll', { count: shipments.length })}
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>{t('manifest.exportAll', { count: shipments.length })}</span>
              </button>
            )}

            {/* If selected rows, offer Export Selected */}
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => handleExportCsv('selected')}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-semibold transition-colors shadow-xs"
                title={t('manifest.exportSelected', { count: selectedIds.length })}
              >
                <Download className="w-3.5 h-3.5 text-blue-700" />
                <span>{t('manifest.exportSelected', { count: selectedIds.length })}</span>
              </button>
            )}

            {/* Print Driver Pickup Manifest */}
            <button
              type="button"
              onClick={() => setShowManifestSummary(true)}
              disabled={selectedIds.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('manifest.printScan')} ({selectedIds.length})</span>
            </button>
          </div>
        </div>


        {/* Notifications */}
        {exportNotice && (
          <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span className="font-medium">{exportNotice}</span>
            </div>
            <button onClick={() => setExportNotice(null)} className="text-emerald-700 hover:text-emerald-900 font-bold px-1">✕</button>
          </div>
        )}

        {mitigationNotice && (
          <div className="mt-3 p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-blue-600" />
              <span className="font-medium">{mitigationNotice}</span>
            </div>
            <button onClick={() => setMitigationNotice(null)} className="text-blue-700 hover:text-blue-900 font-bold px-1">✕</button>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="pt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('manifest.searchParcels')}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </div>

          {/* SLA Filter Buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
            <button
              onClick={() => setSlaFilter('all')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                slaFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('manifest.allSla')}
            </button>
            <button
              onClick={() => setSlaFilter('at_risk')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1 ${
                slaFilter === 'at_risk' ? 'bg-amber-500 text-white shadow-xs font-bold' : 'text-amber-800 hover:text-amber-950'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>{t('sla.at_risk')} ({slaMetrics.atRisk})</span>
            </button>
            <button
              onClick={() => setSlaFilter('breached')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1 ${
                slaFilter === 'breached' ? 'bg-rose-600 text-white shadow-xs font-bold' : 'text-rose-800 hover:text-rose-950'
              }`}
            >
              <AlertCircle className="w-3 h-3" />
              <span>{t('sla.breached')} ({slaMetrics.breached})</span>
            </button>
          </div>

          {/* Status Segmented Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('manifest.allStatuses')}
            </button>
            <button
              onClick={() => setStatusFilter('in_transit')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === 'in_transit' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('status.in_transit')}
            </button>
            <button
              onClick={() => setStatusFilter('out_for_delivery')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === 'out_for_delivery' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('status.out_for_delivery')}
            </button>
          </div>

          {/* Carrier Dropdown */}
          <select
            value={carrierFilter}
            onChange={(e) => setCarrierFilter(e.target.value)}
            className="p-2 border border-slate-200 bg-white rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">{t('manifest.allCarriers')}</option>
            <option value="vanguard">Transerve</option>
            <option value="fedex">FedEx</option>
            <option value="ups">UPS</option>
            <option value="usps">USPS</option>
            <option value="dhl">DHL</option>
          </select>

          {/* Quick Export CSV Button in toolbar */}
          <button
            type="button"
            onClick={() => handleExportCsv('current')}
            disabled={filteredShipments.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('manifest.exportCsvDesc')}
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t('manifest.exportCsv')}</span>
          </button>
        </div>
      </div>

      {/* High Density Table Grid with SLA Highlighting */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4 w-10 text-center">
                  <button onClick={toggleSelectAll} className="cursor-pointer">
                    {selectedIds.length === filteredShipments.length && filteredShipments.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4 font-bold">{t('manifest.colTracking')}</th>
                <th className="py-3 px-4 font-bold">{t('common.carrier')}</th>
                <th className="py-3 px-4 font-bold">{t('manifest.colSla')}</th>
                <th className="py-3 px-4 font-bold">{t('manifest.colRoute')}</th>
                <th className="py-3 px-4 font-bold text-right">{t('label.weight')}</th>
                <th className="py-3 px-4 font-bold">{t('sla.deliveryWindow')}</th>
                <th className="py-3 px-4 font-bold text-right">{t('manifest.colActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredShipments.map((s) => {
                const isSelected = selectedIds.includes(s.id);
                const sla = getShipmentSla(s);
                const isAtRisk = sla.status === 'at_risk';
                const isBreached = sla.status === 'breached';

                return (
                  <tr
                    key={s.id}
                    className={`transition-colors ${
                      isBreached
                        ? 'bg-rose-50/50 hover:bg-rose-50/80 border-l-4 border-rose-500'
                        : isAtRisk
                        ? 'bg-amber-50/50 hover:bg-amber-50/80 border-l-4 border-amber-500'
                        : isSelected
                        ? 'bg-blue-50/30'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => toggleSelect(s.id)} className="cursor-pointer">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300" />
                        )}
                      </button>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-900">{s.trackingNumber}</div>
                      <div className="text-[10px] text-slate-500 font-mono">Ref: {s.referenceNumber}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 uppercase">{s.carrier}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[150px]">{s.serviceLevel}</div>
                    </td>

                    {/* SLA Status Column */}
                    <td className="py-3 px-4">
                      <div
                        onClick={() => setInspectingSlaShipment({ shipment: s, sla })}
                        className="cursor-pointer group"
                      >
                        {isBreached ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 group-hover:bg-rose-200 transition-colors">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span>{t('sla.breached')} ({t('sla.overdue')})</span>
                          </span>
                        ) : isAtRisk ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 group-hover:bg-amber-200 transition-colors">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-pulse" />
                            <span>{t('sla.at_risk')} ({formatTimeRemaining(sla.timeRemainingMinutes)} {t('sla.bufferTime')})</span>
                          </span>
                        ) : sla.status === 'delivered_on_time' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{t('sla.delivered_on_time')}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>{t('sla.on_schedule')} ({formatTimeRemaining(sla.timeRemainingMinutes)})</span>
                          </span>
                        )}

                        {sla.riskReason && (
                          <div className="text-[10px] text-slate-500 font-medium truncate max-w-[200px] mt-0.5 group-hover:text-slate-900">
                            {sla.riskReason}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-slate-800 font-medium">
                        {s.shipper.city} → <strong>{s.recipient.city}</strong>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                        To: {s.recipient.name}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {formatWeight(s.package.weightKg)}
                    </td>

                    <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                      <div className="font-semibold text-slate-900">
                        {formatDate(s.estimatedDelivery, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="text-[10px] text-slate-500">{s.rates.deliveryTimeWindow}</div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setInspectingSlaShipment({ shipment: s, sla })}
                          className={`p-1.5 rounded-md transition-colors ${
                            isAtRisk || isBreached
                              ? 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                              : 'hover:bg-slate-100 text-slate-600'
                          }`}
                          title="SLA Diagnostics"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onSelectShipment(s)}
                          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition-colors"
                          title={t('manifest.viewTrack')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setViewingLabelShipment(s)}
                          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                          title={t('manifest.viewLabel')}
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredShipments.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-xs">
            {t('manifest.noResults')}
          </div>
        )}
      </div>

      {/* Bulk Action Bar for Selected Records */}
      {selectedIds.length > 0 && (
        <div className="p-3 bg-slate-900 text-white rounded-xl shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="font-mono font-bold bg-blue-600 text-white px-2 py-0.5 rounded text-[11px]">
              {selectedIds.length}
            </span>
            <span className="text-slate-300">
              {selectedIds.length === 1 ? '1 shipment selected' : `${selectedIds.length} shipments selected`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleExportCsv('selected')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('manifest.exportSelected', { count: selectedIds.length })}</span>
            </button>
            <button
              onClick={() => setShowManifestSummary(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors border border-slate-700"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('manifest.printScan')}</span>
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1.5 text-slate-400 hover:text-white transition-colors text-[11px]"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}



      {/* SLA Risk Diagnostic & Mitigation Modal */}
      {inspectingSlaShipment && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${
                  inspectingSlaShipment.sla.status === 'breached'
                    ? 'bg-rose-100 text-rose-700'
                    : inspectingSlaShipment.sla.status === 'at_risk'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {inspectingSlaShipment.sla.status === 'breached' ? (
                    <AlertCircle className="w-5 h-5" />
                  ) : inspectingSlaShipment.sla.status === 'at_risk' ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">SLA Commitment Diagnostic</h3>
                  <p className="text-xs text-slate-500 font-mono">{inspectingSlaShipment.shipment.trackingNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectingSlaShipment(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Diagnostic Information */}
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="flex justify-between font-mono">
                  <span className="text-slate-500">CARRIER SERVICE:</span>
                  <strong className="text-slate-900">{inspectingSlaShipment.shipment.rates.carrierName}</strong>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-slate-500">GUARANTEED DEADLINE:</span>
                  <strong className="text-slate-900">{inspectingSlaShipment.shipment.rates.deliveryTimeWindow} ({new Date(inspectingSlaShipment.shipment.estimatedDelivery).toLocaleDateString()})</strong>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-slate-500">SLA BUFFER REMAINING:</span>
                  <strong className={`tabular-nums ${
                    inspectingSlaShipment.sla.status === 'breached'
                      ? 'text-rose-600'
                      : inspectingSlaShipment.sla.status === 'at_risk'
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }`}>
                    {formatTimeRemaining(inspectingSlaShipment.sla.timeRemainingMinutes) || '0m'}
                  </strong>
                </div>
              </div>

              {inspectingSlaShipment.sla.riskReason && (
                <div className={`p-3 rounded-lg border text-xs ${
                  inspectingSlaShipment.sla.status === 'breached'
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}>
                  <span className="font-bold block uppercase text-[10px] tracking-wider mb-1">Root Cause Risk Analysis</span>
                  <p>{inspectingSlaShipment.sla.riskReason}</p>
                </div>
              )}
            </div>

            {/* Mitigation Actions */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Recommended Carrier Actions
              </span>
              <div className="grid grid-cols-1 gap-2 text-xs">
                <button
                  onClick={() => handleExecuteMitigation('Expedite Final-Mile Courier Priority')}
                  className="p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium text-left flex items-center justify-between transition-colors"
                >
                  <span>1. Expedite Final-Mile Priority Courier</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleExecuteMitigation('Send Proactive SMS & Email Delay Notification')}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-medium text-left flex items-center justify-between transition-colors"
                >
                  <span>2. Notify Consignee with Adjusted ETA Window</span>
                  <Send className="w-4 h-4 text-slate-500" />
                </button>
                <button
                  onClick={() => handleExecuteMitigation('Re-route via Alternative Regional Sort Hub')}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-medium text-left flex items-center justify-between transition-colors"
                >
                  <span>3. Re-route via Regional Air Hub Backup</span>
                  <Truck className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInspectingSlaShipment(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Carrier Pickup Manifest Summary Sheet Modal */}
      {showManifestSummary && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Carrier Driver Pickup Manifest (SCAN Sheet)
                </h3>
                <p className="text-xs text-slate-500">
                  Daily End of Day Driver Handover Document · Date: {new Date().toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setShowManifestSummary(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
              <div className="flex justify-between font-mono">
                <span>MANIFEST ID: <strong>MF-2026-W45-0982</strong></span>
                <span>ORIGIN FACILITY: <strong>AERO-HUB-01</strong></span>
              </div>
              <div className="flex justify-between font-mono">
                <span>TOTAL PACKAGES: <strong>{selectedIds.length}</strong></span>
                <span>TOTAL WEIGHT: <strong>
                  {shipments.filter(s => selectedIds.includes(s.id)).reduce((acc, c) => acc + c.package.weightKg, 0).toFixed(1)} KG
                </strong></span>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
              {shipments.filter(s => selectedIds.includes(s.id)).map((s, i) => (
                <div key={s.id} className="p-2.5 flex items-center justify-between font-mono">
                  <div>
                    <span className="font-bold">{i + 1}. {s.trackingNumber}</span>
                    <span className="text-slate-500 block text-[10px]">{s.recipient.name} ({s.recipient.city}, {s.recipient.state})</span>
                  </div>
                  <span className="text-slate-700">{s.package.weightKg} kg · {s.serviceLevel}</span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500">Carrier Courier Signature Required at pickup</span>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Dispatch Manifest</span>
                </button>
                <button
                  onClick={() => setShowManifestSummary(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shipping Label Modal */}
      {viewingLabelShipment && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">Carrier Shipping Label</h3>
                <p className="text-xs text-slate-500 font-mono">{viewingLabelShipment.trackingNumber}</p>
              </div>
              <button
                onClick={() => setViewingLabelShipment(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <ShippingLabel shipment={viewingLabelShipment} />

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewingLabelShipment(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
