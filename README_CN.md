# 🚀 Doris Protocol - 去中心化内容创作平台

> **本地优先 • AI增强 • IPFS驱动**

一个融合传统博客功能与Web3经济学的去中心化内容创作和发布平台，帮助内容创作者摆脱大平台垄断，提供无缝的用户体验。

## ⚡ Quick Start 快速开始

### 🏃‍♂️ 普通用户 - 5分钟快速体验

**无需任何配置，一键体验完整功能！**

1. **下载项目**
   ```bash
   git clone https://github.com/your-org/doris-protocol.git
   cd doris-protocol
   ```

2. **一键启动**
   ```bash
   chmod +x start.sh
   ./start.sh
   ```
   
   脚本会自动：
   - 安装所需依赖
   - 配置系统参数
   - 启动Express API服务器（端口3001）
   - 启动Docsify博客服务器（端口3000）
   - 检查服务状态

3. **开始使用**
   
   启动成功后会显示：
   ```
   🎉 Doris Protocol 启动完成!
   
   📋 服务地址：
     📖 博客访问：    http://localhost:3000
     🎛️ 简单管理：    http://localhost:3001/admin.html
     🚀 专业管理：    http://localhost:3001/admin-pro.html
   ```

4. **核心功能体验**
   
   **写作体验**：
   - 访问 http://localhost:3001/admin.html
   - 点击"📝 Create Content"标签
   - 选择模板类型，输入标题和内容
   - 点击"Generate Template"自动生成文章结构
   - 点击"Save Post"保存文章

   **博客浏览**：
   - 访问 http://localhost:3000
   - 浏览已发布的文章
   - 查看自动生成的导航侧边栏

5. **停止服务**
   ```bash
   ./stop.sh
   ```

### 🔧 技术用户 - 完整配置和部署

**适合开发者和需要AI增强功能的用户**

#### 环境要求

- **Node.js**: v20.0.0 或更高版本
- **pnpm**: v8.0.0 或更高版本
- **Git**: 用于版本控制
- **终端**: 命令行访问权限

#### 详细安装步骤

1. **克隆并安装**
   ```bash
   # 克隆项目
   git clone https://github.com/your-org/doris-protocol.git
   cd doris-protocol
   
   # 安装依赖
   pnpm install
   
   # 验证安装
   pnpm --version && node --version
   ```

2. **API配置**（可选 - 用于AI增强功能）
   
   创建环境变量文件：
   ```bash
   cp .env.example .env
   ```
   
   编辑 `.env` 文件，添加你的API密钥：
   
   ```bash
   # GitHub Pages 配置
   GITHUB_REPOSITORY=your-org/doris-protocol
   GITHUB_PAGES_URL=your-org.github.io/doris-protocol
   
   # AI服务配置（选择一个或多个）
   
   # OpenAI (推荐)
   OPENAI_API_KEY=sk-your-openai-api-key
   OPENAI_MODEL=gpt-4
   
   # DeepSeek (性价比高)
   DEEPSEEK_API_KEY=sk-your-deepseek-key
   DEEPSEEK_BASE_URL=https://api.siliconflow.cn/v1
   DEEPSEEK_MODEL=deepseek-chat
   
   # Anthropic Claude (替代选择)
   ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
   ANTHROPIC_MODEL=claude-3-sonnet-20240229
   
   # Google Gemini (免费额度大)
   GEMINI_API_KEY=your-gemini-api-key
   GEMINI_MODEL=gemini-2.5-flash
   
   # IPFS部署配置
   PINATA_API_KEY=your-pinata-api-key
   PINATA_SECRET_API_KEY=your-pinata-secret
   ```

3. **启动方式**
   
   **方式1：一键启动（推荐）**
   ```bash
   ./start.sh
   ```
   
   **方式2：分别启动**
   ```bash
   # 终端1：启动API服务器
   pnpm run dev
   
   # 终端2：启动博客服务器
   pnpm run serve:docs
   ```

4. **功能测试**
   ```bash
   # 运行完整测试套件
   pnpm test
   
   # 运行特定测试
   pnpm run test:unit          # 单元测试
   pnpm run test:integration   # 集成测试
   
   # 生成测试覆盖率报告
   pnpm run test:coverage
   ```

#### 高级功能配置

**AI增强内容创作**
1. 配置至少一个AI服务的API密钥
2. 访问管理界面：http://localhost:3001/admin.html
3. 在"🤖 AI Enhance"标签中选择AI提供商
4. 选择要增强的文章和增强选项
5. 点击"🤖 Enhance with AI"

