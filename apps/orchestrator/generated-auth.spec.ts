import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('Verify signup, login, and dashboard access', async ({ page }) => {
    // Signup form loads with all fields
    await page.goto('http://localhost:3000/signup');
    await page.waitForSelector('form#signup-form');
    await expect(page.locator('h1')).toContainText('Create Account');
    await page.screenshot({ path: 'screenshots/01-signup-form.png' });

    // User can create account
    await page.fill('#email', 'test@ork.dev');
    await page.fill('#password', 'P@ssw0rd123');
    await page.fill('#password-confirm', 'P@ssw0rd123');
    await page.click('button#create-account');
    await page.screenshot({ path: 'screenshots/02-signup-submit.png' });

    // Redirects to dashboard after signup
    await page.waitForSelector('[data-testid='dashboard']');
    expect(page.url()).toContain('/dashboard');
    await page.screenshot({ path: 'screenshots/03-dashboard-load.png' });

    // User can logout
    await page.click('button#logout');
    await page.waitForSelector('form#login-form');
    expect(page.url()).toContain('/login');
    await page.screenshot({ path: 'screenshots/04-logout.png' });

    // User can login with existing credentials
    await page.fill('#email', 'test@ork.dev');
    await page.fill('#password', 'P@ssw0rd123');
    await page.click('button#login');
    await page.waitForSelector('[data-testid='dashboard']');
    expect(page.url()).toContain('/dashboard');
    await page.screenshot({ path: 'screenshots/05-login-success.png' });
  });
});