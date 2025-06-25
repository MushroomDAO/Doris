# Ollama Local AI Service

## Overview

Ollama allows you to run large language models locally for privacy-first AI content enhancement. This eliminates the need for cloud AI services like OpenAI or Anthropic.

## Benefits

- ✅ **Privacy**: All data stays on your machine
- ✅ **Cost**: No API charges once set up
- ✅ **Offline**: Works without internet connection
- ✅ **Control**: Choose your own models
- ✅ **Speed**: Local inference can be faster

## Installation

### macOS
```bash
# Download and install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Or use Homebrew
brew install ollama
```

### Linux
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### Windows
Download from [ollama.ai](https://ollama.ai/download/windows)

## Model Setup

### Recommended Models for Doris Protocol

#### 1. Llama 2 (7B) - Balanced Performance
```bash
ollama pull llama2
# Size: ~3.8GB
# Memory: ~8GB RAM recommended
# Speed: Fast inference
```

#### 2. Code Llama (7B) - Code and Technical Content
```bash
ollama pull codellama
# Size: ~3.8GB
# Best for: Technical blogs, code documentation
```

#### 3. Mistral (7B) - Efficient and Fast
```bash
ollama pull mistral
# Size: ~4.1GB
# Best for: General content creation
```

#### 4. Llama 2 (13B) - Higher Quality
```bash
ollama pull llama2:13b
# Size: ~7.3GB
# Memory: ~16GB RAM recommended
# Best for: High-quality content generation
```

### Advanced Models (Requires more resources)

#### Llama 2 70B - Production Quality
```bash
ollama pull llama2:70b
# Size: ~39GB
# Memory: ~64GB RAM recommended
# Best for: Professional content creation
```

## Configuration

### Start Ollama Service
```bash
# Start the Ollama service
ollama serve

# Verify it's running (in another terminal)
curl http://localhost:11434/api/version
```

### Test Model
```bash
# Interactive chat to test
ollama run llama2

# API test
curl http://localhost:11434/api/generate -d '{
  "model": "llama2",
  "prompt": "Write a short blog post about local-first software.",
  "stream": false
}'
```

## Integration with Doris Protocol

### Environment Configuration
Add to your `.env` file:
```bash
# Enable local AI
LOCAL_AI_ENABLED=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2

# Disable cloud AI (optional)
# OPENAI_API_KEY=
# ANTHROPIC_API_KEY=
```

### Model Selection
Choose model based on your needs:
```bash
# For fast responses (good for daily blogging)
OLLAMA_MODEL=mistral

# For high quality (good for long-form content)
OLLAMA_MODEL=llama2:13b

# For technical content
OLLAMA_MODEL=codellama
```

## Performance Optimization

### Hardware Requirements

#### Minimum (Llama 2 7B)
- CPU: 4+ cores
- RAM: 8GB
- Storage: 5GB free space

#### Recommended (Llama 2 13B)
- CPU: 8+ cores 
- RAM: 16GB
- Storage: 10GB free space
- GPU: NVIDIA with 8GB+ VRAM (optional)

#### Optimal (Llama 2 70B)
- CPU: 16+ cores
- RAM: 64GB
- Storage: 50GB free space
- GPU: NVIDIA with 24GB+ VRAM

### GPU Acceleration
If you have NVIDIA GPU:
```bash
# Check if GPU is available
nvidia-smi

# Ollama will automatically use GPU if available
# Monitor GPU usage during inference
watch -n 1 nvidia-smi
```

### Memory Management
```bash
# Reduce memory usage by quantizing models
ollama pull llama2:7b-q4_0  # 4-bit quantized version

# Or use smaller models
ollama pull tinyllama        # Only 637MB
```

## Usage Examples

### Content Enhancement
```bash
# Enhance a blog post title
curl http://localhost:11434/api/generate -d '{
  "model": "llama2",
  "prompt": "Improve this blog title: \"My Thoughts on AI\"",
  "stream": false
}'

# Generate tags for content
curl http://localhost:11434/api/generate -d '{
  "model": "llama2", 
  "prompt": "Generate 5 tags for a blog post about local-first software",
  "stream": false
}'
```

### Custom Prompts for Doris Protocol
Create prompts in `config/ai.config.js`:
```javascript
const ollamaPrompts = {
  enhanceTitle: `Improve this blog title to be more engaging and SEO-friendly: "{title}"`,
  generateSummary: `Write a concise 2-3 sentence summary for this blog post: "{content}"`,
  generateTags: `Generate 5 relevant tags for this content: "{content}"`,
  improveContent: `Improve the structure and clarity of this content while maintaining the author's voice: "{content}"`
};
```

## Troubleshooting

### Common Issues

1. **Ollama service not starting**
```bash
# Check if port is already in use
lsof -i :11434

# Kill existing process
pkill ollama

# Restart service
ollama serve
```

2. **Out of memory errors**
```bash
# Use smaller model
ollama pull llama2:7b-q4_0

# Or increase system swap
sudo swapon --show
```

3. **Slow inference**
```bash
# Check system resources
top -p $(pgrep ollama)

# Use GPU if available
# Ensure CUDA/Metal is installed
```

4. **Model download fails**
```bash
# Check disk space
df -h

# Retry download
ollama pull llama2 --insecure
```

### Performance Monitoring
```bash
# Monitor Ollama service
tail -f ~/.ollama/logs/server.log

# Check model performance
curl http://localhost:11434/api/ps
```

## Advanced Configuration

### Custom Model Parameters
```bash
# Run with custom parameters
ollama run llama2 --num-ctx 4096 --temperature 0.7

# Save custom configuration
echo 'num_ctx 4096' > ~/.ollama/models/custom-llama2
```

### Multiple Models
```bash
# Pull multiple models for different use cases
ollama pull llama2      # General content
ollama pull codellama   # Technical content  
ollama pull mistral     # Fast responses

# Switch models in Doris Protocol via environment
OLLAMA_MODEL=codellama pnpm run enhance:ai
```

## Security Considerations

- Ollama runs locally, so no data leaves your machine
- Models are stored in `~/.ollama/models/`
- Network traffic only to download models initially
- Consider firewall rules if exposing API externally

## Next Steps

1. Install and test Ollama with a small model
2. Configure Doris Protocol to use local AI
3. Test content enhancement workflows
4. Optimize model selection for your use case
5. Consider upgrading hardware for better performance

For more information, visit [ollama.ai](https://ollama.ai) or check the [GitHub repository](https://github.com/jmorganca/ollama). 