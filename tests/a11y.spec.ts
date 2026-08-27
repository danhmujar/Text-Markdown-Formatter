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
    await expect(changelogDialog).toContainText('Version 0.1.0');
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

  test('comparison dialog stops Escape propagation and restores focus', async ({ page }) => {
    await page.goto('/');
    const compareButton = page.getByRole('button', { name: /Compare input and output for/ }).first();
    await compareButton.click();
    const comparisonDialog = page.locator(
      '[role="dialog"][aria-labelledby="comparison-dialog-title"]',
    );
    await expect(comparisonDialog).toBeVisible();
    const closeComparison = page.getByRole('button', { name: 'Close comparison dialog' });
    await expect(closeComparison).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(comparisonDialog).toBeHidden();
    await expect(compareButton).toBeFocused();
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
