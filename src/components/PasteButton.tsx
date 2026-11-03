import { useEffect, useRef, useState } from 'react';
import { ClipboardPaste } from 'lucide-react';
import { readClipboard, type ClipboardPayload, type PasteSelection } from '@/utils/clipboard';
import { showToast } from '@/components/Toast';

interface PasteButtonProps {
  label: string;
  getVersion: () => unknown;
  getSelection: () => PasteSelection;
  onPaste: (payload: ClipboardPayload, selection: PasteSelection) => void;
}

export function PasteButton({ label, getVersion, getSelection, onPaste }: PasteButtonProps) {
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const mounted = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const paste = async () => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    const version = getVersion();
    const selection = getSelection();
    try {
      const payload = await readClipboard();
      if (!mounted.current) return;
      if (version !== getVersion() || buttonRef.current?.closest('[hidden]')) {
        showToast('The editor changed while reading the clipboard. Please paste again.', 'info');
        return;
      }
      if (!payload.text) {
        showToast('No text found on the clipboard. Copy some text first.', 'info');
        return;
      }
      onPaste(payload, selection);
    } catch (error) {
      if (!mounted.current) return;
      showToast(
        error instanceof Error && error.message === 'too-large'
          ? 'Paste is too large. Paste a smaller selection.'
          : 'Clipboard access is blocked. Right-click inside the editor and choose Paste, or use Ctrl+V / ⌘V.',
        'error',
      );
    } finally {
      busy.current = false;
      if (mounted.current) setPending(false);
    }
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={`Paste into ${label}`}
      aria-busy={pending}
      disabled={pending}
      onClick={() => void paste()}
      className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded border border-[var(--border-color)] bg-[var(--surface-bg)] px-2 text-xs font-medium text-[var(--text-primary)] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-blue)] disabled:opacity-60"
    >
      <ClipboardPaste aria-hidden="true" className="h-3.5 w-3.5" />
      {pending ? 'Pasting…' : 'Paste'}
    </button>
  );
}
