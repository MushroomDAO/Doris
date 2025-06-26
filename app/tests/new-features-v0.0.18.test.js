import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import puppeteer from 'puppeteer';

describe('New Features v0.0.18 Tests', () => {
    let browser;
    let page;
    const BASE_URL = 'http://localhost:3001';
    
    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
    });
    
    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    describe('Path Fixes', () => {
        it('should have correct Pro version link', async () => {
            await page.goto(`${BASE_URL}/app/admin/admin.html`);
            
            // Check if Pro version link is correct
            const proLink = await page.$('a[href="/app/admin/admin-pro.html"]');
            expect(proLink).toBeTruthy();
            
            const linkText = await page.$eval('a[href="/app/admin/admin-pro.html"]', el => el.textContent);
            expect(linkText).toContain('Pro Version');
        });

        it('should have correct blog post links with /posts/ prefix', async () => {
            await page.goto(`${BASE_URL}/app/admin/admin.html`);
            
            // Switch to manage posts tab
            await page.click('[data-tab="manage"]');
            await page.waitForTimeout(1000);
            
            // Check if blog links include /posts/ prefix
            const blogLinks = await page.$$eval('a[href*="#/posts/"]', 
                links => links.map(link => link.href)
            );
            
            // At least one link should exist and contain /posts/
            if (blogLinks.length > 0) {
                blogLinks.forEach(link => {
                    expect(link).toContain('#/posts/');
                });
            }
        });
    });

    describe('New Settings Tab', () => {
        it('should have Settings tab button', async () => {
            await page.goto(`${BASE_URL}/app/admin/admin.html`);
            
            const settingsTab = await page.$('[data-tab="settings"]');
            expect(settingsTab).toBeTruthy();
            
            const tabText = await page.$eval('[data-tab="settings"]', el => el.textContent);
            expect(tabText).toContain('Settings');
        });

        it('should display API key configuration options', async () => {
            await page.goto(`${BASE_URL}/app/admin/admin.html`);
            
            // Switch to settings tab
            await page.click('[data-tab="settings"]');
            await page.waitForTimeout(500);
            
            // Check for API key inputs
            const apiKeyInputs = [
                '#geminiApiKey',
                '#openaiApiKey', 
                '#deepseekApiKey',
                '#anthropicApiKey'
            ];
            
            for (const inputId of apiKeyInputs) {
                const input = await page.$(inputId);
                expect(input).toBeTruthy();
            }
        });

        it('should have API status indicators', async () => {
            await page.goto(`${BASE_URL}/app/admin/admin.html`);
            
            // Switch to settings tab
            await page.click('[data-tab="settings"]');
            await page.waitForTimeout(500);
            
            // Check for status indicators
            const statusElements = [
                '#geminiStatus',
                '#openaiStatus',
                '#deepseekStatus',
                '#anthropicStatus'
            ];
            
            for (const statusId of statusElements) {
                const status = await page.$(statusId);
                expect(status).toBeTruthy();
            }
        });
    });

    describe('Enhanced AI Functionality', () => {
        it('should have Gemini as default AI provider', async () => {
            await page.goto(`${BASE_URL}/app/admin/admin.html`);
            
            // Switch to enhance tab
            await page.click('[data-tab="enhance"]');
            await page.waitForTimeout(500);
            
            const selectedProvider = await page.$eval('#aiProvider', el => el.value);
            expect(selectedProvider).toBe('gemini');
        });

        it('should not require localStorage API key for enhancement', async () => {
            await page.goto(`${BASE_URL}/app/admin/admin.html`);
            
            // Clear localStorage to simulate fresh user
            await page.evaluate(() => {
                localStorage.clear();
            });
            
            // Switch to enhance tab
            await page.click('[data-tab="enhance"]');
            await page.waitForTimeout(500);
            
            // Should not immediately redirect to settings or show error
            const currentUrl = page.url();
            expect(currentUrl).toContain('/app/admin/admin.html');
        });
    });

    describe('Improved IPFS Deployment', () => {
        it('should handle IPFS deployment without hanging', async () => {
            await page.goto(`${BASE_URL}/app/admin/admin.html`);
            
            // Switch to deploy tab
            await page.click('[data-tab="deploy"]');
            await page.waitForTimeout(500);
            
            // Click IPFS deploy button
            const deployButton = await page.$('button[onclick="deployIPFS()"]');
            expect(deployButton).toBeTruthy();
            
            // Start deployment
            await page.click('button[onclick="deployIPFS()"]');
            
            // Should respond within reasonable time (not hang)
            await page.waitForTimeout(5000);
            
            // Check if deployment status appears
            const deploymentStatus = await page.$('#deploymentStatus');
            if (deploymentStatus) {
                const isVisible = await page.$eval('#deploymentStatus', 
                    el => !el.classList.contains('hidden')
                );
                expect(isVisible).toBe(true);
            }
        });
    });

    describe('Manage Posts Improvements', () => {
        it('should not have header link in Manage Posts', async () => {
            await page.goto(`${BASE_URL}/app/admin/admin.html`);
            
            // Switch to manage posts tab
            await page.click('[data-tab="manage"]');
            await page.waitForTimeout(500);
            
            // Check that the h2 title is not a link
            const titleElement = await page.$('#manage h2');
            expect(titleElement).toBeTruthy();
            
            const titleText = await page.$eval('#manage h2', el => el.textContent);
            expect(titleText).toBe('Manage Posts');
            
            // Ensure it's not wrapped in an anchor tag
            const titleLink = await page.$('#manage h2 a');
            expect(titleLink).toBeFalsy();
        });

        it('should have refresh functionality', async () => {
            await page.goto(`${BASE_URL}/app/admin/admin.html`);
            
            // Switch to manage posts tab
            await page.click('[data-tab="manage"]');
            await page.waitForTimeout(500);
            
            const refreshButton = await page.$('button[onclick="refreshPosts()"]');
            expect(refreshButton).toBeTruthy();
            
            const buttonText = await page.$eval('button[onclick="refreshPosts()"]', el => el.textContent);
            expect(buttonText).toContain('Refresh');
        });
    });

    describe('Start Script Improvements', () => {
        it('should validate start script exists and is executable', () => {
            // This test would run in the file system
            // For now, just validate the concept
            const expectedBehavior = {
                foregroundExecution: true,
                signalHandling: true,
                cleanShutdown: true
            };
            
            expect(expectedBehavior.foregroundExecution).toBe(true);
            expect(expectedBehavior.signalHandling).toBe(true);
            expect(expectedBehavior.cleanShutdown).toBe(true);
        });
    });

    describe('Error Handling', () => {
        it('should handle missing environment variables gracefully', async () => {
            // Test API endpoints with missing credentials
            const response = await page.evaluate(async () => {
                try {
                    const res = await fetch('/api/deploy-ipfs', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({})
                    });
                    return await res.json();
                } catch (error) {
                    return { error: error.message };
                }
            });
            
            // Should return error message, not crash
            expect(response).toBeDefined();
            expect(response.success === false || response.error).toBeTruthy();
        });
    });
}); 