import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { create } from 'ipfs-http-client';
import pinataSDK from '@pinata/sdk';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class IPFSDeployer {
  constructor() {
    this.config = this.loadConfig();
    this.setupClients();
  }

  loadConfig() {
    const configPath = path.join(process.cwd(), 'config/ipfs.config.js');
    if (fs.existsSync(configPath)) {
      return require(configPath);
    }
    
    return {
      // IPFS node configuration
      ipfsNode: {
        host: 'ipfs.infura.io',
        port: 5001,
        protocol: 'https',
        headers: {
          authorization: process.env.INFURA_PROJECT_ID ? 
            `Basic ${Buffer.from(`${process.env.INFURA_PROJECT_ID}:${process.env.INFURA_PROJECT_SECRET}`).toString('base64')}` : 
            undefined
        }
      },
      
      // Pinata configuration
      pinata: {
        enabled: true,
        apiKey: process.env.PINATA_API_KEY,
        secretApiKey: process.env.PINATA_SECRET_API_KEY
      },
      
      // Web3.Storage configuration
      web3Storage: {
        enabled: true,
        token: process.env.WEB3_STORAGE_TOKEN
      },
      
      // Deployment options
      deploy: {
        buildDir: './docs',
        pinName: 'Doris-Protocol-Blog',
        updateDNSLink: false,
        dnsLinkDomain: '',
        excludeFiles: ['.DS_Store', 'Thumbs.db', '*.tmp', 'node_modules', '.git']
      }
    };
  }

  setupClients() {
    // IPFS client
    if (this.config.ipfsNode.host) {
      this.ipfs = create(this.config.ipfsNode);
    }
    
    // Pinata client
    if (this.config.pinata.enabled && this.config.pinata.apiKey) {
      this.pinata = pinataSDK(this.config.pinata.apiKey, this.config.pinata.secretApiKey);
    }
  }

  async deployToIPFS() {
    console.log(chalk.blue('🌐 Starting IPFS deployment...'));
    
    const buildDir = path.resolve(this.config.deploy.buildDir);
    
    if (!await fs.pathExists(buildDir)) {
      throw new Error(`Build directory does not exist: ${buildDir}`);
    }

    let hash;
    
    // Try multiple deployment methods
    if (this.config.pinata.enabled && this.pinata) {
      hash = await this.deployToPinata(buildDir);
    } else if (this.config.web3Storage.enabled && this.config.web3Storage.token) {
      hash = await this.deployToWeb3Storage(buildDir);
    } else if (this.ipfs) {
      hash = await this.deployToIPFSNode(buildDir);
    } else {
      throw new Error('No available IPFS deployment method');
    }

    // Save hash
    await this.saveHash(hash);
    
    // Update DNS Link (if configured)
    if (this.config.deploy.updateDNSLink && this.config.deploy.dnsLinkDomain) {
      await this.updateDNSLink(hash);
    }

    console.log(chalk.green(`✅ Deployment completed!`));
    console.log(chalk.blue(`📡 IPFS Hash: ${hash}`));
    console.log(chalk.blue(`🔗 IPFS Gateway: https://ipfs.io/ipfs/${hash}`));
    console.log(chalk.blue(`🔗 Pinata Gateway: https://gateway.pinata.cloud/ipfs/${hash}`));
    console.log(chalk.blue(`🔗 Cloudflare Gateway: https://cloudflare-ipfs.com/ipfs/${hash}`));
    
    return hash;
  }

  async deployToPinata(buildDir) {
    const spinner = ora('Uploading to Pinata...').start();
    
    try {
      // Test Pinata connection
      await this.pinata.testAuthentication();
      
      // Get package.json for metadata
      const packagePath = path.join(process.cwd(), 'package.json');
      const packageData = await fs.readJson(packagePath).catch(() => ({}));
      
      const options = {
        pinataMetadata: {
          name: this.config.deploy.pinName,
          keyvalues: {
            'deployed-at': new Date().toISOString(),
            'version': packageData.version || '0.1.0',
            'project': 'doris-protocol',
            'type': 'blog-site'
          }
        },
        pinataOptions: {
          cidVersion: 0
        }
      };

      const result = await this.pinata.pinFromFS(buildDir, options);
      
      spinner.succeed('Pinata deployment successful');
      return result.IpfsHash;
    } catch (error) {
      spinner.fail('Pinata deployment failed');
      throw error;
    }
  }

  async deployToWeb3Storage(buildDir) {
    const spinner = ora('Uploading to Web3.Storage...').start();
    
    try {
      const { Web3Storage, getFilesFromPath } = await import('web3.storage');
      const client = new Web3Storage({ token: this.config.web3Storage.token });
      
      const files = await getFilesFromPath(buildDir);
      const cid = await client.put(files, { 
        name: this.config.deploy.pinName,
        maxRetries: 3
      });
      
      spinner.succeed('Web3.Storage deployment successful');
      return cid;
    } catch (error) {
      spinner.fail('Web3.Storage deployment failed');
      throw error;
    }
  }

  async deployToIPFSNode(buildDir) {
    const spinner = ora('Uploading to IPFS node...').start();
    
    try {
      const files = await this.getAllFiles(buildDir);
      const fileObjects = [];
      
      for (const file of files) {
        const content = await fs.readFile(file);
        const relativePath = path.relative(buildDir, file).replace(/\\/g, '/');
        fileObjects.push({
          path: relativePath,
          content: content
        });
      }
      
      const result = await this.ipfs.addAll(fileObjects, {
        wrapWithDirectory: true,
        pin: true
      });
      
      let hash;
      for await (const file of result) {
        if (file.path === '') {
          hash = file.cid.toString();
          break;
        }
      }
      
      spinner.succeed('IPFS node deployment successful');
      return hash;
    } catch (error) {
      spinner.fail('IPFS node deployment failed');
      throw error;
    }
  }

  async getAllFiles(dir, files = []) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await this.getAllFiles(fullPath, files);
      } else {
        // Check if file should be excluded
        const shouldExclude = this.config.deploy.excludeFiles.some(pattern => {
          if (pattern.includes('*')) {
            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            return regex.test(entry.name);
          }
          return entry.name === pattern;
        });
        
        if (!shouldExclude) {
          files.push(fullPath);
        }
      }
    }
    
    return files;
  }

  async saveHash(hash) {
    // Save to file
    const hashFile = path.join(process.cwd(), 'ipfs-hash.txt');
    await fs.writeFile(hashFile, hash, 'utf8');
    
    // Save to package.json
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageData = await fs.readJson(packagePath);
    packageData.ipfsHash = hash;
    packageData.lastDeployed = new Date().toISOString();
    await fs.writeJson(packagePath, packageData, { spaces: 2 });
    
    // Save deployment history
    const historyFile = path.join(process.cwd(), 'deployment-history.json');
    let history = [];
    
    if (await fs.pathExists(historyFile)) {
      history = await fs.readJson(historyFile);
    }
    
    history.unshift({
      hash,
      timestamp: new Date().toISOString(),
      version: packageData.version,
      type: 'ipfs'
    });
    
    // Keep only last 20 deployments
    history = history.slice(0, 20);
    await fs.writeJson(historyFile, history, { spaces: 2 });
    
    console.log(chalk.green('✅ IPFS hash saved'));
  }

  async updateDNSLink(hash) {
    const spinner = ora('Updating DNS Link...').start();
    
    try {
      // Cloudflare DNS API implementation
      if (process.env.CLOUDFLARE_API_TOKEN) {
        await this.updateCloudflareDNS(hash);
      }
      
      spinner.succeed('DNS Link updated successfully');
    } catch (error) {
      spinner.fail('DNS Link update failed');
      console.log(chalk.yellow(`Warning: ${error.message}`));
    }
  }

  async updateCloudflareDNS(hash) {
    const api = axios.create({
      baseURL: 'https://api.cloudflare.com/client/v4',
      headers: {
        'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const dnsRecord = {
      type: 'TXT',
      name: `_dnslink.${this.config.deploy.dnsLinkDomain}`,
      content: `dnslink=/ipfs/${hash}`,
      ttl: 300
    };

    // Update DNS record
    if (process.env.CLOUDFLARE_RECORD_ID) {
      await api.put(
        `/zones/${process.env.CLOUDFLARE_ZONE_ID}/dns_records/${process.env.CLOUDFLARE_RECORD_ID}`,
        dnsRecord
      );
    } else {
      await api.post(
        `/zones/${process.env.CLOUDFLARE_ZONE_ID}/dns_records`,
        dnsRecord
      );
    }
  }

  async checkStatus() {
    console.log(chalk.blue('📊 Checking deployment status...'));
    
    const hashFile = path.join(process.cwd(), 'ipfs-hash.txt');
    if (!await fs.pathExists(hashFile)) {
      console.log(chalk.yellow('No previous deployment found'));
      return;
    }

    const hash = await fs.readFile(hashFile, 'utf8');
    const historyFile = path.join(process.cwd(), 'deployment-history.json');
    
    if (await fs.pathExists(historyFile)) {
      const history = await fs.readJson(historyFile);
      console.log(chalk.green(`\n📡 Current deployment: ${hash}`));
      console.log(chalk.blue(`🕒 Last deployed: ${history[0]?.timestamp || 'Unknown'}`));
      console.log(chalk.blue(`📦 Version: ${history[0]?.version || 'Unknown'}`));
      
      console.log(chalk.blue('\n🔗 Access URLs:'));
      console.log(`  IPFS Gateway: https://ipfs.io/ipfs/${hash}`);
      console.log(`  Pinata Gateway: https://gateway.pinata.cloud/ipfs/${hash}`);
      console.log(`  Cloudflare Gateway: https://cloudflare-ipfs.com/ipfs/${hash}`);
      
      if (this.config.deploy.dnsLinkDomain) {
        console.log(`  DNS Link: https://${this.config.deploy.dnsLinkDomain}`);
      }
    }
  }
}

// Main execution function
async function main() {
  try {
    const args = process.argv.slice(2);
    const deployer = new IPFSDeployer();

    if (args.includes('--status')) {
      await deployer.checkStatus();
    } else {
      await deployer.deployToIPFS();
    }
  } catch (error) {
    console.error(chalk.red('IPFS deployment error:'), error);
    process.exit(1);
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main();
}

export default IPFSDeployer; 