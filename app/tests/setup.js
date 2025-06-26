// Test setup for Doris Protocol v0.1
import { jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';

// Global test environment setup
beforeAll(async () => {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
    
    // Create test directories if they don't exist
    const testDirs = [
        'test-output',
        'test-ai-output', 
        'test-ipfs-output'
    ];
    
    for (const dir of testDirs) {
        const fullPath = path.join(process.cwd(), dir);
        try {
            await fs.mkdir(fullPath, { recursive: true });
        } catch (error) {
            // Directory might already exist
        }
    }
});

// Clean up after all tests
afterAll(async () => {
    // Clean up test directories
    const testDirs = [
        'test-output',
        'test-ai-output',
        'test-ipfs-output'
    ];
    
    for (const dir of testDirs) {
        const fullPath = path.join(process.cwd(), dir);
        try {
            await fs.rm(fullPath, { recursive: true, force: true });
        } catch (error) {
            // Ignore cleanup errors
        }
    }
});

// Mock external APIs for testing
jest.mock('openai', () => ({
    OpenAI: jest.fn().mockImplementation(() => ({
        chat: {
            completions: {
                create: jest.fn().mockResolvedValue({
                    choices: [{
                        message: {
                            content: 'Mocked AI response for testing'
                        }
                    }]
                })
            }
        }
    }))
}));

jest.mock('@anthropic-ai/sdk', () => ({
    Anthropic: jest.fn().mockImplementation(() => ({
        messages: {
            create: jest.fn().mockResolvedValue({
                content: [{
                    text: 'Mocked Anthropic response for testing'
                }]
            })
        }
    }))
}));

jest.mock('@pinata/sdk', () => ({
    pinata: jest.fn().mockImplementation(() => ({
        pinFileToIPFS: jest.fn().mockResolvedValue({
            IpfsHash: 'QmTestHash123',
            PinSize: 1024,
            Timestamp: new Date().toISOString()
        }),
        pinJSONToIPFS: jest.fn().mockResolvedValue({
            IpfsHash: 'QmTestJSONHash456',
            PinSize: 512,
            Timestamp: new Date().toISOString()
        })
    }))
}));

// Global test utilities
global.testUtils = {
    // Create a test markdown file
    async createTestMarkdown(title = 'Test Post', content = 'Test content') {
        const date = new Date().toISOString().split('T')[0];
        return `# ${title}\n\n*Published: ${date}*\n\n${content}`;
    },
    
    // Generate test file path
    generateTestPath(filename) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return path.join('test-output', 'docs', 'posts', year.toString(), month, filename);
    },
    
    // Mock console methods for cleaner test output
    silenceLogs() {
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    },
    
    // Restore console methods
    restoreLogs() {
        console.log.mockRestore?.();
        console.warn.mockRestore?.();
        console.error.mockRestore?.();
    }
};

// Custom matchers for file system operations
expect.extend({
    async toBeValidMarkdown(received) {
        if (typeof received !== 'string') {
            return {
                message: () => `Expected a string, but received ${typeof received}`,
                pass: false,
            };
        }
        
        const hasTitle = /^#\s+.+$/m.test(received);
        const hasContent = received.trim().length > 10;
        const hasValidStructure = received.includes('\n');
        
        return {
            message: () => 
                hasTitle && hasContent && hasValidStructure
                    ? `Expected ${received} not to be valid markdown`
                    : `Expected ${received} to be valid markdown with title, content, and structure`,
            pass: hasTitle && hasContent && hasValidStructure,
        };
    },
    
    async toBeValidIPFSHash(received) {
        if (typeof received !== 'string') {
            return {
                message: () => `Expected a string, but received ${typeof received}`,
                pass: false,
            };
        }
        
        const isValidV0 = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(received);
        const isValidV1 = /^bafy[a-z2-7]{55}$/.test(received);
        
        return {
            message: () => 
                isValidV0 || isValidV1
                    ? `Expected ${received} not to be a valid IPFS hash`
                    : `Expected ${received} to be a valid IPFS hash (v0 or v1 format)`,
            pass: isValidV0 || isValidV1,
        };
    }
}); 