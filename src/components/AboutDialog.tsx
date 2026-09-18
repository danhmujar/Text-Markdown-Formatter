import React from 'react';
import { X } from 'lucide-react';
import { APP_VERSION } from '../constants/release';
import { Dialog, DialogContent, useBackgroundInert } from './ui';

interface AboutDialogProps {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onOpenChangelog: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  backgroundRef: React.RefObject<HTMLDivElement | null>;
}

const sections = [
  [
    'Tech Stack',
    ['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'Marked', 'DOMPurify', 'Vitest', 'Playwright'],
  ],
  [
    'Security & Architecture',
    [
      'Client-side text processing',
      'Sanitized HTML output',
      'Clipboard-safe export paths',
      'No account or server-side document storage',
      'Undo/redo history within the current session',
    ],
  ],
  [
    'Features',
    [
      'Combined editor and formatted preview',
      'Automatic cleanup for pasted line wraps',
      'Multi-cell text and Markdown workspace',
      'Copy all or individual cells to Catalyst',
      'Word/Outlook-compatible formatted copy',
      'Themes and dark mode',
      'Smart Cleanup and syntax warnings',
      'Undo and redo',
      'Responsive mobile layout',
    ],
  ],
  [
    'Limitations',
    [
      'Destination applications may interpret HTML spacing differently.',
      'Workspace content is saved locally in this browser; clear it with New.',
      'No cloud sync or shared workspace.',
      'Session data is not intended as permanent document storage.',
    ],
  ],
] as const;

export const AboutDialog: React.FC<AboutDialogProps> = ({
  open,
  onOpen,
  onOpenChangelog,
  onClose,
  triggerRef,
  backgroundRef,
}) => {
  useBackgroundInert(open, backgroundRef);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="About this app"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={onOpen}
        className="fixed bottom-4 left-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border text-lg font-semibold shadow-lg transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:bottom-5 sm:left-5"
        style={{
          backgroundColor: 'var(--panel-bg)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-primary)',
        }}
      >
        <span aria-hidden="true">?</span>
      </button>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) onClose();
        }}
      >
        <DialogContent
          overlayClassName="z-[60]"
          className="z-[60]"
          aria-labelledby="about-dialog-title"
          aria-describedby="about-dialog-intro"
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
          <div
            className="flex items-start justify-between gap-4 border-b p-4 sm:p-5"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <button
              type="button"
              aria-label="Close About dialog"
              onClick={onClose}
              className="order-2 shrink-0 rounded-md p-1.5 opacity-70 transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
            <div className="order-1">
              <h2 id="about-dialog-title" className="text-lg font-semibold sm:text-xl">
                About Text &amp; Markdown Formatter
              </h2>
              <p id="about-dialog-intro" className="mt-2 text-sm leading-6 opacity-80">
                A client-side workspace that removes accidental line wraps from pasted text,
                previews the cleaned result, and copies formatted content to Catalyst, Word,
                Outlook, Google Docs, and Excel.
              </p>
              <div className="mt-3 flex items-center gap-3 text-sm">
                <span className="opacity-70">Version {APP_VERSION}</span>
                <button
                  type="button"
                  onClick={onOpenChangelog}
                  className="font-medium underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  View changelog
                </button>
              </div>
            </div>
          </div>
          <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
            <div className="grid gap-5 sm:grid-cols-2">
              {sections.map(([title, items]) => (
                <section key={title}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider opacity-65">
                    {title}
                  </h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-5 opacity-85">
                    {items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            <section className="mt-5 border-t pt-4" style={{ borderColor: 'var(--border-color)' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wider opacity-65">
                Developer
              </h3>
              <p className="mt-2 text-sm leading-6 opacity-85">
                Built by Danh Michael Mujar, Analyst at WTW who believes professional tools should
                be clear, useful, and transparent.
              </p>
              <a
                href="https://www.linkedin.com/in/danhmujar"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex text-sm font-medium underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Connect on LinkedIn
              </a>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
