import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  msg: string;
  type: ToastType;
}

export function showToast(msg: string, type: ToastType = 'info'): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<Omit<ToastMessage, 'id'>>('app-toast', {
        detail: { msg, type },
      }),
    );
  }
}

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<Omit<ToastMessage, 'id'>>;
      if (!customEvent.detail?.msg) return;

      const newToast: ToastMessage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        msg: customEvent.detail.msg,
        type: customEvent.detail.type || 'info',
      };

      setToasts((prev) => [...prev.slice(-4), newToast]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 4000);
    };

    window.addEventListener('app-toast', handleToastEvent);
    return () => window.removeEventListener('app-toast', handleToastEvent);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div
      id="global-toast-container"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4 sm:px-0"
    >
      {toasts.map((toast) => {
        const isError = toast.type === 'error';
        const isSuccess = toast.type === 'success';

        return (
          <div
            key={toast.id}
            id={`toast-item-${toast.id}`}
            className={`pointer-events-auto flex items-start gap-2.5 p-3 rounded-lg border shadow-lg backdrop-blur-sm text-xs transition-all duration-200 animate-in slide-in-from-bottom-2 ${
              isError
                ? 'bg-rose-950/90 border-rose-800 text-rose-200 shadow-rose-950/40'
                : isSuccess
                  ? 'bg-emerald-950/90 border-emerald-800 text-emerald-200 shadow-emerald-950/40'
                  : 'bg-slate-900/90 border-slate-700 text-slate-200 shadow-slate-950/40'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isError && <AlertCircle className="w-4 h-4 text-rose-400" />}
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {!isError && !isSuccess && <Info className="w-4 h-4 text-blue-400" />}
            </div>
            <p className="flex-1 leading-relaxed break-words">{toast.msg}</p>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-slate-400 hover:text-slate-200 p-0.5 rounded transition cursor-pointer"
              title="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
