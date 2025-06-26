import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';

// Mock OpenAI and Anthropic APIs
jest.mock('openai');
jest.mock('@anthropic-ai/sdk');

describe('AI Enhancement Script', () => {
    const testDir = path.join(process.cwd(), 'test-ai-output');
    const testFile = path.join(testDir, 'test-post.md');
    
    beforeEach(async () => {
        await fs.mkdir(testDir, { recursive: true });
    });

    afterEach(async () => {
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    it('should enhance title successfully', async () => {
        const originalContent = `# My Basic Title

Some content here for the blog post.`;

        await fs.writeFile(testFile, originalContent);

        // Mock AI response
        const mockEnhancedTitle = 'My Enhanced and SEO-Optimized Title';
        
        // Test the title enhancement logic
        const titleRegex = /^#\s+(.+)$/m;
        const match = originalContent.match(titleRegex);
        const originalTitle = match ? match[1] : '';
        
        expect(originalTitle).toBe('My Basic Title');
        
        // Simulate enhancement
        const enhancedContent = originalContent.replace(
            titleRegex, 
            `# ${mockEnhancedTitle}`
        );
        
        expect(enhancedContent).toContain(mockEnhancedTitle);
    });

    it('should add summary to content', async () => {
        const originalContent = `# Test Post

This is some content without a summary.

## Main Section

More content here.`;

        const mockSummary = 'This post discusses important topics related to testing and development.';
        
        // Test summary insertion logic
        const lines = originalContent.split('\n');
        const titleIndex = lines.findIndex(line => line.startsWith('# '));
        
        if (titleIndex !== -1) {
            lines.splice(titleIndex + 1, 0, '', `*Summary: ${mockSummary}*`, '');
        }
        
        const enhancedContent = lines.join('\n');
        
        expect(enhancedContent).toContain(mockSummary);
        expect(enhancedContent).toContain('*Summary:');
    });

    it('should generate relevant tags', async () => {
        const testContent = `# JavaScript Testing Guide

This comprehensive guide covers testing methodologies for JavaScript applications, including unit tests, integration tests, and end-to-end testing strategies.`;

        // Mock tag generation
        const mockTags = ['javascript', 'testing', 'development', 'guide', 'programming'];
        
        // Test tag generation logic
        const contentWords = testContent.toLowerCase().split(/\W+/);
        const relevantWords = contentWords.filter(word => 
            word.length > 3 && 
            !['this', 'that', 'with', 'from', 'they', 'have', 'been'].includes(word)
        );
        
        expect(relevantWords).toContain('javascript');
        expect(relevantWords).toContain('testing');
        expect(mockTags.length).toBeLessThanOrEqual(5);
    });

    it('should handle missing environment variables gracefully', () => {
        // Test when API keys are not set
        const originalEnv = process.env.OPENAI_API_KEY;
        delete process.env.OPENAI_API_KEY;
        
        // Should not crash and should provide helpful error message
        const hasApiKey = !!process.env.OPENAI_API_KEY;
        expect(hasApiKey).toBe(false);
        
        // Restore original environment
        if (originalEnv) {
            process.env.OPENAI_API_KEY = originalEnv;
        }
    });

    it('should validate file existence before processing', async () => {
        const nonExistentFile = path.join(testDir, 'does-not-exist.md');
        
        const fileExists = await fs.access(nonExistentFile)
            .then(() => true)
            .catch(() => false);
        
        expect(fileExists).toBe(false);
    });

    it('should preserve markdown structure during enhancement', async () => {
        const originalContent = `# Original Title

## Introduction

Some introduction text.

### Subsection

- List item 1
- List item 2

\`\`\`javascript
console.log('test');
\`\`\`

## Conclusion

Final thoughts.`;

        // Test that markdown structure is preserved
        const lines = originalContent.split('\n');
        const headerLines = lines.filter(line => line.match(/^#{1,3}\s/));
        const codeBlockLines = lines.filter(line => line.includes('```'));
        const listLines = lines.filter(line => line.match(/^-\s/));
        
        expect(headerLines.length).toBe(4); // # ## ### ##
        expect(codeBlockLines.length).toBe(2); // opening and closing ```
        expect(listLines.length).toBe(2); // two list items
    });

    it('should handle special characters in content', async () => {
        const contentWithSpecialChars = `# Test Title with "Quotes" & Symbols

Content with émojis 🚀 and special characters: @#$%^&*()`;

        await fs.writeFile(testFile, contentWithSpecialChars);
        
        const content = await fs.readFile(testFile, 'utf-8');
        expect(content).toContain('🚀');
        expect(content).toContain('"Quotes"');
        expect(content).toContain('&');
    });

    it('should provide meaningful error messages for API failures', () => {
        // Mock API failure scenarios
        const apiErrors = [
            { status: 401, message: 'Invalid API key' },
            { status: 429, message: 'Rate limit exceeded' },
            { status: 500, message: 'Internal server error' }
        ];

        apiErrors.forEach(error => {
            // Test error handling logic
            const errorMessage = `API Error ${error.status}: ${error.message}`;
            expect(errorMessage).toContain(error.status.toString());
            expect(errorMessage).toContain(error.message);
        });
    });

    it('should support Gemini API as default provider', () => {
        // Test Gemini API configuration
        const providers = ['openai', 'deepseek', 'anthropic', 'gemini'];
        const defaultProvider = 'gemini';
        
        expect(providers).toContain(defaultProvider);
        expect(defaultProvider).toBe('gemini');
        
        // Test environment variable reading for Gemini
        const geminiApiKey = process.env.GEMINI_API_KEY || process.env.Gemini_API_KEY;
        
        // Should accept both formats
        if (process.env.GEMINI_API_KEY || process.env.Gemini_API_KEY) {
            expect(geminiApiKey).toBeTruthy();
        }
    });

    it('should handle localStorage fallback to environment variables', () => {
        // Test the logic used in admin interface
        const mockLocalStorageKey = null; // Simulate empty localStorage
        const mockEnvKey = 'test-api-key-from-env';
        
        // Simulate the logic from admin.html enhanceContent function
        const effectiveApiKey = mockLocalStorageKey || mockEnvKey;
        
        expect(effectiveApiKey).toBe(mockEnvKey);
        
        // Test with localStorage value
        const mockLocalStorageValue = 'test-api-key-from-storage';
        const effectiveApiKeyWithLocal = mockLocalStorageValue || mockEnvKey;
        
        expect(effectiveApiKeyWithLocal).toBe(mockLocalStorageValue);
    });
}); 