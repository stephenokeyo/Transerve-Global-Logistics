export type Language = 'en' | 'es' | 'fr';

export interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
  locale: string;
}

export interface I18nContextType {
  language: Language;
  locale: string;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatDate: (date: string | Date | number, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (date: string | Date | number, options?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (date: string | Date | number, options?: Intl.DateTimeFormatOptions) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatWeight: (kg: number) => string;
  formatDistance: (km: number) => string;
  formatPercent: (value: number, decimals?: number) => string;
  tStatus: (status: string) => string;
  tSla: (status: string) => string;
  tRole: (role: string) => string;
  languages: LanguageOption[];
}
