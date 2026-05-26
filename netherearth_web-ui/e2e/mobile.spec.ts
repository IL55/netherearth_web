/**
 * Mobile integration tests.
 * Touch-specific tests call skipIfDesktop() and are skipped automatically
 * when navigator.maxTouchPoints === 0 (desktop project).
 */

import { test, expect, type Page } from '@playwright/test';

async function isTouch(page: Page): Promise<boolean> {
    return page.evaluate(() => navigator.maxTouchPoints > 0);
}

// ── Startup menu ──────────────────────────────────────────────────────────────

test.describe('mobile startup menu', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('canvas');
    });

    test('shows TAP ≡ TO RESUME hint on touch device', async ({ page }) => {
        if (!await isTouch(page)) test.skip();
        await expect(page.getByText('TAP ≡ TO RESUME')).toBeVisible();
    });

    test('shows ESC hint on non-touch device', async ({ page }) => {
        if (await isTouch(page)) test.skip();
        await expect(page.getByText('ESC — resume')).toBeVisible();
    });

    test('BIND KEYS button absent on touch device', async ({ page }) => {
        if (!await isTouch(page)) test.skip();
        await expect(page.getByRole('button', { name: 'BIND KEYS' })).not.toBeAttached();
    });

    test('startup menu buttons are at least 44px tall', async ({ page }) => {
        if (!await isTouch(page)) test.skip();
        const buttons = page.getByRole('button').filter({ hasNot: page.getByLabel('Menu') });
        const count = await buttons.count();
        for (let i = 0; i < count; i++) {
            const btn = buttons.nth(i);
            if (!await btn.isVisible()) continue;
            const box = await btn.boundingBox();
            if (!box) continue;
            const label = await btn.textContent();
            expect(box.height, `button "${label?.trim()}" below 44px tap target`).toBeGreaterThanOrEqual(44);
        }
    });

    test('no horizontal overflow on narrow viewport', async ({ page }) => {
        // Use body.scrollWidth vs clientWidth: document.documentElement.scrollWidth
        // is inflated by fixed-position elements in Chromium and is not a reliable
        // indicator of user-visible horizontal scroll.
        const hasOverflow = await page.evaluate(
            () => document.body.scrollWidth > document.body.clientWidth,
        );
        expect(hasOverflow).toBe(false);
    });
});

// ── Canvas layout ─────────────────────────────────────────────────────────────

test.describe('mobile canvas layout', () => {
    test('canvas fills at least 90% of viewport height on mobile', async ({ page }) => {
        if (!await isTouch(page)) test.skip();
        await page.goto('/');
        const canvas = page.locator('canvas');
        await expect(canvas).toBeVisible();
        const [box, viewportHeight] = await Promise.all([
            canvas.boundingBox(),
            page.evaluate(() => window.innerHeight),
        ]);
        expect(box!.height).toBeGreaterThan(viewportHeight * 0.9);
    });
});

// ── Pause button ──────────────────────────────────────────────────────────────

test.describe('mobile pause button', () => {
    test('pause button is hidden while startup menu is open', async ({ page }) => {
        if (!await isTouch(page)) test.skip();
        await page.goto('/');
        await page.waitForSelector('canvas');
        await expect(page.getByRole('button', { name: 'Menu' })).toBeHidden();
    });

    test('pause button appears after dismissing startup menu', async ({ page }) => {
        if (!await isTouch(page)) test.skip();
        await page.goto('/');
        await page.waitForSelector('canvas');
        await page.getByRole('button', { name: 'NEW GAME' }).click();
        await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible({ timeout: 5_000 });
    });

    test('pause button is at least 44×44px', async ({ page }) => {
        if (!await isTouch(page)) test.skip();
        await page.goto('/');
        await page.waitForSelector('canvas');
        await page.getByRole('button', { name: 'NEW GAME' }).click();
        const pauseBtn = page.getByRole('button', { name: 'Menu' });
        await expect(pauseBtn).toBeVisible({ timeout: 5_000 });
        const box = await pauseBtn.boundingBox();
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(box!.height).toBeGreaterThanOrEqual(44);
    });

    test('tapping pause button reopens startup menu', async ({ page }) => {
        if (!await isTouch(page)) test.skip();
        await page.goto('/');
        await page.waitForSelector('canvas');
        await page.getByRole('button', { name: 'NEW GAME' }).click();
        const pauseBtn = page.getByRole('button', { name: 'Menu' });
        await expect(pauseBtn).toBeVisible({ timeout: 5_000 });
        await pauseBtn.click();
        await expect(page.getByText('NETHER EARTH WEB')).toBeVisible();
    });
});

// ── Touch zones ───────────────────────────────────────────────────────────────

test.describe('mobile touch zones', () => {
    test('directional arrows appear in DOM after game starts', async ({ page }) => {
        if (!await isTouch(page)) test.skip();
        await page.goto('/');
        await page.waitForSelector('canvas');
        await page.getByRole('button', { name: 'NEW GAME' }).click();
        // Touch zone visual overlay contains arrow hints — wait for mount
        await expect(page.getByText('↑').first()).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText('↓').first()).toBeVisible();
        await expect(page.getByText('←').first()).toBeVisible();
        await expect(page.getByText('→').first()).toBeVisible();
    });

    test('no JS errors after game starts and touch zones are active', async ({ page }) => {
        if (!await isTouch(page)) test.skip();
        const errors: string[] = [];
        page.on('pageerror', e => errors.push(e.message));

        await page.goto('/');
        await page.waitForSelector('canvas');
        await page.getByRole('button', { name: 'NEW GAME' }).click();
        await expect(page.getByText('↑').first()).toBeVisible({ timeout: 10_000 });
        await page.waitForTimeout(2_000);

        expect(errors).toHaveLength(0);
    });
});
