import { test, expect } from '@playwright/test';
import { financialProse } from '../src/utils/__tests__/fixtures/tabbedProse';

const normalizedProse = financialProse.trim().replace(/\s+/g, ' ') + '\n';

for (const mode of ['single-cell', 'split-cells']) {
  test(`tabbed prose is repaired on paste in ${mode} mode and Undo restores the source`, async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByLabel('Paste behavior').selectOption(mode);
    const editor = page.locator('#formatter-textarea-0-0');
    await editor.fill('Before. After.');
    await editor.evaluate((element, text) => {
      const textarea = element as HTMLTextAreaElement;
      textarea.setSelectionRange(8, 8);
      const clipboardData = new DataTransfer();
      clipboardData.setData('text/plain', text);
      textarea.dispatchEvent(
        new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData,
        }),
      );
    }, financialProse);
    await expect(editor).toHaveValue(`Before. ${normalizedProse}After.`);
    await expect(page.locator('textarea[id^="formatter-textarea-"]')).toHaveCount(1);
    await expect
      .poll(() =>
        editor.evaluate((element) => ({
          start: (element as HTMLTextAreaElement).selectionStart,
          end: (element as HTMLTextAreaElement).selectionEnd,
        })),
      )
      .toEqual({ start: 8 + normalizedProse.length, end: 8 + normalizedProse.length });
    await page.locator('#header-undo-btn').click();
    await expect(editor).toHaveValue(`Before. ${financialProse}After.`);
  });
}
