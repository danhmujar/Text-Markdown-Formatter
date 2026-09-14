import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { APP_VERSION } from '../src/constants/release';

test.describe('a11y - WCAG 2.1 AA', () => {
  test('should not have any automatically detectable WCAG violations', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('settings popover has an accessible name and restores focus', async ({ page }) => {
    await page.goto('/');
    const settingsBtn = page.locator('#editor-settings-btn');
    await expect(settingsBtn).toHaveAttribute('aria-label', 'Layout and grid settings');
    await settingsBtn.click();
    const panel = page.locator('#editor-settings-panel');
    await expect(panel).toHaveAttribute('role', 'group');
    await expect(panel).not.toHaveAttribute('aria-modal', 'true');
    await expect(panel).toHaveAttribute('aria-labelledby', 'settings-panel-title');
    await page.locator('#add-row-btn').focus();
    await page.keyboard.press('Tab');
    await expect(page.locator('#formatter-textarea-0-0')).toBeFocused();
    await page.locator('#formatter-heading').click();
    await expect(panel).toBeHidden();

    await settingsBtn.click();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(settingsBtn).toBeFocused();
  });

  test('pasted hard wraps clean automatically and remain reversible', async ({ page }) => {
    await page.goto('/');
    const textarea = page.locator('#formatter-textarea-0-0');
    await expect(textarea).toBeVisible();

    const wrapped =
      'Since 2008, the Company has adhered to the French corporate\ngovernance code for listed companies published by Afep and\nMedef Code, available on the following websites and reports.';
    await textarea.evaluate((element, text) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData('text/plain', text);
      element.dispatchEvent(
        new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData }),
      );
    }, wrapped);

    await expect(page.locator('#formatter-preview-0-0')).toContainText(
      'Since 2008, the Company has adhered to the French corporate governance code for listed companies published by Afep and Medef Code, available on the following websites and reports.',
    );
    await expect(
      page.getByRole('region', { name: 'Cleaned text' }).getByRole('status'),
    ).toContainText('Removed 2 accidental line breaks');

    await page.locator('#toggle-edit-mode-0-0').click();
    await expect(page.locator('#formatter-textarea-0-0')).toHaveValue(wrapped.replace(/\n/g, ' '));

    await page.locator('#header-undo-btn').click();
    await expect(page.locator('#formatter-textarea-0-0')).toHaveValue(wrapped);

    await page.locator('#header-undo-btn').click();
    await expect(page.locator('#formatter-textarea-0-0')).toHaveValue('');
    await page.locator('#header-clear-all-btn').click();
    await expect(page.locator('#formatter-textarea-0-0')).toBeFocused();
  });

  test('About and changelog dialogs have accessible focus management', async ({ page }) => {
    await page.goto('/');
    const fab = page.getByRole('button', { name: 'About this app' });
    await fab.click();
    const aboutDialog = page.locator('[role="dialog"][aria-labelledby="about-dialog-title"]');
    const closeAbout = page.getByRole('button', { name: 'Close About dialog' });
    const changelogTrigger = page.getByRole('button', { name: 'View changelog' });
    const linkedin = page.getByRole('link', { name: 'Connect on LinkedIn' });

    await expect(aboutDialog).toHaveAttribute('aria-modal', 'true');
    await expect(aboutDialog).toHaveAttribute('aria-labelledby', 'about-dialog-title');
    await expect(
      page.getByRole('heading', { name: 'About Text & Markdown Formatter' }),
    ).toBeVisible();
    await expect(page.locator('#app-background')).toHaveAttribute('inert', '');
    await expect(closeAbout).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(changelogTrigger).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(linkedin).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(closeAbout).toBeFocused();
    await changelogTrigger.click();

    await expect(aboutDialog).toBeHidden();
    const changelogDialog = page.locator(
      '[role="dialog"][aria-labelledby="changelog-dialog-title"]',
    );
    await expect(changelogDialog).toBeVisible();
    await expect(changelogDialog).toHaveAttribute('aria-modal', 'true');
    await expect(changelogDialog).toHaveAttribute('aria-labelledby', 'changelog-dialog-title');
    await expect(page.getByRole('heading', { name: 'Changelog' })).toBeVisible();
    await expect(changelogDialog).toContainText(`Version ${APP_VERSION}`);
    await expect(changelogDialog).toContainText('Release information');
    await expect(changelogDialog).toContainText(
      'About now includes local version and changelog details.',
    );
    const closeChangelog = page.getByRole('button', { name: 'Close changelog dialog' });
    const changelogEntries = page.getByRole('region', { name: 'Changelog entries' });
    await expect(closeChangelog).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(changelogEntries).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(closeChangelog).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(changelogEntries).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(changelogDialog).toBeHidden();
    await expect(fab).toBeFocused();

    await fab.click();
    const backdrop = page.locator('[role="presentation"]');
    await backdrop.click({ position: { x: 2, y: 2 } });
    await expect(aboutDialog).toBeHidden();
    await expect(page.locator('#app-background')).not.toHaveAttribute('inert', '');
  });

  test('standalone Comparison mode keeps formatter state and aligned diff state', async ({
    page,
  }) => {
    await page.goto('/');
    const formatterInput = page.locator('#formatter-textarea-0-0');
    const formatterValue = 'Formatter workspace stays unchanged.';
    await formatterInput.fill(formatterValue);

    const comparisonModeButton = page.locator('#comparison-mode-btn');
    await expect(comparisonModeButton).toHaveAttribute('aria-pressed', 'false');
    await comparisonModeButton.click();

    const left = page.locator('#comparison-left-textarea');
    const right = page.locator('#comparison-right-textarea');
    await expect(left).toBeVisible();
    await expect(right).toBeVisible();
    await expect(left).toHaveValue('');
    await expect(right).toHaveValue('');
    await expect(page.locator('#compare-cell-btn-0-0')).toHaveCount(0);
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
    await expect(page.locator('#app-background')).not.toHaveAttribute('inert', '');
    await expect(comparisonModeButton).toHaveAttribute('aria-pressed', 'true');
    await expect(left).toBeFocused();
    await expect(page.locator('#header-clear-all-btn')).toHaveCount(0);
    await expect(page.locator('#header-undo-btn')).toHaveCount(0);
    await expect(page.locator('#header-redo-btn')).toHaveCount(0);

    await left.fill('Keep old value.\nAfter');
    await right.fill('Keep new value.\nInserted\nAfter');
    const result = page.getByLabel('Side-by-side comparison');
    await page.locator('#comparison-run-btn').click();
    await expect(result).toBeFocused();
    await expect(result).toBeVisible();
    const rows = result.locator('[data-diff-row]:not([data-diff-row="empty"])');
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0).locator('[data-diff-kind="removed"]')).toHaveCount(1);
    await expect(rows.nth(0).locator('[data-diff-kind="added"]')).toHaveCount(1);
    await expect(rows.nth(0).locator('[data-diff-segment="changed"]')).toHaveCount(2);
    await expect(
      rows.nth(0).locator('[data-diff-side="left"] [data-diff-segment="changed"]'),
    ).toHaveClass(/bg-\[var\(--diff-highlight-bg\)\]/);
    await expect(
      rows.nth(0).locator('[data-diff-side="right"] [data-diff-segment="changed"]'),
    ).toHaveClass(/bg-\[var\(--diff-highlight-bg\)\]/);
    await expect(rows.nth(0).locator('[aria-hidden="true"]')).toHaveCount(0);
    await expect(rows.nth(0).locator('[data-diff-side="left"]')).not.toHaveClass(
      /bg-(emerald|rose)-500/,
    );
    await expect(rows.nth(0).locator('[data-diff-side="right"]')).not.toHaveClass(
      /bg-(emerald|rose)-500/,
    );
    await expect(rows.nth(1).locator('[data-diff-kind="spacer"]')).toHaveCount(1);
    await expect(rows.nth(1).locator('[data-diff-kind="added"]')).toContainText('Inserted');
    await expect(result.getByRole('heading', { name: 'Left' })).toBeVisible();
    await expect(result.getByRole('heading', { name: 'Right' })).toBeVisible();
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);

    await page.locator('#comparison-edit-btn').click();
    await expect(left).toBeFocused();
    await expect(left).toBeVisible();
    await expect(left).toHaveValue('Keep old value.\nAfter');
    await expect(right).toHaveValue('Keep new value.\nInserted\nAfter');
    await page.locator('#comparison-back-btn').click();
    await expect(formatterInput).toHaveValue(formatterValue);
    await expect(page.locator('#comparison-left-textarea')).toBeHidden();

    // Comparison is persistent for this app session, while Formatter remains untouched.
    await comparisonModeButton.click();
    await expect(left).toBeVisible();
    await expect(left).toHaveValue('Keep old value.\nAfter');
    await expect(right).toHaveValue('Keep new value.\nInserted\nAfter');
  });

  test('Comparison mode requires content and supports one-sided content', async ({ page }) => {
    await page.goto('/');
    await page.locator('#comparison-mode-btn').click();
    const runButton = page.locator('#comparison-run-btn');
    await expect(runButton).toBeDisabled();
    await expect(page.locator('#comparison-content-prompt')).toContainText(
      'Enter content on at least one side',
    );
    await page.locator('#comparison-right-textarea').fill('Only on the right');
    await runButton.click();
    const rightOnlyRow = page.locator('[data-diff-row="0"]');
    await expect(
      rightOnlyRow.locator('[data-diff-side="left"][data-diff-kind="spacer"]'),
    ).toHaveCount(1);
    await expect(
      rightOnlyRow.locator('[data-diff-side="right"][data-diff-kind="added"]'),
    ).toContainText('Only on the right');

    await page.locator('#comparison-edit-btn').click();
    await page.locator('#comparison-left-textarea').fill('word '.repeat(1_001));
    await runButton.click();
    await expect(page.getByRole('alert')).toContainText(
      'Comparison is limited to 1,000 lines, 10,000 tokens per side, and a combined work limit.',
    );
  });

  test('Comparison Clear protects drafts and returns to blank editing', async ({ page }) => {
    await page.goto('/');
    await page.locator('#comparison-mode-btn').click();
    const left = page.locator('#comparison-left-textarea');
    const right = page.locator('#comparison-right-textarea');
    await left.fill('Left content');
    await right.fill('Right content');
    await page.locator('#comparison-run-btn').click();

    const clearButton = page.locator('#comparison-clear-btn');
    page.once('dialog', (dialog) => dialog.dismiss());
    await clearButton.click();
    await expect(page.getByLabel('Side-by-side comparison')).toBeVisible();
    await expect(clearButton).toBeFocused();

    await page.locator('#comparison-edit-btn').click();
    await expect(left).toHaveValue('Left content');
    await expect(right).toHaveValue('Right content');
    await page.locator('#comparison-run-btn').click();

    page.once('dialog', (dialog) => dialog.accept());
    await clearButton.click();
    await expect(left).toBeVisible();
    await expect(right).toBeVisible();
    await expect(left).toHaveValue('');
    await expect(right).toHaveValue('');
    await expect(page.getByLabel('Side-by-side comparison')).toBeHidden();
    await expect(page.locator('#comparison-run-btn')).toBeVisible();

    await clearButton.click();
    await expect(left).toHaveValue('');
    await expect(right).toHaveValue('');
  });

  test('Comparison uses the Formatter font-size setting for editors and results', async ({
    page,
  }) => {
    await page.goto('/');
    await page.locator('#formatter-textarea-0-0').fill('Shared font size sample');
    await page.locator('#font-size-increase-btn').click();
    await expect(page.getByText('15pt', { exact: true })).toBeVisible();
    await page.locator('#toggle-edit-mode-0-0').click();
    await expect(page.locator('#formatter-preview-0-0 p')).toHaveCount(1);
    expect(
      await page
        .locator('#formatter-preview-0-0 p')
        .evaluate((element) => (element as HTMLElement).style.fontSize),
    ).toBe('15pt');

    await page.locator('#comparison-mode-btn').click();
    const left = page.locator('#comparison-left-textarea');
    const right = page.locator('#comparison-right-textarea');
    expect(await left.evaluate((element) => (element as HTMLElement).style.fontSize)).toBe('15pt');
    expect(await right.evaluate((element) => (element as HTMLElement).style.fontSize)).toBe('15pt');
    await expect(page.locator('#comparison-main-content [id*="font-size"]')).toHaveCount(0);

    await left.fill('same size');
    await right.fill('same size');
    await page.locator('#comparison-run-btn').click();
    expect(
      await page
        .locator('[data-comparison-text="true"]')
        .evaluate((element) => (element as HTMLElement).style.fontSize),
    ).toBe('15pt');
  });

  test('responsive navigation manages focus and keyboard dismissal', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 800 });
    await page.goto('/');

    const mobileTrigger = page.locator('#mobile-menu-toggle-btn');
    await expect(mobileTrigger).toBeVisible();
    await expect(page.locator('#comparison-mode-btn')).toBeHidden();

    await mobileTrigger.click();
    await expect(page.locator('#mobile-new-btn')).toBeFocused();
    await expect(page.locator('#main-content')).toHaveAttribute('inert', '');

    await page.keyboard.press('Escape');
    await expect(page.locator('#mobile-header-menu')).toHaveCount(0);
    await expect(mobileTrigger).toBeFocused();
    await expect(page.locator('#main-content')).not.toHaveAttribute('inert', '');

    await page.setViewportSize({ width: 1024, height: 800 });
    await expect(mobileTrigger).toBeVisible();
    await expect(page.locator('#comparison-mode-btn')).toBeHidden();

    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(mobileTrigger).toBeHidden();
    await expect(page.locator('#comparison-mode-btn')).toBeVisible();
  });

  test('Comparison mode keeps one shared result scroll region on narrow screens', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/');
    await page.locator('#mobile-menu-toggle-btn').click();
    await page.locator('#mobile-comparison-mode-btn').click();
    await expect(page.locator('#mobile-new-btn')).toHaveCount(0);
    await expect(page.locator('#mobile-undo-btn')).toHaveCount(0);
    await expect(page.locator('#mobile-redo-btn')).toHaveCount(0);
    await page.locator('#comparison-left-textarea').fill('left line\nsecond line');
    await page.locator('#comparison-right-textarea').fill('right line\nsecond line');
    await page.locator('#comparison-run-btn').click();

    const comparison = page.getByLabel('Side-by-side comparison');
    await expect(comparison).toBeVisible();
    const dimensions = await comparison.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth);
    await expect(comparison.locator('[data-diff-row]:not([data-diff-row="empty"])')).toHaveCount(2);
  });

  test('skip link is first focusable and jumps to main', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toContainText('Skip to main content');
    await skipLink.click();
    await expect(page.locator('#main-content')).toBeFocused();
  });
});
