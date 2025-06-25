/**
 * Ollama Local AI Service
 * Provides local AI capabilities using Ollama models
 */

import fetch from 'node-fetch';

export class OllamaService {
    constructor(config = {}) {
        this.baseUrl = config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        this.model = config.model || process.env.OLLAMA_MODEL || 'llama2';
        this.timeout = config.timeout || 60000; // 60 seconds
    }

    /**
     * Check if Ollama service is available
     */
    async isAvailable() {
        try {
            const response = await fetch(`${this.baseUrl}/api/version`, {
                timeout: 5000
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get available models
     */
    async listModels() {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);
            const data = await response.json();
            return data.models || [];
        } catch (error) {
            console.error('Error listing Ollama models:', error);
            return [];
        }
    }

    /**
     * Generate text using Ollama
     */
    async generate(prompt, options = {}) {
        try {
            const requestBody = {
                model: options.model || this.model,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: options.temperature || 0.7,
                    top_p: options.top_p || 0.9,
                    top_k: options.top_k || 40,
                    num_ctx: options.num_ctx || 2048,
                    ...options.modelOptions
                }
            };

            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody),
                timeout: this.timeout
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return {
                success: true,
                text: data.response,
                model: data.model,
                context: data.context,
                done: data.done
            };
        } catch (error) {
            console.error('Error generating text with Ollama:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Chat-style conversation (for multi-turn interactions)
     */
    async chat(messages, options = {}) {
        try {
            // Convert chat messages to a single prompt
            const prompt = this.formatChatPrompt(messages);
            return await this.generate(prompt, options);
        } catch (error) {
            console.error('Error in Ollama chat:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Format chat messages into a single prompt
     */
    formatChatPrompt(messages) {
        return messages.map(msg => {
            if (msg.role === 'user') {
                return `Human: ${msg.content}`;
            } else if (msg.role === 'assistant') {
                return `Assistant: ${msg.content}`;
            } else if (msg.role === 'system') {
                return `System: ${msg.content}`;
            }
            return msg.content;
        }).join('\n\n') + '\n\nAssistant:';
    }

    /**
     * Content enhancement methods for Doris Protocol
     */
    async enhanceTitle(title, context = '') {
        const prompt = `Improve this blog title to be more engaging and SEO-friendly. Keep it concise and compelling.

Original title: "${title}"
${context ? `Context: ${context}` : ''}

Improved title:`;

        const result = await this.generate(prompt, { temperature: 0.8 });
        
        if (result.success) {
            // Extract just the title from response
            const enhanced = result.text.trim().replace(/^["']|["']$/g, '');
            return enhanced;
        }
        
        return title; // Fallback to original
    }

    async generateSummary(content, maxLength = 300) {
        const prompt = `Write a concise summary (max ${maxLength} characters) for this blog post. Focus on the key points and main takeaways.

Content:
${content}

Summary:`;

        const result = await this.generate(prompt, { temperature: 0.7 });
        
        if (result.success) {
            let summary = result.text.trim();
            // Truncate if too long
            if (summary.length > maxLength) {
                summary = summary.substring(0, maxLength - 3) + '...';
            }
            return summary;
        }
        
        return '';
    }

    async generateTags(content, maxTags = 5) {
        const prompt = `Generate ${maxTags} relevant tags for this blog post. Return only the tags, separated by commas, no explanations.

Content:
${content}

Tags:`;

        const result = await this.generate(prompt, { temperature: 0.6 });
        
        if (result.success) {
            const tags = result.text.trim()
                .split(',')
                .map(tag => tag.trim().toLowerCase())
                .filter(tag => tag.length > 0)
                .slice(0, maxTags);
            return tags;
        }
        
        return [];
    }

    async improveContent(content, instructions = '') {
        const defaultInstructions = "Improve the structure, clarity, and readability while maintaining the author's voice and style.";
        const enhancementInstructions = instructions || defaultInstructions;

        const prompt = `${enhancementInstructions}

Original content:
${content}

Improved content:`;

        const result = await this.generate(prompt, { 
            temperature: 0.7,
            num_ctx: 4096 // Larger context for content improvement
        });
        
        if (result.success) {
            return result.text.trim();
        }
        
        return content; // Fallback to original
    }

    /**
     * Content generation for templates
     */
    async generateFromTemplate(templateType, title, userInput = '') {
        const prompts = {
            'daily': `Write a daily blog post with the title "${title}". Include personal reflections and insights from the day. ${userInput}`,
            'weekly': `Write a weekly summary blog post titled "${title}". Review the week's highlights, learnings, and plans for next week. ${userInput}`,
            'tech': `Write a technical blog post about "${title}". Include explanations, examples, and practical insights. ${userInput}`,
            'thoughts': `Write a thoughtful blog post titled "${title}". Share personal perspectives and insights. ${userInput}`,
            'book-notes': `Write book notes for "${title}". Include key takeaways, quotes, and personal reflections. ${userInput}`,
            'project-update': `Write a project update post titled "${title}". Include progress, challenges, and next steps. ${userInput}`
        };

        const prompt = prompts[templateType] || `Write a blog post titled "${title}". ${userInput}`;
        
        const fullPrompt = `${prompt}

Please write a well-structured blog post with:
- An engaging introduction
- Clear main sections with headers
- Practical examples or insights
- A meaningful conclusion

Blog post:`;

        const result = await this.generate(fullPrompt, { 
            temperature: 0.8,
            num_ctx: 4096
        });
        
        if (result.success) {
            return `# ${title}\n\n${result.text.trim()}`;
        }
        
        return `# ${title}\n\n*AI generation failed. Please write your content manually.*`;
    }

    /**
     * Health check and diagnostics
     */
    async getStatus() {
        try {
            const [available, models] = await Promise.all([
                this.isAvailable(),
                this.listModels()
            ]);

            const status = {
                service: 'Ollama Local AI',
                available,
                baseUrl: this.baseUrl,
                defaultModel: this.model,
                models: models.map(m => m.name || m),
                capabilities: [
                    'Content Enhancement',
                    'Title Improvement', 
                    'Summary Generation',
                    'Tag Generation',
                    'Content Generation'
                ]
            };

            if (available) {
                // Test a simple generation
                const testResult = await this.generate('Say "Hello" in one word.', { 
                    model: this.model,
                    timeout: 10000 
                });
                status.testPassed = testResult.success;
                status.testResponse = testResult.text?.trim().substring(0, 50);
            }

            return status;
        } catch (error) {
            return {
                service: 'Ollama Local AI',
                available: false,
                error: error.message
            };
        }
    }
}

/**
 * Factory function to create Ollama service instance
 */
export function createOllamaService(config = {}) {
    return new OllamaService(config);
}

/**
 * Check if local AI is enabled and available
 */
export async function isLocalAIAvailable() {
    if (!process.env.LOCAL_AI_ENABLED || process.env.LOCAL_AI_ENABLED !== 'true') {
        return false;
    }
    
    const service = createOllamaService();
    return await service.isAvailable();
}

export default OllamaService; 