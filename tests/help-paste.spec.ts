import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { financialProse } from '../src/utils/__tests__/fixtures/tabbedProse';

async function clipboard(page: Page, text: string, html?: string) {
  await page.evaluate(
    ({ text, html }) => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          read: async () => [
            {
              types: html ? ['text/plain', 'text/html'] : ['text/plain'],
              getType: async (type: string) =>
                new Blob([type === 'text/plain' ? text : html!], { type }),
            },
          ],
        },
      });
    },
    { text, html },
  );
}

test('Paste inserts in Preview, switches to Edit, and preserves raw Undo', async ({ page }) => {
  await page.goto('/');
  const editor = page.locator('#formatter-textarea-0-0');
  await editor.fill('Start. ');
  await editor.press('End');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await clipboard(page, financialProse);
  await page.getByRole('button', { name: 'Paste into Cleaned Text', exact: true }).click();
  await expect(editor).toBeFocused();
  const cleaned = financialProse
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"');
  await expect(editor).toHaveValue('Start. ' + cleaned);
  await page.screenshot({ path: test.info().outputPath('formatter-paste.png') });
  await page.locator('#header-undo-btn').click();
  await expect(editor).toHaveValue('Start. ' + financialProse);
});

test('Paste replaces an Edit selection and splits rich tables through the shared path', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const editor = page.locator('#formatter-textarea-0-0');
  await editor.fill('old');
  await editor.press('Control+a');
  await clipboard(page, 'new');
  await page.getByRole('button', { name: 'Paste into Cleaned Text', exact: true }).click();
  await expect(editor).toHaveValue('new');
  await expect(editor).toBeFocused();
  await page.getByLabel('Paste behavior').selectOption('split-cells');
  await clipboard(page, 'Left\tRight', '<table><tr><td>Left</td><td>Right</td></tr></table>');
  await page.getByRole('button', { name: 'Paste into Cleaned Text', exact: true }).click();
  await expect(page.locator('#formatter-textarea-0-0')).toHaveValue('Left');
  await expect(page.locator('#formatter-textarea-0-1')).toHaveValue('Right');
});

test('Comparison Paste preserves text on independent sides', async ({ page }) => {
  await page.goto('/');
  await page.locator('#comparison-mode-btn').click();
  await clipboard(page, 'a\tb\nc');
  await page.getByRole('button', { name: 'Paste into Left', exact: true }).click();
  await expect(page.locator('#comparison-left-textarea')).toHaveValue('a\tb\nc');
  await page.screenshot({ path: test.info().outputPath('comparison-paste.png') });
  await expect(page.locator('#comparison-left-textarea')).toBeFocused();
  await clipboard(page, 'right');
  await page.getByRole('button', { name: 'Paste into Right', exact: true }).click();
  await expect(page.locator('#comparison-right-textarea')).toHaveValue('right');
  await expect(page.locator('#comparison-left-textarea')).toHaveValue('a\tb\nc');
});

test('denied, empty, oversized and stale clipboard reads preserve editor content', async ({
  page,
}) => {
  await page.goto('/');
  const editor = page.locator('#formatter-textarea-0-0');
  await editor.fill('keep');
  const paste = page.getByRole('button', { name: 'Paste into Cleaned Text', exact: true });
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        read: async () => {
          throw new DOMException('Denied', 'NotAllowedError');
        },
      },
    }),
  );
  await paste.click();
  await expect(page.getByText(/Clipboard access is blocked/)).toBeVisible();
  await expect(editor).toHaveValue('keep');
  await clipboard(page, '');
  await paste.click();
  await expect(page.getByText(/No text found on the clipboard/)).toBeVisible();
  await clipboard(page, 'x'.repeat(500_001));
  await paste.click();
  await expect(page.getByText('Paste is too large. Paste a smaller selection.')).toBeVisible();
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        readText: () =>
          new Promise<string>((resolve) => {
            (window as unknown as { finishPaste: () => void }).finishPaste = () => resolve('late');
          }),
      },
    }),
  );
  await paste.click();
  await expect(paste).toBeDisabled();
  await editor.fill('changed');
  await page.evaluate(() => (window as unknown as { finishPaste: () => void }).finishPaste());
  await expect(page.getByText(/editor changed while reading/)).toBeVisible();
  await expect(editor).toHaveValue('changed');
});

test('Help stays usable on mobile and shortcuts pass a11y', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto('/');
  const help = page.getByRole('button', { name: 'Help', exact: true });
  await help.click();
  await page.screenshot({ path: test.info().outputPath('help-mobile.png') });
  await page.getByRole('button', { name: 'Keyboard shortcuts', exact: true }).click();
  const content = page.getByRole('region', { name: 'Help content' });
  await content.focus();
  await page.keyboard.press('End');
  await expect(page.getByText(/Ctrl\+B and Ctrl\+I are not app shortcuts/)).toBeVisible();
  await page.waitForTimeout(400);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(help).toBeFocused();
});
