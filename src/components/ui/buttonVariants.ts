export const BUTTON_VARIANTS = {
  neutralDark: 'bg-slate-800 hover:bg-slate-700 border-slate-500',
  neutralLight: 'bg-white hover:bg-slate-100 border-slate-200',
  subtleLight: 'bg-slate-100 hover:bg-slate-200 border-slate-200',
  presetActive:
    'bg-[var(--primary-blue)] text-[var(--primary-foreground)] border-[var(--primary-blue)] shadow-sm hover:brightness-110',
  presetDark: 'bg-slate-700/60 text-slate-300 border-slate-500 hover:bg-slate-700 hover:text-white',
  presetLight: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100',
  growDark: 'bg-slate-700/50 hover:bg-slate-700 text-slate-200 border-slate-500',
  growLight: 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs',
} as const;
