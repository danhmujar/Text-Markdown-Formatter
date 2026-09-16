import React, { useEffect } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '../../utils/cn';

export const Dialog = DialogPrimitive.Root;

/** Preserve the app-background `inert` contract the a11y specs assert. */
export function useBackgroundInert(
  open: boolean,
  backgroundRef: React.RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    const background = backgroundRef.current;
    if (!open || !background) return;
    const wasInert = background.inert;
    background.inert = true;
    return () => {
      background.inert = wasInert;
    };
  }, [backgroundRef, open]);
}

export function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      role="presentation"
      className={cn('animotion-fade-in fixed inset-0 bg-black/45', className)}
      {...props}
    />
  );
}

export function DialogContent({
  overlayClassName,
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { overlayClassName?: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay className={overlayClassName} />
      <DialogPrimitive.Content
        aria-modal="true"
        className={cn(
          'animotion-fade-in-down fixed left-1/2 top-1/2 flex max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:w-[calc(100%-3rem)]',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
