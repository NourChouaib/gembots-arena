'use client';

import { useEffect, useState, useCallback } from 'react';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
    query_id?: string;
    auth_date?: number;
    hash?: string;
    start_param?: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  ready: () => void;
  expand: () => void;
  close: () => void;
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    setText: (text: string) => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export function useTelegram() {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    const init = () => {
      const tg = window.Telegram?.WebApp;
      if (tg && tg.initData) {
        setWebApp(tg);
        setUser(tg.initDataUnsafe.user || null);
        setIsTelegram(true);
        
        // Configure app
        tg.ready();
        tg.expand();
        try {
          tg.setHeaderColor('#030712'); // gray-950
          tg.setBackgroundColor('#030712');
        } catch {}
      }
    };
    
    // Try immediately
    init();
    
    // Retry after script loads (defer)
    if (!window.Telegram?.WebApp?.initData) {
      const timer = setTimeout(init, 500);
      const timer2 = setTimeout(init, 1500);
      return () => { clearTimeout(timer); clearTimeout(timer2); };
    }
  }, []);

  const haptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    webApp?.HapticFeedback?.impactOccurred(type);
  }, [webApp]);

  const hapticSuccess = useCallback(() => {
    webApp?.HapticFeedback?.notificationOccurred('success');
  }, [webApp]);

  const hapticError = useCallback(() => {
    webApp?.HapticFeedback?.notificationOccurred('error');
  }, [webApp]);

  const hapticSelect = useCallback(() => {
    webApp?.HapticFeedback?.selectionChanged();
  }, [webApp]);

  return {
    webApp,
    user,
    isTelegram,
    haptic,
    hapticSuccess,
    hapticError,
    hapticSelect,
  };
}
