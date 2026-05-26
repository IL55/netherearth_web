import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    timeout: 30_000,
    fullyParallel: true,
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        baseURL: 'http://localhost:5173/netherearth_web',
        trace: 'on-first-retry',
    },
    projects: [
        { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
        { name: 'mobile',  use: { ...devices['iPhone 14'], browserName: 'chromium' } },
    ],
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:5173/netherearth_web/',
        reuseExistingServer: !process.env.CI,
    },
});
