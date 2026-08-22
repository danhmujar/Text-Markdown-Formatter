import React from 'react';
import { ListOrdered, List, Bold, Italic, Sparkles, Check } from 'lucide-react';
import { NumberingFormat } from '../utils/markdownFormatter';
import { cn } from '../utils/cn';
import { BUTTON_VARIANTS } from './ui';

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
      className={`px-2.5 py-1.5 border-b flex items-center justify-between gap-2 text-xs shrink-0 select-none transition-colors ${
        isDark
          ? 'bg-slate-900/95 border-indigo-900/40 text-slate-300'
          : 'bg-indigo-50/50 border-indigo-100 text-slate-700'
      }`}
    >
      {/* Numbering and list format buttons */}
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mr-1 hidden sm:inline">
          Format:
        </span>

        {/* (i) (ii) Roman Numerals Button */}
        <button
          id={`btn-numbering-roman-${r}-${c}`}
          onClick={() => onApplyNumbering('roman-parentheses')}
          className={`px-2 py-0.5 rounded border text-[11px] font-mono font-semibold flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-2xs ${
            isDark
              ? 'bg-indigo-950/80 hover:bg-indigo-900 border-indigo-700/70 text-indigo-200 hover:text-white'
              : 'bg-white hover:bg-indigo-100/70 border-indigo-200 text-indigo-900 hover:text-indigo-950'
          }`}
          title="Add Roman numeral numbering (i) (ii) (iii)... (Click to toggle/number lines or selection)"
        >
          <ListOrdered className="w-3 h-3 text-indigo-400" />
          <span>(i) (ii)</span>
        </button>

        {/* 1. 2. Numeric Numbering Button */}
        <button
          id={`btn-numbering-numeric-${r}-${c}`}
          onClick={() => onApplyNumbering('numeric-dot')}
          className={`px-2 py-0.5 rounded border text-[11px] font-mono font-semibold flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-2xs ${
            isDark
              ? 'bg-blue-950/80 hover:bg-blue-900 border-blue-700/70 text-blue-200 hover:text-white'
              : 'bg-white hover:bg-blue-100/70 border-blue-200 text-blue-900 hover:text-blue-950'
          }`}
          title="Add standard numbering 1. 2. 3.... (Click to toggle/number lines or selection)"
        >
          <ListOrdered className="w-3 h-3 text-blue-400" />
          <span>1. 2.</span>
        </button>

        {/* a. b. Alphabetical Button */}
        <button
          id={`btn-numbering-alpha-${r}-${c}`}
          onClick={() => onApplyNumbering('alpha-dot')}
          className={`px-2 py-0.5 rounded border text-[11px] font-mono font-semibold flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-2xs ${
            isDark
              ? 'bg-purple-950/80 hover:bg-purple-900 border-purple-700/70 text-purple-200 hover:text-white'
              : 'bg-white hover:bg-purple-100/70 border-purple-200 text-purple-900 hover:text-purple-950'
          }`}
          title="Add alphabetical numbering a. b. c.... (Click to toggle/number lines or selection)"
        >
          <span>a. b.</span>
        </button>

        {/* Bullet list button */}
        <button
          id={`btn-numbering-bullet-${r}-${c}`}
          onClick={() => onApplyNumbering('bullet')}
          className={cn(
            'px-1.5 py-0.5 rounded border text-[10.5px] font-medium hidden sm:inline-flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-2xs',
            isDark
              ? cn(BUTTON_VARIANTS.neutralDark, 'text-slate-300')
              : cn(BUTTON_VARIANTS.neutralLight, 'text-slate-700'),
          )}
          title="Add bullet points * ..."
        >
          <List className="w-3 h-3 text-slate-400" />
          <span>Bullet</span>
        </button>

        <div className="w-px h-3.5 bg-slate-300 dark:bg-slate-700 mx-0.5" />

        {/* Bold Button */}
        <button
          id={`btn-format-bold-${r}-${c}`}
          onClick={() => onApplyInlineFormat('**', 'Bold')}
          className={cn(
            'px-1.5 py-0.5 rounded border text-[10.5px] font-bold flex items-center transition cursor-pointer active:scale-95 shadow-2xs',
            isDark
              ? cn(BUTTON_VARIANTS.neutralDark, 'text-slate-200')
              : cn(BUTTON_VARIANTS.neutralLight, 'text-slate-800'),
          )}
          title="Toggle **bold** formatting on selection"
        >
          <Bold className="w-3 h-3" />
        </button>

        {/* Italic Button */}
        <button
          id={`btn-format-italic-${r}-${c}`}
          onClick={() => onApplyInlineFormat('*', 'Italic')}
          className={cn(
            'px-1.5 py-0.5 rounded border text-[10.5px] font-serif italic flex items-center transition cursor-pointer active:scale-95 shadow-2xs',
            isDark
              ? cn(BUTTON_VARIANTS.neutralDark, 'text-slate-200')
              : cn(BUTTON_VARIANTS.neutralLight, 'text-slate-800'),
          )}
          title="Toggle *italic* formatting on selection"
        >
          <Italic className="w-3 h-3" />
        </button>

        {/* Smart Clean Button */}
        <button
          id={`btn-format-clean-${r}-${c}`}
          onClick={onSmartClean}
          className={`px-1.5 py-0.5 rounded border text-[10px] font-medium hidden lg:inline-flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-2xs ${
            isDark
              ? 'bg-indigo-950/50 hover:bg-indigo-900/60 border-indigo-800/60 text-indigo-300'
              : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700'
          }`}
          title="Standardize quotes, spaces and markdown syntax"
        >
          <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
          <span>Clean</span>
        </button>
      </div>

      {/* Toast / Status feedback or hint */}
      <div className="flex items-center gap-1.5 shrink-0">
        {feedback ? (
          <span className="text-[10px] font-medium text-emerald-500 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in duration-150">
            <Check className="w-3 h-3" />
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
