import React, { createContext, useContext, useState } from 'react';
import { translations } from '../translations';

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'uz');

  function toggleLang() {
    setLang((l) => {
      const next = l === 'uz' ? 'ru' : 'uz';
      localStorage.setItem('lang', next);
      return next;
    });
  }

  function t(key) {
    const dict = translations[lang] || translations.uz;
    return dict[key] || translations.uz[key] || key;
  }

  return (
    <LangContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
