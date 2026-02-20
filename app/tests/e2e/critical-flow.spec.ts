import { expect, test } from '@playwright/test'

test('affiche le dashboard et permet de naviguer vers Objectifs', async ({ page }) => {
  await page.goto('/')
  
  // Handle the login modal if it appears
  const loginModal = page.getByRole('heading', { name: 'Bienvenue' })
  try {
    await loginModal.waitFor({ state: 'visible', timeout: 2000 })
    await page.getByRole('button', { name: 'Continuer sans connexion' }).click()
    // Wait for modal to disappear
    await loginModal.waitFor({ state: 'hidden', timeout: 2000 })
  } catch (e) {
    // Modal didn't appear, continue
  }

  // Wait for the app to load and display the main heading
  await expect(page.getByRole('heading', { name: /Module d'Évaluation/i })).toBeVisible()
  
  // Create a new project to access the dashboard
  await page.getByRole('button', { name: '+ Nouvelle' }).click()
  await page.getByPlaceholder('ex: Module 164 - Hiver 2026').waitFor({ state: 'visible' })
  await page.getByPlaceholder('ex: Module 164 - Hiver 2026').fill('Test Project')
  await page.getByRole('button', { name: 'Créer l\'évaluation' }).click()

  // Now we should be in the dashboard, wait for the ETML heading
  await expect(page.getByRole('heading', { name: /ETML/i })).toBeVisible()

  // Fill in at least one student to unlock the "Objectifs" tab
  // The "Objectifs" tab requires hasStudents || hasObjectives
  // Since we just created a project, we have neither.
  const firstNomInput = page.getByPlaceholder('Nom').first()
  await firstNomInput.waitFor({ state: 'visible' })
  await firstNomInput.fill('Doe')
  
  const firstPrenomInput = page.getByPlaceholder('Prénom').first()
  await firstPrenomInput.fill('John')

  // Click outside to trigger the blur/save
  await page.getByRole('heading', { name: /ETML/i }).click()

  // Click on "Fermer la saisie élèves" to save the students
  await page.getByRole('button', { name: 'Fermer la saisie élèves' }).click()

  // Wait for the button to become enabled
  const objectifsButton = page.locator('nav').getByRole('button', { name: 'Objectifs' })
  await expect(objectifsButton).toBeEnabled()

  // Click on the "Objectifs" button in the navigation (first occurrence)
  await objectifsButton.click()
  
  // Wait for the Objectives view to load by checking for the "Nouvel objectif d'évaluation" label
  await expect(page.getByText("Nouvel objectif d'évaluation")).toBeVisible()
})
