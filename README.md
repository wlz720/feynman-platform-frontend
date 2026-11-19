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
- **AI 测评**：按知识点选择难度（基础/中等/困难）与题型（单选/简答）现场出题；单选题前端判分，简答题交给 AI 阅卷；答错自动把知识点加入复习列表
- **AI 助手（RAG）**：与自己的整个知识库对话——后端先向量检索最相关的知识点片段，再由大模型据此作答，回答下方展示可点击的引用来源；知识库没有的内容会直说，不编造
- **知识图谱**：ECharts 力导向图展示知识点引用关系，支持拖拽节点、缩放漫游、悬停高亮关联、点击跳详情；节点按学习状态着色（绿=已掌握 / 橙=需复习 / 紫=未开始）
- **3D 视界**：Three.js 把知识点映射成三维「星球」（颜色=学习状态），引用关系变成「星际航线」；鼠标悬停高亮星球与相连航线，点击星球进入知识点详情，另含一个旋转立方体演示场景/相机/渲染器三要素

## 技术栈

| 用途 | 选型 |
| --- | --- |
| 框架 / 构建 | React 19 + Vite 8 |
| 路由 | react-router-dom 7（含受保护路由） |
| 请求 | axios（统一实例 + 请求拦截器注入 token） |
| Markdown | react-markdown 10 + remark-gfm + remark-math + rehype-katex + rehype-highlight |
| 流程图 | mermaid 12（动态 import，按需加载） |
| 录音 | react-media-recorder 1.7（基于浏览器 MediaRecorder） |
| 图表 | echarts + echarts-for-react（按需注册 GraphChart，只打包力导向图所需模块） |
| 3D | three（原生 WebGL 渲染、OrbitControls、Raycaster 鼠标拾取） |
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
src/pages/QuizPage.jsx           AI 出题测评（难度/题型切换、语音输入、AI 评分阅卷、答错入复习）
src/pages/QuizHistoryPage.jsx    测评记录（分数/错题筛选/历史回顾）
src/pages/AgentPage.jsx          AI 助手（RAG 知识库问答聊天界面）
src/pages/GraphPage.jsx          知识图谱（ECharts 力导向图）
src/pages/ThreeJSPage.jsx        3D 视界（Three.js 知识星球 + 旋转立方体演示）
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
3. **输入边界与入库消毒**：后端对 `title`（≤200 字）与 `content`（≤10 万字）做类型和长度校验，并在写入前删除代码块之外的原始 HTML，恶意载荷不会进入数据库；围栏代码块与行内代码保持原样。

课程第六课的测试样例（`<script>alert('Hacked!')</script>`、`<img onerror=...>`）已验证：页面正常渲染标题，不出现弹窗，DOM 中也不存在脚本与事件属性。

### AI 教练反馈

转录成功后只回填文本，不会自动请求评分；用户核对（可修改）后点击「提交给 AI 教练」，前端才调用 `POST /audio/evaluate`，并带上 `knowledgePointId`，由后端在返回评价的同时写回知识点的 `lastAttempt` 与复习状态。这样「展示反馈」和「更新学习状态」在一次请求里完成，不会出现前端拿到分数但状态没保存的中间态，也避免识别错误时白白消耗一次模型调用。

识别结果放在可编辑的 textarea 里：语音识别常把专有名词听错，用户改完点「用修改后的文本重新评分」即可覆盖上一次结果；文本改过但未重新评分时，按钮旁会提示「文本已修改，建议重新评分」。

录音回调用 `useCallback` 固定依赖 `id`，避免 `useReactMediaRecorder` 的 `onStop` 拿到旧闭包里的状态。对话模型偶尔会把 JSON 包进代码块或前后加一句解释，后端已做容错提取；前端只消费规范化后的 `{ polishedText, evaluation, strengths, weaknesses, score, saved }`。

### AI 出题测评

`QuizPage` 进入时先加载知识点，「难度」和「题型」两项都选完、且用户点「开始出题」后才请求 `POST /ai/generate-question`。只选一项时按钮保持禁用并提示「请先选择难度和题型」，不会因为点了难度就立刻出题；已出题后再改选项只提示「选择已更改，点『重新出题』生成新题」，不会自动消耗模型调用。

简答题支持语音输入：回答框下方有「🎤 语音输入」按钮，录音结束后复用 `src/utils/audio.js` 把浏览器录音转成 16kHz 单声道 WAV，再调 `POST /audio/transcribe`；识别结果会追加到回答框，识别错的字可以继续手改，多次录音会依次拼接，提交前不会自动评分。麦克风未授权或设备不可用时会在按钮下方给出中文提示，不影响手动作答。

提交后题目与结果同屏展示，方便对照学习：单选题在选项上直接标「（正确答案）」和「（你的选择）」，结果区再列正确答案、你的选择与解析；简答题保留题干和学生回答（只读），结果区先给 0-100 的阅卷分数（≥80 绿、60-79 黄、<60 红），再按三组列反馈——「符合知识点」（绿）、「正确但知识点未涵盖（属于关联拓展，不算错）」（蓝）、「需要修正或补充」（黄），最后是阅卷意见。60 分及格，低于 60 分自动加入复习列表；这些分组和分数都来自后端结构化阅卷，不再是笼统的一句评价。

