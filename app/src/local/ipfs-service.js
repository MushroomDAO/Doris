/**
 * Local IPFS Node Service
 * Provides local IPFS capabilities for content publishing
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';

export class LocalIPFSService {
    constructor(config = {}) {
        this.apiUrl = config.apiUrl || process.env.IPFS_API_URL || 'http://localhost:5001';
        this.gatewayUrl = config.gatewayUrl || process.env.IPFS_GATEWAY_URL || 'http://localhost:8080';
        this.timeout = config.timeout || 30000; // 30 seconds
    }

    /**
     * Check if IPFS daemon is running
     */
    async isRunning() {
        try {
            const response = await fetch(`${this.apiUrl}/api/v0/version`, {
                timeout: 5000
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get IPFS node information
     */
    async getNodeInfo() {
        try {
            const [versionRes, idRes] = await Promise.all([
                fetch(`${this.apiUrl}/api/v0/version`),
                fetch(`${this.apiUrl}/api/v0/id`)
            ]);

            const [version, identity] = await Promise.all([
                versionRes.json(),
                idRes.json()
            ]);

            return {
                version: version.Version,
                peerId: identity.ID,
                addresses: identity.Addresses,
                agentVersion: identity.AgentVersion
            };
        } catch (error) {
            console.error('Error getting IPFS node info:', error);
            return null;
        }
    }

    /**
     * Add file or directory to IPFS
     */
    async addFile(filePath, options = {}) {
        try {
            const isDirectory = (await fs.stat(filePath)).isDirectory();
            const cmd = isDirectory ? 
                `ipfs add -r "${filePath}"` : 
                `ipfs add "${filePath}"`;

            const result = execSync(cmd, { 
                encoding: 'utf-8',
                timeout: this.timeout 
            });

            // Parse the output to get the hash
            const lines = result.trim().split('\n');
            const lastLine = lines[lines.length - 1];
            const match = lastLine.match(/^added (\w+)/);
            
            if (match) {
                const hash = match[1];
                return {
                    success: true,
                    hash,
                    url: `${this.gatewayUrl}/ipfs/${hash}`,
                    size: await this.getObjectSize(hash)
                };
            }

            throw new Error('Failed to parse IPFS add output');
        } catch (error) {
            console.error('Error adding to IPFS:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Pin content to ensure it stays in the node
     */
    async pinAdd(hash) {
        try {
            execSync(`ipfs pin add ${hash}`, { 
                encoding: 'utf-8',
                timeout: this.timeout 
            });
            return { success: true };
        } catch (error) {
            console.error('Error pinning content:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Remove pin from content
     */
    async pinRemove(hash) {
        try {
            execSync(`ipfs pin rm ${hash}`, { 
                encoding: 'utf-8',
                timeout: this.timeout 
            });
            return { success: true };
        } catch (error) {
            console.error('Error removing pin:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * List all pinned content
     */
    async listPins() {
        try {
            const result = execSync('ipfs pin ls --type=recursive', { 
                encoding: 'utf-8',
                timeout: this.timeout 
            });

            const pins = result.trim().split('\n')
                .filter(line => line.trim())
                .map(line => {
                    const [hash, type] = line.split(' ');
                    return { hash, type };
                });

            return {
                success: true,
                pins
            };
        } catch (error) {
            console.error('Error listing pins:', error);
            return {
                success: false,
                error: error.message,
                pins: []
            };
        }
    }

    /**
     * Get object size
     */
    async getObjectSize(hash) {
        try {
            const result = execSync(`ipfs object stat ${hash}`, { 
                encoding: 'utf-8',
                timeout: 10000 
            });

            const sizeMatch = result.match(/CumulativeSize: (\d+)/);
            return sizeMatch ? parseInt(sizeMatch[1]) : 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Get repository statistics
     */
    async getRepoStats() {
        try {
            const result = execSync('ipfs repo stat', { 
                encoding: 'utf-8',
                timeout: 10000 
            });

            const stats = {};
            result.split('\n').forEach(line => {
                const [key, value] = line.split(': ');
                if (key && value) {
                    stats[key.trim()] = value.trim();
                }
            });

            return {
                success: true,
                stats
            };
        } catch (error) {
            console.error('Error getting repo stats:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get connected peers count
     */
    async getPeersCount() {
        try {
            const result = execSync('ipfs swarm peers', { 
                encoding: 'utf-8',
                timeout: 10000 
            });

            const peers = result.trim().split('\n').filter(line => line.trim());
            return peers.length;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Run garbage collection to free space
     */
    async garbageCollect() {
        try {
            const result = execSync('ipfs repo gc', { 
                encoding: 'utf-8',
                timeout: 60000 // 1 minute for GC
            });

            return {
                success: true,
                output: result.trim()
            };
        } catch (error) {
            console.error('Error running garbage collection:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Start IPFS daemon (if not running)
     */
    async startDaemon() {
        try {
            if (await this.isRunning()) {
                return { success: true, message: 'IPFS daemon already running' };
            }

            // Start daemon in background
            const daemon = spawn('ipfs', ['daemon'], {
                detached: true,
                stdio: 'ignore'
            });

            daemon.unref();

            // Wait a bit and check if it started
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const running = await this.isRunning();
            
            return {
                success: running,
                message: running ? 'IPFS daemon started' : 'Failed to start IPFS daemon'
            };
        } catch (error) {
            console.error('Error starting IPFS daemon:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Deploy Doris Protocol content to local IPFS
     */
    async deployDorisContent(contentPath) {
        try {
            // Ensure daemon is running
            if (!await this.isRunning()) {
                const startResult = await this.startDaemon();
                if (!startResult.success) {
                    throw new Error('IPFS daemon not running and failed to start');
                }
            }

            // Add content to IPFS
            const addResult = await this.addFile(contentPath);
            if (!addResult.success) {
                throw new Error(`Failed to add content: ${addResult.error}`);
            }

            // Pin the content
            const pinResult = await this.pinAdd(addResult.hash);
            if (!pinResult.success) {
                console.warn(`Warning: Failed to pin content: ${pinResult.error}`);
            }

            // Store deployment info
            await this.saveDeploymentInfo({
                hash: addResult.hash,
                url: addResult.url,
                timestamp: new Date().toISOString(),
                size: addResult.size,
                pinned: pinResult.success
            });

            return {
                success: true,
                hash: addResult.hash,
                url: addResult.url,
                gatewayUrl: `${this.gatewayUrl}/ipfs/${addResult.hash}`,
                size: addResult.size,
                pinned: pinResult.success
            };
        } catch (error) {
            console.error('Error deploying to local IPFS:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Save deployment information
     */
    async saveDeploymentInfo(info) {
        try {
            const deploymentFile = path.join(process.cwd(), '.ipfs-deployments.json');
            let deployments = [];

            try {
                const existing = await fs.readFile(deploymentFile, 'utf-8');
                deployments = JSON.parse(existing);
            } catch (error) {
                // File doesn't exist, start with empty array
            }

            deployments.unshift(info); // Add to beginning
            deployments = deployments.slice(0, 50); // Keep last 50 deployments

            await fs.writeFile(deploymentFile, JSON.stringify(deployments, null, 2));
        } catch (error) {
            console.error('Error saving deployment info:', error);
        }
    }

    /**
     * Get deployment history
     */
    async getDeploymentHistory() {
        try {
            const deploymentFile = path.join(process.cwd(), '.ipfs-deployments.json');
            const data = await fs.readFile(deploymentFile, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            return [];
        }
    }

    /**
     * Health check and diagnostics
     */
    async getStatus() {
        try {
            const running = await this.isRunning();
            
            if (!running) {
                return {
                    service: 'Local IPFS Node',
                    running: false,
                    apiUrl: this.apiUrl,
                    gatewayUrl: this.gatewayUrl,
                    message: 'IPFS daemon not running'
                };
            }

            const [nodeInfo, repoStats, peersCount, pins] = await Promise.all([
                this.getNodeInfo(),
                this.getRepoStats(),
                this.getPeersCount(),
                this.listPins()
            ]);

            return {
                service: 'Local IPFS Node',
                running: true,
                apiUrl: this.apiUrl,
                gatewayUrl: this.gatewayUrl,
                version: nodeInfo?.version,
                peerId: nodeInfo?.peerId,
                peers: peersCount,
                pinnedObjects: pins.pins?.length || 0,
                repoSize: repoStats.stats?.RepoSize,
                capabilities: [
                    'Content Publishing',
                    'Content Pinning',
                    'Local Gateway',
                    'Peer-to-Peer Distribution'
                ]
            };
        } catch (error) {
            return {
                service: 'Local IPFS Node',
                running: false,
                error: error.message
            };
        }
    }
}

/**
 * Factory function to create Local IPFS service instance
 */
export function createLocalIPFSService(config = {}) {
    return new LocalIPFSService(config);
}

/**
 * Check if local IPFS is enabled and available
 */
export async function isLocalIPFSAvailable() {
    if (!process.env.LOCAL_IPFS_ENABLED || process.env.LOCAL_IPFS_ENABLED !== 'true') {
        return false;
    }
    
    const service = createLocalIPFSService();
    return await service.isRunning();
}

/**
 * Utility functions for IPFS operations
 */
export const ipfsUtils = {
    /**
     * Validate IPFS hash format
     */
    isValidHash(hash) {
        return /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(hash);
    },

    /**
     * Format file size for display
     */
    formatSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Generate IPFS URLs for different gateways
     */
    generateUrls(hash, customGateway = null) {
        const urls = {
            local: `http://localhost:8080/ipfs/${hash}`,
            ipfs: `https://ipfs.io/ipfs/${hash}`,
            cloudflare: `https://cloudflare-ipfs.com/ipfs/${hash}`,
            pinata: `https://gateway.pinata.cloud/ipfs/${hash}`
        };

        if (customGateway) {
            urls.custom = `${customGateway}/ipfs/${hash}`;
        }

        return urls;
    }
};

export default LocalIPFSService; 