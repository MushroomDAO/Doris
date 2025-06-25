import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import puppeteer from 'puppeteer';

describe('Web Interface Automation Tests', () => {
    let browser;
    let page;
    const BASE_URL = 'http://localhost:3001';
    
    beforeAll(async () => {
        // Launch browser for testing
        browser = await puppeteer.launch({
            headless: true, // Set to false to see the browser
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        page = await browser.newPage();
        
        // Set viewport size
        await page.setViewport({ width: 1280, height: 720 });
        
        // Enable request interception for API mocking
        await page.setRequestInterception(true);
        
        page.on('request', (request) => {
            // Mock API responses for testing
            if (request.url().includes('/api/chat')) {
                request.respond({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        response: 'Hello! This is a test response from the AI assistant.'
                    })
                });
            } else if (request.url().includes('/api/save-post')) {
                request.respond({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        message: 'Post saved successfully'
                    })
                });
            } else if (request.url().includes('/api/deploy-ipfs')) {
                request.respond({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        hash: 'QmTestHash123',
                        url: 'https://gateway.pinata.cloud/ipfs/QmTestHash123'
                    })
                });
            } else {
                request.continue();
            }
        });
    });
    
    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });
    
    describe('Admin Interface Tests', () => {
        it('should load admin page successfully', async () => {
            await page.goto(`${BASE_URL}/admin.html`);
            
            // Wait for page to load
            await page.waitForSelector('h1');
            
            // Check if title is correct
            const title = await page.title();
            expect(title).toContain('Doris Protocol');
            
            // Check if main elements are present
            const heading = await page.$eval('h1', el => el.textContent);
            expect(heading).toContain('Doris Protocol');
        });
        
        it('should have functional navigation tabs', async () => {
            await page.goto(`${BASE_URL}/admin.html`);
            
            // Wait for tabs to be available
            await page.waitForSelector('[data-tab]');
            
            // Test tab switching
            const tabs = ['content', 'ai-enhance', 'preview', 'deployment'];
            
            for (const tab of tabs) {
                const tabSelector = `[data-tab="${tab}"]`;
                if (await page.$(tabSelector)) {
                    await page.click(tabSelector);
                    await page.waitForTimeout(500); // Wait for tab to switch
                    
                    const activeTab = await page.$eval(`[data-tab="${tab}"]`, 
                        el => el.classList.contains('active') || el.classList.contains('bg-blue-600')
                    );
                    expect(activeTab).toBe(true);
                }
            }
        });
        
        it('should handle form inputs correctly', async () => {
            await page.goto(`${BASE_URL}/admin.html`);
            
            // Test title input
            const titleSelector = 'input[placeholder*="title"], #postTitle, #title';
            if (await page.$(titleSelector)) {
                await page.type(titleSelector, 'Test Blog Post');
                const titleValue = await page.$eval(titleSelector, el => el.value);
                expect(titleValue).toBe('Test Blog Post');
            }
            
            // Test content textarea
            const contentSelector = 'textarea[placeholder*="content"], #postContent, #content';
            if (await page.$(contentSelector)) {
                await page.type(contentSelector, 'This is test content for the blog post.');
                const contentValue = await page.$eval(contentSelector, el => el.value);
                expect(contentValue).toContain('This is test content');
            }
        });
    });
    
    describe('Pro Interface Tests', () => {
        it('should load pro admin page successfully', async () => {
            await page.goto(`${BASE_URL}/admin-pro.html`);
            
            // Wait for page to load
            await page.waitForSelector('h1');
            
            // Check if title is correct
            const title = await page.title();
            expect(title).toContain('Doris Protocol Pro');
            
            // Check if main elements are present
            const heading = await page.$eval('h1', el => el.textContent);
            expect(heading).toContain('Doris Protocol Pro');
        });
        
        it('should test AI chat functionality', async () => {
            await page.goto(`${BASE_URL}/admin-pro.html`);
            
            // Wait for chat input
            await page.waitForSelector('#chatInput');
            
            // Type a message
            await page.type('#chatInput', 'Hello AI, this is a test message');
            
            // Click send button
            await page.click('button[onclick="sendMessage()"]');
            
            // Wait for response to appear
            await page.waitForTimeout(2000);
            
            // Check if message was added to chat
            const messages = await page.$$('#messages div');
            expect(messages.length).toBeGreaterThan(0);
        });
        
        it('should test content creation functionality', async () => {
            await page.goto(`${BASE_URL}/admin-pro.html`);
            
            // Fill in the form
            await page.type('#title', 'Automated Test Post');
            await page.type('#content', 'This is content created by automated testing.');
            
            // Click create post button
            await page.click('button[onclick="createPost()"]');
            
            // Wait for success message
            await page.waitForTimeout(2000);
            
            // Check if success message appears
            const successMessage = await page.$eval('#messages', 
                el => el.textContent.includes('successfully')
            );
            expect(successMessage).toBe(true);
        });
        
        it('should test IPFS deployment functionality', async () => {
            await page.goto(`${BASE_URL}/admin-pro.html`);
            
            // Click deploy button
            await page.click('button[onclick="deployIPFS()"]');
            
            // Wait for deployment to complete
            await page.waitForTimeout(3000);
            
            // Check if deployment status updated
            const deployStatus = await page.$eval('#deployStatus', el => el.textContent);
            expect(deployStatus).toContain('Deployed!');
        });
    });
    
    describe('Performance Tests', () => {
        it('should load pages within acceptable time', async () => {
            const startTime = Date.now();
            
            await page.goto(`${BASE_URL}/admin-pro.html`);
            await page.waitForSelector('h1');
            
            const loadTime = Date.now() - startTime;
            
            // Page should load within 5 seconds
            expect(loadTime).toBeLessThan(5000);
        });
        
        it('should handle multiple rapid clicks', async () => {
            await page.goto(`${BASE_URL}/admin-pro.html`);
            
            // Rapidly click the deploy button multiple times
            for (let i = 0; i < 5; i++) {
                await page.click('button[onclick="deployIPFS()"]');
                await page.waitForTimeout(200);
            }
            
            // Should not crash or show errors
            const errorElements = await page.$$('.error, [class*="error"]');
            // Some errors might be expected due to rapid clicking, so we just check it doesn't crash
            expect(errorElements.length).toBeLessThan(10);
        });
    });
    
    describe('Responsive Design Tests', () => {
        it('should work on mobile viewport', async () => {
            await page.setViewport({ width: 375, height: 667 }); // iPhone size
            
            await page.goto(`${BASE_URL}/admin-pro.html`);
            await page.waitForSelector('h1');
            
            // Check if page still renders properly
            const heading = await page.$eval('h1', el => el.textContent);
            expect(heading).toContain('Doris Protocol Pro');
            
            // Check if interactive elements are still clickable
            const buttons = await page.$$('button');
            expect(buttons.length).toBeGreaterThan(0);
        });
        
        it('should work on tablet viewport', async () => {
            await page.setViewport({ width: 768, height: 1024 }); // iPad size
            
            await page.goto(`${BASE_URL}/admin-pro.html`);
            await page.waitForSelector('h1');
            
            // Check if layout adapts properly
            const heading = await page.$eval('h1', el => el.textContent);
            expect(heading).toContain('Doris Protocol Pro');
        });
    });
    
    describe('Accessibility Tests', () => {
        it('should have proper heading structure', async () => {
            await page.goto(`${BASE_URL}/admin-pro.html`);
            
            const h1Elements = await page.$$('h1');
            expect(h1Elements.length).toBeGreaterThanOrEqual(1);
            
            const h1Text = await page.$eval('h1', el => el.textContent);
            expect(h1Text.trim().length).toBeGreaterThan(0);
        });
        
        it('should have accessible form elements', async () => {
            await page.goto(`${BASE_URL}/admin-pro.html`);
            
            // Check if form inputs have labels or placeholders
            const inputs = await page.$$('input, textarea');
            
            for (const input of inputs) {
                const placeholder = await input.evaluate(el => el.placeholder);
                const label = await input.evaluate(el => {
                    const id = el.id;
                    return id ? document.querySelector(`label[for="${id}"]`) : null;
                });
                
                // Should have either placeholder or label
                expect(placeholder || label).toBeTruthy();
            }
        });
    });
    
    describe('Error Handling Tests', () => {
        it('should handle network errors gracefully', async () => {
            await page.goto(`${BASE_URL}/admin-pro.html`);
            
            // Disable network to simulate offline
            await page.setOfflineMode(true);
            
            // Try to send a chat message
            await page.type('#chatInput', 'Test message during offline');
            await page.click('button[onclick="sendMessage()"]');
            
            await page.waitForTimeout(2000);
            
            // Should show some kind of error indication
            const messages = await page.$eval('#messages', el => el.textContent);
            expect(messages).toContain('error' || 'Error' || 'failed' || 'Failed');
            
            // Re-enable network
            await page.setOfflineMode(false);
        });
        
        it('should validate required fields', async () => {
            await page.goto(`${BASE_URL}/admin-pro.html`);
            
            // Try to create post without title/content
            await page.click('button[onclick="createPost()"]');
            
            await page.waitForTimeout(1000);
            
            // Should show validation message
            const messages = await page.$eval('#messages', el => el.textContent);
            expect(messages).toContain('enter' || 'Enter' || 'required' || 'Required');
        });
    });
});

// Export test utilities for potential reuse
export const TestUtils = {
    async takeScreenshot(page, name) {
        await page.screenshot({ 
            path: `tests/screenshots/${name}.png`,
            fullPage: true 
        });
    },
    
    async measurePerformance(page, url) {
        const startTime = Date.now();
        await page.goto(url);
        await page.waitForSelector('h1');
        return Date.now() - startTime;
    },
    
    async checkConsoleErrors(page) {
        const errors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });
        return errors;
    }
}; 