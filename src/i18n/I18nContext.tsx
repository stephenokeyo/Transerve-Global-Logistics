import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Language, LanguageOption, I18nContextType } from './types';
import { enTranslations } from './locales/en';
import { esTranslations } from './locales/es';
import { frTranslations } from './locales/fr';

const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', locale: 'en-US' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', locale: 'es-ES' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', locale: 'fr-FR' },
];

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: enTranslations,
  es: esTranslations,
  fr: frTranslations,
};

const LOCALE_MAP: Record<Language, string> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
};

const STORAGE_KEY = 'vanguard_i18n_lang';

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (saved && (saved === 'en' || saved === 'es' || saved === 'fr')) {
        return saved;
      }
      // Check browser navigator language
      if (typeof navigator !== 'undefined' && navigator.language) {
        const navLang = navigator.language.toLowerCase();
        if (navLang.startsWith('es')) return 'es';
        if (navLang.startsWith('fr')) return 'fr';
      }
    } catch {
      // Fallback
    }
    return 'en';
  });

  const locale = LOCALE_MAP[language] || 'en-US';

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = lang;
      }
    } catch (e) {
      console.warn('Could not persist i18n language preference:', e);
    }
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  // Translation lookup with fallback to English and parameter replacement
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const dict = TRANSLATIONS[language] || enTranslations;
    let text = dict[key] || enTranslations[key] || key;

    if (params) {
      Object.entries(params).forEach(([paramKey, val]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
      });
    }

    return text;
  }, [language]);

  // Date and Time formatters
  const formatDate = useCallback((date: string | Date | number, options?: Intl.DateTimeFormatOptions): string => {
    try {
      const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
      if (isNaN(d.getTime())) return String(date);
      const defaultOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options,
      };
      return new Intl.DateTimeFormat(locale, defaultOptions).format(d);
    } catch {
      return String(date);
    }
  }, [locale]);

  const formatTime = useCallback((date: string | Date | number, options?: Intl.DateTimeFormatOptions): string => {
    try {
      const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
      if (isNaN(d.getTime())) return String(date);
      const defaultOptions: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        ...options,
      };
      return new Intl.DateTimeFormat(locale, defaultOptions).format(d);
    } catch {
      return String(date);
    }
  }, [locale]);

  const formatDateTime = useCallback((date: string | Date | number, options?: Intl.DateTimeFormatOptions): string => {
    try {
      const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
      if (isNaN(d.getTime())) return String(date);
      const defaultOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...options,
      };
      return new Intl.DateTimeFormat(locale, defaultOptions).format(d);
    } catch {
      return String(date);
    }
  }, [locale]);

  // Number and Currency formatters
  const formatCurrency = useCallback((amount: number, currency: string = 'USD'): string => {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `$${amount.toFixed(2)}`;
    }
  }, [locale]);

  const formatNumber = useCallback((value: number, options?: Intl.NumberFormatOptions): string => {
    try {
      return new Intl.NumberFormat(locale, options).format(value);
    } catch {
      return String(value);
    }
  }, [locale]);

  const formatWeight = useCallback((kg: number): string => {
    const formatted = formatNumber(kg, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    return `${formatted} kg`;
  }, [formatNumber]);

  const formatDistance = useCallback((km: number): string => {
    const formatted = formatNumber(km);
    return `${formatted} km`;
  }, [formatNumber]);

  const formatPercent = useCallback((value: number, decimals: number = 1): string => {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value / 100);
    } catch {
      return `${value.toFixed(decimals)}%`;
    }
  }, [locale]);

  // Semantic status helpers
  const tStatus = useCallback((status: string): string => {
    return t(`status.${status}`);
  }, [t]);

  const tSla = useCallback((status: string): string => {
    return t(`sla.${status}`);
  }, [t]);

  const tRole = useCallback((role: string): string => {
    return t(`role.${role}`);
  }, [t]);

  const contextValue = useMemo<I18nContextType>(() => ({
    language,
    locale,
    setLanguage,
    t,
    formatDate,
    formatTime,
    formatDateTime,
    formatCurrency,
    formatNumber,
    formatWeight,
    formatDistance,
    formatPercent,
    tStatus,
    tSla,
    tRole,
    languages: SUPPORTED_LANGUAGES,
  }), [
    language,
    locale,
    setLanguage,
    t,
    formatDate,
    formatTime,
    formatDateTime,
    formatCurrency,
    formatNumber,
    formatWeight,
    formatDistance,
    formatPercent,
    tStatus,
    tSla,
    tRole,
  ]);

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
