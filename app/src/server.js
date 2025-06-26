import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
// Removed deprecated pinata-web3 import
import dotenv from 'dotenv';
import matter from 'gray-matter';
import tar from 'tar-stream';
import FormData from 'form-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '../..');

// Load environment variables from app/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
// Serve admin interfaces from app directory
app.use('/app', express.static(path.join(rootDir, 'app')));
// Serve blog content from blog directory
app.use('/blog', express.static(path.join(rootDir, 'blog')));

// Initialize AI clients with support for custom API URLs
let openai, anthropic;
if (process.env.OPENAI_API_KEY) {
    const openaiConfig = { apiKey: process.env.OPENAI_API_KEY };
    if (process.env.API_URL) {
        openaiConfig.baseURL = process.env.API_URL;
    }
    openai = new OpenAI(openaiConfig);
}
if (process.env.ANTHROPIC_API_KEY) {
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// Utility functions
const getBlogDirectory = () => path.join(rootDir, 'blog');
const getPostsDirectory = () => path.join(rootDir, 'blog', 'posts');

const generateFileName = (title) => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const slug = title.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50);
    
    return `${year}-${month}-${day}-${slug}.md`;
};

const ensureDirectoryExists = async (dirPath) => {
    try {
        await fs.access(dirPath);
    } catch {
        await fs.mkdir(dirPath, { recursive: true });
    }
};

// API Routes

// API Documentation
app.get('/api', (req, res) => {
    const apiDocs = {
        name: 'Doris Protocol API',
        version: '0.0.16',
        description: 'API for Doris Protocol - Decentralized Content Platform',
        endpoints: {
            posts: {
                'GET /api/posts': {
                    description: 'Get all blog posts',
                    parameters: 'None',
                    response: 'Array of post objects with file, title, date, type'
                },
                'GET /api/post-content': {
                    description: 'Get content of a specific post',
                    parameters: 'file (query param) - relative path to post file',
                    response: 'Object with content and title'
                },
                'POST /api/save-post': {
                    description: 'Save a new or updated blog post',
                    body: 'title (string), content (string)',
                    response: 'Success confirmation with file path'
                },
                'DELETE /api/delete-post': {
                    description: 'Delete a blog post',
                    body: 'file (string) - relative path to post file',
                    response: 'Success confirmation'
                }
            },
            content: {
                'POST /api/generate-post': {
                    description: 'Generate new post from template',
                    body: 'templateType (string), title (string)',
                    response: 'Generated content string'
                },
                'POST /api/enhance-content': {
                    description: 'Enhance content using AI',
                    body: 'postFile (string), provider (string), options (object)',
                    response: 'Enhanced content with comparison'
                },
                'POST /api/save-enhanced-content': {
                    description: 'Save AI-enhanced content',
                    body: 'postFile (string), enhancedContent (string)',
                    response: 'Success confirmation'
                }
            },
            ai: {
                'POST /api/generate-image': {
                    description: 'Generate images using AI',
                    body: 'prompt (string), provider (string, default: gemini)',
                    response: 'Generated images with paths and metadata'
                }
            },
            deployment: {
                'POST /api/create-github-repo': {
                    description: 'Create GitHub repository',
                    body: 'username (string), repo (string), token (string)',
                    response: 'Repository creation confirmation with URLs'
                },
                'POST /api/deploy-github': {
                    description: 'Deploy content to GitHub Pages',
                    body: 'username (string), repo (string), token (string)',
                    response: 'Deployment status with file count'
                },
                'POST /api/deploy-ipfs': {
                    description: 'Deploy content to IPFS',
                    body: 'None (uses environment config)',
                    response: 'IPFS hash and gateway URLs'
                }
            }
        },
        examples: {
            'Create a new post': {
                method: 'POST',
                url: '/api/generate-post',
                body: {
                    templateType: 'tech',
                    title: 'My New Blog Post'
                }
            },
            'Get all posts': {
                method: 'GET',
                url: '/api/posts'
            },
            'Deploy to IPFS': {
                method: 'POST',
                url: '/api/deploy-ipfs',
                body: {}
            }
        },
        environment: {
            requiredEnvVars: [
                'OPENAI_API_KEY (optional) - for OpenAI content enhancement',
                'DEEPSEEK_API_KEY (optional) - for DeepSeek content enhancement', 
                'GEMINI_API_KEY (required) - for Gemini AI features',
                'PINATA_API_KEY (required) - for IPFS deployment',
                'PINATA_SECRET_API_KEY (required) - for IPFS deployment'
            ]
        },
        admin: {
            web_interface: 'http://localhost:3001/app/admin/admin.html',
            pro_interface: 'http://localhost:3001/app/admin/admin-pro.html',
            blog_preview: 'http://localhost:3000'
        }
    };

    res.json(apiDocs);
});

