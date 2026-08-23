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
