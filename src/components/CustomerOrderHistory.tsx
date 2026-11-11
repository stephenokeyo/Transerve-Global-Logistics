import React, { useState, useMemo } from 'react';
import { User } from '../types/user';
import { Shipment } from '../types/shipping';
import { useI18n } from '../i18n/I18nContext';
import { 
  Package, Truck, CheckCircle2, ArrowRight, Clock, 
  MapPin, FileText, ChevronRight, Search, ShieldCheck,
  Calendar, X, RotateCcw, Filter, Building2, SlidersHorizontal,
  PackageSearch, Receipt, Printer
} from 'lucide-react';
import { PrintableReceiptModal } from './PrintableReceiptModal';

interface CustomerOrderHistoryProps {
  currentUser: User;
  allShipments: Shipment[];
  onTrackShipment: (shipment: Shipment) => void;
}

export const CustomerOrderHistory: React.FC<CustomerOrderHistoryProps> = ({
  currentUser,
  allShipments,
  onTrackShipment,
}) => {
  const { t, tStatus, formatDate, formatWeight } = useI18n();

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_transit' | 'delivered'>('all');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [receiptShipment, setReceiptShipment] = useState<Shipment | null>(null);

  // 1. Filter shipments belonging to or associated with this customer
  const baseCustomerOrders = useMemo(() => {
    const matched = allShipments.filter((s) => {
      const isRecipient =
        s.recipient.email.toLowerCase() === currentUser.email.toLowerCase() ||
        s.recipient.name.toLowerCase().includes(currentUser.name.toLowerCase()) ||
        (currentUser.company && s.recipient.company?.toLowerCase().includes(currentUser.company.toLowerCase()));

      const isShipper =
        s.shipper.email.toLowerCase() === currentUser.email.toLowerCase() ||
        s.shipper.name.toLowerCase().includes(currentUser.name.toLowerCase());

      return isRecipient || isShipper;
    });

    // Fallback: If no direct match in mock data, provide full shipments pool for customer inspection
    return matched.length > 0 ? matched : allShipments;
  }, [allShipments, currentUser]);

  // 2. Extract distinct destination cities for dropdown filter
  const destinationCities = useMemo(() => {
    const cities = new Set<string>();
    baseCustomerOrders.forEach((order) => {
      if (order.recipient.city) {
        cities.add(order.recipient.city);
      }
    });
    return Array.from(cities).sort();
  }, [baseCustomerOrders]);

  // 3. Multi-criteria filtering: Tracking Number, Destination City, Delivery Date Range, Status
  const filteredOrders = useMemo(() => {
    return baseCustomerOrders.filter((order) => {
      // Search filter: checks tracking number, reference, contents description, recipient name, or city
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesTracking = order.trackingNumber.toLowerCase().includes(query);
        const matchesRef = order.referenceNumber.toLowerCase().includes(query);
        const matchesContents = order.package.contentsDescription.toLowerCase().includes(query);
        const matchesCity = order.recipient.city.toLowerCase().includes(query);
        const matchesRecipient = order.recipient.name.toLowerCase().includes(query);

        if (!matchesTracking && !matchesRef && !matchesContents && !matchesCity && !matchesRecipient) {
          return false;
        }
      }

      // Destination City Filter
      if (selectedCity && selectedCity !== 'ALL') {
        if (order.recipient.city.toLowerCase() !== selectedCity.toLowerCase()) {
          return false;
        }
      }

      // Delivery Date Range Filter
      const deliveryDateStr = order.estimatedDelivery;
      if (deliveryDateStr) {
        const orderTime = new Date(deliveryDateStr).getTime();
        if (!isNaN(orderTime)) {
          if (startDate) {
            const startTime = new Date(startDate).setHours(0, 0, 0, 0);
            if (orderTime < startTime) return false;
          }
          if (endDate) {
            const endTime = new Date(endDate).setHours(23, 59, 59, 999);
            if (orderTime > endTime) return false;
          }
        }
      }

      // Status Filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'in_transit' && order.status === 'delivered') return false;
        if (statusFilter === 'delivered' && order.status !== 'delivered') return false;
      }

      return true;
    });
  }, [baseCustomerOrders, searchQuery, selectedCity, startDate, endDate, statusFilter]);

  // Check if any filter is currently applied
  const hasActiveFilters = Boolean(
    searchQuery.trim() || (selectedCity && selectedCity !== 'ALL') || startDate || endDate || statusFilter !== 'all'
  );

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCity('');
    setStartDate('');
    setEndDate('');
    setStatusFilter('all');
  };

  const handleApplyPreset = (preset: 'all' | '7d' | '30d' | 'year') => {
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
      return;
    }
    const today = new Date();
    const toDateStr = today.toISOString().slice(0, 10);

    if (preset === '7d') {
      const past = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().slice(0, 10));
      setEndDate(toDateStr);
    } else if (preset === '30d') {
      const past = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().slice(0, 10));
      setEndDate(toDateStr);
    } else if (preset === 'year') {
      setStartDate('2026-01-01');
      setEndDate('2026-12-31');
    }
  };

  return (
    <div className="space-y-6">
      {/* Customer Header & Search / Filter Console */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        
        {/* Title & Customer Profile Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {t('customer.title')}
              </h2>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[10px] font-bold uppercase tracking-wider">
                {t('role.customer')}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('customer.subtitle')} · <strong>{currentUser.name}</strong> ({currentUser.email})
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-mono">
              {t('customer.showingFiltered', { count: filteredOrders.length, total: baseCustomerOrders.length })}
            </span>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>ISO 27001 Protected</span>
            </div>
          </div>
        </div>

        {/* Primary Search Bar & Destination City Controls */}
        <div className="pt-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Universal Search input (Tracking #, Reference, City, Contents) */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('customer.searchPlaceholder')}
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-mono"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                title="Clear search text"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Destination City Filter Dropdown */}
          <div className="relative w-full md:w-56 shrink-0">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full pl-8 pr-7 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all cursor-pointer appearance-none"
            >
              <option value="">{t('customer.allCities')} ({destinationCities.length})</option>
              {destinationCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">
              ▼
            </div>
          </div>

          {/* Advanced Date Range Toggle Button */}
          <button
            type="button"
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            className={`px-3.5 py-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              isFilterPanelOpen || startDate || endDate
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{t('customer.filterByDate')}</span>
            {(startDate || endDate) && (
              <span className="w-2 h-2 rounded-full bg-blue-600" />
            )}
          </button>

          {/* Reset Filters Button (if active) */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-2.5 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              title={t('customer.clearFilters')}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('customer.clearFilters')}</span>
            </button>
          )}
        </div>

        {/* Expandable Date Range & Status Filter Panel */}
        {isFilterPanelOpen && (
          <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/70 p-4 rounded-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 font-mono flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                {t('customer.filterByDate')}
              </span>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-400 text-[11px] mr-1">Presets:</span>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('all')}
                  className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-medium cursor-pointer"
                >
                  {t('customer.presetAll')}
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('7d')}
                  className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-medium cursor-pointer"
                >
                  {t('customer.preset7d')}
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('30d')}
                  className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-medium cursor-pointer"
                >
                  {t('customer.preset30d')}
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('year')}
                  className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-medium cursor-pointer"
                >
                  {t('customer.presetYear')}
                </button>
              </div>
            </div>

            {/* Date Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 font-mono mb-1">
                  {t('customer.dateFrom')}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 font-mono mb-1">
                  {t('customer.dateTo')}
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 font-mono mb-1">
                  Delivery Status
                </label>
                <div className="inline-flex w-full p-0.5 bg-slate-200 rounded-lg text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`flex-1 py-1.5 rounded transition-all text-center ${
                      statusFilter === 'all' ? 'bg-white font-bold text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('in_transit')}
                    className={`flex-1 py-1.5 rounded transition-all text-center ${
                      statusFilter === 'in_transit' ? 'bg-white font-bold text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    In Transit
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('delivered')}
                    className={`flex-1 py-1.5 rounded transition-all text-center ${
                      statusFilter === 'delivered' ? 'bg-white font-bold text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Delivered
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Filter Pills Strip */}
        {hasActiveFilters && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 font-mono text-[11px]">Active Filters:</span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-mono text-[11px]">
                Search: "{searchQuery}"
                <button type="button" onClick={() => setSearchQuery('')} className="hover:text-blue-900 cursor-pointer">×</button>
              </span>
            )}
            {selectedCity && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full font-mono text-[11px]">
                City: {selectedCity}
                <button type="button" onClick={() => setSelectedCity('')} className="hover:text-indigo-900 cursor-pointer">×</button>
              </span>
            )}
            {(startDate || endDate) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full font-mono text-[11px]">
                Date: {startDate || 'Start'} → {endDate || 'Now'}
                <button type="button" onClick={() => { setStartDate(''); setEndDate(''); }} className="hover:text-amber-900 cursor-pointer">×</button>
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-mono text-[11px]">
                Status: {statusFilter}
                <button type="button" onClick={() => setStatusFilter('all')} className="hover:text-emerald-900 cursor-pointer">×</button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Orders List / Empty Search State */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <PackageSearch className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {t('customer.noMatchingOrders')}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Try adjusting your tracking number keyword, choosing a different destination city, or clearing the delivery date range.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t('customer.resetSearch')}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const isDelivered = order.status === 'delivered';
            const isOut = order.status === 'out_for_delivery';

            return (
              <div
                key={order.id}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isDelivered
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        : isOut
                        ? 'bg-blue-50 text-blue-600 border border-blue-200 animate-pulse'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {isDelivered ? <CheckCircle2 className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-black text-slate-900">
                        {order.trackingNumber}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {order.carrier}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                          isDelivered
                            ? 'bg-emerald-50 text-emerald-800'
                            : isOut
                            ? 'bg-blue-50 text-blue-800'
                            : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {tStatus(order.status)}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-800">
                      {order.package.contentsDescription}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5">
                      <span>From: <strong>{order.shipper.city}, {order.shipper.state}</strong></span>
                      <span aria-hidden="true">·</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-blue-600" />
                        <span>To: <strong>{order.recipient.name}</strong> ({order.recipient.city}, {order.recipient.state})</span>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{t('label.weight')}: {formatWeight(order.package.weightKg)}</span>
                    </div>
                  </div>
                </div>

                {/* Status and Action */}
                <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-mono">
                      {isDelivered ? t('customer.deliveredOn') : t('tracker.estimatedDelivery')}
                    </span>
                    <span className="font-bold text-xs text-slate-900">
                      {formatDate(order.estimatedDelivery, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setReceiptShipment(order)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                      title="Print Shipping Receipt & Tax Invoice"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Receipt</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onTrackShipment(order)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                    >
                      <span>{t('customer.trackOrder')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Printable Shipping Receipt & Tax Invoice Modal */}
      {receiptShipment && (
        <PrintableReceiptModal
          shipment={receiptShipment}
          onClose={() => setReceiptShipment(null)}
        />
      )}
    </div>
  );
};
