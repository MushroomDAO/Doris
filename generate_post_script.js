const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');
const inquirer = require('inquirer');
const chalk = require('chalk');

class PostGenerator {
  constructor() {
    this.templatesDir = path.join(__dirname, '../templates');
    this.postsDir = path.join(__dirname, '../docs/posts');
  }

  async generatePost() {
    console.log(chalk.blue('📝 博客文章生成器'));
    
    // 获取用户输入
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'template',
        message: '选择文章模板:',
        choices: [
          { name: '📅 每日博客', value: 'daily-post' },
          { name: '📅 每周总结', value: 'weekly-summary' },
          { name: '📝 技术文章', value: 'tech-article' },
          { name: '💭 随笔', value: 'thoughts' },
          { name: '📚 读书笔记', value: 'book-notes' }
        ]
      },
      {
        type: 'input',
        name: 'title',
        message: '文章标题:',
        validate: input => input.trim() !== '' || '标题不能为空'
      },
      {
        type: 'input',
        name: 'author',
        message: '作者:',
        default: 'Blog Author'
      },
      {
        type: 'input',
        name: 'tags',
        message: '标签 (用逗号分隔):',
        default: '日常'
      },
      {
        type: 'confirm',
        name: 'aiEnhance',
        message: '是否启用 AI 内容增强?',
        default: false
      }
    ]);

    // 生成文件路径
    const now = moment();
    const year = now.format('YYYY');
    const month = now.format('MM');
    const day = now.format('DD');
    const dateStr = now.format('YYYY-MM-DD');
    
    const postDir = path.join(this.postsDir, year, month);
    await fs.ensureDir(postDir);
    
    const fileName = `${dateStr}-${this.slugify(answers.title)}.md`;
    const filePath = path.join(postDir, fileName);
    
    // 检查文件是否已存在
    if (await fs.pathExists(filePath)) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: '文件已存在，是否覆盖?',
          default: false
        }
      ]);
      
      if (!overwrite) {
        console.log(chalk.yellow('操作已取消'));
        return;
      }
    }

    // 生成文章内容
    const content = await this.generateContent(answers, now);
    
    // 写入文件
    await fs.writeFile(filePath, content, 'utf8');
    
    console.log(chalk.green(`✅ 文章已生成: ${filePath}`));
    
    // 更新侧边栏
    await this.updateSidebar();
    
    console.log(chalk.green('✅ 侧边栏已更新'));
    
    if (answers.aiEnhance) {
      console.log(chalk.blue('💡 提示: 使用 npm run ai-enhance 来增强文章内容'));
    }
  }

  async generateContent(answers, date) {
    const templatePath = path.join(this.templatesDir, `${answers.template}.md`);
    
    let template = '';
    if (await fs.pathExists(templatePath)) {
      template = await fs.readFile(templatePath, 'utf8');
    } else {
      template = await this.getDefaultTemplate(answers.template);
    }

    // 替换模板变量
    const replacements = {
      '{{title}}': answers.title,
      '{{author}}': answers.author,
      '{{date}}': date.format('YYYY-MM-DD HH:mm:ss'),
      '{{tags}}': answers.tags,
      '{{year}}': date.format('YYYY'),
      '{{month}}': date.format('MM'),
      '{{day}}': date.format('DD'),
      '{{enhance}}': answers.aiEnhance.toString()
    };

    let content = template;
    for (const [key, value] of Object.entries(replacements)) {
      content = content.replace(new RegExp(key, 'g'), value);
    }

    return content;
  }

  async getDefaultTemplate(templateType)