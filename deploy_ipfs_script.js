const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const { create } = require('ipfs-http-client');
const pinataSDK = require('@pinata/sdk');
const axios = require('axios');

class IPFSDeployer {
  constructor() {
    this.config = this.loadConfig();
    this.setupClients();
  }

  loadConfig() {
    const configPath = path.join(__dirname, '../config/ipfs.config.js');
    if (fs.existsSync(configPath)) {
      return require(configPath);
    }
    
    return {
      // IPFS 节点配置
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
      
      // Pinata 配置
      pinata: {
        enabled: true,
        apiKey: process.env.PINATA_API_KEY,
        secretApiKey: process.env.PINATA_SECRET_API_KEY
      },
      
      // Web3.Storage 配置
      web3Storage: {
        enabled: true,
        token: process.env.WEB3_STORAGE_TOKEN
      },
      
      // 部署选项
      deploy: {
        buildDir: './docs',
        pinName: 'AI-Blog',
        updateDNSLink: false,
        dnsLinkDomain: '',
        excludeFiles: ['.DS_Store', 'Thumbs.db', '*.tmp']
      }
    };
  }

  setupClients() {
    // IPFS 客户端
    if (this.config.ipfsNode.host) {
      this.ipfs = create(this.config.ipfsNode);
    }
    
    // Pinata 客户端
    if (this.config.pinata.enabled && this.config.pinata.apiKey) {
      this.pinata = pinataSDK(this.config.pinata.apiKey, this.config.pinata.secretApiKey);
    }
  }

  async deployToIPFS() {
    console.log(chalk.blue('🌐 开始部署到 IPFS...'));
    
    const buildDir = path.resolve(this.config.deploy.buildDir);
    
    if (!await fs.pathExists(buildDir)) {
      throw new Error(`构建目录不存在: ${buildDir}`);
    }

    let hash;
    
    // 尝试多种部署方式
    if (this.config.pinata.enabled && this.pinata) {
      hash = await this.deployToPinata(buildDir);
    } else if (this.config.web3Storage.enabled && this.config.web3Storage.token) {
      hash = await this.deployToWeb3Storage(buildDir);
    } else if (this.ipfs) {
      hash = await this.deployToIPFSNode(buildDir);
    } else {
      throw new Error('没有可用的 IPFS 部署方式');
    }

    // 保存哈希
    await this.saveHash(hash);
    
    // 更新 DNS Link (如果配置)
    if (this.config.deploy.updateDNSLink && this.config.deploy.dnsLinkDomain) {
      await this.updateDNSLink(hash);
    }

    console.log(chalk.green(`✅ 部署完成!`));
    console.log(chalk.blue(`📡 IPFS 哈希: ${hash}`));
    console.log(chalk.blue(`🔗 访问链接: https://ipfs.io/ipfs/${hash}`));
    console.log(chalk.blue(`🔗 Gateway 链接: https://gateway.pinata.cloud/ipfs/${hash}`));
    
    return hash;
  }

  async deployToPinata(buildDir) {
    const spinner = ora('正在上传到 Pinata...').start();
    
    try {
      // 测试 Pinata 连接
      await this.pinata.testAuthentication();
      
      const options = {
        pinataMetadata: {
          name: this.config.deploy.pinName,
          keyvalues: {
            'deployed-at': new Date().toISOString(),
            'version': require('../package.json').version
          }
        },
        pinataOptions: {
          cidVersion: 0
        }
      };

      const result = await this.pinata.pinFromFS(buildDir, options);
      
      spinner.succeed('Pinata 部署成功');
      return result.IpfsHash;
    } catch (error) {
      spinner.fail('Pinata 部署失败');
      throw error;
    }
  }