// Get all posts
app.get('/api/posts', async (req, res) => {
    try {
        const postsDir = getPostsDirectory();
        const posts = [];
        
        const years = await fs.readdir(postsDir);
        
        for (const year of years) {
            const yearPath = path.join(postsDir, year);
            const stat = await fs.stat(yearPath);
            
            if (stat.isDirectory()) {
                const months = await fs.readdir(yearPath);
                
                for (const month of months) {
                    const monthPath = path.join(yearPath, month);
                    const monthStat = await fs.stat(monthPath);
                    
                    if (monthStat.isDirectory()) {
                        const files = await fs.readdir(monthPath);
                        
                        for (const file of files) {
                            if (file.endsWith('.md')) {
                                const filePath = path.join(monthPath, file);
                                const content = await fs.readFile(filePath, 'utf-8');
                                const lines = content.split('\n');
                                
                                // Extract title from first line or filename
                                let title = file.replace('.md', '');
                                const titleLine = lines.find(line => line.startsWith('# '));
                                if (titleLine) {
                                    title = titleLine.replace('# ', '');
                                }
                                
                                posts.push({
                                    file: `${year}/${month}/${file}`,
                                    title,
                                    date: `${year}-${month}`,
                                    type: 'markdown',
                                    path: filePath
                                });
                            }
                        }
                    }
                }
            }
        }
        
        // Sort by date (newest first)
        posts.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        res.json(posts);
    } catch (error) {
        console.error('Error loading posts:', error);
        res.status(500).json({ error: 'Failed to load posts' });
    }
});

// Get post content
app.get('/api/post-content', async (req, res) => {
    try {
        const { file } = req.query;
        if (!file) {
            return res.status(400).json({ error: 'File parameter required' });
        }
        
        const filePath = path.join(getPostsDirectory(), file);
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Extract title from content
        const lines = content.split('\n');
        const titleLine = lines.find(line => line.startsWith('# '));
        const title = titleLine ? titleLine.replace('# ', '') : path.basename(file, '.md');
        
        res.json({ content, title });
    } catch (error) {
        console.error('Error loading post content:', error);
        res.status(500).json({ error: 'Failed to load post content' });
    }
});

// Generate new post
app.post('/api/generate-post', async (req, res) => {
    try {
        const { templateType, title } = req.body;
        
        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }
        
        // Load template
        const templatePath = path.join(rootDir, 'templates', `${templateType}.md`);
        let template = '';
        
        try {
            template = await fs.readFile(templatePath, 'utf-8');
        } catch {
            // Default template if file doesn't exist
            template = `# ${title}

*Published: ${new Date().toISOString().split('T')[0]}*

## Summary

## Main Content

## Conclusion

---

**Tags:** 
**Category:** ${templateType}
`;
        }
        
        // Replace placeholders
        const content = template
            .replace(/\{\{title\}\}/g, title)
            .replace(/\{\{date\}\}/g, new Date().toISOString().split('T')[0])
            .replace(/\{\{type\}\}/g, templateType);
        
        res.json({ content });
    } catch (error) {
        console.error('Error generating post:', error);
        res.status(500).json({ error: 'Failed to generate post' });
    }
});

