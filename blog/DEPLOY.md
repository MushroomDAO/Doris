# Doris Protocol Deployment Guide

## Version 0.1.0 Deployment Instructions

### Prerequisites

#### System Requirements
- **Node.js**: v20.0.0 or higher
- **pnpm**: v8.0.0 or higher  
- **Git**: For repository management
- **Terminal**: Command line access

#### API Keys Required (Optional but Recommended)
- **OpenAI API Key**: For AI content enhancement
- **Anthropic API Key**: Alternative AI provider
- **Pinata API Keys**: For IPFS pinning service
- **Web3.Storage Token**: Alternative IPFS service

### Installation

#### 1. Clone Repository
```bash
# Clone the Doris Protocol template
git clone https://github.com/your-org/doris-protocol.git my-blog
cd my-blog

# Or fork and clone your own version
git clone https://github.com/your-username/my-doris-blog.git
cd my-doris-blog
```

#### 2. Install Dependencies
```bash
# Install all required packages
pnpm install

# Verify installation
pnpm --version
node --version
```

#### 3. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit with your API keys
nano .env
```

Required environment variables:
```bash
# AI Services (at least one required for AI features)
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-your-anthropic-key

# IPFS Services (at least one required for decentralized publishing)
PINATA_API_KEY=your-pinata-key
PINATA_SECRET_API_KEY=your-pinata-secret

# Or use Web3.Storage
WEB3_STORAGE_TOKEN=your-web3storage-token
```

### Development

#### Local Development Server
```bash
# Start Docsify server
pnpm run serve:docs

# Server will be available at http://localhost:3000
```

#### Content Creation
```bash
# Create new blog post (interactive)
pnpm run generate:post

# Enhance content with AI
pnpm run enhance:ai

# Enhance specific file
pnpm run enhance:ai --file docs/posts/2024/12/my-post.md
```

#### Testing and Quality
```bash
# Run linting
pnpm run lint

# Fix linting issues
pnpm run lint:fix

# Format code
pnpm run format

# Run tests (when implemented)
pnpm run test
```

### Deployment

#### GitHub Pages Deployment

1. **Setup Repository**
```bash
# Ensure your repository is connected to GitHub
git remote -v

# If not connected, add remote
git remote add origin https://github.com/your-username/your-repo.git
```

2. **Enable GitHub Pages**
- Go to repository Settings → Pages
- Select "GitHub Actions" as source
- The workflow will automatically deploy on push to main

3. **Push Changes**
```bash
# Commit and push
git add .
git commit -m "Initial Doris Protocol setup"
git push origin main
```

#### IPFS Deployment

1. **Manual Deployment**
```bash
# Deploy to IPFS
pnpm run deploy:ipfs

# Check deployment status
pnpm run deploy:ipfs --status
```

2. **Automated Deployment**
The GitHub Actions workflow automatically deploys to IPFS when:
- Code is pushed to main branch
- Environment secrets are configured

3. **Required GitHub Secrets**
Add these in Repository Settings → Secrets and variables → Actions:
```
PINATA_API_KEY=your-pinata-key
PINATA_SECRET_API_KEY=your-pinata-secret
OPENAI_API_KEY=your-openai-key (optional)
```

### Production Configuration

#### Performance Optimization
```bash
# Build for production
pnpm run build

# Preview production build
pnpm run preview
```

#### Security Configuration
1. **API Key Management**
   - Never commit API keys to repository
   - Use GitHub Secrets for automation
   - Rotate keys regularly

2. **Access Control**
   - Configure repository visibility
   - Set up branch protection rules
   - Enable security alerts

#### Monitoring and Maintenance
1. **Health Checks**
   - Monitor IPFS hash accessibility
   - Check GitHub Pages deployment status
   - Verify AI services functionality

2. **Updates**
   - Regularly update dependencies: `pnpm update`
   - Monitor security vulnerabilities
   - Test new features in development

### Troubleshooting

#### Common Issues

1. **"Cannot find package" errors**
```bash
# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

2. **IPFS deployment failures**
```bash
# Check API keys
echo $PINATA_API_KEY

# Test connection
pnpm run deploy:ipfs --status

# Try alternative service
# Configure Web3.Storage in .env
```

3. **AI enhancement not working**
```bash
# Verify API key
echo $OPENAI_API_KEY

# Check rate limits
# Wait a few minutes and retry

# Use alternative provider
# Set ANTHROPIC_API_KEY instead
```

4. **Docsify server issues**
```bash
# Check port availability
lsof -i :3000

# Kill existing process
kill -9 $(lsof -t -i:3000)

# Restart server
pnpm run serve:docs
```

#### Debug Mode
```bash
# Enable verbose logging
NODE_ENV=development LOG_LEVEL=debug pnpm run serve:docs

# Check build logs
pnpm run build --verbose
```

### Advanced Configuration

#### Custom Domain Setup
1. **GitHub Pages Custom Domain**
   - Add CNAME file to docs/ directory
   - Configure DNS records
   - Enable HTTPS in repository settings

2. **IPFS DNS Link**
   - Configure TXT record: `_dnslink.example.com`
   - Set value: `dnslink=/ipfs/YOUR_HASH`
   - Enable automatic updates in config

#### CI/CD Customization
Edit `.github/workflows/deploy.yml`:
```yaml
# Customize deployment triggers
on:
  push:
    branches: [ main ]
    paths: 
      - 'docs/**'
      - 'scripts/**'
      
# Add custom deployment steps
- name: Custom deployment step
  run: echo "Add your custom logic here"
```

#### Content Management
1. **Bulk Operations**
```bash
# Process all posts with AI
find docs/posts -name "*.md" -exec pnpm run enhance:ai --file {} \;

# Archive old posts
pnpm run archive:monthly
```

2. **Content Migration**
```bash
# Convert existing blog
# Place markdown files in docs/posts/YYYY/MM/
# Run AI enhancement
pnpm run enhance:ai
```

### Maintenance Schedule

#### Daily
- ✅ Monitor deployment status
- ✅ Check IPFS accessibility
- ✅ Review AI enhancement results

#### Weekly  
- ✅ Update dependencies
- ✅ Review content metrics
- ✅ Backup deployment history

#### Monthly
- ✅ Archive old content
- ✅ Security audit
- ✅ Performance review
- ✅ API usage analysis

### Support and Resources

#### Documentation
- [Solution Architecture](/docs/Solution.md)
- [Feature Specifications](/docs/FEATURES.md)
- [Development Plan](/docs/PLAN.md)
- [Change Log](/docs/CHANGES.md)

#### Community
- **GitHub Issues**: Report bugs and feature requests
- **Discussions**: Community support and ideas
- **Wiki**: Community-contributed documentation

#### External Resources
- [Docsify Documentation](https://docsify.js.org/)
- [IPFS Documentation](https://docs.ipfs.tech/)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [Pinata Documentation](https://docs.pinata.cloud/)

### Version Updates

#### Upgrading to New Versions
```bash
# Check current version
cat package.json | grep version

# Update to latest version
git fetch origin
git checkout main
git pull origin main
pnpm install

# Run migration scripts (if any)
pnpm run migrate
```

#### Breaking Changes
- Check CHANGES.md for breaking changes
- Update configuration files as needed
- Test thoroughly before deploying

---

**Last Updated**: 2024-12-26  
**Version**: 0.1.0  
**Next Review**: 2025-01-26 