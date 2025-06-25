#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

/**
 * Scan posts directory and extract post information
 */
async function scanPosts() {
    const postsDir = path.join(rootDir, 'docs', 'posts');
    const posts = [];

    try {
        const years = await fs.readdir(postsDir);
        
        for (const year of years) {
            const yearPath = path.join(postsDir, year);
            const yearStat = await fs.stat(yearPath);
            
            if (yearStat.isDirectory() && /^\d{4}$/.test(year)) {
                const months = await fs.readdir(yearPath);
                
                for (const month of months) {
                    const monthPath = path.join(yearPath, month);
                    const monthStat = await fs.stat(monthPath);
                    
                    if (monthStat.isDirectory() && /^\d{2}$/.test(month)) {
                        const files = await fs.readdir(monthPath);
                        
                        for (const file of files) {
                            if (file.endsWith('.md')) {
                                const filePath = path.join(monthPath, file);
                                const content = await fs.readFile(filePath, 'utf-8');
                                
                                // Extract metadata from content
                                const metadata = extractMetadata(content, file);
                                posts.push({
                                    ...metadata,
                                    year: parseInt(year),
                                    month: parseInt(month),
                                    path: `posts/${year}/${month}/${file}`,
                                    fullPath: filePath
                                });
                            }
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.log('Posts directory not found, creating empty structure...');
        await fs.mkdir(postsDir, { recursive: true });
    }

    // Sort posts by date (newest first)
    posts.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        if (a.month !== b.month) return b.month - a.month;
        return new Date(b.date) - new Date(a.date);
    });

    return posts;
}

/**
 * Extract metadata from markdown content
 */
function extractMetadata(content, filename) {
    const lines = content.split('\n');
    let title = filename.replace('.md', '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
    let summary = '';
    let category = 'general';
    let tags = [];
    let date = '';

    // Extract title from first heading
    const titleLine = lines.find(line => line.trim().startsWith('# '));
    if (titleLine) {
        title = titleLine.replace(/^#\s*/, '').trim();
    }

    // Extract date from filename or content
    const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
        date = dateMatch[1];
    }

    // Extract metadata from content
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Extract summary from content (first paragraph after title)
        if (!summary && line && !line.startsWith('#') && !line.startsWith('*') && !line.startsWith('**') && line.length > 10) {
            summary = line.substring(0, 100) + (line.length > 100 ? '...' : '');
        }
        
        // Extract tags
        if (line.startsWith('**Tags:**') || line.startsWith('Tags:')) {
            const tagLine = line.replace(/\*?\*?Tags:\s*/, '');
            tags = tagLine.split(',').map(tag => tag.trim()).filter(tag => tag);
        }
        
        // Extract category
        if (line.startsWith('**Category:**') || line.startsWith('Category:')) {
            category = line.replace(/\*?\*?Category:\s*/, '').trim();
        }
    }

    return { title, summary, category, tags, date };
}

/**
 * Generate sidebar content
 */
function generateSidebar(posts) {
    let sidebar = `<!-- Auto-generated sidebar - Last updated: ${new Date().toISOString()} -->

* [🏠 Home](/)
* [📝 Content Management](admin.html)

* [Quick Actions](#quick-actions)
  * [✍️ Create New Post](admin.html#create)
  * [🤖 AI Enhancement](admin.html#enhance)  
  * [👁️ Preview Content](admin.html#preview)
  * [🚀 Deploy Content](admin.html#deploy)

`;

    // Recent posts (last 10)
    if (posts.length > 0) {
        sidebar += `* [📰 Recent Posts](#recent-posts)\n`;
        posts.slice(0, 10).forEach(post => {
            sidebar += `  * [${post.title}](${post.path})\n`;
        });
        sidebar += '\n';
    }

    // Group posts by year and month
    const groupedPosts = {};
    posts.forEach(post => {
        const key = `${post.year}`;
        const monthKey = `${post.year}-${String(post.month).padStart(2, '0')}`;
        
        if (!groupedPosts[key]) {
            groupedPosts[key] = {};
        }
        if (!groupedPosts[key][monthKey]) {
            groupedPosts[key][monthKey] = [];
        }
        groupedPosts[key][monthKey].push(post);
    });

    // Archives section
    if (Object.keys(groupedPosts).length > 0) {
        sidebar += `* [📁 Archives](#archives)\n`;
        
        Object.keys(groupedPosts).sort().reverse().forEach(year => {
            sidebar += `  * [${year}](#${year})\n`;
            
            Object.keys(groupedPosts[year]).sort().reverse().forEach(monthKey => {
                const [, month] = monthKey.split('-');
                const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long' });
                const monthPosts = groupedPosts[year][monthKey];
                
                sidebar += `    * [${monthName} (${monthPosts.length})](#${monthKey})\n`;
                monthPosts.forEach(post => {
                    sidebar += `      * [${post.title}](${post.path})\n`;
                });
            });
        });
        sidebar += '\n';
    }

    // Categories section
    const categories = {};
    posts.forEach(post => {
        if (!categories[post.category]) {
            categories[post.category] = [];
        }
        categories[post.category].push(post);
    });

    if (Object.keys(categories).length > 0) {
        sidebar += `* [🏷️ Categories](#categories)\n`;
        Object.keys(categories).sort().forEach(category => {
            const categoryPosts = categories[category];
            sidebar += `  * [${category} (${categoryPosts.length})](posts/?category=${category})\n`;
        });
        sidebar += '\n';
    }

    // Documentation section
    sidebar += `* [📚 Documentation](#documentation)
  * [Solution](docs/Solution.md)
  * [Features](docs/FEATURES.md)
  * [Development Plan](docs/PLAN.md)
  * [Changes](docs/CHANGES.md)
  * [Deployment Guide](docs/DEPLOY.md)

* [⚙️ Development](#development)
  * [Environment Setup](.env.example)
  * [API Reference](api/)
  * [Scripts Guide](scripts/)

* [🔗 External Links](#external-links)
  * [GitHub Repository](https://github.com/username/doris-protocol)
  * [IPFS Gateway](https://gateway.pinata.cloud/ipfs/)
  * [Issues & Support](https://github.com/username/doris-protocol/issues)
`;

    return sidebar;
}

/**
 * Update sidebar file
 */
async function updateSidebar() {
    try {
        console.log('📊 Scanning posts directory...');
        const posts = await scanPosts();
        console.log(`📝 Found ${posts.length} posts`);

        console.log('🔧 Generating sidebar...');
        const sidebarContent = generateSidebar(posts);

        const sidebarPath = path.join(rootDir, 'docs', '_sidebar.md');
        await fs.writeFile(sidebarPath, sidebarContent, 'utf-8');

        console.log('✅ Sidebar updated successfully!');
        console.log(`📍 File: ${sidebarPath}`);
        
        // Also update README with recent posts
        await updateReadmeWithRecentPosts(posts.slice(0, 5));
        
        return { success: true, postsCount: posts.length };
    } catch (error) {
        console.error('❌ Error updating sidebar:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update README with recent posts
 */
async function updateReadmeWithRecentPosts(recentPosts) {
    try {
        const readmePath = path.join(rootDir, 'docs', 'README.md');
        let readmeContent = await fs.readFile(readmePath, 'utf-8');

        // Find the recent posts section and replace it
        const recentPostsSection = `## 📰 Recent Posts

${recentPosts.map(post => 
    `- **[${post.title}](${post.path})** - ${post.date}\n  ${post.summary}`
).join('\n\n')}

---`;

        // Replace the recent posts section or add it before the last section
        if (readmeContent.includes('## 📰 Recent Posts')) {
            readmeContent = readmeContent.replace(
                /## 📰 Recent Posts[\s\S]*?(?=##|$)/,
                recentPostsSection + '\n\n'
            );
        } else {
            // Add before the last section (before ## Development)
            readmeContent = readmeContent.replace(
                '## 🛠 Development',
                recentPostsSection + '\n\n## 🛠 Development'
            );
        }

        await fs.writeFile(readmePath, readmeContent, 'utf-8');
        console.log('✅ README updated with recent posts!');
    } catch (error) {
        console.log('⚠️ Could not update README:', error.message);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    updateSidebar()
        .then(result => {
            if (result.success) {
                console.log(`🎉 Complete! Updated sidebar with ${result.postsCount} posts.`);
            } else {
                console.error('💥 Failed to update sidebar:', result.error);
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('💥 Unexpected error:', error);
            process.exit(1);
        });
}

export { updateSidebar, scanPosts }; 