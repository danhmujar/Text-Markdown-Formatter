/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- the changelog region must be keyboard-scrollable */
import React from 'react';
import { X } from 'lucide-react';
import { APP_VERSION, CHANGELOG_ENTRIES } from '../constants/release';
import { Dialog, DialogContent, useBackgroundInert } from './ui';

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
  useBackgroundInert(open, backgroundRef);
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent
        overlayClassName="z-[80]"
        className="z-[80]"
        aria-labelledby="changelog-dialog-title"
        style={{
          backgroundColor: 'var(--panel-bg)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-primary)',
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          triggerRef.current?.focus();
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
      </DialogContent>
    </Dialog>
  );
};