答错的题目会自动把知识点加入复习列表（`PUT /api/knowledge-points/:id` 写 `reviewList: true`），并在结果区提示；每次提交都会调用 `POST /api/quiz/attempts` 保存记录，成功显示「本次作答已保存到测评记录」，失败只提示、不影响结果展示。

### 测评记录（暂时隐藏）

`/quiz/:id/history` 由 `QuizHistoryPage` 渲染，页面取标题后请求 `GET /api/quiz/attempts?knowledgePointId=...&limit=100`，顶部显示总作答数与答错数；「全部记录 / 只看错题」切换会带上 `onlyWrong=true` 重新查询。每条记录按题型还原：单选高亮「你的选择」与「正确答案」，简答展示分数、三组反馈与阅卷意见。

这个功能是否保留还在斟酌，因此当前**隐藏了所有入口**（测评页顶部/结果区、知识点详情页），`App.jsx` 里也没有挂载该路由，页面文件暂时保留。作答记录仍会在后台写入数据库，恢复时在 `App.jsx` 加回 `/quiz/:id/history` 路由并恢复入口即可。

### AI 助手（课时11：RAG 问答）

`/agent` 由 `AgentPage` 渲染，导航栏「AI助手」进入。聊天界面维护 `messages / inputValue / isLoading` 三个状态：发送后先把用户消息上屏，再调 `POST /ai/rag-qa`，等待期间显示三点跳动的「思考中」气泡，新消息自动平滑滚动到底部。

机器人回答用 `MarkdownContent` 渲染（复用公式/代码高亮/流程图能力，且同样经过 XSS 消毒）；回答下方把后端返回的 `sources` 渲染成「引用来源」chips，点击跳转到对应知识点详情页，悬停可看检索片段摘要。后端返回的中文错误（凭证缺失、限流、欠费等）直接以红色气泡展示，网络中断才用兜底文案。

### 知识图谱（课时12）

`/graph` 由 `GraphPage` 渲染。数据来自 `GET /api/graph/knowledge-map`：每个知识点是一个节点，A 的正文提到 B 的标题就生成一条 A→B 的引用边（带箭头）。前端用 ECharts `graph` 系列的 `force` 力导向布局：`roam` 支持缩放平移、`draggable` 支持拖拽节点、`emphasis.focus: 'adjacency'` 悬停高亮一度邻居。

课后挑战题已实现：后端节点带 `status / reviewList`，前端据此着色（`mastered` 绿、`reviewList` 橙、其余紫），并配 legend 图例；Tooltip 展示标题、状态、创建时间与内容摘要（选做的 G6 Tooltip 等价实现）。点击节点跳转知识点详情页。

体积控制：`echarts-for-react/lib/core` + `echarts/core` 按需注册 `GraphChart / Tooltip / Legend / CanvasRenderer`，不引入整包 echarts，主 bundle 少打约 600KB。

### 3D 视界（课时13）

`/3d-world` 由 `ThreeJSPage` 渲染，导航栏「3D视界」进入，页内可切换两种模式：

- **知识宇宙**：复用 `GET /api/graph/knowledge-map` 的节点与引用边，每个知识点是一颗球体，颜色沿用学习状态（绿/橙/紫），球体半径随 `symbolSize` 缩放；引用边用 `THREE.Line` 连接两端节点。悬停时通过 `Raycaster` 拾取星球，材质 `emissive` 发光并高亮相连航线、其余航线降透明度，左上角浮层显示标题与正文摘要；点击（按下与抬起位移 < 5px，避免和拖拽旋转冲突）跳转知识点详情。
- **旋转立方体**：课件第二部分的 Hello 3D World，绿色立方体自转，用于演示场景 `Scene`、透视相机 `PerspectiveCamera`、渲染器 `WebGLRenderer` 三要素与 `OrbitControls`。

实现细节：

1. **响应式**：窗口尺寸变化时由 `window.resize` 监听同步更新 `camera.aspect`、投影矩阵与渲染器尺寸；容器高度为 `72vh`。
2. **资源释放**：几何体、材质、`OrbitControls`、`WebGLRenderer` 与事件监听在 `useEffect` 清理函数里逐个 `dispose()`，切换模式或卸载页面不会残留 WebGL 上下文。
3. **避免重复建场景**：`navigate` 通过 ref 透传，不放进 3D `useEffect` 依赖，否则路由变化会重建整个宇宙。
4. **数据未就绪**：图谱数据没回来前不初始化场景，空知识库时给出中文引导而不是黑屏。

### 接口地址

`src/api/axios.js` 默认连 `http://localhost:3000/api`；如需临时指向别的后端实例（例如同时跑多个环境），启动前设置 `VITE_API_BASE_URL=http://localhost:3100/api` 即可，不需要改代码。

## 仓库

- 前端：<https://github.com/wlz720/feynman-platform-frontend>
- 后端：<https://github.com/wlz720/feynman-platform-backend>
