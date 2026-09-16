import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastMessage {
  id: string;
  msg: string;
  type: ToastType;
  action?: ToastAction;
  duration?: number | null;
}

export function showToast(
  msg: string,
  type: ToastType = 'info',
  options?: Pick<ToastMessage, 'action' | 'duration'>,
): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<Omit<ToastMessage, 'id'>>('app-toast', {
        detail: { msg, type, ...options },
      }),
    );
  }
}

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timeoutIdsRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<Omit<ToastMessage, 'id'>>;
      if (!customEvent.detail?.msg) return;

      const newToast: ToastMessage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        msg: customEvent.detail.msg,
        type: customEvent.detail.type || 'info',
        action: customEvent.detail.action,
        duration: customEvent.detail.duration,
      };

      setToasts((prev) => [...prev.slice(-4), newToast]);

      if (newToast.duration !== null) {
        const timeoutId = setTimeout(() => {
          timeoutIdsRef.current.delete(newToast.id);
          setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
        }, newToast.duration ?? 4000);
        timeoutIdsRef.current.set(newToast.id, timeoutId);
      }
    };

    window.addEventListener('app-toast', handleToastEvent);
    return () => {
      window.removeEventListener('app-toast', handleToastEvent);
      timeoutIdsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutIdsRef.current.clear();
    };
  }, []);

  const removeToast = (id: string) => {
    const timeoutId = timeoutIdsRef.current.get(id);
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      timeoutIdsRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div
      id="global-toast-container"
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none sm:left-auto sm:right-4 sm:w-auto sm:max-w-xs"
    >
      {toasts.map((toast) => {
        const isError = toast.type === 'error';
        const isSuccess = toast.type === 'success';

        return (
          <div
            key={toast.id}
            id={`toast-item-${toast.id}`}
            role={isError ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-center gap-2.5 rounded-full border py-2 pl-4 pr-2 text-xs shadow-lg transition-all duration-200 animate-in slide-in-from-bottom-2 ${
              isError
                ? 'bg-rose-950 border-rose-800 text-rose-200 shadow-rose-950/40'
                : isSuccess
                  ? 'bg-emerald-950 border-emerald-800 text-emerald-200 shadow-emerald-950/40'
                  : 'bg-slate-900 border-slate-700 text-slate-200 shadow-slate-950/40'
            }`}
          >
            <div className="shrink-0">
              {isError && (
                <AlertCircle
                  aria-hidden="true"
                  focusable="false"
                  className="w-4 h-4 text-rose-400"
                />
              )}
              {isSuccess && (
                <CheckCircle2
                  aria-hidden="true"
                  focusable="false"
                  className="w-4 h-4 text-emerald-400"
                />
              )}
              {!isError && !isSuccess && (
                <Info aria-hidden="true" focusable="false" className="w-4 h-4 text-blue-400" />
              )}
            </div>
            <p className="flex-1 leading-relaxed break-words">{toast.msg}</p>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  removeToast(toast.id);
                  toast.action?.onClick();
                }}
                className="shrink-0 rounded px-2 py-1 font-semibold text-blue-300 hover:text-blue-100 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none"
              >
                {toast.action.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              aria-label="Close notification"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-slate-400 transition hover:text-slate-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none"
              title="Close notification"
            >
              <X aria-hidden="true" focusable="false" className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
