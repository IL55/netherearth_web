import { test, expect } from '@playwright/test';

// ── Startup ───────────────────────────────────────────────────────────────────

test.describe('game startup', () => {
    test('page loads without uncaught JS errors', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', e => errors.push(e.message));

        await page.goto('/');
        await page.waitForSelector('canvas');

        expect(errors).toHaveLength(0);
    });

    test('canvas is visible with non-zero dimensions', async ({ page }) => {
        await page.goto('/');
        const canvas = page.locator('canvas');

        await expect(canvas).toBeVisible();
        const box = await canvas.boundingBox();
        expect(box!.width).toBeGreaterThan(100);
        expect(box!.height).toBeGreaterThan(100);
    });

    test('game loop runs for 3 seconds without crashing', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', e => errors.push(e.message));

        await page.goto('/');
        await page.waitForSelector('canvas');
        await page.waitForTimeout(3_000);

        expect(errors).toHaveLength(0);
    });
});

// ── Mobile ─────────────────────────────────────────────────────────────────────
// These run under the 'mobile' project (iPhone 14 viewport + touch enabled).

test.describe('mobile viewport', () => {
    test('canvas fills at least 80% of mobile screen width', async ({ page }) => {
        await page.goto('/');
        const canvas = page.locator('canvas');

        await expect(canvas).toBeVisible();
        const [canvasBox, viewportWidth] = await Promise.all([
            canvas.boundingBox(),
            page.evaluate(() => window.innerWidth),
        ]);
        expect(canvasBox!.width).toBeGreaterThan(viewportWidth * 0.8);
    });

    test('no JS errors on mobile after 2 seconds', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', e => errors.push(e.message));

        await page.goto('/');
        await page.waitForSelector('canvas');
        await page.waitForTimeout(2_000);

        expect(errors).toHaveLength(0);
    });
});
