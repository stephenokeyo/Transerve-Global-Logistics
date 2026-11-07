import React, { useState, useMemo } from 'react';
import { User, ShipperLoyaltyProfile, LoyaltyTierDefinition } from '../types/user';
import { Shipment } from '../types/shipping';
import { 
  LOYALTY_TIERS, 
  calculateUserLoyaltyProfile, 
  getAllShipperLoyaltyProfiles 
} from '../services/loyaltyService';
import { useI18n } from '../i18n/I18nContext';
import { 
  Award, TrendingUp, Sparkles, ShieldCheck, ArrowUpRight, 
  Package, DollarSign, Percent, CheckCircle2, ChevronRight,
  Zap, Users, Search, Filter, ShieldAlert, Gift, Star, RefreshCw
} from 'lucide-react';

interface ShipperLoyaltySectionProps {
  currentUser: User;
  users: User[];
  shipments?: Shipment[];
  onSelectUserForDetail?: (userId: string) => void;
}

export const ShipperLoyaltySection: React.FC<ShipperLoyaltySectionProps> = ({
  currentUser,
  users,
  shipments,
  onSelectUserForDetail,
}) => {
  const { t, formatNumber, formatPercent } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | 'bronze' | 'silver' | 'gold' | 'platinum'>('all');
  const [selectedProfileId, setSelectedProfileId] = useState<string>(currentUser.id);

  // Compute all user profiles
  const allProfiles: ShipperLoyaltyProfile[] = useMemo(() => {
    return getAllShipperLoyaltyProfiles(users, shipments);
  }, [users, shipments]);

  // Active focused profile (defaults to currentUser, or selected user)
  const activeProfile = useMemo(() => {
    const found = allProfiles.find(p => p.userId === selectedProfileId);
    return found || allProfiles[0] || calculateUserLoyaltyProfile(currentUser, shipments);
  }, [allProfiles, selectedProfileId, currentUser, shipments]);

  // Filtered leaderboard
  const filteredProfiles = useMemo(() => {
    return allProfiles.filter(p => {
      const matchesSearch = 
        p.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.companyName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTier = tierFilter === 'all' || p.currentTier.id === tierFilter;

      return matchesSearch && matchesTier;
    }).sort((a, b) => b.totalShipments - a.totalShipments);
  }, [allProfiles, searchQuery, tierFilter]);

  // Aggregate program statistics
  const programTotals = useMemo(() => {
    const totalDispatches = allProfiles.reduce((acc, p) => acc + p.totalShipments, 0);
    const totalFreightVolume = allProfiles.reduce((acc, p) => acc + p.totalFreightSpendUsd, 0);
    const totalMemberSavings = allProfiles.reduce((acc, p) => acc + p.totalEstimatedSavingsUsd, 0);
    return {
      totalDispatches,
      totalFreightVolume: Math.round(totalFreightVolume),
      totalMemberSavings: Math.round(totalMemberSavings),
      avgDiscount: Math.round(allProfiles.reduce((acc, p) => acc + p.currentTier.discountPct, 0) / allProfiles.length),
    };
  }, [allProfiles]);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Program Highlights */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 rounded-2xl p-6 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 rounded-xl shadow-lg">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-extrabold tracking-tight">
                  {t('loyalty.title')}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-mono text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  Volume Discount Tiers
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                {t('loyalty.subtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t('loyalty.applyToGenerator')}</span>
            </span>
          </div>
        </div>

        {/* Aggregate KPI Grid */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5">
          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Cumulative Dispatches
            </span>
            <div className="text-2xl font-black font-mono text-white mt-1">
              {programTotals.totalDispatches}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Across registered shippers
            </span>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Total Freight Spend
            </span>
            <div className="text-2xl font-black font-mono text-amber-300 mt-1">
              ${programTotals.totalFreightVolume.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Gross billed volume
            </span>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Customer Rate Savings
            </span>
            <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
              ${programTotals.totalMemberSavings.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Tier discount reductions
            </span>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Average Rate Discount
            </span>
            <div className="text-2xl font-black font-mono text-cyan-300 mt-1">
              {programTotals.avgDiscount}% OFF
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Dynamic tier average
            </span>
          </div>
        </div>
      </div>

      {/* 2. Program Tier Rules Matrix (Bronze -> Silver -> Gold -> Platinum) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-extrabold text-slate-900 font-mono uppercase tracking-wider">
              {t('loyalty.tierRules')}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Shipment volume benchmarks, commercial discounts, and operational SLA upgrades
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
            4 Qualification Tiers
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {LOYALTY_TIERS.map((tier) => {
            const isUserCurrentTier = activeProfile.currentTier.id === tier.id;

            return (
              <div
                key={tier.id}
                className={`p-4 rounded-xl border transition-all relative ${
                  isUserCurrentTier
                    ? 'ring-2 ring-amber-500/40 bg-amber-50/30 border-amber-300 shadow-md'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Active user badge */}
                {isUserCurrentTier && (
                  <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-amber-600 text-white font-mono text-[9px] font-bold uppercase tracking-wider shadow-xs">
                    Current Focus Tier
                  </span>
                )}

                <div className="flex items-center justify-between mb-2">
                  <span
                    className="font-mono text-xs font-black px-2 py-0.5 rounded-md uppercase tracking-wider"
                    style={{ backgroundColor: tier.badgeBg, color: tier.badgeText }}
                  >
                    {tier.name}
                  </span>
                  <span className="text-xl font-black font-mono text-slate-900">
                    {tier.discountPct}% OFF
                  </span>
                </div>

                <div className="text-xs font-mono text-slate-500 mb-2">
                  Threshold: <strong>{tier.minShipments}+ shipments</strong>
                </div>

                <p className="text-[11px] text-slate-600 leading-snug mb-3 min-h-[44px]">
                  {tier.description}
                </p>

                {/* Specific perks checklist */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{tier.discountPct}% Flat Discount</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${tier.priorityDispatch ? 'text-slate-800 font-semibold' : 'text-slate-400 line-through'}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${tier.priorityDispatch ? 'text-blue-600' : 'text-slate-300'}`} />
                    <span>{t('loyalty.perkPriority')}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${tier.freeInsuranceBonus ? 'text-slate-800 font-semibold' : 'text-slate-400 line-through'}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${tier.freeInsuranceBonus ? 'text-amber-600' : 'text-slate-300'}`} />
                    <span>{t('loyalty.perkInsurance')}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${tier.dedicatedAccountManager ? 'text-slate-800 font-semibold' : 'text-slate-400 line-through'}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${tier.dedicatedAccountManager ? 'text-purple-600' : 'text-slate-300'}`} />
                    <span>{t('loyalty.perkAccountManager')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Focused Shipper Loyalty Card (Detailed Progression) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white font-extrabold flex items-center justify-center text-base shrink-0 shadow-xs">
              {activeProfile.userName.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-bold text-slate-900">
                  {activeProfile.userName}
                </h4>
                <span
                  className="font-mono text-[11px] font-extrabold px-2 py-0.5 rounded uppercase"
                  style={{ backgroundColor: activeProfile.currentTier.badgeBg, color: activeProfile.currentTier.badgeText }}
                >
                  {activeProfile.currentTier.name}
                </span>
                {activeProfile.userId === currentUser.id && (
                  <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">
                    YOUR ACCOUNT
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">
                {activeProfile.companyName} · {activeProfile.userEmail}
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">
              Current Rate Discount
            </span>
            <div className="text-2xl font-black font-mono text-emerald-600">
              {activeProfile.currentTier.discountPct}% OFF
            </div>
          </div>
        </div>

        {/* Tier Progress Bar */}
        <div className="mt-5 p-4 bg-slate-50/80 rounded-xl border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold font-mono text-slate-800 uppercase">
                {t('loyalty.nextTier')}
              </span>
              <span className="text-slate-400 font-mono">|</span>
              <span className="text-slate-600 font-medium">
                {activeProfile.nextTier
                  ? t('loyalty.shipmentsRemaining', { count: activeProfile.shipmentsToNextTier, tier: activeProfile.nextTier.name })
                  : t('loyalty.highestTierReached')}
              </span>
            </div>
            <span className="font-mono font-bold text-slate-700">
              {activeProfile.totalShipments} / {activeProfile.nextTier?.minShipments || activeProfile.totalShipments} Shipments
            </span>
          </div>

          <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 via-emerald-500 to-indigo-600 rounded-full transition-all duration-700"
              style={{ width: `${activeProfile.progressPctToNextTier}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mt-2">
            <span>{activeProfile.currentTier.name} ({activeProfile.currentTier.minShipments} Dispatches)</span>
            {activeProfile.nextTier && (
              <span>Target: {activeProfile.nextTier.name} ({activeProfile.nextTier.minShipments} Dispatches)</span>
            )}
          </div>
        </div>

        {/* Financial and Activity Summary for this user */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-4">
          <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1 font-mono uppercase">
              <span>{t('loyalty.totalShipments')}</span>
              <Package className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-xl font-black font-mono text-slate-900">
              {activeProfile.totalShipments}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block truncate">
              Last shipment: {new Date(activeProfile.lastShipmentDate || '').toLocaleDateString()}
            </span>
          </div>

          <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1 font-mono uppercase">
              <span>{t('loyalty.totalSpend')}</span>
              <DollarSign className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl font-black font-mono text-slate-900">
              ${activeProfile.totalFreightSpendUsd.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block truncate">
              Commercial line-haul spend
            </span>
          </div>

          <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1 font-mono uppercase">
              <span>{t('loyalty.totalSavings')}</span>
              <Percent className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-black font-mono text-emerald-600">
              ${activeProfile.totalEstimatedSavingsUsd.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block truncate">
              Saved via {activeProfile.currentTier.discountPct}% volume discount
            </span>
          </div>
        </div>
      </div>

      {/* 4. Shipper Directory Leaderboard (All Accounts with Tier Filter & Search) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h4 className="text-sm font-extrabold text-slate-900 font-mono uppercase">
              {t('loyalty.allShippersTitle')}
            </h4>
            <p className="text-xs text-slate-500">
              Real-time volume calculation and discount tier assignment for enterprise accounts
            </p>
          </div>

          {/* Search & Tier Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('loyalty.filterShipper')}
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 w-52"
              />
            </div>

            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value as any)}
              className="p-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">All Loyalty Tiers</option>
              <option value="bronze">Bronze (5% OFF)</option>
              <option value="silver">Silver (10% OFF)</option>
              <option value="gold">Gold (15% OFF)</option>
              <option value="platinum">Platinum (20% OFF)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Shipper / Account</th>
                <th className="py-3 px-4">Organization</th>
                <th className="py-3 px-4">Loyalty Tier</th>
                <th className="py-3 px-4">Commercial Discount</th>
                <th className="py-3 px-4">Shipments</th>
                <th className="py-3 px-4">Total Freight Spend</th>
                <th className="py-3 px-4">Cumulative Savings</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProfiles.map((p) => {
                const isSelected = p.userId === activeProfile.userId;
                const isCurrentUser = p.userId === currentUser.id;

                return (
                  <tr 
                    key={p.userId} 
                    className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                      isSelected ? 'bg-blue-50/40' : ''
                    }`}
                    onClick={() => setSelectedProfileId(p.userId)}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-[11px] shrink-0">
                          {p.userName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{p.userName}</span>
                            {isCurrentUser && (
                              <span className="text-[9px] font-mono text-blue-600 font-bold bg-blue-100 px-1 rounded">YOU</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">{p.userEmail}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {p.companyName}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className="font-mono text-[10px] font-bold px-2 py-0.5 rounded uppercase"
                        style={{ backgroundColor: p.currentTier.badgeBg, color: p.currentTier.badgeText }}
                      >
                        {p.currentTier.name}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">
                      {p.currentTier.discountPct}% OFF
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {p.totalShipments}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-800">
                      ${p.totalFreightSpendUsd.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-emerald-600">
                      ${p.totalEstimatedSavingsUsd.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProfileId(p.userId);
                          if (onSelectUserForDetail) onSelectUserForDetail(p.userId);
                        }}
                        className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {isSelected ? 'Focused' : 'Inspect'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