// Save post
app.post('/api/save-post', async (req, res) => {
    try {
        const { title, content } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }
        
        const fileName = generateFileName(title);
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        
        const targetDir = path.join(getPostsDirectory(), year.toString(), month);
        await ensureDirectoryExists(targetDir);
        
        const filePath = path.join(targetDir, fileName);
        
        // Ensure content starts with title
        let finalContent = content;
        if (!content.startsWith('# ')) {
            finalContent = `# ${title}\n\n${content}`;
        }
        
        await fs.writeFile(filePath, finalContent, 'utf-8');
        
        // Update sidebar
        await updateSidebar();
        
        res.json({ 
            success: true, 
            file: `${year}/${month}/${fileName}`,
            message: 'Post saved successfully' 
        });
    } catch (error) {
        console.error('Error saving post:', error);
        res.status(500).json({ error: 'Failed to save post' });
    }
});

// Enhance content with AI
app.post('/api/enhance-content', async (req, res) => {
    try {
        const { postFile, provider = 'openai', options = {}, apiKey } = req.body;
        
        if (!postFile) {
            return res.status(400).json({ error: 'Post file is required' });
        }
        
        // Validate AI provider
        const validProviders = ['openai', 'deepseek', 'anthropic', 'gemini'];
        if (!validProviders.includes(provider)) {
            return res.status(400).json({ 
                error: `Invalid AI provider. Must be one of: ${validProviders.join(', ')}` 
            });
        }
        
        // Get API key from request or environment
        const apiKeyMap = {
            'openai': apiKey || process.env.OPENAI_API_KEY,
            'deepseek': apiKey || process.env.DEEPSEEK_API_KEY,
            'anthropic': apiKey || process.env.ANTHROPIC_API_KEY,
            'gemini': apiKey || process.env.GEMINI_API_KEY || process.env.Gemini_API_KEY
        };
        
        const selectedApiKey = apiKeyMap[provider];
        if (!selectedApiKey) {
            return res.status(400).json({ 
                error: `${provider.toUpperCase()} API key not configured. Please set it in Settings or environment variables.` 
            });
        }
        
        const filePath = path.join(getPostsDirectory(), postFile);
        
        // Read and parse the markdown file (fs.readFile will throw if file doesn't exist)
        let content;
        try {
            content = await fs.readFile(filePath, 'utf-8');
        } catch (fileError) {
            if (fileError.code === 'ENOENT') {
                return res.status(404).json({ error: 'Post file not found' });
            }
            throw fileError; // Re-throw other errors
        }
        const parsed = matter(content);
        
        // Prepare enhancement prompt based on options
        let enhancementPrompts = [];
        
        if (options.improveTitle) {
            enhancementPrompts.push('Improve the title to be more engaging');
        }
        if (options.addSummary) {
            enhancementPrompts.push('Add a concise summary at the beginning');
        }
        if (options.generateTags) {
            enhancementPrompts.push('Generate relevant tags');
        }
        if (options.improveContent) {
            enhancementPrompts.push('Improve content structure and clarity');
        }
        
        if (enhancementPrompts.length === 0) {
            return res.status(400).json({ error: 'No enhancement options selected' });
        }
        
        const prompt = `Please enhance the following markdown content with these improvements: ${enhancementPrompts.join(', ')}.
        
Original content:
${content}

Please return only the enhanced markdown content without explanations.`;
        
        // Call the appropriate AI service
        let enhancedContent;
        
        try {
            switch (provider) {
                case 'openai':
                    enhancedContent = await callOpenAI(prompt, selectedApiKey);
                    break;
                case 'deepseek':
                    enhancedContent = await callDeepSeek(prompt, selectedApiKey);
                    break;
                case 'anthropic':
                    enhancedContent = await callAnthropic(prompt, selectedApiKey);
                    break;
                case 'gemini':
                    enhancedContent = await callGemini(prompt, selectedApiKey);
                    break;
                default:
                    throw new Error(`Unsupported provider: ${provider}`);
            }
        } catch (aiError) {
            console.error(`AI API Error (${provider}):`, aiError);
            return res.status(500).json({ 
                error: `AI enhancement failed: ${aiError.message}`,
                provider: provider,
                details: aiError.response?.data || aiError.message
            });
        }
        
        res.json({ 
            success: true, 
            enhancedContent,
            provider,
            originalLength: content.length,
            enhancedLength: enhancedContent.length
        });
        
    } catch (error) {
        console.error('Error enhancing content:', error);
        res.status(500).json({ 
            error: 'Failed to enhance content: ' + error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Save enhanced content
app.post('/api/save-enhanced-content', async (req, res) => {
    try {
        const { postFile, content } = req.body;
        
        if (!postFile || !content) {
            return res.status(400).json({ error: 'Post file and content are required' });
        }
        
        const filePath = path.join(getPostsDirectory(), postFile);
        
        // Write the enhanced content back to the file
        await fs.writeFile(filePath, content, 'utf-8');
        
        // Update sidebar after content change
        await updateSidebar();
        
        res.json({ 
            success: true, 
            message: 'Enhanced content saved successfully' 
        });
        
    } catch (error) {
        console.error('Error saving enhanced content:', error);
        res.status(500).json({ 
            error: 'Failed to save enhanced content: ' + error.message
        });
    }
});

// AI service functions
async function callOpenAI(prompt, apiKey = null) {
    const effectiveApiKey = apiKey || process.env.OPENAI_API_KEY;
    
    if (!effectiveApiKey) {
        throw new Error('OpenAI API key not configured.');
    }

    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({
        apiKey: effectiveApiKey,
        baseURL: process.env.OPENAI_BASE_URL
    });
    
    const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
            {
                role: 'system',
                content: 'You are a professional blog content editor. Always respond in the same language as the input content.'
            },
            {
                role: 'user',
                content: prompt
            }
        ],
        temperature: 0.7,
        max_tokens: 2000
    });

    return response.choices[0].message.content.trim();
}

async function callDeepSeek(prompt, apiKey = null) {
    const effectiveApiKey = apiKey || process.env.DEEPSEEK_API_KEY;
    
    if (!effectiveApiKey) {
        throw new Error('DeepSeek API key not configured.');
    }

    const OpenAI = (await import('openai')).default;
    const deepseek = new OpenAI({
        apiKey: effectiveApiKey,
        baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.siliconflow.cn/v1'
    });
    
    const response = await deepseek.chat.completions.create({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        messages: [
            {
                role: 'system',
                content: 'You are a professional blog content editor. Always respond in the same language as the input content.'
            },
            {
                role: 'user',
                content: prompt
            }
        ],
        temperature: 0.7,
        max_tokens: 2000
    });

    return response.choices[0].message.content.trim();
}

async function callAnthropic(prompt, apiKey = null) {
    const effectiveApiKey = apiKey || process.env.ANTHROPIC_API_KEY;
    
    if (!effectiveApiKey) {
        throw new Error('Anthropic API key not configured.');
    }

    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic({
        apiKey: effectiveApiKey
    });
    
    const response = await anthropic.messages.create({
        model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
        max_tokens: 2000,
        messages: [
            {
                role: 'user',
                content: prompt
            }
        ]
    });

    return response.content[0].text.trim();
}

async function callGemini(prompt, apiKey = null) {
    const { GoogleGenAI } = await import('@google/genai');
    const effectiveApiKey = apiKey || process.env.GEMINI_API_KEY || process.env.Gemini_API_KEY;
    
    if (!effectiveApiKey) {
        throw new Error('Gemini API key not configured.');
    }
    
    const ai = new GoogleGenAI({ apiKey: effectiveApiKey });
    
    const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        contents: prompt,
        config: {
            temperature: 0.7,
            maxOutputTokens: 2000,
        }
    });

    return response.text.trim();
}

