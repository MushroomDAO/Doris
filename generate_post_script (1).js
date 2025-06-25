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

  async getDefaultTemplate(templateType) {
    const templates = {
      'daily-post': `---
title: {{title}}
author: {{author}}
date: {{date}}
tags: {{tags}}
summary: ""
enhance: {{enhance}}
---

# {{title}}

## 今日要点

### 📅 日程安排
- [ ] 任务1
- [ ] 任务2
- [ ] 任务3

### 💭 今日思考


### 📷 今日图片
<!-- 在这里添加图片 -->
![描述](图片链接)

### 🎥 相关视频
<!-- 在这里添加视频链接 -->
<div class="video-container">
  <iframe src="视频链接" frameborder="0" allowfullscreen></iframe>
</div>

### 📝 详细内容


### 🎯 明日计划
- [ ] 计划1
- [ ] 计划2

---
*发布时间: {{date}}*`,

      'weekly-summary': `---
title: {{title}}
author: {{author}}
date: {{date}}
tags: {{tags}}
summary: ""
enhance: {{enhance}}
---

# {{title}}

## 本周概览

### 📊 数据统计
- 完成任务: X 个
- 学习时间: X 小时
- 阅读文章: X 篇

### 🎯 本周目标达成情况
- [ ] 目标1 - 状态
- [ ] 目标2 - 状态
- [ ] 目标3 - 状态

### 💡 本周收获


### 📚 学习内容


### 🤔 反思与改进


### 📋 下周计划


---
*周报时间: {{date}}*`,

      'tech-article': `---
title: {{title}}
author: {{author}}
date: {{date}}
tags: {{tags}}
summary: ""
enhance: {{enhance}}
category: 技术
---

# {{title}}

## 概述


## 背景


## 技术方案

### 环境要求


### 实现步骤

1. 步骤一
2. 步骤二
3. 步骤三

### 代码示例

\`\`\`javascript
// 示例代码
console.log("Hello World");
\`\`\`

## 遇到的问题


## 解决方案


## 总结


## 参考资料
- [链接1](URL)
- [链接2](URL)

---
*技术文章 - {{date}}*`,

      'thoughts': `---
title: {{title}}
author: {{author}}
date: {{date}}
tags: {{tags}}
summary: ""
enhance: {{enhance}}
category: 随笔
---

# {{title}}

## 引言


## 正文


## 感悟


---
*随笔 - {{date}}*`,

      'book-notes': `---
title: {{title}}
author: {{author}}
date: {{date}}
tags: {{tags}}
summary: ""
enhance: {{enhance}}
category: 读书笔记
book_title: ""
book_author: ""
rating: ""
---

# {{title}}

## 书籍信息
- **书名**: 
- **作者**: 
- **评分**: ⭐⭐⭐⭐⭐

## 主要内容


## 重点摘录

> 引用内容

## 个人思考


## 行动计划


---
*读书笔记 - {{date}}*`
    };

    return templates[templateType] || templates['daily-post'];
  }

  slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // 移除特殊字符
      .replace(/[\s_-]+/g, '-') // 替换空格和下划线为连字符
      .replace(/^-+|-+$/g, ''); // 移除开头和结尾的连字符
  }

  async updateSidebar() {
    const sidebarPath = path.join(__dirname, '../docs/_sidebar.md');
    
    // 获取所有文章
    const posts = await this.getAllPosts();
    
    // 按日期分组
    const groupedPosts = this.groupPostsByDate(posts);
    
    // 生成侧边栏内容
    let sidebarContent = `# 博客导航

* [🏠 首页](/)
* [📝 最新文章](#最新文章)
* [📅 归档](/archives/)

## 最新文章

`;

    // 添加最近10篇文章
    const recentPosts = posts.slice(0, 10);
    for (const post of recentPosts) {
      sidebarContent += `* [${post.title}](${post.path})\n`;
    }

    sidebarContent += '\n## 按年份分类\n\n';

    // 按年份组织
    const years = Object.keys(groupedPosts).sort().reverse();
    for (const year of years) {
      sidebarContent += `* ${year}年\n`;
      const months = Object.keys(groupedPosts[year]).sort().reverse();
      for (const month of months.slice(0, 3)) { // 只显示最近3个月
        const monthPosts = groupedPosts[year][month].slice(0, 5); // 每月最多5篇
        sidebarContent += `  * ${month}月\n`;
        for (const post of monthPosts) {
          sidebarContent += `    * [${post.title}](${post.path})\n`;
        }
      }
    }

    await fs.writeFile(sidebarPath, sidebarContent, 'utf8');
  }

  async getAllPosts() {
    const posts = [];
    const postsPattern = path.join(this.postsDir, '**/*.md');
    const glob = require('glob');
    const files = glob.sync(postsPattern);

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const fm = require('front-matter');
        const parsed = fm(content);
        
        // 计算相对路径
        const relativePath = path.relative(path.join(__dirname, '../docs'), file)
          .replace(/\\/g, '/') // Windows 路径处理
          .replace('.md', '');

        posts.push({
          title: parsed.attributes.title || path.basename(file, '.md'),
          date: parsed.attributes.date || fs.statSync(file).mtime,
          path: '/' + relativePath,
          file: file
        });
      } catch (error) {
        console.warn(`处理文件 ${file} 时出错:`, error.message);
      }
    }

    // 按日期排序
    return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  groupPostsByDate(posts) {
    const grouped = {};
    
    for (const post of posts) {
      const date = moment(post.date);
      const year = date.format('YYYY');
      const month = date.format('MM');
      
      if (!grouped[year]) grouped[year] = {};
      if (!grouped[year][month]) grouped[year][month] = [];
      
      grouped[year][month].push(post);
    }
    
    return grouped;
  }
}

// 主执行函数
async function main() {
  try {
    const generator = new PostGenerator();
    await generator.generatePost();
  } catch (error) {
    console.error(chalk.red('生成文章时出现错误:'), error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = PostGenerator;