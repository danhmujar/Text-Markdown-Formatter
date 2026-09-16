import React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '../../utils/cn';

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({
  className,
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        style={{
          backgroundColor: 'var(--panel-bg)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-primary)',
        }}
        className={cn(
          'animotion-fade-in z-[70] max-w-xs rounded-md border px-2 py-1 text-xs shadow-lg',
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}

/** Wrap a control to move its native `title` hint into a styled tooltip. */
export function Tip({ tip, children }: { tip: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}
