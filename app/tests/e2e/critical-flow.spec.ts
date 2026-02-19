import { expect, test } from '@playwright/test'

test('affiche le dashboard et permet de naviguer vers Objectifs', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /ETML/i })).toBeVisible()
  // Click on the "Objectifs" button in the navigation (first occurrence)
  await page.locator('nav').getByRole('button', { name: 'Objectifs' }).click()
  await expect(page.getByRole('button', { name: 'Ajouter objectif' })).toBeVisible()
})