  async deployToWeb3Storage(buildDir) {
    const spinner = ora('正在上传到 Web3.Storage...').start();
    
    try {
      const { Web3Storage, getFilesFromPath } = await import('web3.storage');
      const client = new Web3Storage({ token: this.config.web3Storage.token });
      
      const files = await getFilesFromPath(buildDir);
      const cid = await client.put(files, { 
        name: this.config.deploy.pinName,
        maxRetries: 3
      });
      
      spinner.succeed('Web3.Storage 部署成功');
      return cid;
    } catch (error) {
      spinner.fail('Web3.Storage 部署失败');
      throw error;
    }
  }

  async deployToIPFSNode(buildDir) {
    const spinner = ora('正在上传到 IPFS 节点...').start();
    
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
      
      spinner.succeed('IPFS 节点部署成功');
      return hash;
    } catch (error) {
      spinner.fail('IPFS 节点部署失败');
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
        // 检查是否需要排除
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
    // 保存到文件
    const hashFile = path.join(__dirname, '../ipfs-hash.txt');
    await fs.writeFile(hashFile, hash, 'utf8');
    
    // 保存到 package.json
    const packagePath = path.join(__dirname, '../package.json');
    const packageData = await fs.readJson(packagePath);
    packageData.ipfsHash = hash;
    packageData.lastDeployed = new Date().toISOString();
    await fs.writeJson(packagePath, packageData, { spaces: 2 });
    
    console.log(chalk.green('✅ IPFS 哈希已保存'));
  }

  async updateDNSLink(hash) {
    const spinner = ora('正在更新 DNS Link...').start();
    
    try {
      // 这里需要根据具体的 DNS 服务商实现
      // 例如: Cloudflare DNS API
      if (process.env.CLOUDFLARE_API_TOKEN) {
        await this.updateCloudflareDNS(hash);
      }
      
      spinner.succeed('DNS Link 更新成功');
    } catch (error) {
      spinner.fail('DNS Link 更新失败');
      console.warn(chalk.yellow('DNS Link 更新失败，但不影响 IPFS 部署'));
    }
  }

  async updateCloudflareDNS(hash) {
    // Cloudflare DNS 更新示例
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;
    const recordId = process.env.CLOUDFLARE_RECORD_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    
    if (!zoneId || !recordId || !apiToken) {
      throw new Error('Cloudflare 配置不完整');
    }

    const dnsLinkValue = `dnslink=/ipfs/${hash}`;
    
    await axios.put(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${recordId}`,
      {
        type: 'TXT',
        name: '_dnslink.' + this.config.deploy.dnsLinkDomain,
        content: dnsLinkValue
      },
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
  }

  async checkStatus() {
    console.log(chalk.blue('📊 IPFS 部署状态检查'));
    
    const hashFile = path.join(__dirname, '../ipfs-hash.txt');
    if (!await fs.pathExists(hashFile)) {
      console.log(chalk.red('❌ 未找到部署记录'));
      return;
    }
    
    const hash = await fs.readFile(hashFile, 'utf8');
    console.log(chalk.green(`📡 当前部署哈希: ${hash}`));
    
    // 检查可访问性
    const gateways = [
      'https://ipfs.io/ipfs/',
      'https://gateway.pinata.cloud/ipfs/',
      'https://cloudflare-ipfs.com/ipfs/'
    ];
    
    for (const gateway of gateways) {
      try {
        const response = await axios.head(`${gateway}${hash}`, { timeout: 5000 });
        console.log(chalk.green(`✅ ${gateway} - 可访问`));
      } catch (error) {
        console.log(chalk.red(`❌ ${gateway} - 无法访问`));
      }
    }
  }
}

// 主执行函数
async function main() {
  const command = process.argv[2] || 'deploy';
  
  try {
    const deployer = new IPFSDeployer();
    
    if (command === 'deploy') {
      await deployer.deployToIPFS();
    } else if (command === 'status') {
      await deployer.checkStatus();
    } else {
      console.log(chalk.red('未知命令。使用: deploy 或 status'));
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('IPFS 部署错误:'), error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = IPFSDeployer;