**IPFS去中心化部署**
1. 注册Pinata账户或配置Web3.Storage
2. 在`.env`中添加相应的API密钥
3. 在"🚀 Deploy"标签中点击"Deploy to IPFS"
4. 获得GitHub Pages和IPFS的访问地址

**GitHub Pages自动部署**
1. 推送代码到GitHub仓库
2. 启用GitHub Pages功能
3. GitHub Actions会自动部署到GitHub Pages

#### 开发调试

**日志查看**
```bash
# 查看Express服务器日志
tail -f logs/express.log

# 查看Docsify服务器日志
tail -f logs/docsify.log
```

**API测试**
```bash
# 测试文章列表API
curl http://localhost:3001/api/posts

# 测试AI增强API（需要配置API密钥）
curl -X POST http://localhost:3001/api/enhance-content \
  -H "Content-Type: application/json" \
  -d '{"postFile":"2024/12/example.md","provider":"openai","options":{"improveTitle":true}}'
```

**故障排除**

1. **端口被占用错误**
   ```bash
   # 查看端口占用
   lsof -i :3000
   lsof -i :3001
   
   # 强制停止
   ./stop.sh
   ```

2. **文件监控错误 (EMFILE)**
   ```bash
   # 脚本已自动处理，手动设置：
   ulimit -n 4096
   ```

3. **依赖安装失败**
   ```bash
   # 清理缓存重新安装
   rm -rf node_modules pnpm-lock.yaml
   pnpm install
   ```

## 📱 Web界面使用指南

### 简单管理界面 (admin.html)

适合日常使用，提供核心功能：

- **📝 Create Content**: 创建新文章
  - 选择模板类型（日常、技术、思考等）
  - 使用AI生成文章结构
  - 实时保存和预览

- **🤖 AI Enhance**: AI内容增强
  - 支持多个AI提供商
  - 可选择增强选项（标题、摘要、标签、内容）
  - 实时显示增强效果

- **👁️ Preview**: 内容预览
  - Markdown原文和渲染效果对比
  - 支持在Docsify中打开

- **🚀 Deploy**: 部署发布
  - 一键部署到GitHub Pages
  - 一键部署到IPFS网络
  - 显示访问地址和使用提示

- **📁 Manage Posts**: 文章管理
  - 查看所有文章列表
  - 编辑和删除文章

### 专业管理界面 (admin-pro.html)

提供高级功能：

- **🤖 AI Chat**: AI对话助手
- **📊 Analytics**: 数据分析
- **⚙️ Advanced Settings**: 高级设置
- **🌐 IPFS Tools**: IPFS工具

## 🎯 典型使用场景

### 场景1：技术博主

1. 使用"Tech Article"模板创建技术文章
2. 用AI增强内容结构和表达
3. 部署到GitHub Pages作为主站
4. 同时部署到IPFS确保永久可访问

### 场景2：个人日记

1. 使用"Daily Post"模板记录日常
2. 选择性使用AI优化文笔
3. 仅本地使用，不配置云服务

### 场景3：项目文档

1. 使用"Project Update"模板
2. 利用AI生成摘要和标签
3. 自动部署到团队GitHub Pages

## 🔧 自定义和扩展

### 添加自定义模板

1. 在`templates/`目录创建新的`.md`模板文件
2. 在管理界面的模板选择中会自动出现

### 修改主题样式

1. 编辑`docs/index.html`中的CSS样式
2. 或使用docsify主题插件

### 集成其他AI服务

1. 在`src/server.js`中添加新的AI服务函数
2. 在管理界面添加新的选项

## 📊 系统要求和性能

- **最低配置**: 2GB RAM, 1GB 磁盘空间
- **推荐配置**: 4GB RAM, 5GB 磁盘空间
- **网络要求**: AI功能需要网络连接
- **浏览器支持**: Chrome, Firefox, Safari, Edge

## 🛡️ 安全和隐私

- **本地优先**: 核心数据存储在本地
- **API密钥安全**: 环境变量存储，不提交到版本控制
- **去中心化**: IPFS确保内容永久性和抗审查
- **开源透明**: 所有代码公开可审计

---

## 📞 获得帮助

- **问题反馈**: [GitHub Issues](https://github.com/your-org/doris-protocol/issues)
- **功能建议**: [GitHub Discussions](https://github.com/your-org/doris-protocol/discussions)
- **使用文档**: [完整文档](README.md)

**🌟 开始你的去中心化内容创作之旅！** 