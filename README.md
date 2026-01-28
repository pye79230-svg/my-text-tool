文本分片工具专业版 (TextSplitter Pro)
一个基于 Web 的本地化文本处理工具，专为处理超长文档（如小说、日志、代码库）而设计。它能在浏览器端高效地将大文件分割成适合 AI 模型（如 ChatGPT, Claude）阅读的小片段。
✨ 核心特性
🔒 隐私优先：采用 Local-First 架构，所有文件处理均在浏览器内存中完成，数据绝不上传至任何服务器。
🌍 多语言支持：内置多种编码格式支持（UTF-8, GBK, Shift_JIS 等），完美解决中文、日文老文档的乱码问题。
🧠 智能断句：
缓冲区模式：基于语义的智能断句算法，自动识别中英文句号、换行符，防止句子被截断。
正则模式：支持自定义正则表达式（如 第.+章）进行结构化分割。
⚡ 极速处理：利用异步非阻塞机制，轻松处理 MB 级以上的纯文本文件。
🛠️ 开发者友好：支持自定义头部注入（Prompt Injection），方便批量生成 AI 提示词。
🚀 快速开始
依赖环境
本项目基于 React 和 Tailwind CSS 构建。
安装与运行
克隆项目
git clone [https://github.com/你的用户名/text-splitter-pro.git](https://github.com/你的用户名/text-splitter-pro.git)


安装依赖
cd text-splitter-pro
npm install


启动开发服务器
npm run dev


📖 使用指南
拖拽上传：直接将 .txt, .md, .json 等文件拖入上传区。
选择编码：如果文件显示乱码，请在配置面板切换编码（推荐尝试 GBK 或 Shift_JIS）。
配置参数：
分片大小：推荐设置为 15,000 字（针对大多数 LLM 上下文窗口优化）。
头部注入：可输入 "请阅读以下片段..." 等指令，工具会自动插入到每个分片的开头。
导出：点击“复制”直接粘贴给 AI，或下载为独立文件。
🛠️ 技术栈
Frontend: React.js, TypeScript
Styling: Tailwind CSS
Icons: Lucide React
Build Tool: Vite (推荐)
🤝 贡献 (Contributing)
欢迎提交 Issues 和 Pull Requests！如果你有更好的断句算法或新的功能建议，请随时贡献。
📄 许可证
本项目采用 MIT License 许可证。

