const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const fm = require('front-matter');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const chalk = require('chalk');
const ora = require('ora');

class AIEnhancer {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    
    this.config = this.loadConfig();
  }

  loadConfig() {
    const configPath = path.join(__dirname, '../config/ai.config.js');
    if (fs.existsSync(configPath)) {
      return require(configPath);
    }
    
    return {
      aiProvider: 'openai', // 'openai' | 'anthropic' | 'local'
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
      prompts: {
        summary: `请为以下博客文章生成一个简洁的摘要（不超过100字）：\n\n{content}`,
        tags: `请为以下博客文章生成3-5个相关标签，用逗号分隔：\n\n{content}`,
        title: `请为以下博客文章生成一个吸引人的标题：\n\n{content}`,
        enhance: `请优化以下博客文章的内容，保持原意但让表达更加清晰流畅：\n\n{content}`
      }
    };
  }

  async enhanceContent(content, type = 'enhance') {
    const spinner = ora(`正在使用 AI 增强内容 (${type})...`).start();
    
    try {
      const prompt = this.config.prompts[type].replace('{content}', content);
      
      let result;
      if (this.config.aiProvider === 'openai') {
        result = await this.callOpenAI(prompt);
      } else if (this.config.aiProvider === 'anthropic') {
        result = await this.callAnthropic(prompt);
      } else {
        throw new Error('不支持的 AI 提供商');
      }
      
      spinner.succeed(`AI 内容增强完成 (${type})`);
      return result;
    } catch (error) {
      spinner.fail(`AI 内容增强失败: ${error.message}`);
      throw error;
    }
  }

  async callOpenAI(prompt) {
    const response = await this.openai.chat.completions.create({
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的博客内容编辑，擅长优化文章内容和生成元数据。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens
    });

    return response.choices[0].message.content.trim();
  }

  async callAnthropic(prompt) {
    const response = await this.anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: this.config.maxTokens,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    return response.content[0].text.trim();
  }

  async processMarkdownFile(filePath) {
    console.log(chalk.blue(`处理文件: ${filePath}`));
    
    const content = await fs.readFile(filePath, 'utf8');
    const parsed = fm(content);
    
    let needsUpdate = false;
    let updatedAttributes = { ...parsed.attributes };
    let updatedBody = parsed.body;

    // 生成摘要
    if (!parsed.attributes.summary && parsed.body.length > 100) {
      try {
        const summary = await this.enhanceContent(parsed.body, 'summary');
        updatedAttributes.summary = summary;
        needsUpdate = true;
        console.log(chalk.green('  ✓ 生成摘要'));
      } catch (error) {
        console.log(chalk.red('  ✗ 摘要生成失败'));
      }
    }

    // 生成标签
    if (!parsed.attributes.tags && parsed.body.length > 100) {
      try {
        const tags = await this.enhanceContent(parsed.body, 'tags');
        updatedAttributes.tags = tags;
        needsUpdate = true;
        console.log(chalk.green('  ✓ 生成标签'));
      } catch (error) {
        console.log(chalk.red('  ✗ 标签生成失败'));
      }
    }

    // 生成标题（如果没有 title 属性）
    if (!parsed.attributes.title && parsed.body.length > 100) {
      try {
        const title = await this.enhanceContent(parsed.body, 'title');
        updatedAttributes.title = title;
        needsUpdate = true;
        console.log(chalk.green('  ✓ 生成标题'));
      } catch (error) {
        console.log(chalk.red('  ✗ 标题生成失败'));
      }
    }

    // 增强内容（可选，通过标记触发）
    if (parsed.attributes.enhance === true) {
      try {
        const enhancedContent = await this.enhanceContent(parsed.body, 'enhance');
        updatedBody = enhancedContent;
        updatedAttributes.enhance = false; // 标记为已增强
        needsUpdate = true;
        console.log(chalk.green('  ✓ 内容增强完成'));
      } catch (error) {
        console.log(chalk.red('  ✗ 内容增强失败'));
      }
    }

    // 更新文件
    if (needsUpdate) {
      const frontMatter = Object.keys(updatedAttributes).length > 0 
        ? '---\n' + Object.entries(updatedAttributes)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n') + '\n---\n\n'
        : '';
      
      const newContent = frontMatter + updatedBody;
      await fs.writeFile(filePath, newContent, 'utf8');
      console.log(chalk.green('  ✓ 文件已更新'));
    } else {
      console.log(chalk.gray('  - 无需更新'));
    }
  }

  async processAllFiles() {
    console.log(chalk.blue('🤖 开始 AI 内容增强...'));
    
    // 查找所有需要处理的 markdown 文件
    const files = glob.sync('docs/posts/**/*.md');
    
    if (files.length === 0) {
      console.log(chalk.yellow('未找到需要处理的文件'));
      return;
    }

    console.log(chalk.blue(`找到 ${files.length} 个文件需要处理`));
    
    for (const file of files) {
      try {
        await this.processMarkdownFile(file);
        // 添加延迟以避免 API 限制
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.log(chalk.red(`处理文件 ${file} 时出错: ${error.message}`));
      }
    }
    
    console.log(chalk.green('✅ AI 内容增强完成'));
  }
}

// 主执行函数
async function main() {
  try {
    const enhancer = new AIEnhancer();
    await enhancer.processAllFiles();
  } catch (error) {
    console.error(chalk.red('AI 增强过程中出现错误:'), error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = AIEnhancer;