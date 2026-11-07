import React, { useState, useRef, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { Language } from '../i18n/types';

interface LanguageSwitcherProps {
  variant?: 'navbar' | 'compact' | 'footer';
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ 
  variant = 'navbar',
  className = '',
}) => {
  const { language, setLanguage, languages } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption = languages.find(l => l.code === language) || languages[0];

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (code: Language) => {
    setLanguage(code);
    setIsOpen(false);
  };

  if (variant === 'footer') {
    return (
      <div className={`flex items-center gap-2 text-xs text-slate-400 ${className}`}>
        <Globe className="w-3.5 h-3.5 shrink-0 text-slate-500" />
        <div className="flex items-center divide-x divide-slate-800">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => handleSelect(l.code)}
              className={`px-2 py-0.5 transition-colors font-mono ${
                language === l.code 
                  ? 'text-sky-400 font-bold' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title={l.name}
            >
              {l.flag} {l.code.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Select language"
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors shadow-2xs select-none"
      >
        <span className="text-sm leading-none" role="img" aria-label={currentOption.name}>
          {currentOption.flag}
        </span>
        <span className="font-mono text-xs text-slate-900 tracking-wide uppercase">
          {currentOption.code}
        </span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
            Select Language / Idioma / Langue
          </div>
          {languages.map((lang) => {
            const isSelected = language === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                  isSelected 
                    ? 'bg-blue-50/80 text-blue-900 font-bold' 
                    : 'text-slate-700 hover:bg-slate-50 font-medium'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none" role="img" aria-label={lang.name}>
                    {lang.flag}
                  </span>
                  <div>
                    <span className="block">{lang.nativeName}</span>
                    <span className="block text-[10px] text-slate-400 font-mono">{lang.name}</span>
                  </div>
                </div>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
