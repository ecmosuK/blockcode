import { test, expect } from '@playwright/test'

/**
 * Core User Flow Test
 *
 * Tests the critical path: load the app, verify editor is ready,
 * and perform basic navigation.
 *
 * This test validates that the BlockCode editor starts correctly
 * and core UI elements are accessible.
 */

test.describe('Core User Flow: Editor Startup', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/')

    // Wait for the page to load idle (all network requests done)
    await page.waitForLoadState('networkidle')

    const app = page.locator('.app')

    // Wait for editor to be visible
    await expect(app).toBeVisible({ timeout: 10000 })
  })

  test('should load the editor and show workspace', async ({ page }) => {
    // Verified in beforeEach - app should be visible
    const app = page.locator('.app')
    const paletteGroups = page.locator('#palette .palette-group')

    // Verify workspace is ready
    await expect(app).toBeVisible()
    // Palette should be interactive
    await expect(paletteGroups.first()).toBeVisible()
  })

  test('should navigate between tabs', async ({ page }) => {
    // Verified in beforeEach - we're in editor state
    const tabBlocks = page.locator('#tabBlocks')
    const tabAssets = page.locator('#tabAssets')

    // Verify blocks tab is visible and clickable
    await expect(tabBlocks).toBeVisible()
    await expect(tabAssets).toBeVisible()

    // Switch to assets tab
    await tabAssets.click()
    await expect(tabBlocks).toHaveAttribute('aria-selected', 'false')
    await expect(tabAssets).toHaveAttribute('aria-selected', 'true')

    // Switch back to blocks tab
    await tabBlocks.click()
    await expect(tabBlocks).toHaveAttribute('aria-selected', 'true')
    await expect(tabAssets).toHaveAttribute('aria-selected', 'false')
  })

  test('should show toast on background creation', async ({ page }, testInfo) => {
    // Verified in beforeEach - we're in editor state
    // Go to assets tab
    await page.locator('#tabAssets').click()
    await page.waitForSelector('#viewAssets', { state: 'visible' })

    // Create a new background
    await page.fill('#bgName', 'E2E Test Background')
    await page.fill('#bgColor', '#ffffff')
    await page.fill('#bgAccent', '#ff0000')
    await page.click('#createBgBtn')

    // Verify toast appears
    const toast = page.locator('#toast')
    await expect(toast).toHaveText('Background created.', { timeout: 5000 })

    // Capture screenshot
    await page.screenshot({ path: `test-results/${testInfo.title}.png`, fullPage: true })
  })
})