import { expect, test, type Page } from '@playwright/test';

// Every working-example game: a Tutorial button that auto-plays a scripted path
// with a coach panel and then resets; a responsive board; a restart control.
const GAMES = [
  { name: 'FreeCell', route: '/#/freecell' },
  { name: 'Klondike', route: '/#/klondike' },
  { name: 'Spider', route: '/#/spider' },
  { name: 'Golf', route: '/#/golf' },
  { name: 'Pyramid', route: '/#/pyramid' },
  { name: 'Tri Peaks', route: '/#/tripeaks' },
];

// Dismiss whichever start overlay a game opens with: a difficulty picker or the
// rules modal.
async function dismissStart(page: Page) {
  if (await page.locator('.sol-diff-opt').count()) {
    await page.locator('.sol-diff-opt').first().click();
  }
  if (await page.locator('.sol-modal-close').count()) {
    await page.locator('.sol-modal-close').click();
  }
  await expect(page.locator('.sol-modal')).toHaveCount(0);
}

for (const g of GAMES) {
  test(`${g.name}: tutorial auto-plays with a coach, then resets to a playable game`, async ({ page }) => {
    await page.goto(g.route);
    await dismissStart(page);

    // The Tutorial button exists and starts the coached walkthrough.
    await page.getByRole('button', { name: 'Tutorial' }).click();
    const coach = page.locator('.sol-coach');
    await expect(coach).toBeVisible();
    await expect(coach.locator('.sol-coach-step')).toContainText('Tutorial · 1/');

    // Step through the whole scripted path via Next/Finish.
    for (let i = 0; i < 12 && (await coach.count()); i++) {
      await coach.locator('.sol-btn-primary').click();
    }
    // The tutorial ended and handed back to a normal game (coach gone).
    await expect(coach).toHaveCount(0);
    await expect(page.locator('.sol-board')).toBeVisible();
  });

  test(`${g.name}: renders on a phone without horizontal overflow, and restarts`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(g.route);
    await dismissStart(page);

    const overflow = await page.evaluate(() => {
      const b = document.querySelector('.sol-board') as HTMLElement;
      return b.scrollWidth - b.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(1);

    // Restart is always available.
    await page.getByRole('button', { name: 'New game' }).click();
    await expect(page.locator('.sol-board')).toBeVisible();
  });
}
