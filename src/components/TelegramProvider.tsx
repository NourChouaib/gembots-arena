'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface TelegramContextType {
  isTelegram: boolean;
  isTgRoute: boolean;
}

const TelegramContext = createContext<TelegramContextType>({
  isTelegram: false,
  isTgRoute: false,
});

export function useTelegram() {
  return useContext(TelegramContext);
}

export default function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [isTelegram, setIsTelegram] = useState(false);
  const [isTgRoute, setIsTgRoute] = useState(false);

  useEffect(() => {
    // Check if opened as Telegram Mini App
    const tg = (window as any).Telegram?.WebApp;
    if (tg && tg.initData) {
      setIsTelegram(true);
      tg.ready();
      tg.expand();
      // Apply TG theme
      document.documentElement.style.setProperty('--tg-bg', tg.backgroundColor || '#0A0A0F');
    }

    // Check if on /tg route
    if (window.location.pathname.startsWith('/tg')) {
      setIsTgRoute(true);
    }
  }, []);

  return (
    <TelegramContext.Provider value={{ isTelegram, isTgRoute }}>
      {children}
    </TelegramContext.Provider>
  );
}
