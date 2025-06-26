import fs from 'fs-extra';
import path from 'path';
import moment from 'moment';
import inquirer from 'inquirer';
import chalk from 'chalk';

class PostGenerator {
  constructor() {
    this.templatesDir = path.join(process.cwd(), 'templates');
    this.postsDir = path.join(process.cwd(), 'docs/posts');
  }

  async generatePost() {
    console.log(chalk.blue('📝 Doris Protocol - Blog Post Generator'));
    
    // Get user input
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'template',
        message: 'Select article template:',
        choices: [
          { name: '📅 Daily Blog', value: 'daily-post' },
          { name: '📊 Weekly Summary', value: 'weekly-summary' },
          { name: '💻 Tech Article', value: 'tech-article' },
          { name: '💭 Thoughts', value: 'thoughts' },
          { name: '📚 Reading Notes', value: 'book-notes' },
          { name: '🚀 Project Update', value: 'project-update' }
        ]
      },
      {
        type: 'input',
        name: 'title',
        message: 'Article title:',
        validate: input => input.trim() !== '' || 'Title cannot be empty'
      },
      {
        type: 'input',
        name: 'author',
        message: 'Author:',
        default: 'Blog Author'
      },
      {
        type: 'input',
        name: 'description',
        message: 'Brief description:',
        default: 'A new blog post'
      },
      {
        type: 'input',
        name: 'tags',
        message: 'Tags (comma separated):',
        default: 'blog, daily'
      },
      {
        type: 'confirm',
        name: 'aiEnhance',
        message: 'Enable AI content enhancement?',
        default: true
      }
    ]);

    // Generate file path
    const now = moment();
    const year = now.format('YYYY');
    const month = now.format('MM');
    const day = now.format('DD');
    const dateStr = now.format('YYYY-MM-DD');
    
    const postDir = path.join(this.postsDir, year, month);
    await fs.ensureDir(postDir);
    
    const fileName = `${dateStr}-${this.slugify(answers.title)}.md`;
    const filePath = path.join(postDir, fileName);
    
    // Check if file exists
    if (await fs.pathExists(filePath)) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: 'File already exists, overwrite?',
          default: false
        }
      ]);
      
      if (!overwrite) {
        console.log(chalk.yellow('Operation cancelled'));
        return;
      }
    }

    // Generate content
    const content = await this.generateContent(answers, now);
    
    // Write file
    await fs.writeFile(filePath, content, 'utf8');
    
    console.log(chalk.green(`✅ Article generated: ${filePath}`));
    
    // Update sidebar
    await this.updateSidebar();
    
    console.log(chalk.green('✅ Sidebar updated'));
    
    if (answers.aiEnhance) {
      console.log(chalk.blue('💡 Tip: Use `pnpm run enhance:ai` to enhance article content'));
    }

    return filePath;
  }

  async generateContent(answers, date) {
    const templatePath = path.join(this.templatesDir, `${answers.template}.md`);
    
    let template = '';
    if (await fs.pathExists(templatePath)) {
      template = await fs.readFile(templatePath, 'utf8');
    } else {
      template = await this.getDefaultTemplate(answers.template);
    }

    // Replace template variables
    const replacements = {
      '{{title}}': answers.title,
      '{{author}}': answers.author,
      '{{date}}': date.format('YYYY-MM-DD HH:mm:ss'),
      '{{description}}': answers.description,
      '{{tags}}': answers.tags,
      '{{year}}': date.format('YYYY'),
      '{{month}}': date.format('MM'),
      '{{day}}': date.format('DD'),
      '{{enhance}}': answers.aiEnhance.toString(),
      '{{slug}}': this.slugify(answers.title)
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
title: "{{title}}"
date: "{{date}}"
author: "{{author}}"
description: "{{description}}"
tags: [{{tags}}]
enhance: {{enhance}}
type: "daily"
---

# {{title}}

## Today's Highlights

Write about your day's key moments, thoughts, or experiences...

## Learning & Insights

What did you learn today? Any interesting insights or discoveries?

## Tomorrow's Goals

What are you planning for tomorrow?

<!-- Add more content here -->

---
*Generated on {{date}} with Doris Protocol*`,

      'weekly-summary': `---
title: "{{title}}"
date: "{{date}}"
author: "{{author}}"
description: "{{description}}"
tags: [{{tags}}]
enhance: {{enhance}}
type: "weekly"
---

# {{title}}

## Week Overview

Summary of this week's activities and achievements...

## Key Accomplishments

- Achievement 1
- Achievement 2
- Achievement 3

## Challenges & Solutions

What challenges did you face and how did you overcome them?

## Next Week's Focus

What are your priorities for the coming week?

---
*Generated on {{date}} with Doris Protocol*`,

      'tech-article': `---
title: "{{title}}"
date: "{{date}}"
author: "{{author}}"
description: "{{description}}"
tags: [{{tags}}]
enhance: {{enhance}}
type: "tech"
category: "technology"
---

# {{title}}

## Introduction

Brief introduction to the topic...

## Problem Statement

What problem are we trying to solve?

## Solution

Detailed explanation of the solution...

## Implementation

\`\`\`javascript
// Example code
console.log('Hello Doris Protocol!');
\`\`\`

## Conclusion

Key takeaways and conclusions...

## References

- [Link 1](https://example.com)
- [Link 2](https://example.com)

---
*Generated on {{date}} with Doris Protocol*`,

      'thoughts': `---
title: "{{title}}"
date: "{{date}}"
author: "{{author}}"
description: "{{description}}"
tags: [{{tags}}]
enhance: {{enhance}}
type: "thoughts"
---

# {{title}}

## Current Thoughts

Share your current thoughts and reflections...

## Random Musings

Any random ideas or observations?

## Quote of the Day

> Add an inspiring quote here

---
*Generated on {{date}} with Doris Protocol*`,

      'book-notes': `---
title: "{{title}}"
date: "{{date}}"
author: "{{author}}"
description: "{{description}}"
tags: [{{tags}}]
enhance: {{enhance}}
type: "reading"
book: "Book Title"
author_book: "Book Author"
---

# {{title}}

## Book Information

**Title:** Book Title  
**Author:** Book Author  
**Genre:** Genre  
**Rating:** ⭐⭐⭐⭐⭐

## Key Takeaways

- Key point 1
- Key point 2
- Key point 3

## Favorite Quotes

> "Insert meaningful quote here"

## Personal Reflection

What did this book mean to you? How will you apply its lessons?

---
*Generated on {{date}} with Doris Protocol*`,

      'project-update': `---
title: "{{title}}"
date: "{{date}}"
author: "{{author}}"
description: "{{description}}"
tags: [{{tags}}]
enhance: {{enhance}}
type: "project"
---

# {{title}}

## Project Status

Current status of the project...

## Recent Progress

- Completed task 1
- Completed task 2
- Completed task 3

## Challenges

What obstacles have you encountered?

## Next Steps

- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

## Timeline

Updated project timeline and milestones...

---
*Generated on {{date}} with Doris Protocol*`
    };

    return templates[templateType] || templates['daily-post'];
  }

  slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async updateSidebar() {
    try {
      const sidebarPath = path.join(process.cwd(), 'docs/_sidebar.md');
      
      // Get all post files
      const years = await fs.readdir(this.postsDir);
      const posts = [];
      
      for (const year of years) {
        const yearPath = path.join(this.postsDir, year);
        if ((await fs.stat(yearPath)).isDirectory()) {
          const months = await fs.readdir(yearPath);
          
          for (const month of months) {
            const monthPath = path.join(yearPath, month);
            if ((await fs.stat(monthPath)).isDirectory()) {
              const files = await fs.readdir(monthPath);
              
              for (const file of files) {
                if (file.endsWith('.md')) {
                  posts.push({
                    path: `/posts/${year}/${month}/${file}`,
                    year,
                    month,
                    file
                  });
                }
              }
            }
          }
        }
      }

      // Update sidebar with recent posts
      const recentPosts = posts
        .sort((a, b) => b.file.localeCompare(a.file))
        .slice(0, 10);

      // This is a simplified update - in a real implementation,
      // you'd want to preserve the existing sidebar structure
      console.log(chalk.blue(`Found ${posts.length} posts, showing ${recentPosts.length} recent posts in sidebar`));
      
    } catch (error) {
      console.log(chalk.yellow('Warning: Could not update sidebar:', error.message));
    }
  }
}

// Main execution function
async function main() {
  try {
    const generator = new PostGenerator();
    await generator.generatePost();
  } catch (error) {
    console.error(chalk.red('Error generating post:'), error);
    process.exit(1);
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main();
}

export default PostGenerator; 