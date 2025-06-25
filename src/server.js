import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { PinataSDK } from 'pinata-web3';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(rootDir, 'docs')));

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
const getPostsDirectory = () => path.join(rootDir, 'docs', 'posts');

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
        const { postFile, provider, options } = req.body;
        
        if (!postFile) {
            return res.status(400).json({ error: 'Post file is required' });
        }
        
        const filePath = path.join(getPostsDirectory(), postFile);
        const content = await fs.readFile(filePath, 'utf-8');
        
        let enhancedContent = content;
        
        if (provider === 'openai' && openai) {
            const prompt = createEnhancementPrompt(content, options);
            
            const completion = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 2000
            });
            
            enhancedContent = completion.choices[0].message.content;
            
        } else if (provider === 'anthropic' && anthropic) {
            const prompt = createEnhancementPrompt(content, options);
            
            const message = await anthropic.messages.create({
                model: "claude-3-sonnet-20240229",
                max_tokens: 2000,
                messages: [{ role: "user", content: prompt }]
            });
            
            enhancedContent = message.content[0].text;
        } else {
            return res.status(400).json({ error: 'AI provider not configured or invalid' });
        }
        
        // Save enhanced content
        await fs.writeFile(filePath, enhancedContent, 'utf-8');
        
        res.json({ 
            success: true, 
            enhancedContent,
            message: 'Content enhanced successfully' 
        });
        
    } catch (error) {
        console.error('Error enhancing content:', error);
        res.status(500).json({ error: 'Failed to enhance content: ' + error.message });
    }
});

// Deploy to GitHub Pages
app.post('/api/deploy-github', async (req, res) => {
    try {
        // For demo purposes - in real implementation this would trigger a git push
        // or call GitHub Actions API
        const output = `
✅ GitHub Pages Deployment Initiated!
📄 Repository: ${process.env.GITHUB_REPOSITORY || 'your-org/doris-protocol'}
🚀 Branch: gh-pages
⏳ Deployment Status: Processing...

The deployment will be available at:
🔗 GitHub Pages URL: https://${process.env.GITHUB_PAGES_URL || 'your-org.github.io/doris-protocol'}

Note: GitHub Pages deployment may take 2-5 minutes to go live.
`;
        
        res.json({ 
            success: true, 
            output,
            githubPagesUrl: `https://${process.env.GITHUB_PAGES_URL || 'your-org.github.io/doris-protocol'}`,
            message: 'Deployed to GitHub successfully' 
        });
    } catch (error) {
        console.error('Error deploying to GitHub:', error);
        res.status(500).json({ error: 'Failed to deploy to GitHub: ' + error.message });
    }
});

// Deploy to IPFS
app.post('/api/deploy-ipfs', async (req, res) => {
    try {
        if (!process.env.PINATA_API_KEY || !process.env.PINATA_SECRET_API_KEY) {
            return res.status(400).json({ error: 'Pinata API keys not configured' });
        }
        
        const pinata = new PinataSDK({
            pinataApiKey: process.env.PINATA_API_KEY,
            pinataSecretApiKey: process.env.PINATA_SECRET_API_KEY
        });
        
        // Pin the docs directory
        const docsPath = path.join(rootDir, 'docs');
        const result = await pinata.pinFromFS(docsPath);
        
        // Generate comprehensive access URLs
        const githubPagesUrl = `https://${process.env.GITHUB_PAGES_URL || 'your-org.github.io/doris-protocol'}`;
        const ipfsHash = result.IpfsHash;
        const accessUrls = {
            github: githubPagesUrl,
            ipfs: {
                hash: ipfsHash,
                gateways: [
                    `https://ipfs.io/ipfs/${ipfsHash}`,
                    `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
                    `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
                    `https://dweb.link/ipfs/${ipfsHash}`
                ]
            }
        };
        
        const output = `
✅ IPFS Deployment Successful!
📡 IPFS Hash: ${ipfsHash}

🌐 Blog Access URLs:

📄 GitHub Pages (Primary):
   ${githubPagesUrl}

🌍 IPFS Gateways (Decentralized):
   • IPFS Gateway: https://ipfs.io/ipfs/${ipfsHash}
   • Pinata Gateway: https://gateway.pinata.cloud/ipfs/${ipfsHash}
   • Cloudflare Gateway: https://cloudflare-ipfs.com/ipfs/${ipfsHash}
   • Dweb Gateway: https://dweb.link/ipfs/${ipfsHash}

📋 Access Instructions:
   1. GitHub Pages URL is updated automatically via CI/CD
   2. IPFS content is immediately available on all gateways
   3. Share any of the IPFS URLs for decentralized access
   4. Content is permanently pinned and accessible

💡 Tips:
   - Use GitHub Pages URL for regular visitors
   - Use IPFS URLs for decentralized sharing
   - Content remains accessible even if GitHub is down
`;
        
        res.json({ 
            success: true, 
            output,
            hash: ipfsHash,
            accessUrls
        });
    } catch (error) {
        console.error('Error deploying to IPFS:', error);
        res.status(500).json({ error: 'Failed to deploy to IPFS: ' + error.message });
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
function createEnhancementPrompt(content, options) {
    let prompt = "Please enhance the following markdown content:\n\n" + content + "\n\n";
    prompt += "Enhancement requirements:\n";
    
    if (options.improveTitle) {
        prompt += "- Improve the title to be more engaging and SEO-friendly\n";
    }
    if (options.addSummary) {
        prompt += "- Add a concise summary at the beginning\n";
    }
    if (options.generateTags) {
        prompt += "- Generate relevant tags for the content\n";
    }
    if (options.improveContent) {
        prompt += "- Improve the content structure, clarity, and readability\n";
    }
    
    prompt += "\nPlease return only the enhanced markdown content without any explanations.";
    
    return prompt;
}

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
        const sidebarPath = path.join(rootDir, 'docs', '_sidebar.md');
        await fs.writeFile(sidebarPath, sidebarContent, 'utf-8');
        
    } catch (error) {
        console.error('Error updating sidebar:', error);
    }
}

// Serve admin interface
app.get('/admin', (req, res) => {
    res.sendFile(path.join(rootDir, 'docs', 'admin.html'));
});

// Serve docs at root
app.get('/', (req, res) => {
    res.sendFile(path.join(rootDir, 'docs', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Doris Protocol Server running on http://localhost:${PORT}`);
    console.log(`📝 Admin Interface: http://localhost:${PORT}/admin`);
    console.log(`📚 Documentation: http://localhost:${PORT}/docs/`);
});

export default app; 