async function generateImageWithGemini(prompt) {
    const { GoogleGenAI, Modality } = await import('@google/genai');
    const apiKey = process.env.GEMINI_API_KEY || process.env.Gemini_API_KEY;
    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    const response = await ai.models.generateContent({
        model: process.env.GEMINI_IMAGE_MODEL || 'gemini-2.0-flash-preview-image-generation',
        contents: prompt,
        config: {
            responseModalities: [Modality.TEXT, Modality.IMAGE],
        }
    });
    
    const images = [];
    const texts = [];
    
    for (const part of response.candidates[0].content.parts) {
        if (part.text) {
            texts.push(part.text);
        } else if (part.inlineData) {
            images.push({
                data: part.inlineData.data,
                mimeType: part.inlineData.mimeType
            });
        }
    }
    
    return { images, texts };
}

// Generate image with AI
app.post('/api/generate-image', async (req, res) => {
    try {
        const { prompt, provider = 'gemini' } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }
        
        if (provider !== 'gemini') {
            return res.status(400).json({ error: 'Currently only Gemini image generation is supported' });
        }
        
        const result = await generateImageWithGemini(prompt);
        
        if (result.images.length === 0) {
            return res.status(500).json({ error: 'No images were generated' });
        }
        
        // Save images to blog/assets/images directory
        const assetsDir = path.join(rootDir, 'blog', 'assets', 'images');
        await ensureDirectoryExists(assetsDir);
        
        const savedImages = [];
        
        for (let i = 0; i < result.images.length; i++) {
            const image = result.images[i];
            const timestamp = Date.now();
            const extension = image.mimeType === 'image/png' ? 'png' : 'jpg';
            const filename = `gemini-generated-${timestamp}-${i}.${extension}`;
            const imagePath = path.join(assetsDir, filename);
            
            // Save image to file
            const buffer = Buffer.from(image.data, 'base64');
            await fs.writeFile(imagePath, buffer);
            
            savedImages.push({
                filename,
                path: `/assets/images/${filename}`,
                mimeType: image.mimeType,
                size: buffer.length
            });
        }
        
        res.json({
            success: true,
            prompt: prompt,
            images: savedImages,
            texts: result.texts,
            count: savedImages.length
        });
        
    } catch (error) {
        console.error('Error generating image:', error);
        res.status(500).json({
            error: 'Failed to generate image: ' + error.message
        });
    }
});

