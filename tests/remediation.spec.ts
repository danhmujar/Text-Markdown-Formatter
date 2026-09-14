import { test, expect, type Dialog, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(results.violations).toEqual([]);
}

function contrastRatio(foreground: string, background: string): number {
  const luminance = (color: string) => {
    const channels = color
      .slice(1)
      .match(/.{2}/g)!
      .map((channel) => {
        const value = Number.parseInt(channel, 16) / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test.describe('a11y remediation', () => {
  test('layout presets protect content and a 5x5 grid stays usable', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.locator('#formatter-textarea-0-0').fill('retained');
    await page.locator('#editor-settings-btn').click();

    let unexpectedDialogs = 0;
    const dismissUnexpected = async (dialog: Dialog) => {
      unexpectedDialogs += 1;
      await dialog.dismiss();
    };
    page.on('dialog', dismissUnexpected);
    await page.locator('#layout-2x2-btn').click();
    page.off('dialog', dismissUnexpected);
    expect(unexpectedDialogs).toBe(0);

    for (let index = 0; index < 3; index += 1) {
      await page.locator('#add-column-btn').click();
      await page.locator('#add-row-btn').click();
    }
    await expect(page.locator('textarea[id^="formatter-textarea-"]')).toHaveCount(25);
    await page.locator('#formatter-textarea-4-4').fill('outside content');

    page.once('dialog', (dialog) => dialog.dismiss());
    await page.locator('#layout-single-btn').click();
    await expect(page.locator('textarea[id^="formatter-textarea-"]')).toHaveCount(25);
    await expect(page.locator('#formatter-textarea-4-4')).toHaveValue('outside content');

    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('#layout-single-btn').click();
    await expect(page.locator('textarea[id^="formatter-textarea-"]')).toHaveCount(1);
    await page.locator('#header-undo-btn').click();
    await expect(page.locator('textarea[id^="formatter-textarea-"]')).toHaveCount(25);
    await expect(page.locator('#formatter-textarea-4-4')).toHaveValue('outside content');

    await page.setViewportSize({ width: 390, height: 800 });
    await page.locator('#formatter-textarea-4-4').focus();
    const dimensions = await page.locator('#formatter-cell-4-4').evaluate((cell) => {
      const grid = cell.parentElement!;
      const scroller = grid.parentElement!;
      const rect = cell.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        scrollLeft: scroller.scrollLeft,
        scrollTop: scroller.scrollTop,
        scrollWidth: scroller.scrollWidth,
        clientWidth: scroller.clientWidth,
        bodyWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      };
    });
    expect(dimensions.width).toBeGreaterThanOrEqual(256);
    expect(dimensions.height).toBeGreaterThanOrEqual(288);
    expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth);
    expect(dimensions.scrollLeft).toBeGreaterThan(0);
    expect(dimensions.scrollTop).toBeGreaterThan(0);
    expect(dimensions.bodyWidth).toBe(dimensions.viewportWidth);
  });

  test('New clears persisted content and starts a fresh history session', async ({ page }) => {
    await page.goto('/');
    await page.locator('#formatter-textarea-0-0').fill('saved workspace');
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('text-markdown-formatter:workspace')))
      .not.toBeNull();

    await page.locator('#header-clear-all-btn').click();
    await expect(page.locator('#formatter-textarea-0-0')).toHaveValue('');
    await expect(page.locator('#formatter-textarea-0-0')).toBeFocused();
    await expect(page.locator('#header-undo-btn')).toBeDisabled();
    expect(
      await page.evaluate(() => localStorage.getItem('text-markdown-formatter:workspace')),
    ).toBeNull();

    await page.reload();
    await expect(page.locator('#formatter-textarea-0-0')).toHaveValue('');
    await expect(page.locator('#header-undo-btn')).toBeDisabled();
  });

  test('remote and oversized paste inputs stay inside resource boundaries', async ({ page }) => {
    const remoteRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('example.invalid')) remoteRequests.push(request.url());
    });
    await page.goto('/');
    await page
      .locator('#formatter-textarea-0-0')
      .fill(
        '![remote](https://example.invalid/tracker.png)\n![local](/text-markdown-formatter-icon.png)\n![data](data:image/png;base64,AA==)',
      );
    await page.locator('#toggle-edit-mode-0-0').click();

    const imageSources = await page
      .locator('#formatter-preview-0-0 img')
      .evaluateAll((images) => images.map((image) => image.getAttribute('src')));
    expect(imageSources).toEqual([
      null,
      '/text-markdown-formatter-icon.png',
      'data:image/png;base64,AA==',
    ]);
    expect(remoteRequests).toEqual([]);

    await page.locator('#header-clear-all-btn').click();
    const textarea = page.locator('#formatter-textarea-0-0');
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveValue('');
    const pastePrevented = await textarea.evaluate((element) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData('text/plain', 'x'.repeat(500_001));
      const event = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData,
      });
      element.dispatchEvent(event);
      return event.defaultPrevented;
    });
    expect(pastePrevented).toBe(true);
    await expect(textarea).toHaveValue('');
  });

  test('all dark themes keep semantic contrast and representative states pass axe', async ({
    page,
  }) => {
    await page.goto('/');
    const themes = [
      '',
      'theme-teal',
      'theme-terracotta',
      'theme-forest',
      'theme-slate',
      'theme-rosewood',
      'theme-pistachio',
      'theme-purple',
    ];
    for (const theme of themes) {
      const colors = await page.evaluate((className) => {
        document.body.className = `${className} dark-theme`.trim();
        const styles = getComputedStyle(document.body);
        return {
          panel: styles.getPropertyValue('--panel-bg').trim(),
          text: styles.getPropertyValue('--text-primary').trim(),
          primary: styles.getPropertyValue('--primary-blue').trim(),
          primaryForeground: styles.getPropertyValue('--primary-foreground').trim(),
          border: styles.getPropertyValue('--border-color').trim(),
          diff: styles.getPropertyValue('--diff-highlight-bg').trim(),
        };
      }, theme);
      expect(contrastRatio(colors.primaryForeground, colors.primary)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(colors.border, colors.panel)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(colors.text, colors.diff)).toBeGreaterThanOrEqual(4.5);
    }

    await page.evaluate(() => {
      localStorage.setItem(
        'formatter-theme-v1',
        JSON.stringify({ colorTheme: 'theme-teal', darkMode: true }),
      );
    });
    await page.reload();
    await page.locator('#formatter-textarea-0-0').fill('**Populated preview**');
    await page.locator('#toggle-edit-mode-0-0').click();
    await expectNoAxeViolations(page);

    await page.locator('#editor-settings-btn').click();
    await expectNoAxeViolations(page);
    await page.keyboard.press('Escape');
    await page.locator('#palette-toggle-btn').click();
    await expectNoAxeViolations(page);
    await page.keyboard.press('Escape');

    await page.locator('#comparison-mode-btn').click();
    await expectNoAxeViolations(page);
    await page.locator('#comparison-left-textarea').fill('old value');
    await page.locator('#comparison-right-textarea').fill('new value');
    await page.locator('#comparison-run-btn').click();
    await expectNoAxeViolations(page);
    await page.locator('#comparison-back-btn').click();

    await page.getByRole('button', { name: 'About this app' }).click();
    await expectNoAxeViolations(page);
    await page.getByRole('button', { name: 'View changelog' }).click();
    await expectNoAxeViolations(page);
  });

  test('native theme radios support arrows and keep unique IDs', async ({ page }) => {
    await page.goto('/');
    await page.locator('#palette-toggle-btn').click();
    await page.locator('input[name="color-theme"]:checked').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('body')).toHaveClass(/theme-teal/);
    await page.locator('#palette-toggle-btn').click();
    await expect(page.locator('#theme-swatch-theme-teal')).toBeChecked();
    await page.locator('input[name="color-theme"]:checked').focus();
    await page.keyboard.press('Tab');
    await expect(page.locator('input[name="color-theme"]:focus')).toHaveCount(0);

    await page.setViewportSize({ width: 768, height: 800 });
    await page.locator('#mobile-menu-toggle-btn').click();
    const duplicateIds = await page.locator('[id]').evaluateAll((elements) => {
      const ids = elements.map((element) => element.id);
      return [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    });
    expect(duplicateIds).toEqual([]);
    await page.locator('input[name="mobile-color-theme"]:checked').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#mobile-swatch-theme-terracotta')).toBeChecked();
  });

  test('small-screen changelog reaches its final entry by keyboard', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 500 });
    await page.goto('/');
    await page.getByRole('button', { name: 'About this app' }).click();
    await page.getByRole('button', { name: 'View changelog' }).click();
    const entries = page.getByRole('region', { name: 'Changelog entries' });
    await page.keyboard.press('Tab');
    await expect(entries).toBeFocused();
    await page.keyboard.press('End');

    await expect
      .poll(() =>
        entries.evaluate(
          (region) => region.scrollTop + region.clientHeight >= region.scrollHeight - 1,
        ),
      )
      .toBe(true);
  });
});
