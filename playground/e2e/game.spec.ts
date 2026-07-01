import { expect, test } from '@playwright/test';

// The one integration that has to keep working: shuffle, deal a hand, and score
// a played hand — end to end, with real animations running.
test('Demo: deals a hand and scores a played hand', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Demo' }).click();
  await page.getByRole('button', { name: 'Barajar y repartir' }).click();

  // The deal finished once the play control appears (phase → 'playing').
  const play = page.getByRole('button', { name: /^Jugar mano/ });
  await expect(play).toBeVisible({ timeout: 15_000 });

  // A full hand of 8 interactive cards landed.
  const handCards = page.locator('.game-stagewrap [role="button"]');
  await expect(handCards).toHaveCount(8);

  // Select three cards; the play button enables once something is selected.
  for (let i = 0; i < 3; i++) await handCards.nth(i).click();
  await expect(play).toBeEnabled();

  await play.click();

  // The score counts up past zero — the played hand actually scored.
  const score = page.locator('.game-score');
  await expect(score).not.toHaveText('0', { timeout: 15_000 });
});
