import React from 'react';
import { ListOrdered, List, Bold, Italic, Sparkles, Check } from 'lucide-react';
import { NumberingFormat } from '../utils/markdownFormatter';
import { cn } from '../utils/cn';
import { BUTTON_VARIANTS } from './ui';
import { Tip } from './ui';

interface EditToolbarProps {
  rowIndex: number;
  colIndex: number;
  isDark: boolean;
  feedback: string | null;
  onApplyNumbering: (format: NumberingFormat) => void;
  onApplyInlineFormat: (wrapper: string, label: string) => void;
  onSmartClean: () => void;
}

export const EditToolbar: React.FC<EditToolbarProps> = ({
  rowIndex: r,
  colIndex: c,
  isDark,
  feedback,
  onApplyNumbering,
  onApplyInlineFormat,
  onSmartClean,
}) => {
  return (
    <div
      id={`edit-mode-toolbar-${r}-${c}`}
      role="toolbar"
      aria-label="Edit mode formatting"
      style={{
        backgroundColor: 'var(--surface-bg)',
        borderColor: 'var(--border-color)',
        color: 'var(--text-secondary)',
      }}
      className="px-2.5 py-1.5 border-b flex items-center justify-between gap-2 text-xs shrink-0 select-none transition-colors"
    >
      {/* Numbering and list format buttons */}
      <div className="flex items-center gap-1 flex-wrap">
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider mr-1 hidden sm:inline ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
        >
          Format:
        </span>

        {/* (i) (ii) Roman Numerals Button */}
        <Tip tip="Add Roman numeral numbering (i) (ii) (iii)... (Click to toggle/number lines or selection)">
          <button
            id={`btn-numbering-roman-${r}-${c}`}
            type="button"
            onClick={() => onApplyNumbering('roman-parentheses')}
            aria-label="Format with Roman numeral numbering (i) (ii) (iii)"
            style={{
              backgroundColor: isDark ? 'var(--accent-bg)' : 'white',
              borderColor: 'var(--accent-border)',
              color: 'var(--primary-blue)',
            }}
            className="px-2 py-0.5 rounded border text-[11px] font-mono font-semibold flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-2xs focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none hover:brightness-110"
          >
            <ListOrdered
              aria-hidden="true"
              focusable="false"
              className="w-3 h-3"
              style={{ color: 'var(--primary-blue)' }}
            />
            <span>(i) (ii)</span>
          </button>
        </Tip>

        {/* 1. 2. Numeric Numbering Button */}
        <Tip tip="Add standard numbering 1. 2. 3.... (Click to toggle/number lines or selection)">
          <button
            id={`btn-numbering-numeric-${r}-${c}`}
            type="button"
            onClick={() => onApplyNumbering('numeric-dot')}
            aria-label="Format with standard numeric numbering 1. 2. 3."
            style={{
              backgroundColor: isDark ? 'var(--accent-bg)' : 'white',
              borderColor: 'var(--accent-border)',
              color: 'var(--primary-blue)',
            }}
            className="px-2 py-0.5 rounded border text-[11px] font-mono font-semibold flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-2xs focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none hover:brightness-110"
          >
            <ListOrdered
              aria-hidden="true"
              focusable="false"
              className="w-3 h-3"
              style={{ color: 'var(--primary-blue)' }}
            />
            <span>1. 2.</span>
          </button>
        </Tip>

        {/* a. b. Alphabetical Button */}
        <Tip tip="Add alphabetical numbering a. b. c.... (Click to toggle/number lines or selection)">
          <button
            id={`btn-numbering-alpha-${r}-${c}`}
            type="button"
            onClick={() => onApplyNumbering('alpha-dot')}
            aria-label="Format with alphabetical numbering a. b. c."
            style={{
              backgroundColor: isDark ? 'var(--accent-bg)' : 'white',
              borderColor: 'var(--accent-border)',
              color: 'var(--primary-blue)',
            }}
            className="px-2 py-0.5 rounded border text-[11px] font-mono font-semibold flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-2xs focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none hover:brightness-110"
          >
            <span>a. b.</span>
          </button>
        </Tip>

        {/* Bullet list button */}
        <Tip tip="Add bullet points * ...">
          <button
            id={`btn-numbering-bullet-${r}-${c}`}
            type="button"
            onClick={() => onApplyNumbering('bullet')}
            aria-label="Format as bullet list"
            className={cn(
              'px-1.5 py-0.5 rounded border text-[10.5px] font-medium hidden sm:inline-flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-2xs focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none',
              isDark
                ? cn(BUTTON_VARIANTS.neutralDark, 'text-slate-300')
                : cn(BUTTON_VARIANTS.neutralLight, 'text-slate-700'),
            )}
          >
            <List aria-hidden="true" focusable="false" className="w-3 h-3 text-slate-400" />
            <span>Bullet</span>
          </button>
        </Tip>

        <div style={{ backgroundColor: 'var(--border-color)' }} className="w-px h-3.5 mx-0.5" />

        {/* Bold Button */}
        <Tip tip="Toggle **bold** formatting on selection">
          <button
            id={`btn-format-bold-${r}-${c}`}
            type="button"
            onClick={() => onApplyInlineFormat('**', 'Bold')}
            aria-label="Format selection as bold"
            className={cn(
              'px-1.5 py-0.5 rounded border text-[10.5px] font-bold flex items-center transition cursor-pointer active:scale-95 shadow-2xs focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none',
              isDark
                ? cn(BUTTON_VARIANTS.neutralDark, 'text-slate-200')
                : cn(BUTTON_VARIANTS.neutralLight, 'text-slate-800'),
            )}
          >
            <Bold aria-hidden="true" focusable="false" className="w-3 h-3" />
          </button>
        </Tip>

        {/* Italic Button */}
        <Tip tip="Toggle *italic* formatting on selection">
          <button
            id={`btn-format-italic-${r}-${c}`}
            type="button"
            onClick={() => onApplyInlineFormat('*', 'Italic')}
            aria-label="Format selection as italic"
            className={cn(
              'px-1.5 py-0.5 rounded border text-[10.5px] font-serif italic flex items-center transition cursor-pointer active:scale-95 shadow-2xs focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none',
              isDark
                ? cn(BUTTON_VARIANTS.neutralDark, 'text-slate-200')
                : cn(BUTTON_VARIANTS.neutralLight, 'text-slate-800'),
            )}
          >
            <Italic aria-hidden="true" focusable="false" className="w-3 h-3" />
          </button>
        </Tip>

        {/* Smart Clean Button */}
        <Tip tip="Standardize quotes, spaces and markdown syntax">
          <button
            id={`btn-format-clean-${r}-${c}`}
            type="button"
            onClick={onSmartClean}
            aria-label="Clean and format markdown syntax"
            style={{
              backgroundColor: isDark ? 'var(--accent-bg)' : 'var(--accent-bg)',
              borderColor: 'var(--accent-border)',
              color: 'var(--primary-blue)',
            }}
            className="px-1.5 py-0.5 rounded border text-[10px] font-medium hidden lg:inline-flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-2xs focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none hover:brightness-110"
          >
            <Sparkles
              aria-hidden="true"
              focusable="false"
              className="w-2.5 h-2.5"
              style={{ color: 'var(--primary-blue)' }}
            />
            <span>Clean</span>
          </button>
        </Tip>
      </div>

      {/* Toast / Status feedback or hint */}
      <div className="flex items-center gap-1.5 shrink-0">
        {feedback ? (
          <span
            role="status"
            aria-live="polite"
            className="text-[10px] font-medium text-emerald-500 dark:text-emerald-400 flex items-center gap-1 animotion-fade-in"
          >
            <Check aria-hidden="true" focusable="false" className="w-3 h-3" />
            <span>{feedback}</span>
          </span>
        ) : (
          <span className="text-[9.5px] text-slate-400 dark:text-slate-500 hidden xl:inline">
            Enter continues numbering
          </span>
        )}
      </div>
    </div>
  );
};
