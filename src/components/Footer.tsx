import React from 'react';
import { ShieldCheck, Globe, Truck, Anchor, Plane } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { LanguageSwitcher } from './LanguageSwitcher';

export const Footer: React.FC = () => {
  const { t } = useI18n();

  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-900 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-white text-slate-950 font-black flex items-center justify-center text-xs">
                T
              </div>
              <span className="text-base font-extrabold text-white tracking-tight">
                {t('nav.brand')}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('hero.subtitle')}
            </p>
            <div className="flex items-center gap-3 text-slate-500 pt-1">
              <Plane className="w-4 h-4" />
              <Truck className="w-4 h-4" />
              <Anchor className="w-4 h-4" />
              <Globe className="w-4 h-4" />
            </div>
          </div>

          {/* Global Operations Hubs */}
          <div className="space-y-2">
            <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">
              {t('footer.globalHubs').split(':')[0]}
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('footer.globalHubs')}
            </p>
          </div>

          {/* Carrier Network Protocols */}
          <div className="space-y-2">
            <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">
              {t('footer.apiGateways').split(':')[0]}
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('footer.apiGateways')}
            </p>
          </div>

          {/* Compliance & Standards */}
          <div className="space-y-2">
            <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">
              {t('footer.slaGuarantee')}
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('footer.certifications')}
            </p>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-900 flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            © {new Date().getFullYear()} {t('footer.rights')}
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher variant="footer" />
          </div>
        </div>
      </div>
    </footer>
  );
};

