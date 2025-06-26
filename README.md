# 🚀 Doris Protocol - 去中心化内容创作平台

> **Local First • AI Enhanced • IPFS Powered**

一个融合传统博客功能与Web3经济学的去中心化内容创作和发布平台。

## ⚡ Quick Start 快速开始

### 🏃‍♂️ 普通用户（5分钟快速体验）

1. **克隆项目**
   ```bash
   git clone https://github.com/your-org/doris-protocol.git
   cd doris-protocol
   ```

2. **一键启动**
   ```bash
   chmod +x start.sh
   ./start.sh
   ```

3. **开始使用**
   - 📖 访问博客：http://localhost:3000
   - 🎛️ 内容管理：http://localhost:3001/admin.html
   - 🚀 高级功能：http://localhost:3001/admin-pro.html

4. **停止服务**
   ```bash
   ./stop.sh
   ```

### 🔧 技术用户（完整配置）

1. **环境要求**
   - Node.js 20+
   - pnpm 8+
   - Git

2. **安装依赖**
   ```bash
   git clone https://github.com/your-org/doris-protocol.git
   cd doris-protocol
   pnpm install
   ```

3. **环境配置**（可选，用于AI增强功能）
   ```bash
   cp .env.example .env
   # 编辑 .env 文件添加API密钥
   ```
   
   支持的AI服务：
   - **OpenAI**: `OPENAI_API_KEY=sk-your-key`
   - **DeepSeek**: `DEEPSEEK_API_KEY=sk-your-key`
   - **Anthropic**: `ANTHROPIC_API_KEY=sk-ant-your-key`
   - **Google Gemini**: `GEMINI_API_KEY=your-key`

4. **启动服务**
   ```bash
   # 方式1：一键启动（推荐）
   ./start.sh
   
   # 方式2：手动启动
   pnpm run dev        # Express服务器 (端口3001)
   pnpm run serve:docs # Docsify服务器 (端口3000)
   ```

5. **测试功能**
   ```bash
   pnpm test           # 运行测试套件
   ```

### 📋 主要功能

- ✅ **内容创建**：支持Markdown编写和AI辅助生成
- ✅ **AI增强**：多平台AI服务支持（OpenAI、DeepSeek、Claude、Gemini）
- ✅ **去中心化发布**：GitHub Pages + IPFS双重部署
- ✅ **本地优先**：核心功能完全离线可用
- ✅ **Web管理界面**：简单友好的内容管理

---

## 🏗️ Architecture 架构设计

Doris Protocol implements a **Local First** design philosophy, ensuring core functionality works completely offline while providing optional cloud services for enhanced features.

## For Whom?
For content creators, bloggers, and anyone who wants to share their thoughts and ideas with the world.
**Escape from the big platform's Data Hegemony.**

## Features
1. Permissionless: Anyone can use it to create their own content.
2. Decentralized: No central authority to control the content.
3. Open Source: Anyone can contribute to the protocol.
4. Interoperable: We offer code and production level support for users.
5. Scalable: We are building a [community](https://github.com/mushroomdao/Mycelium-Protocol/discussions) of users and contributors.
6. Trustless: We are using crypto and ZK to guarantee your content is tamper-proof.

## Install

## Client Tool
Download this and install in your local machine.

## Usage

## Contribute

## License
It is a sub protocol of Mycelium Protocol. Follow the [Mycelium Protocol](https://github.com/mushroomdao/Mycelium-Protocol) license.
