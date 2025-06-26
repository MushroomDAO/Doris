# GeminiCli 与 ClaudeCode 的快速对比

Google发布了 Gemini-Cli 对标 Claude-Code。给大家梳理两个工具的快速对比!
 
其实连 Google 自己官推都没搞清楚 Gemini-cli 相对于 Claude-Code 强在哪里。
 
gemini-cli 其实定位是 Agentic Workflow Tool，Claude-code 是 Agentic Coding Tool
 
最大的原因是，Gemini-cli 不但拥有写代码功能：
gemini-2.5-pro 写代码
超大代码库支持（1M上下文）
Github集成（查询 PR, issues, git 历史等）
 
还拥有其他工作流所需的工具：
本地系统交互 (如转换图片格式, 按月整理PDF发票等)
内置网络搜索 (内置 Google Search)
多模态能力 (能从 PDF 或草图生成应用)
外部服务集成 (如调用 Imagen, Veo, Lyria 进行媒体生成)
 
一句话总结：claude-code 能在命令行进行 Agentic Coding，而gemini-cli 不但能coding，结合他的多模态能力，还能进行其他任务，当成 Agentic Workflow 使用。（当然我估计 claude-code 很快就会跟进）
 
简单举几个用例场景：
- 提取当前文件夹内所有发票的金额并汇总为文档
- 帮我回忆一下我昨天在这个文件夹内操作了什么
- 把所有当前文件夹内的图片使用veo3转换为视频，你需要分析照片的内容并给出一些生动的prompt让照片动起来，最后使用flow将他们剪辑到一起