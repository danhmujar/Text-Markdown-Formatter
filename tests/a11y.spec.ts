import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('a11y - WCAG 2.1 AA', () => {
  test('should not have any automatically detectable WCAG violations', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('settings dialog has accessible name and focus trap', async ({ page }) => {
    await page.goto('/');
    const settingsBtn = page.locator('#editor-settings-btn');
    await expect(settingsBtn).toHaveAttribute('aria-label', 'Layout and grid settings');
    await settingsBtn.click();
    const dialog = page.locator('#editor-settings-panel');
    await expect(dialog).toHaveAttribute('role', 'dialog');
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAttribute('aria-labelledby', 'settings-dialog-title');
    // First button should be focused
    await expect(page.locator('#layout-single-btn')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(settingsBtn).toBeFocused();
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
    await expect(changelogDialog).toContainText('Version 0.2.0');
    await expect(changelogDialog).toContainText('Release information');
    await expect(changelogDialog).toContainText(
      'About now includes local version and changelog details.',
    );
    const closeChangelog = page.getByRole('button', { name: 'Close changelog dialog' });
    await expect(closeChangelog).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(closeChangelog).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(closeChangelog).toBeFocused();

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
    const formatterInput = page.locator('#cell-textarea-0-0');
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

    await left.fill('Keep old value.\nAfter');
    await right.fill('Keep new value.\nInserted\nAfter');
    await page.locator('#comparison-run-btn').click();

    const result = page.getByLabel('Side-by-side comparison');
    await expect(result).toBeVisible();
    const rows = result.locator('[data-diff-row]:not([data-diff-row="empty"])');
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0).locator('[data-diff-kind="removed"]')).toHaveCount(1);
    await expect(rows.nth(0).locator('[data-diff-kind="added"]')).toHaveCount(1);
    await expect(rows.nth(0).locator('[data-diff-segment="changed"]')).toHaveCount(2);
    await expect(rows.nth(1).locator('[data-diff-kind="spacer"]')).toHaveCount(1);
    await expect(rows.nth(1).locator('[data-diff-kind="added"]')).toContainText('Inserted');
    await expect(result.getByRole('heading', { name: 'Left' })).toBeVisible();
    await expect(result.getByRole('heading', { name: 'Right' })).toBeVisible();
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);

    await page.locator('#comparison-edit-btn').click();
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

  test('Comparison mode supports empty, identical, and one-sided content', async ({ page }) => {
    await page.goto('/');
    await page.locator('#comparison-mode-btn').click();
    const runButton = page.locator('#comparison-run-btn');
    await expect(runButton).toBeEnabled();
    await runButton.click();
    await expect(page.getByText('No differences found.')).toBeVisible();
    await expect(page.locator('[data-diff-row="empty"]')).toBeVisible();

    await page.locator('#comparison-edit-btn').click();
    await page.locator('#comparison-right-textarea').fill('Only on the right');
    await runButton.click();
    const rightOnlyRow = page.locator('[data-diff-row="0"]');
    await expect(
      rightOnlyRow.locator('[data-diff-side="left"][data-diff-kind="spacer"]'),
    ).toHaveCount(1);
    await expect(
      rightOnlyRow.locator('[data-diff-side="right"][data-diff-kind="added"]'),
    ).toContainText('Only on the right');
  });

  test('Comparison Clear empties both sides and returns to blank editing', async ({ page }) => {
    await page.goto('/');
    await page.locator('#comparison-mode-btn').click();
    const left = page.locator('#comparison-left-textarea');
    const right = page.locator('#comparison-right-textarea');
    await left.fill('Left content');
    await right.fill('Right content');
    await page.locator('#comparison-run-btn').click();

    const clearButton = page.locator('#comparison-clear-btn');
    await expect(clearButton).toBeVisible();
    await clearButton.click();
    await expect(left).toBeVisible();
    await expect(right).toBeVisible();
    await expect(left).toHaveValue('');
    await expect(right).toHaveValue('');
    await expect(page.getByLabel('Side-by-side comparison')).toBeHidden();
    await expect(page.locator('#comparison-run-btn')).toBeVisible();

    // Clear remains available and harmless when the workspace is already empty.
    await clearButton.click();
    await expect(left).toHaveValue('');
    await expect(right).toHaveValue('');
  });

  test('Comparison uses the Formatter font-size setting for editors and results', async ({
    page,
  }) => {
    await page.goto('/');
    await page.locator('#cell-textarea-0-0').fill('Shared font size sample');
    await page.locator('#font-size-increase-btn').click();
    await expect(page.getByText('15pt', { exact: true })).toBeVisible();
    await expect(page.locator('#output-formatted-0-0 p')).toHaveCount(1);
    expect(
      await page
        .locator('#output-formatted-0-0 p')
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

  test('mobile navigation opens Comparison mode and closes after activation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/');
    await page.locator('#mobile-menu-toggle-btn').click();
    const mobileComparison = page.locator('#mobile-comparison-mode-btn');
    await expect(mobileComparison).toBeVisible();
    await mobileComparison.click();
    await expect(page.locator('#mobile-header-menu')).toHaveCount(0);
    await expect(page.locator('#comparison-left-textarea')).toBeVisible();
  });

  test('Comparison mode keeps one shared result scroll region on narrow screens', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/');
    await page.locator('#mobile-menu-toggle-btn').click();
    await page.locator('#mobile-comparison-mode-btn').click();
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
