import React from 'react';
import { Plus, Columns, Rows, Grid2X2, Square } from 'lucide-react';
import { cn } from '../../utils/cn';
import { BUTTON_VARIANTS } from './buttonVariants';

interface EditorSettingsPanelProps {
  isDark: boolean;
  numRows: number;
  numCols: number;
  onSetSingleLayout: () => void;
  onSet2x2Layout: () => void;
  onSetLeftRightLayout: () => void;
  onSetUpDownLayout: () => void;
  onAddColumnRight: () => void;
  onAddRowDown: () => void;
}

const PRESET_BUTTON_BASE =
  'px-2.5 py-2 rounded-md flex items-center justify-center gap-1.5 text-[11px] font-medium border transition cursor-pointer active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none';
const GROW_BUTTON_BASE =
  'px-2.5 py-2 rounded-md border flex items-center justify-center gap-1.5 text-[11px] font-medium transition cursor-pointer active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none';

export const EditorSettingsPanel: React.FC<EditorSettingsPanelProps> = ({
  isDark,
  numRows,
  numCols,
  onSetSingleLayout,
  onSet2x2Layout,
  onSetLeftRightLayout,
  onSetUpDownLayout,
  onAddColumnRight,
  onAddRowDown,
}) => {
  return (
    <div
      id="editor-settings-panel"
      role="group"
      aria-labelledby="settings-panel-title"
      style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}
      className="absolute right-0 top-full mt-2 w-72 rounded-lg border shadow-xl z-30 overflow-hidden animotion-fade-in-down"
    >
      <h2 id="settings-panel-title" className="sr-only">
        Layout and Grid Settings
      </h2>
      <div className="p-3 space-y-3">
        {/* Layout presets */}
        <div>
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
          >
            Layout
          </span>
          <div className="grid grid-cols-2 gap-1.5 mt-1.5">
            <button
              id="layout-single-btn"
              type="button"
              onClick={onSetSingleLayout}
              aria-label="1 Cell (Single Container) layout"
              aria-pressed={numRows === 1 && numCols === 1}
              className={cn(
                PRESET_BUTTON_BASE,
                numRows === 1 && numCols === 1
                  ? BUTTON_VARIANTS.presetActive
                  : isDark
                    ? BUTTON_VARIANTS.presetDark
                    : BUTTON_VARIANTS.presetLight,
              )}
              title="1 Cell (Single Container)"
            >
              <Square aria-hidden="true" focusable="false" className="w-3 h-3" />
              <span>1×1</span>
            </button>
            <button
              id="layout-2x2-btn"
              type="button"
              onClick={onSet2x2Layout}
              aria-label="2x2 Grid (4 Cells) layout"
              aria-pressed={numRows === 2 && numCols === 2}
              className={cn(
                PRESET_BUTTON_BASE,
                numRows === 2 && numCols === 2
                  ? BUTTON_VARIANTS.presetActive
                  : isDark
                    ? BUTTON_VARIANTS.presetDark
                    : BUTTON_VARIANTS.presetLight,
              )}
              title="2x2 Grid (4 Cells)"
            >
              <Grid2X2 aria-hidden="true" focusable="false" className="w-3 h-3 text-amber-400" />
              <span>2×2</span>
            </button>
            <button
              id="layout-left-right-btn"
              type="button"
              onClick={onSetLeftRightLayout}
              aria-label="2 Cells Side-by-Side (Left & Right) layout"
              aria-pressed={numRows === 1 && numCols === 2}
              className={cn(
                PRESET_BUTTON_BASE,
                numRows === 1 && numCols === 2
                  ? BUTTON_VARIANTS.presetActive
                  : isDark
                    ? BUTTON_VARIANTS.presetDark
                    : BUTTON_VARIANTS.presetLight,
              )}
              title="2 Cells Side-by-Side (Left & Right)"
            >
              <Columns aria-hidden="true" focusable="false" className="w-3 h-3 text-cyan-400" />
              <span>Left &amp; Right</span>
            </button>
            <button
              id="layout-up-down-btn"
              type="button"
              onClick={onSetUpDownLayout}
              aria-label="2 Cells Stacked (Up & Down) layout"
              aria-pressed={numRows === 2 && numCols === 1}
              className={cn(
                PRESET_BUTTON_BASE,
                numRows === 2 && numCols === 1
                  ? BUTTON_VARIANTS.presetActive
                  : isDark
                    ? BUTTON_VARIANTS.presetDark
                    : BUTTON_VARIANTS.presetLight,
              )}
              title="2 Cells Stacked (Up & Down)"
            >
              <Rows aria-hidden="true" focusable="false" className="w-3 h-3 text-emerald-400" />
              <span>Up &amp; Down</span>
            </button>
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--border-color)' }} className="h-px" />

        {/* Grow grid */}
        <div>
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
          >
            Grid
          </span>
          <div className="grid grid-cols-2 gap-1.5 mt-1.5">
            <button
              id="add-column-btn"
              type="button"
              onClick={onAddColumnRight}
              aria-label="Add column to the right"
              className={cn(
                GROW_BUTTON_BASE,
                isDark ? BUTTON_VARIANTS.growDark : BUTTON_VARIANTS.growLight,
              )}
              title="Add Column to the Right"
            >
              <Plus aria-hidden="true" focusable="false" className="w-3 h-3 text-cyan-500" />
              <span>+ Col</span>
            </button>
            <button
              id="add-row-btn"
              type="button"
              onClick={onAddRowDown}
              aria-label="Add row down"
              className={cn(
                GROW_BUTTON_BASE,
                isDark ? BUTTON_VARIANTS.growDark : BUTTON_VARIANTS.growLight,
              )}
              title="Add Row Down"
            >
              <Plus aria-hidden="true" focusable="false" className="w-3 h-3 text-emerald-500" />
              <span>+ Row</span>
            </button>
          </div>
          <p
            className={`mt-1.5 text-[10px] leading-snug ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
          >
            Presets can remove cells outside the new layout; confirmation is required first. + adds
            an empty row/col.
          </p>
        </div>
      </div>
    </div>
  );
};
