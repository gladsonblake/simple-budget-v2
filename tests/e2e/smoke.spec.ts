import { test, expect } from '@playwright/test'

const routes = ['/dashboard', '/transactions', '/categories', '/import']

for (const route of routes) {
  test(`${route} loads`, async ({ page }) => {
    const response = await page.goto(route)
    expect(response).not.toBeNull()
    expect(response?.status()).toBe(200)
    await expect(page.locator('h1')).toBeVisible()
  })
}
