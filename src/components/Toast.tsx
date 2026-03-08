'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

interface ToastContextType {
  showToast: (type: Toast['type'], title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

let toastId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: Toast['type'], title: string, message?: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const icons: Record<string, string> = {
    success: '⚔️',
    error: '❌',
    info: 'ℹ️',
  };

  const colors: Record<string, string> = {
    success: 'from-green-900/90 to-emerald-900/90 border-green-500/50',
    error: 'from-red-900/90 to-rose-900/90 border-red-500/50',
    info: 'from-blue-900/90 to-indigo-900/90 border-blue-500/50',
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 max-w-sm">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              className={`bg-gradient-to-r ${colors[toast.type]} border rounded-xl p-4 backdrop-blur-md shadow-2xl cursor-pointer`}
              onClick={() => removeToast(toast.id)}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{icons[toast.type]}</span>
                <div>
                  <div className="font-bold text-white">{toast.title}</div>
                  {toast.message && (
                    <div className="text-sm text-gray-300 mt-1 whitespace-pre-line">{toast.message}</div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
