import React, { useId } from 'react';

interface ThemeSliderProps {
  isDark: boolean;
  onToggle: () => void;
}

export const ThemeSlider: React.FC<ThemeSliderProps> = React.memo(function ThemeSlider({
  isDark,
  onToggle,
}) {
  const id = useId();

  return (
    <label className="theme-switch" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={isDark}
        onChange={onToggle}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      />
      <span className="slider" aria-hidden="true">
        <span className="slider-bg">
          <span className="slider-bg-day">
            <svg
              width="68"
              height="34"
              viewBox="0 0 68 34"
              aria-hidden="true"
              className="slider-bg-svg"
            >
              <path fill="#bae6fd" d="M28 34c0-14 12-20 20-16 6-8 18-6 20 2v14Z" opacity=".6" />
              <path fill="#e0f2fe" d="M34 34c0-10 10-14 16-10 8-8 18-6 18 2v8Z" opacity=".8" />
              <path fill="#fff" d="M40 34c0-8 10-10 14-6 6-6 14-4 14 2v4Z" opacity=".95" />
              <path fill="#fff" d="M24 34c0-4 6-6 10-2 4-4 10-2 12 2Z" opacity=".85" />
            </svg>
          </span>
          <span className="slider-bg-night">
            <svg
              width="68"
              height="34"
              viewBox="0 0 68 34"
              aria-hidden="true"
              className="slider-bg-svg"
            >
              <path fill="#fcd34d" d="m16 10 1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5Z" />
              <path fill="#fef3c7" d="m30 6 .5 2 2 .5-2 .5-.5 2-.5-2-2-.5 2-.5Z" />
              <circle cx="8" cy="12" r="1" fill="#fff" />
              <circle cx="24" cy="22" r="1.5" fill="#fcd34d" />
              <circle cx="12" cy="24" r="1" fill="#fff" />
            </svg>
          </span>
        </span>
        <svg aria-hidden="true" className="sun-details" viewBox="0 0 32 32" width="28" height="28">
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2.5"
            d="M16 1.5V4m0 24v2.5M1.5 16H4m24 0h2.5M5.5 5.5l2 2m17 17 2 2m-21 0 2-2m17-17 2-2"
          />
        </svg>
        <svg aria-hidden="true" className="moon-details" viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79" />
        </svg>
      </span>
    </label>
  );
});
