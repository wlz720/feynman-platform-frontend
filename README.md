# Feynman 学习平台 · 前端

基于 React 19 + Vite 的单页应用，为「费曼学习法」知识管理平台提供界面：知识点管理、Markdown 笔记渲染（代码高亮 / 数学公式 / 流程图），以及费曼复述录音并转写为文字。

## 功能

- **账号**：注册、登录，JWT 存于 localStorage，受保护路由拦截未登录访问
- **知识点**：列表浏览、新建、编辑、删除，按用户隔离
- **Markdown 渲染**：GFM 表格、代码高亮、KaTeX 数学公式、Mermaid 流程图
- **费曼复述**：浏览器录音 → 转 16kHz 单声道 WAV → 上传后端 → 显示识别文本

## 技术栈

| 用途 | 选型 |
| --- | --- |
| 框架 / 构建 | React 19 + Vite 8 |
| 路由 | react-router-dom 7（含受保护路由） |
| 请求 | axios（统一实例 + 请求拦截器注入 token） |
| Markdown | react-markdown 10 + remark-gfm + remark-math + rehype-katex + rehype-highlight |
| 流程图 | mermaid 12（动态 import，按需加载） |
| 录音 | react-media-recorder 1.7（基于浏览器 MediaRecorder） |
| 音频转码 | Web Audio API（decodeAudioData + OfflineAudioContext） |

## 快速开始

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 产物输出到 dist/
```

需要先启动后端（默认 `http://localhost:3000`），地址配置在 `src/api/axios.js` 的 `baseURL`。

## 目录结构

```
src/App.jsx                      路由表（公开页 / 受保护页）
src/api/axios.js                 axios 实例与 token 拦截器
src/components/MarkdownContent.jsx  公式、流程图、代码高亮渲染
src/components/KnowledgeList.jsx    知识点列表卡片
src/pages/DashboardPage.jsx      知识点浏览首页
src/pages/KnowledgePointFormPage.jsx 新建 / 编辑表单
src/pages/FeynmanRecordPage.jsx  录音与转录结果
src/pages/LoginPage.jsx          登录
src/pages/RegisterPage.jsx       注册
src/utils/audio.js               录音转 16000Hz 单声道 PCM WAV
```

## 实现说明

### 录音为什么要转码

Chrome 的 MediaRecorder 输出的是 `audio/webm;codecs=opus`，而百度短语音要求 16000Hz、单声道、WAV/PCM。仅把文件重命名为 `.wav` 并不改变字节内容，服务端会判定格式错误。因此 `src/utils/audio.js` 先用 `decodeAudioData` 解码，再用 `OfflineAudioContext(1, 时长×16000, 16000)` 重采样并混为单声道，最后按 WAV 规范写入 44 字节文件头，PCM 量化为 16 位小端。

### 上传时的 Content-Type

`src/api/axios.js` **不设置**默认的 `Content-Type: application/json`。axios 1.x 在 `Content-Type` 为 JSON 且数据是 FormData 时，会把表单序列化成 JSON（`transformRequest`），导致文件丢失、后端收到空请求体。普通对象请求仍由 axios 自动加上 JSON 头，multipart 则由浏览器自动生成带 boundary 的头。

### 流程图

mermaid 体积较大，采用动态 `import()` 拆包，仅在渲染到含 `language-mermaid` 的代码块时加载；渲染失败会降级为一段中文错误提示，不影响页面其余部分。

## 仓库

- 前端：<https://github.com/wlz720/feynman-platform-frontend>
- 后端：<https://github.com/wlz720/feynman-platform-backend>
