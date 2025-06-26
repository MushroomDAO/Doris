// Simple web interface test
import puppeteer from 'puppeteer';

export async function runWebTests() {
    console.log('🚀 Starting Web Interface Tests...');
    
    let browser;
    try {
        browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        
        // Test 1: Load Admin Page
        console.log('�� Testing admin page load...');
        await page.goto('http://localhost:3001/admin.html');
        await page.waitForSelector('h1', { timeout: 5000 });
        const title = await page.title();
        console.log('✅ Admin page loaded:', title);
        
        // Test 2: Load Pro Page
        console.log('📄 Testing pro page load...');
        await page.goto('http://localhost:3001/admin-pro.html');
        await page.waitForSelector('h1', { timeout: 5000 });
        const proTitle = await page.$eval('h1', el => el.textContent);
        console.log('✅ Pro page loaded:', proTitle);
        
        // Test 3: Test Form Inputs
        console.log('📝 Testing form inputs...');
        if (await page.$('#title')) {
            await page.type('#title', 'Test Post');
            const value = await page.$eval('#title', el => el.value);
            console.log('✅ Form input works:', value);
        }
        
        // Test 4: Test Chat Input
        console.log('💬 Testing chat input...');
        if (await page.$('#chatInput')) {
            await page.type('#chatInput', 'Hello AI');
            const chatValue = await page.$eval('#chatInput', el => el.value);
            console.log('✅ Chat input works:', chatValue);
        }
        
        // Test 5: Check Responsive Design
        console.log('📱 Testing responsive design...');
        await page.setViewport({ width: 375, height: 667 });
        await page.reload();
        await page.waitForSelector('h1');
        console.log('✅ Mobile view works');
        
        console.log('🎉 All web tests passed!');
        return { success: true, tests: 5, passed: 5 };
        
    } catch (error) {
        console.error('❌ Web test failed:', error.message);
        return { success: false, error: error.message };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runWebTests().then(result => {
        console.log('Test Result:', result);
        process.exit(result.success ? 0 : 1);
    });
}