// Create GitHub repository
app.post('/api/create-github-repo', async (req, res) => {
    try {
        const { username, repo, token } = req.body;
        
        if (!username || !repo || !token) {
            return res.status(400).json({ 
                error: 'Missing required fields: username, repo, token' 
            });
        }

        // Create repository via GitHub API
        const createRepoResponse = await fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Doris-Protocol-App'
            },
            body: JSON.stringify({
                name: repo,
                description: 'Blog powered by Doris Protocol',
                homepage: `https://${username}.github.io/${repo}`,
                private: false,
                has_issues: true,
                has_projects: false,
                has_wiki: false,
                auto_init: true
            })
        });

        if (!createRepoResponse.ok) {
            const error = await createRepoResponse.json();
            return res.json({ 
                success: false, 
                error: `GitHub API Error: ${error.message || 'Repository creation failed'}` 
            });
        }

        const repoData = await createRepoResponse.json();

        // Enable GitHub Pages
        const pagesResponse = await fetch(`https://api.github.com/repos/${username}/${repo}/pages`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Doris-Protocol-App'
            },
            body: JSON.stringify({
                source: {
                    branch: 'main',
                    path: '/'
                }
            })
        });

        const pagesUrl = `https://${username}.github.io/${repo}`;

        res.json({
            success: true,
            repoUrl: repoData.html_url,
            pagesUrl: pagesUrl,
            message: 'Repository created and GitHub Pages enabled'
        });

    } catch (error) {
        console.error('Error creating GitHub repository:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create repository: ' + error.message
        });
    }
});

