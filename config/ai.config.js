export default {
  aiProvider: 'openai', // 'openai' | 'anthropic' | 'local'
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

{content}`,
    
    generate: `You are a creative blog content generator. Generate a complete blog post based on the user's prompt. Include:
1. An engaging title
2. Well-structured content with headings
3. A conclusion
4. Relevant tags
5. A brief summary

Format the output as markdown with proper frontmatter.

User prompt: {content}`
  },
  
  // Rate limiting
  rateLimits: {
    requestsPerMinute: 10,
    requestsPerHour: 100
  },
  
  // Content enhancement settings
  enhancement: {
    autoGenerateSummary: true,
    autoGenerateTags: true,
    autoGenerateTitle: false, // Only if no title exists
    enhanceOnFlag: true // Only enhance when enhance: true in frontmatter
  }
}; 