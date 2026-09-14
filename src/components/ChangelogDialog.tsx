/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- the changelog region must be keyboard-scrollable */
import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { APP_VERSION, CHANGELOG_ENTRIES } from '../constants/release';
const focusable = 'button:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ChangelogDialogProps {
  open: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  backgroundRef: React.RefObject<HTMLDivElement | null>;
}
export const ChangelogDialog: React.FC<ChangelogDialogProps> = ({
  open,
  onClose,
  triggerRef,
  backgroundRef,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const bg = backgroundRef.current;
    if (bg) bg.inert = true;
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const nodes = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusable));
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialogRef.current?.addEventListener('keydown', handleKeyDown);
    return () => {
      dialogRef.current?.removeEventListener('keydown', handleKeyDown);
      if (bg) bg.inert = false;
      triggerRef.current?.focus();
    };
  }, [backgroundRef, onClose, open, triggerRef]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-3 sm:p-6"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="changelog-dialog-title"
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-xl border shadow-2xl sm:max-h-[calc(100dvh-3rem)]"
        style={{
          backgroundColor: 'var(--panel-bg)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-primary)',
        }}
      >
        <header
          className="flex items-center justify-between border-b p-4"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div>
            <h2 id="changelog-dialog-title" className="text-lg font-semibold">
              Changelog
            </h2>
            <p className="text-sm opacity-70">Version {APP_VERSION}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close changelog dialog"
            className="rounded p-1 focus-visible:ring-2"
          >
            <X aria-hidden="true" />
          </button>
        </header>
        <div
          tabIndex={0}
          role="region"
          aria-label="Changelog entries"
          className="min-h-0 overflow-y-auto p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-blue)]"
        >
          {CHANGELOG_ENTRIES.map((entry) => (
            <article
              key={entry.title}
              className="border-b py-3 last:border-0"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <p className="text-xs opacity-60">{entry.date}</p>
              <h3 className="font-medium">{entry.title}</h3>
              <p className="mt-1 text-sm opacity-80">{entry.description}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};
