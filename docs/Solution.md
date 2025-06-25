# Doris Protocol Solution

## Project Overview

Doris Protocol is a decentralized content creation and publishing platform that combines traditional blog functionality with Web3 economics. It's designed to help content creators escape from big platform hegemony while providing a seamless user experience.

### Vision
**Not only** a blog tool for content creators, but also a new **economics model** to **escape from big platform hegemony**.

### Target Users
- Content Creators
- Bloggers
- Anyone who wants to share their thoughts and ideas with the world

## System Architecture

### Core Components

#### 1. Content Carrier (内容载体)
- **Framework**: Docsify-based static site generator
- **Features**: Simple, fast, no build process required
- **Storage**: Markdown files in git repository

#### 2. Content Generation (内容产生)
- **AI Framework**: Open-source AI chat framework
- **Workflow**: Interactive content creation with AI assistance
- **Input**: Raw materials provided by users
- **Output**: Standard markdown documents
- **Integration**: MCP (Model Context Protocol) + AI APIs

#### 3. Content Publishing (内容发布)
- **Primary**: GitHub Pages (automatic deployment via git push)
- **Secondary**: IPFS (automatic pinning and distribution)
- **Process**: Push to git → GitHub Actions → Deploy to both platforms

#### 4. User System (用户体系)
- **Authentication**: Auth.js-based external account login
- **Providers**: GitHub, Google, Email
- **Account Binding**: ERC4337 crypto account for scoring system

#### 5. Backend Services (后台服务)
- **IPFS Pin Service**: Content persistence on IPFS
- **Content Indexing**: Search and discovery
- **Content Modification**: Edit and republish workflow
- **Scoring System**: Like/Unlike with token economics
- **Score Calculation**: Based on user interactions and content quality

#### 6. Token Economics (积分系统)
- **Implementation**: External ERC4337 account integration
- **Functions**: Score payment, deduction, income distribution
- **Integration**: API calls to external smart contract system

## Technical Stack

### Frontend
- **Core**: Docsify (no build process, pure static)
- **Theme**: docsify-themeable or custom theme
- **Plugins**:
  - docsify-pagination (pagination)
  - docsify-copy-code (code copying)
  - docsify-tabs (tabbed content)
  - docsify-search (content search)

### Backend/Automation
- **CI/CD**: GitHub Actions
- **Runtime**: Node.js (latest LTS)
- **Package Manager**: pnpm
- **Authentication**: Auth.js (NextAuth.js)
- **Database**: JSON files or lightweight DB for indexing

### AI Services
- **Primary**: OpenAI API (GPT-4)
- **Alternative**: Claude API
- **Local Option**: Ollama (optional)
- **Protocol**: MCP for AI integration

### IPFS Integration
- **Paid Service**: Pinata (stable and reliable)
- **Free Option**: Web3.Storage
- **Self-hosted**: IPFS node (optional)

### Blockchain Integration
- **Account Abstraction**: ERC4337
- **Score Token**: External smart contract
- **Network**: Ethereum L2 (Polygon, Arbitrum, etc.)

## Project Structure

```
blog-template/
├── .github/
│   └── workflows/
│       ├── deploy.yml          # Auto deployment
│       ├── archive.yml         # Monthly archiving
│       └── ai-generate.yml     # AI content generation
├── docs/                       # Docsify documentation
│   ├── _sidebar.md            # Sidebar configuration
│   ├── _navbar.md             # Navigation bar
│   ├── index.html             # Docsify configuration
│   ├── README.md              # Homepage
│   ├── posts/                 # Blog posts
│   │   └── 2024/
│   │       ├── 01/
│   │       └── 02/
│   └── archives/              # Historical archives
│       └── monthly/
├── scripts/                   # Automation scripts
│   ├── generate-post.js       # Generate post templates
│   ├── ai-enhance.js          # AI content enhancement
│   ├── archive-monthly.js     # Monthly archiving
│   ├── deploy-ipfs.js         # IPFS publishing
│   ├── auth-handler.js        # Authentication logic
│   ├── score-manager.js       # Score system integration
│   └── utils/
├── templates/                 # Article templates
│   ├── daily-post.md
│   └── weekly-summary.md
├── config/
│   ├── docsify.config.js
│   ├── ai.config.js
│   ├── auth.config.js
│   └── ipfs.config.js
├── src/                       # Source code
│   ├── components/            # UI components
│   ├── services/              # Service integrations
│   └── utils/                 # Utility functions
└── package.json
```

## Feature Roadmap

### Basic Ability (v0.1.0)
- Get an Account (Email or GitHub login via Auth.js)
- Create a blog post using AI assistance
- Publish a blog to GitHub Pages
- Basic content management (CRUD operations)
- Simple search functionality

### Content Economics (v0.2.0)
- IPFS publishing and pinning
- Like/Unlike functionality with score tokens
- Comment system with token requirements
- Follow/Unfollow system
- Score algorithm implementation
- Content indexing service

### Advanced Features (v0.3.0)
- Advanced AI content generation
- Content recommendation system
- Advanced search and filtering
- Analytics and insights
- Mobile app integration
- Community features

## Core Algorithms

### Score Algorithm
1. **Content Scoring**: Based on likes, comments, and engagement
2. **Token Economy**: Users pay tokens to interact (like/comment)
3. **Revenue Sharing**: Content creators earn from interactions
4. **Quality Control**: Bad content gets cold-indexed through unlikes
5. **Owner Hash**: Cryptographic proof of content ownership

### Content Indexing
- Real-time indexing of new content
- Search optimization for discovery
- Content categorization and tagging
- Performance metrics tracking

## Security Considerations
- Content integrity through cryptographic hashes
- Decentralized storage prevents censorship
- User authentication through established providers
- Token-based spam prevention
- Rate limiting on interactions

## Deployment Strategy
1. **Template Repository**: Create reusable template
2. **One-click Setup**: Automated repository creation
3. **Local Development**: Easy setup with pnpm
4. **Automatic Deployment**: GitHub Actions for CI/CD
5. **IPFS Integration**: Seamless decentralized publishing

This solution provides a comprehensive framework for decentralized content creation while maintaining simplicity and user-friendliness.







