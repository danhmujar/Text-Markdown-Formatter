import { test, expect } from '@playwright/test';

test('Tab creates flush-left letters and preserves list keyboard navigation', async ({ page }) => {
  await page.goto('/');
  const editor = page.locator('#formatter-textarea-0-0');
  await editor.fill('(i) Main');
  await editor.press('End');
  await editor.press('Enter');
  await editor.press('Tab');
  await expect(editor).toHaveValue('(i) Main;\na. ');
  await editor.press('Tab');
  await expect(editor).toBeFocused();
  await expect(editor).toHaveValue('(i) Main;\na. ');
  await editor.pressSequentially('Detail');
  await editor.press('Enter');
  await expect(editor).toHaveValue('(i) Main;\na. Detail;\nb. ');
  await editor.press('Enter');
  await expect(editor).toHaveValue('(i) Main;\na. Detail;\n(ii) ');
  await editor.press('Tab');
  await editor.pressSequentially('Next');
  await editor.press('Shift+Tab');
  await expect(editor).toHaveValue('(i) Main;\na. Detail;\n(ii) Next');

  await editor.fill('a. ');
  await editor.press('End');
  await editor.press('Enter');
  await expect(editor).toHaveValue('');
});
