const fs = require('fs-extra');
const path = require('path');
const inquirer = require('inquirer');
const chalk = require('chalk');

class ProjectSetup {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
  }

  async setup() {
    console.log(chalk.blue('🚀 AI Blog 项目初始化'));
    console.log(chalk.gray('这将帮助你配置博客系统的基本设置\n'));

    // 收集用户信息
    const config = await this.collectUserInfo();
    
    // 创建目录结构
    await this.createDirectories();
    
    // 生成配置文件
    await this.generateConfigs(config);
    
    // 创建示例文件
    await this.createSampleFiles(config);
    
    // 更新 package.json
    await this.updatePackageJson(config);
    
    // 生成 README
    await this.generateReadme(config);
    
    console.log(chalk.green('\n✅ 项目初始化完成!'));
    console.log(chalk.blue('\n接下来的步骤:'));
    console.log('1. 设置环境变量 (复制 .env.example 到 .env)');
    console.log('2. 运行 npm install 安装依赖');
    console.log('3. 运行 npm run new-post 创建第一篇文章');
    console.log('4. 运行 npm run dev 启动开发服务器');
  }

  async collectUserInfo() {
    return await inquirer.prompt([
      {
        type: 'input',
        name: 'blogTitle',
        message: '博客标题:',
        default: 'My AI Blog'
      },
      {
        type: 'input',
        name: 'blogDescription',
        message: '博客描述:',
        default: 'AI-powered personal blog'
      },
      {
        type: 'input',
        name: 'authorName',
        message: '作者姓名:',
        default: 'Blog Author'
      },
      {
        type: 'input',
        name: 'authorEmail',
        message: '作者邮箱:',
        default: 'author@example.com'
      },
      {
        type: 'input',
        name: 'githubRepo',
        message: 'GitHub 仓库 (格式: username/repo):',
        validate: input => {
          if (!input.trim()) return '请输入 GitHub 仓库';
          if (!input.includes('/')) return '格式应为: username/repo';
          return true;
        }
      },
      {
        type: 'list',
        name: 'aiProvider',
        message: '选择 AI 服务提供商:',
        choices: [
          { name: 'OpenAI (GPT-4)', value: 'openai' },
          { name: 'Anthropic (Claude)', value: 'anthropic' },
          { name: '本地模型 (Ollama)', value: 'local' }
        ]
      },
      {
        type: 'list',
        name: 'ipfsProvider',
        message: '选择 IPFS 服务:',
        choices: [
          { name: 'Pinata (推荐)', value: 'pinata' },
          { name: 'Web3.Storage', value: 'web3storage' },
          { name: '自建节点', value: 'self-hosted' }
        ]
      },
      {
        type: 'confirm',
        name: 'enableAnalytics',
        message: '是否启用访问统计?',
        default: true
      }
    ]);
  }

  async createDirectories() {
    const dirs = [
      'docs',
      'docs/posts',
      'docs/archives',
      'docs/archives/monthly',
      'docs/assets',
      'docs/assets/images',
      'docs/assets/videos',
      'scripts',
      'templates',
      'config',
      '.github/workflows'
    ];

    for (const dir of dirs) {
      await fs.ensureDir(path.join(this.projectRoot, dir));
    }

    console.log(chalk.green('✅ 目录结构创建完成'));
  }

  async generateConfigs(config) {
    // AI 配置
    const aiConfig = `module.exports = {
  aiProvider: '${config.aiProvider}',
  model: ${config.aiProvider === 'openai' ? "'gpt-4'" : 
           config.aiProvider === 'anthropic' ? "'claude-3-sonnet-20240229'" : 
           "'llama2'"},
  temperature: 0.7,
  maxTokens: 2000,
  prompts: {
    summary: \`请为以下博客文章生成一个简洁的摘要（不超过100字）：

{content}\`,
    tags: \`请为以下博客文章生成3-5个相关标签，用逗号分隔：

{content}\`,
    title: \`请为以下博客文章生成一个吸引人的标题：

{content}\`,
    enhance: \`请优化以下博客文章的内容，保持原意但让表达更加清晰流畅：

{content}\`
  }
};`;

    // IPFS 配置
    const ipfsConfig = `module.exports = {
  ipfsNode: {
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
    headers: {
      authorization: process.env.INFURA_PROJECT_ID ? 
        \`Basic \${Buffer.from(\`\${process.env.INFURA_PROJECT_ID}:\${process.env.INFURA_PROJECT_SECRET}\`).toString('base64')}\` : 
        undefined
    }
  },
  
  pinata: {
    enabled: ${config.ipfsProvider === 'pinata'},
    apiKey: process.env.PINATA_API_KEY,
    secretApiKey: process.env.PINATA_SECRET_API_KEY
  },
  
  web3Storage: {
    enabled: ${config.ipfsProvider === 'web3storage'},
    token: process.env.WEB3_STORAGE_TOKEN
  },
  
  deploy: {
    buildDir: './docs',
    pinName: '${config.blogTitle}',
    updateDNSLink: false,
    dnsLinkDomain: '',
    excludeFiles: ['.DS_Store', 'Thumbs.db', '*.tmp']
  }
};`;

    // Docsify 配置
    const docsifyConfig = `module.exports = {
  name: '${config.blogTitle}',
  description: '${config.blogDescription}',
  repo: 'https://github.com/${config.githubRepo}',
  author: '${config.authorName}',
  email: '${config.authorEmail}',
  
  theme: {
    color: '#42b883',
    background: '#ffffff'
  },
  
  features: {
    search: true,
    copyCode: true,
    pagination: true,
    analytics: ${config.enableAnalytics}
  }
};`;

    await fs.writeFile(path.join(this.projectRoot, 'config/ai.config.js'), aiConfig);
    await fs.writeFile(path.join(this.projectRoot, 'config/ipfs.config.js'), ipfsConfig);
    await fs.writeFile(path.join(this.projectRoot, 'config/docsify.config.js'), docsifyConfig);

    // 环境变量模板
    const envExample = `# AI 服务配置
${config.aiProvider === 'openai' ? 'OPENAI_API_KEY=your_openai_api_key' : '# OPENAI_API_KEY=your_openai_api_key'}
${config.aiProvider === 'anthropic' ? 'ANTHROPIC_API_KEY=your_anthropic_api_key' : '# ANTHROPIC_API_KEY=your_anthropic_api_key'}

# IPFS 服务配置
${config.ipfsProvider === 'pinata' ? `PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret_key` : `# PINATA_API_KEY=your_pinata_api_key
# PINATA_SECRET_API_KEY=your_pinata_secret_key`}

${config.ipfsProvider === 'web3storage' ? 'WEB3_STORAGE_TOKEN=your_web3storage_token' : '# WEB3_STORAGE_TOKEN=your_web3storage_token'}

# Infura IPFS (可选)
# INFURA_PROJECT_ID=your_infura_project_id
# INFURA_PROJECT_SECRET=your_infura_project_secret

# Cloudflare DNS (可选，用于 DNS Link)
# CLOUDFLARE_API_TOKEN=your_cloudflare_token
# CLOUDFLARE_ZONE_ID=your_zone_id
# CLOUDFLARE_RECORD_ID=your_record_id

# GitHub (自动设置)
# GITHUB_TOKEN=will_be_set_automatically
`;

    await fs.writeFile(path.join(this.projectRoot, '.env.example'), envExample);

    console.log(chalk.green('✅ 配置文件生成完成'));
  }

  async createSampleFiles(config) {
    // 首页
    const homePage = `# ${config.blogTitle}

> ${config.blogDescription}

欢迎来到我的AI驱动博客！这里记录了我的日常思考、技术学习和生活感悟。

## 最新文章

* [