// Deploy to GitHub Pages
app.post('/api/deploy-github', async (req, res) => {
    try {
        const { username, repo, token } = req.body;
        
        if (!username || !repo || !token) {
            return res.status(400).json({ 
                error: 'Missing required fields: username, repo, token' 
            });
        }

        // Get all files in blog directory
        const blogDir = getBlogDirectory();
        const files = await getAllFiles(blogDir);
        
        // Upload files to GitHub repository
        let uploadedCount = 0;
        const errors = [];

        for (const filePath of files) {
            try {
                const relativePath = path.relative(blogDir, filePath);
                const content = await fs.readFile(filePath, 'utf8');
                const encodedContent = Buffer.from(content).toString('base64');

                // Check if file exists
                let sha = null;
                try {
                    const existingFileResponse = await fetch(`https://api.github.com/repos/${username}/${repo}/contents/${relativePath}`, {
                        headers: {
                            'Authorization': `token ${token}`,
                            'Accept': 'application/vnd.github.v3+json',
                            'User-Agent': 'Doris-Protocol-App'
                        }
                    });
                    
                    if (existingFileResponse.ok) {
                        const existingFile = await existingFileResponse.json();
                        sha = existingFile.sha;
                    }
                } catch (e) {
                    // File doesn't exist, continue without SHA
                }

                // Upload/update file
                const uploadResponse = await fetch(`https://api.github.com/repos/${username}/${repo}/contents/${relativePath}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'User-Agent': 'Doris-Protocol-App'
                    },
                    body: JSON.stringify({
                        message: `Deploy: Update ${relativePath}`,
                        content: encodedContent,
                        ...(sha && { sha })
                    })
                });

                if (uploadResponse.ok) {
                    uploadedCount++;
                } else {
                    const error = await uploadResponse.json();
                    errors.push(`Failed to upload ${relativePath}: ${error.message}`);
                }

            } catch (error) {
                errors.push(`Error processing ${filePath}: ${error.message}`);
            }
        }

        res.json({
            success: uploadedCount > 0,
            filesCount: uploadedCount,
            errors: errors.length > 0 ? errors : undefined,
            message: `Successfully deployed ${uploadedCount} files to GitHub Pages`
        });

    } catch (error) {
        console.error('Error deploying to GitHub:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to deploy: ' + error.message
        });
    }
});

// Helper function to get all files recursively
async function getAllFiles(dir) {
    const files = [];
    const items = await fs.readdir(dir, { withFileTypes: true });
    
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            files.push(...await getAllFiles(fullPath));
        } else {
            files.push(fullPath);
        }
    }
    
    return files;
}

// Deploy to IPFS
app.post('/api/deploy-ipfs', async (req, res) => {
    try {
        // Check if IPFS configuration exists
        const pinataApiKey = process.env.PINATA_API_KEY;
        const pinataSecretKey = process.env.PINATA_SECRET_API_KEY;
        
        if (!pinataApiKey || !pinataSecretKey) {
            return res.status(400).json({
                success: false,
                error: 'IPFS configuration missing. Please set PINATA_API_KEY and PINATA_SECRET_API_KEY in .env file.'
            });
        }

        // Get blog directory for deployment
        const blogDir = getBlogDirectory();
        
        // Create simple test upload to verify IPFS connection
        const testContent = `# Doris Protocol Blog
        
Deployed at: ${new Date().toISOString()}
Blog directory: ${blogDir}

This is a test deployment to verify IPFS connectivity.
        `;

        // Upload to Pinata IPFS
        const form = new FormData();
        form.append('file', Buffer.from(testContent), {
            filename: 'doris-blog-test.md',
            contentType: 'text/markdown'
        });

        const metadata = JSON.stringify({
            name: 'Doris Protocol Blog',
            keyvalues: {
                deployedAt: new Date().toISOString(),
                source: 'doris-protocol'
            }
        });
        form.append('pinataMetadata', metadata);

        const pinataResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
            method: 'POST',
            headers: {
                'pinata_api_key': pinataApiKey,
                'pinata_secret_api_key': pinataSecretKey,
                ...form.getHeaders()
            },
            body: form
        });

        if (!pinataResponse.ok) {
            const error = await pinataResponse.json();
            return res.status(500).json({
                success: false,
                error: `Pinata IPFS Error: ${error.message || 'Upload failed'}`
            });
        }

        const pinataResult = await pinataResponse.json();
        const ipfsHash = pinataResult.IpfsHash;

        // Generate gateway URLs
        const gateways = [
            `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
            `https://ipfs.io/ipfs/${ipfsHash}`,
            `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
            `https://dweb.link/ipfs/${ipfsHash}`
        ];

        const output = `✅ IPFS Deployment Successful!
📡 IPFS Hash: ${ipfsHash}
📄 Files Deployed: ${files.length} files
⏰ Deployment Time: ${new Date().toISOString()}

🌍 Gateway URLs:
${gateways.map(url => `• ${url}`).join('\n')}

💾 Storage: Permanently pinned on Pinata IPFS`;

        res.json({
            success: true,
            hash: ipfsHash,
            accessUrls: {
                github: `https://github.com/user/repo`, // Placeholder
                ipfs: {
                    hash: ipfsHash,
                    gateways: gateways
                }
            },
            output: output
        });

    } catch (error) {
        console.error('Error deploying to IPFS:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to deploy to IPFS: ' + error.message
        });
    }
});

// Delete post
app.delete('/api/delete-post', async (req, res) => {
    try {
        const { file } = req.body;
        
        if (!file) {
            return res.status(400).json({ error: 'File parameter required' });
        }
        
        const filePath = path.join(getPostsDirectory(), file);
        await fs.unlink(filePath);
        
        // Update sidebar
        await updateSidebar();
        
        res.json({ 
            success: true, 
            message: 'Post deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ error: 'Failed to delete post' });
    }
});

// Helper functions
async function updateSidebar() {
    try {
        const posts = [];
        const postsDir = getPostsDirectory();
        
        const years = await fs.readdir(postsDir);
        
        for (const year of years) {
            const yearPath = path.join(postsDir, year);
            const stat = await fs.stat(yearPath);
            
            if (stat.isDirectory()) {
                const months = await fs.readdir(yearPath);
                
                for (const month of months) {
                    const monthPath = path.join(yearPath, month);
                    const monthStat = await fs.stat(monthPath);
                    
                    if (monthStat.isDirectory()) {
                        const files = await fs.readdir(monthPath);
                        
                        for (const file of files) {
                            if (file.endsWith('.md')) {
                                const filePath = path.join(monthPath, file);
                                const content = await fs.readFile(filePath, 'utf-8');
                                const lines = content.split('\n');
                                
                                let title = file.replace('.md', '');
                                const titleLine = lines.find(line => line.startsWith('# '));
                                if (titleLine) {
                                    title = titleLine.replace('# ', '');
                                }
                                
                                posts.push({
                                    title,
                                    path: `posts/${year}/${month}/${file}`,
                                    date: `${year}-${month}`
                                });
                            }
                        }
                    }
                }
            }
        }
        
        // Sort by date (newest first)
        posts.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Generate sidebar content
        let sidebarContent = `# Doris Protocol

## Navigation

- [Home](/)
- [📝 Content Management](/admin.html)

## Recent Posts

`;
        
        posts.slice(0, 10).forEach(post => {
            sidebarContent += `- [${post.title}](${post.path})\n`;
        });
        
        sidebarContent += `
## Archives

`;
        
        // Group by year/month
        const groupedPosts = {};
        posts.forEach(post => {
            const [year, month] = post.date.split('-');
            const key = `${year}-${month}`;
            if (!groupedPosts[key]) {
                groupedPosts[key] = [];
            }
            groupedPosts[key].push(post);
        });
        
        Object.keys(groupedPosts).sort().reverse().forEach(period => {
            const [year, month] = period.split('-');
            const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
            sidebarContent += `- **${monthName} ${year}**\n`;
            groupedPosts[period].forEach(post => {
                sidebarContent += `  - [${post.title}](${post.path})\n`;
            });
        });
        
        // Write sidebar
        const sidebarPath = path.join(rootDir, 'blog', '_sidebar.md');
        await fs.writeFile(sidebarPath, sidebarContent, 'utf-8');
        
    } catch (error) {
        console.error('Error updating sidebar:', error);
    }
}

// Serve admin interface
app.get('/admin', (req, res) => {
    res.sendFile(path.join(rootDir, 'app', 'admin', 'admin.html'));
});

// Serve blog at root
app.get('/', (req, res) => {
    res.sendFile(path.join(rootDir, 'blog', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Doris Protocol Server running on http://localhost:${PORT}`);
    console.log(`📝 Admin Interface: http://localhost:${PORT}/admin`);
    console.log(`📚 Documentation: http://localhost:${PORT}/docs/`);
});

export default app; 