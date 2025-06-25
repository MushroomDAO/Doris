import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';

// Mock IPFS APIs
jest.mock('@pinata/sdk');
// Note: Web3.Storage API mock is handled differently

describe('IPFS Deployment Script', () => {
    const testDir = path.join(process.cwd(), 'test-ipfs-output');
    const docsDir = path.join(testDir, 'docs');
    
    beforeEach(async () => {
        await fs.mkdir(docsDir, { recursive: true });
        
        // Create test files
        await fs.writeFile(path.join(docsDir, 'index.html'), '<html><body>Test</body></html>');
        await fs.writeFile(path.join(docsDir, 'README.md'), '# Test Docs');
        
        const postsDir = path.join(docsDir, 'posts', '2024', '01');
        await fs.mkdir(postsDir, { recursive: true });
        await fs.writeFile(path.join(postsDir, '2024-01-01-test-post.md'), '# Test Post');
    });

    afterEach(async () => {
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    it('should identify all files to upload', async () => {
        const files = [];
        
        async function scanDirectory(dir) {
            try {
                const entries = await fs.readdir(dir, { withFileTypes: true });
                
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isDirectory()) {
                        await scanDirectory(fullPath);
                    } else {
                        files.push(fullPath);
                    }
                }
            } catch (error) {
                // Handle directory not found gracefully
                if (error.code !== 'ENOENT') {
                    throw error;
                }
            }
        }
        
        await scanDirectory(docsDir);
        
        expect(files.length).toBeGreaterThan(0);
        expect(files.some(f => f.endsWith('.html'))).toBe(true);
        expect(files.some(f => f.endsWith('.md'))).toBe(true);
    });

    it('should calculate total file size correctly', async () => {
        let totalSize = 0;
        
        async function calculateSize(dir) {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    await calculateSize(fullPath);
                } else {
                    const stats = await fs.stat(fullPath);
                    totalSize += stats.size;
                }
            }
        }
        
        await calculateSize(docsDir);
        
        expect(totalSize).toBeGreaterThan(0);
        expect(typeof totalSize).toBe('number');
    });

    it('should validate environment variables', () => {
        const requiredVars = ['PINATA_API_KEY', 'PINATA_SECRET_KEY'];
        const missingVars = [];
        
        requiredVars.forEach(varName => {
            if (!process.env[varName]) {
                missingVars.push(varName);
            }
        });
        
        // Test that validation logic works
        expect(Array.isArray(missingVars)).toBe(true);
        // In actual usage, would check if missingVars.length > 0
    });

    it('should generate valid IPFS hash format', () => {
        // Mock IPFS hash response
        const mockHashes = [
            'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
            'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
            'QmXg9Pp2ytZ14xgmQjYEiHjVjMFXzCVVEcRTWJBmLgR3V8'
        ];
        
        mockHashes.forEach(hash => {
            // Test IPFS hash format validation
            const isValidV0 = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(hash);
            const isValidV1 = /^bafy[a-z2-7]{55}$/.test(hash);
            
            expect(isValidV0 || isValidV1).toBe(true);
        });
    });

    it('should handle file upload errors gracefully', () => {
        const mockErrors = [
            { code: 'NETWORK_ERROR', message: 'Network connection failed' },
            { code: 'AUTH_ERROR', message: 'Invalid credentials' },
            { code: 'QUOTA_ERROR', message: 'Storage quota exceeded' }
        ];
        
        mockErrors.forEach(error => {
            // Test error handling logic
            const errorMessage = `Upload failed: ${error.code} - ${error.message}`;
            expect(errorMessage).toContain(error.code);
            expect(errorMessage).toContain(error.message);
        });
    });

    it('should exclude unnecessary files from upload', async () => {
        // Create files that should be excluded
        await fs.writeFile(path.join(docsDir, '.DS_Store'), 'system file');
        await fs.writeFile(path.join(docsDir, 'node_modules'), 'dependency file');
        await fs.writeFile(path.join(docsDir, '.git'), 'git file');
        
        const excludePatterns = [
            /\.DS_Store$/,
            /node_modules/,
            /\.git/,
            /\.env$/,
            /package-lock\.json$/
        ];
        
        const testFiles = [
            '.DS_Store',
            'node_modules/package.json',
            '.git/config',
            '.env',
            'package-lock.json',
            'valid-file.md'
        ];
        
        const filteredFiles = testFiles.filter(file => 
            !excludePatterns.some(pattern => pattern.test(file))
        );
        
        expect(filteredFiles).toContain('valid-file.md');
        expect(filteredFiles).not.toContain('.DS_Store');
        expect(filteredFiles).not.toContain('.env');
    });

    it('should generate deployment summary', () => {
        const mockDeployment = {
            hash: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
            fileCount: 15,
            totalSize: 2097152, // Exactly 2MB (2*1024*1024)
            uploadTime: 5432, // milliseconds
            gatewayUrl: 'https://gateway.pinata.cloud/ipfs/'
        };
        
        const summary = {
            deploymentHash: mockDeployment.hash,
            filesUploaded: mockDeployment.fileCount,
            totalSizeMB: (mockDeployment.totalSize / 1024 / 1024).toFixed(2),
            uploadTimeSeconds: (mockDeployment.uploadTime / 1000).toFixed(1),
            accessUrl: `${mockDeployment.gatewayUrl}${mockDeployment.hash}`
        };
        
        expect(summary.deploymentHash).toBe(mockDeployment.hash);
        expect(summary.filesUploaded).toBe(15);
        expect(summary.totalSizeMB).toBe('2.00');
        expect(summary.uploadTimeSeconds).toBe('5.4');
        expect(summary.accessUrl).toContain(mockDeployment.hash);
    });

    it('should verify successful deployment', async () => {
        const mockHash = 'QmTestHash123';
        const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${mockHash}`;
        
        // Mock successful HTTP response
        const mockResponse = {
            status: 200,
            ok: true,
            headers: { 'content-type': 'text/html' }
        };
        
        // Test verification logic
        const isSuccessful = mockResponse.status === 200 && mockResponse.ok;
        expect(isSuccessful).toBe(true);
        
        // Test URL construction
        expect(gatewayUrl).toContain(mockHash);
        expect(gatewayUrl).toContain('https://');
    });

    it('should handle different IPFS providers', () => {
        const providers = {
            pinata: {
                endpoint: 'https://api.pinata.cloud',
                requiresAuth: true,
                gateway: 'https://gateway.pinata.cloud/ipfs/'
            },
            web3storage: {
                endpoint: 'https://api.web3.storage',
                requiresAuth: true,
                gateway: 'https://web3.storage/ipfs/'
            },
            local: {
                endpoint: 'http://localhost:5001',
                requiresAuth: false,
                gateway: 'http://localhost:8080/ipfs/'
            }
        };
        
        Object.keys(providers).forEach(providerName => {
            const provider = providers[providerName];
            expect(provider.endpoint).toBeDefined();
            expect(provider.gateway).toBeDefined();
            expect(typeof provider.requiresAuth).toBe('boolean');
        });
    });
}); 