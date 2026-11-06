# Feynman 学习平台 · 前端

基于 React 19 + Vite 的单页应用，为「费曼学习法」知识管理平台提供界面：知识点管理、Markdown 笔记渲染（代码高亮 / 数学公式 / 流程图），以及费曼复述录音、语音转写与 AI 教练评分反馈。

## 功能

- **账号**：注册、登录，JWT 存于 localStorage，受保护路由拦截未登录访问
- **知识点**：列表浏览、新建、编辑、删除，按用户隔离
- **Markdown 渲染**：GFM 表格、代码高亮、KaTeX 数学公式、Mermaid 流程图
- **费曼复述**：浏览器录音 → 转 16kHz 单声道 WAV → 上传后端 → 显示识别文本
- **AI 教练**：转录完成后先让用户核对/修改文本，点击「提交给 AI 教练」才请求大模型，展示润色文本、综合评价、优点/待改进与 0-100 分；改完文本可重新评分
- **复述详情**：点击知识点卡片进入详情页，回看上次复述原文、润色结果与评价细则
- **复习闭环**：得分低于 60 自动进入复习列表，仪表盘卡片变红并显示「需复习」与上次得分

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
src/pages/KnowledgePointDetailPage.jsx 知识点详情与上次复述评价
src/pages/FeynmanRecordPage.jsx  录音、可编辑转录与 AI 教练反馈
src/pages/LoginPage.jsx          登录
src/pages/RegisterPage.jsx       注册
src/utils/audio.js               录音转 16000Hz 单声道 PCM WAV
```

## 实现说明

### 录音为什么要转码

Chrome 的 MediaRecorder 输出的是 `audio/webm;codecs=opus`，而百度短语音要求 16000Hz、单声道、WAV/PCM。仅把文件重命名为 `.wav` 并不改变字节内容，服务端会判定格式错误。因此 `src/utils/audio.js` 先用 `decodeAudioData` 解码，再用 `OfflineAudioContext(1, 时长×16000, 16000)` 重采样并混为单声道，最后按 WAV 规范写入 44 字节文件头，PCM 量化为 16 位小端。

### 上传时的 Content-Type

`src/api/axios.js` **不设置**默认的 `Content-Type: application/json`。axios 1.x 在 `Content-Type` 为 JSON 且数据是 FormData 时，会把表单序列化成 JSON（`transformRequest`），导致文件丢失、后端收到空请求体。普通对象请求仍由 axios 自动加上 JSON 头，multipart 则由浏览器自动生成带 boundary 的头。

### 流程图与 XSS 防护

mermaid 体积较大，采用动态 `import()` 拆包，仅在渲染到含 `language-mermaid` 的代码块时加载；渲染失败会降级为一段中文错误提示，不影响页面其余部分。

安全上有三层处理：

1. **Markdown 正文**：`react-markdown` 默认不解析原始 HTML，组件里再显式设置 `skipHtml`，`<script>`、`<img onerror>` 这类内容不会进入 DOM；`javascript:` 链接也会被默认的 URL 过滤清空。代码块里的尖括号会被转义成文本，因此课程要求保留的代码示例不受影响。
2. **Mermaid SVG**：mermaid 在 `securityLevel: 'strict'` 下自带一次过滤，但 SVG 最终要通过 `dangerouslySetInnerHTML` 插入，属于「零信任」边界，因此在插入前再用 `DOMPurify.sanitize()` 按 mermaid 相同的白名单（`foreignobject`、`dominant-baseline`）消毒一遍，保留图形与文字、剥离脚本和事件属性。
3. **输入边界**：后端对 `title`（≤200 字）与 `content`（≤10 万字）做类型和长度校验，避免超长内容拖垮渲染。

课程第六课的测试样例（`<script>alert('Hacked!')</script>`、`<img onerror=...>`）已验证：页面正常渲染标题，不出现弹窗，DOM 中也不存在脚本与事件属性。

### AI 教练反馈

转录成功后只回填文本，不会自动请求评分；用户核对（可修改）后点击「提交给 AI 教练」，前端才调用 `POST /audio/evaluate`，并带上 `knowledgePointId`，由后端在返回评价的同时写回知识点的 `lastAttempt` 与复习状态。这样「展示反馈」和「更新学习状态」在一次请求里完成，不会出现前端拿到分数但状态没保存的中间态，也避免识别错误时白白消耗一次模型调用。

识别结果放在可编辑的 textarea 里：语音识别常把专有名词听错，用户改完点「用修改后的文本重新评分」即可覆盖上一次结果；文本改过但未重新评分时，按钮旁会提示「文本已修改，建议重新评分」。

录音回调用 `useCallback` 固定依赖 `id`，避免 `useReactMediaRecorder` 的 `onStop` 拿到旧闭包里的状态。对话模型偶尔会把 JSON 包进代码块或前后加一句解释，后端已做容错提取；前端只消费规范化后的 `{ polishedText, evaluation, strengths, weaknesses, score, saved }`。

## 仓库

- 前端：<https://github.com/wlz720/feynman-platform-frontend>
- 后端：<https://github.com/wlz720/feynman-platform-backend>
