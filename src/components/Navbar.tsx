import React from 'react';
import { User } from '../types/user';
import { UserRoleSwitcher } from './UserRoleSwitcher';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useI18n } from '../i18n/I18nContext';
import { Package, Shield, Search } from 'lucide-react';

interface NavbarProps {
  activeTab: 'tracker' | 'generator' | 'manifest' | 'admin' | 'customer_orders';
  onSelectTab: (tab: 'tracker' | 'generator' | 'manifest' | 'admin' | 'customer_orders') => void;
  onOpenRateCalculator: () => void;
  currentUser: User;
  onUserChanged: (user: User) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenRateCalculator,
  currentUser,
  onUserChanged,
}) => {
  const { t } = useI18n();
  const isAdmin = currentUser.role === 'admin';
  const isShipper = currentUser.role === 'shipper';
  const isCustomer = currentUser.role === 'customer';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      {/* 
        Strict Top Bar Contract (§2):
        [Brand title, one line] — [4–5 nav links, 1–2 word labels, single-line] — [Language + Role profile + Primary Action]
      */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 lg:gap-8">
        {/* Zone 1: Brand Wordmark (Single text element in display face, whitespace-nowrap shrink-0) */}
        <div 
          onClick={() => onSelectTab(isCustomer ? 'customer_orders' : 'tracker')} 
          className="flex items-center gap-2.5 cursor-pointer whitespace-nowrap shrink-0 select-none"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-950 text-white flex items-center justify-center font-black text-sm shadow-xs">
            T
          </div>
          <span className="text-lg font-extrabold tracking-tight text-slate-950">
            {t('nav.brand')}
          </span>
        </div>

        {/* Zone 2: 4–5 single-line text nav links governed by User Role */}
        <nav className="hidden md:flex items-center gap-5 lg:gap-6 text-sm font-medium text-slate-600">
          {isCustomer ? (
            <>
              <button
                onClick={() => onSelectTab('customer_orders')}
                className={`transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'customer_orders'
                    ? 'text-slate-950 font-bold border-b-2 border-slate-950 py-5'
                    : 'hover:text-slate-950'
                }`}
              >
                {t('nav.myOrders')}
              </button>

              <button
                onClick={() => onSelectTab('tracker')}
                className={`transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'tracker'
                    ? 'text-slate-950 font-bold border-b-2 border-slate-950 py-5'
                    : 'hover:text-slate-950'
                }`}
              >
                {t('nav.trackPackage')}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onSelectTab('tracker')}
                className={`transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'tracker'
                    ? 'text-slate-950 font-bold border-b-2 border-slate-950 py-5'
                    : 'hover:text-slate-950'
                }`}
              >
                {t('nav.liveTracking')}
              </button>

              <button
                onClick={() => onSelectTab('generator')}
                className={`transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'generator'
                    ? 'text-slate-950 font-bold border-b-2 border-slate-950 py-5'
                    : 'hover:text-slate-950'
                }`}
              >
                {t('nav.createLabel')}
              </button>

              <button
                onClick={() => onSelectTab('manifest')}
                className={`transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'manifest'
                    ? 'text-slate-950 font-bold border-b-2 border-slate-950 py-5'
                    : 'hover:text-slate-950'
                }`}
              >
                {t('nav.fleetManifest')}
              </button>

              {isAdmin && (
                <button
                  onClick={() => onSelectTab('admin')}
                  className={`transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    activeTab === 'admin'
                      ? 'text-purple-950 font-bold border-b-2 border-purple-700 py-5'
                      : 'text-purple-700 hover:text-purple-950'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 text-purple-700" />
                  <span>{t('nav.userManagement')}</span>
                </button>
              )}

              <button
                onClick={onOpenRateCalculator}
                className="hover:text-slate-950 transition-colors whitespace-nowrap shrink-0"
              >
                {t('nav.rateCalculator')}
              </button>
            </>
          )}
        </nav>

        {/* Zone 3: Language Selector + Role switcher profile + 1 primary action */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <LanguageSwitcher />

          <UserRoleSwitcher
            currentUser={currentUser}
            onUserChanged={onUserChanged}
          />

          {isCustomer ? (
            <button
              onClick={() => onSelectTab('tracker')}
              className="px-3.5 py-2 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{t('nav.trackParcel')}</span>
            </button>
          ) : (
            <button
              onClick={() => onSelectTab('generator')}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs flex items-center gap-1.5"
            >
              <Package className="w-3.5 h-3.5" />
              <span>{t('nav.shipPackage')}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

