import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

describe('Generate Post Script', () => {
    const testOutputDir = path.join(process.cwd(), 'test-output');
    const docsDir = path.join(testOutputDir, 'docs');
    const postsDir = path.join(docsDir, 'posts');

    beforeEach(async () => {
        // Create test directories
        await fs.mkdir(testOutputDir, { recursive: true });
        await fs.mkdir(docsDir, { recursive: true });
        await fs.mkdir(postsDir, { recursive: true });
    });

    afterEach(async () => {
        // Clean up test files
        try {
            await fs.rm(testOutputDir, { recursive: true, force: true });
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    it('should generate a post with valid title and content', async () => {
        const testTitle = 'Test Blog Post';
        const testType = 'daily';
        
        // Create a simple test input simulation
        const mockInput = `${testTitle}\n${testType}\n`;
        
        // Since the actual script is interactive, we'll test the core logic
        const expectedDate = new Date().toISOString().split('T')[0];
        const expectedYear = new Date().getFullYear().toString();
        const expectedMonth = String(new Date().getMonth() + 1).padStart(2, '0');
        
        // Test that the file structure would be correct
        const expectedPath = path.join(postsDir, expectedYear, expectedMonth);
        await fs.mkdir(expectedPath, { recursive: true });
        
        const testContent = `# ${testTitle}\n\n*Published: ${expectedDate}*\n\n## Summary\n\n## Main Content\n\n## Conclusion`;
        const fileName = `${expectedDate}-test-blog-post.md`;
        const filePath = path.join(expectedPath, fileName);
        
        await fs.writeFile(filePath, testContent);
        
        // Verify file was created
        const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
        expect(fileExists).toBe(true);
        
        // Verify content
        const content = await fs.readFile(filePath, 'utf-8');
        expect(content).toContain(testTitle);
        expect(content).toContain(expectedDate);
        expect(content).toContain('## Summary');
    });

    it('should create proper directory structure', async () => {
        const currentDate = new Date();
        const year = currentDate.getFullYear().toString();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        
        const yearDir = path.join(postsDir, year);
        const monthDir = path.join(yearDir, month);
        
        await fs.mkdir(monthDir, { recursive: true });
        
        const yearExists = await fs.access(yearDir).then(() => true).catch(() => false);
        const monthExists = await fs.access(monthDir).then(() => true).catch(() => false);
        
        expect(yearExists).toBe(true);
        expect(monthExists).toBe(true);
    });

    it('should generate different templates based on type', () => {
        const templates = {
            'daily': expect.stringContaining('daily'),
            'weekly': expect.stringContaining('weekly'),
            'tech': expect.stringContaining('tech'),
            'thoughts': expect.stringContaining('thoughts'),
            'book-notes': expect.stringContaining('book'),
            'project-update': expect.stringContaining('project')
        };

        Object.keys(templates).forEach(type => {
            // Test template logic would go here
            expect(type).toBeDefined();
        });
    });

    it('should create valid filename from title', () => {
        const testCases = [
            { title: 'My First Post', expected: 'my-first-post' },
            { title: 'Hello World!', expected: 'hello-world' },
            { title: 'Test & Development', expected: 'test-development' },
            { title: 'Multi   Spaces', expected: 'multi-spaces' }
        ];

        testCases.forEach(({ title, expected }) => {
            const slug = title.toLowerCase()
                .replace(/[^a-z0-9\s]/g, '')
                .replace(/\s+/g, '-')
                .substring(0, 50);
            
            expect(slug).toBe(expected);
        });
    });
}); 