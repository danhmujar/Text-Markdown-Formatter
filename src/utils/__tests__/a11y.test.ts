import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Pillars 4 & 5: Accessibility (WCAG 2.1 AA Compliance)', () => {
  describe('Skip Link Verification', () => {
    it('index.html contains a valid skip link targeting #main-content', () => {
      const htmlPath = path.resolve(__dirname, '../../../index.html');
      const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
      expect(htmlContent).toContain('href="#main-content"');
      expect(htmlContent).toContain('Skip to main content');
      expect(htmlContent).toContain('sr-only focus:not-sr-only');
    });

    it('App.tsx contains a matching main element with id="main-content" and tabIndex={-1}', () => {
      const appPath = path.resolve(__dirname, '../../App.tsx');
      const appContent = fs.readFileSync(appPath, 'utf-8');
      expect(appContent).toContain('id="main-content"');
      expect(appContent).toContain('tabIndex={-1}');
    });
  });

  describe('Semantic Landmarks & Heading Hierarchy', () => {
    it('uses aria-labelledby for input and output panels', () => {
      const appPath = path.resolve(__dirname, '../../App.tsx');
      const appContent = fs.readFileSync(appPath, 'utf-8');
      expect(appContent).toContain('id="input-container-panel"');
      expect(appContent).toContain('aria-labelledby="input-heading"');
      expect(appContent).toContain('id="output-container-panel"');
      expect(appContent).toContain('aria-labelledby="output-heading"');
    });

    it('contains h1 in Header and h2 for Input & Output panel headings', () => {
      const headerPath = path.resolve(__dirname, '../../components/Header.tsx');
      const headerContent = fs.readFileSync(headerPath, 'utf-8');
      expect(headerContent).toContain('<h1');

      const editorPath = path.resolve(__dirname, '../../components/Editor.tsx');
      const editorContent = fs.readFileSync(editorPath, 'utf-8');
      expect(editorContent).toContain('id="input-heading"');
      expect(editorContent).toContain('<h2');

      const previewPath = path.resolve(__dirname, '../../components/Preview.tsx');
      const previewContent = fs.readFileSync(previewPath, 'utf-8');
      expect(previewContent).toContain('id="output-heading"');
      expect(previewContent).toContain('<h2');
    });
  });

  describe('Live Regions & Status Announcements', () => {
    it('Editor warning alert badge has role="status" and aria-live="polite"', () => {
      const editorPath = path.resolve(__dirname, '../../components/Editor.tsx');
      const editorContent = fs.readFileSync(editorPath, 'utf-8');
      expect(editorContent).toContain('id="grid-total-warnings-badge"');
      expect(editorContent).toContain('role="status"');
      expect(editorContent).toContain('aria-live="polite"');
    });

    it('Editor total-input badge has live region for dynamic char count', () => {
      const editorPath = path.resolve(__dirname, '../../components/Editor.tsx');
      const editorContent = fs.readFileSync(editorPath, 'utf-8');
      expect(editorContent).toContain('id="total-input-char-badge"');
      // Ensure badge is a live region after fix
      const badgeIdx = editorContent.indexOf('id="total-input-char-badge"');
      const badgeSnippet = editorContent.slice(Math.max(0, badgeIdx - 200), badgeIdx + 400);
      expect(badgeSnippet).toContain('role="status"');
      expect(badgeSnippet).toContain('aria-live="polite"');
    });

    it('Preview total-output badge has live region', () => {
      const previewPath = path.resolve(__dirname, '../../components/Preview.tsx');
      const previewContent = fs.readFileSync(previewPath, 'utf-8');
      expect(previewContent).toContain('id="total-output-char-badge"');
      const badgeIdx = previewContent.indexOf('id="total-output-char-badge"');
      const badgeSnippet = previewContent.slice(Math.max(0, badgeIdx - 200), badgeIdx + 400);
      expect(badgeSnippet).toContain('role="status"');
      expect(badgeSnippet).toContain('aria-live="polite"');
    });

    it('Editor cleanupNotification banner is a live region', () => {
      const editorPath = path.resolve(__dirname, '../../components/Editor.tsx');
      const editorContent = fs.readFileSync(editorPath, 'utf-8');
      expect(editorContent).toContain('cleanupNotification');
      // Banner should have role/status live
      expect(editorContent).toContain('role="status"');
      expect(
        editorContent.match(/cleanupNotification[\s\S]{0,300}aria-live="polite"/),
      ).toBeTruthy();
    });

    it('EditorCell footer counter has live region', () => {
      const cellPath = path.resolve(__dirname, '../../components/EditorCell.tsx');
      const cellContent = fs.readFileSync(cellPath, 'utf-8');
      expect(cellContent).toContain('cell-counter-footer');
      // Find the footer div definition (id with backticks), not the aria-describedby reference
      const footerIdx = cellContent.indexOf('id={`cell-counter-footer');
      expect(footerIdx).toBeGreaterThan(-1);
      const snippet = cellContent.slice(Math.max(0, footerIdx - 100), footerIdx + 600);
      expect(snippet).toContain('role="status"');
      expect(snippet).toContain('aria-live="polite"');
    });

    it('Global Toast container has aria-live="polite" and role="status" / "alert"', () => {
      const toastPath = path.resolve(__dirname, '../../components/Toast.tsx');
      const toastContent = fs.readFileSync(toastPath, 'utf-8');
      expect(toastContent).toContain('aria-live="polite"');
      expect(toastContent).toContain("role={isError ? 'alert' : 'status'}");
    });

    it('EditToolbar feedback container has role="status" and aria-live="polite"', () => {
      const editToolbarPath = path.resolve(__dirname, '../../components/EditToolbar.tsx');
      const editToolbarContent = fs.readFileSync(editToolbarPath, 'utf-8');
      expect(editToolbarContent).toContain('role="status"');
      expect(editToolbarContent).toContain('aria-live="polite"');
    });
  });

  describe('Focus-Visible & Accessible Controls', () => {
    it('Header buttons use explicit focus-visible rings and type="button"', () => {
      const headerPath = path.resolve(__dirname, '../../components/Header.tsx');
      const headerContent = fs.readFileSync(headerPath, 'utf-8');
      expect(headerContent).toContain('focus-visible:ring-2 focus-visible:ring-blue-500');
      expect(headerContent).toContain('type="button"');
      expect(headerContent).toContain('aria-label=');
    });

    it('EditorCell buttons and inputs have focus-visible rings and aria labels', () => {
      const cellPath = path.resolve(__dirname, '../../components/EditorCell.tsx');
      const cellContent = fs.readFileSync(cellPath, 'utf-8');
      expect(cellContent).toContain('focus-visible:ring-2 focus-visible:ring-blue-500');
      expect(cellContent).toContain('aria-label=');
    });
  });
});
