import fs from 'fs-extra';
import path from 'path';
import glob from 'glob';
import matter from 'gray-matter';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import chalk from 'chalk';
import ora from 'ora';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class AIEnhancer {
  constructor() {
    // OpenAI-compatible APIs (including DeepSeek via SiliconFlow)
    this.openai = null;
    if (process.env.OPENAI_API_KEY) {
      const openaiConfig = {
        apiKey: process.env.OPENAI_API_KEY
      };
      if (process.env.OPENAI_BASE_URL) {
        openaiConfig.baseURL = process.env.OPENAI_BASE_URL;
      }
      this.openai = new OpenAI(openaiConfig);
    }
    
    // DeepSeek via SiliconFlow
    this.deepseek = null;
    if (process.env.DEEPSEEK_API_KEY) {
      this.deepseek = new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.siliconflow.cn/v1'
      });
    }
    
    // Anthropic Claude
    this.anthropic = null;
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
    }
    
    // Google Gemini
    this.gemini = null;
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.Gemini_API_KEY;
    if (geminiApiKey) {
      this.gemini = new GoogleGenAI({ apiKey: geminiApiKey });
    }
    
    this.config = this.loadConfig();
  }

  loadConfig() {
    const configPath = path.join(process.cwd(), 'config/ai.config.js');
    if (fs.existsSync(configPath)) {
      return require(configPath);
    }
    
    return {
      aiProvider: 'openai',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
      prompts: {
        summary: `Please generate a concise summary (no more than 100 words) for the following blog post:

{content}`,
        tags: `Please generate 3-5 relevant tags for the following blog post, separated by commas:

{content}`,
        title: `Please generate an engaging title for the following blog post:

{content}`,
        enhance: `Please optimize the following blog post content, keeping the original meaning but making the expression clearer and more fluent:

{content}`
      }
    };
  }

  async enhanceContent(content, type = 'enhance', provider = null) {
    const selectedProvider = provider || this.config.aiProvider;
    const spinner = ora(`AI enhancing content (${type}) using ${selectedProvider}...`).start();
    
    try {
      const prompt = this.config.prompts[type].replace('{content}', content);
      
      let result;
      switch (selectedProvider) {
        case 'openai':
          if (!this.openai) throw new Error('OpenAI API key not configured');
          result = await this.callOpenAI(prompt);
          break;
        case 'deepseek':
          if (!this.deepseek) throw new Error('DeepSeek API key not configured');
          result = await this.callDeepSeek(prompt);
          break;
        case 'anthropic':
          if (!this.anthropic) throw new Error('Anthropic API key not configured');
          result = await this.callAnthropic(prompt);
          break;
        case 'gemini':
          if (!this.gemini) throw new Error('Gemini API key not configured');
          result = await this.callGemini(prompt);
          break;
        default:
          throw new Error(`Unsupported AI provider: ${selectedProvider}`);
      }
      
      spinner.succeed(`AI content enhancement completed (${type}) using ${selectedProvider}`);
      return result;
    } catch (error) {
      spinner.fail(`AI content enhancement failed: ${error.message}`);
      throw error;
    }
  }

  async callOpenAI(prompt) {
    const response = await this.openai.chat.completions.create({
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: 'You are a professional blog content editor who excels at optimizing article content and generating metadata. Always respond in the same language as the input content.'
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

  async callDeepSeek(prompt) {
    const response = await this.deepseek.chat.completions.create({
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are a professional blog content editor who excels at optimizing article content and generating metadata. Always respond in the same language as the input content.'
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
      model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
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

  async callGemini(prompt) {
    const response = await this.gemini.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-001',
      contents: prompt,
      config: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxTokens,
      }
    });

    return response.text.trim();
  }

  async processMarkdownFile(filePath) {
    console.log(chalk.blue(`Processing file: ${filePath}`));
    
    const content = await fs.readFile(filePath, 'utf8');
    const parsed = matter(content);
    
    let needsUpdate = false;
    let updatedData = { ...parsed.data };
    let updatedContent = parsed.content;

    // Generate summary
    if (!parsed.data.summary && parsed.content.length > 100) {
      try {
        const summary = await this.enhanceContent(parsed.content, 'summary');
        updatedData.summary = summary;
        needsUpdate = true;
        console.log(chalk.green('  ✓ Generated summary'));
      } catch (error) {
        console.log(chalk.red('  ✗ Summary generation failed'));
      }
    }

    // Generate tags
    if (!parsed.data.tags && parsed.content.length > 100) {
      try {
        const tags = await this.enhanceContent(parsed.content, 'tags');
        updatedData.tags = tags.split(',').map(tag => tag.trim());
        needsUpdate = true;
        console.log(chalk.green('  ✓ Generated tags'));
      } catch (error) {
        console.log(chalk.red('  ✗ Tag generation failed'));
      }
    }

    // Generate title (if no title in frontmatter)
    if (!parsed.data.title && parsed.content.length > 100) {
      try {
        const title = await this.enhanceContent(parsed.content, 'title');
        updatedData.title = title;
        needsUpdate = true;
        console.log(chalk.green('  ✓ Generated title'));
      } catch (error) {
        console.log(chalk.red('  ✗ Title generation failed'));
      }
    }

    // Enhance content (triggered by enhance flag)
    if (parsed.data.enhance === true) {
      try {
        const enhancedContent = await this.enhanceContent(parsed.content, 'enhance');
        updatedContent = enhancedContent;
        updatedData.enhance = false; // Mark as enhanced
        needsUpdate = true;
        console.log(chalk.green('  ✓ Content enhancement completed'));
      } catch (error) {
        console.log(chalk.red('  ✗ Content enhancement failed'));
      }
    }

    // Update file
    if (needsUpdate) {
      const newContent = matter.stringify(updatedContent, updatedData);
      await fs.writeFile(filePath, newContent, 'utf8');
      console.log(chalk.green('  ✓ File updated'));
    } else {
      console.log(chalk.gray('  - No update needed'));
    }
  }

  async processAllFiles() {
    console.log(chalk.blue('🤖 Starting AI content enhancement...'));
    
    // Find all markdown files to process
    const pattern = 'docs/posts/**/*.md';
    const files = glob.sync(pattern);
    
    if (files.length === 0) {
      console.log(chalk.yellow('No files found to process'));
      return;
    }

    console.log(chalk.blue(`Found ${files.length} files to process`));
    
    for (const file of files) {
      try {
        await this.processMarkdownFile(file);
        // Add delay to avoid API rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.log(chalk.red(`Error processing file ${file}: ${error.message}`));
      }
    }
    
    console.log(chalk.green('✅ AI content enhancement completed'));
  }

  async enhanceSpecificFile(filePath) {
    console.log(chalk.blue(`🤖 Enhancing specific file: ${filePath}`));
    
    if (!await fs.pathExists(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    await this.processMarkdownFile(filePath);
  }

  async generateContentFromPrompt(prompt, type = 'daily-post') {
    console.log(chalk.blue('🤖 Generating content from prompt...'));
    
    const systemPrompt = `You are a creative blog content generator. Generate a complete blog post based on the user's prompt. Include:
1. An engaging title
2. Well-structured content with headings
3. A conclusion
4. Relevant tags
5. A brief summary

Format the output as markdown with proper frontmatter.`;

    try {
      let result;
      if (this.config.aiProvider === 'openai') {
        const response = await this.openai.chat.completions.create({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens
        });
        result = response.choices[0].message.content.trim();
      } else if (this.config.aiProvider === 'anthropic') {
        const response = await this.anthropic.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: this.config.maxTokens,
          messages: [
            { role: 'user', content: `${systemPrompt}\n\nUser prompt: ${prompt}` }
          ]
        });
        result = response.content[0].text.trim();
      }

      console.log(chalk.green('✅ Content generated successfully'));
      return result;
    } catch (error) {
      console.error(chalk.red('❌ Content generation failed:'), error.message);
      throw error;
    }
  }
}

// Main execution function
async function main() {
  try {
    const args = process.argv.slice(2);
    const enhancer = new AIEnhancer();

    if (args.length === 0) {
      // Process all files
      await enhancer.processAllFiles();
    } else if (args[0] === '--file' && args[1]) {
      // Process specific file
      await enhancer.enhanceSpecificFile(args[1]);
    } else if (args[0] === '--generate' && args[1]) {
      // Generate content from prompt
      const content = await enhancer.generateContentFromPrompt(args.slice(1).join(' '));
      console.log('\n' + chalk.blue('Generated content:'));
      console.log(content);
    } else {
      console.log(chalk.yellow('Usage:'));
      console.log('  node scripts/ai-enhance.js                    # Process all files');
      console.log('  node scripts/ai-enhance.js --file <path>      # Process specific file');
      console.log('  node scripts/ai-enhance.js --generate <prompt> # Generate content from prompt');
    }
  } catch (error) {
    console.error(chalk.red('AI enhancement process error:'), error);
    process.exit(1);
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main();
}

export default AIEnhancer; 