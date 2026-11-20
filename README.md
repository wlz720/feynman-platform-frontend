# Feynman 学习平台 · 前端

基于 React 19 + Vite 的单页应用，为「费曼学习法」知识管理平台提供界面：知识点管理、Markdown 笔记渲染（代码高亮 / 数学公式 / 流程图），以及费曼复述录音、语音转写与 AI 教练评分反馈。全站使用统一的设计系统（紫罗兰主题、卡片/表单/按钮规范、响应式布局），并提供学习概览、下一步复习建议与 2D/3D 知识可视化。

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
- **3D 视界**：Three.js 把知识点映射成三维「星球」（颜色=学习状态），引用关系变成弯曲的「星际航线」；星球带光晕、轨道环与 CSS2D 常驻标签，鼠标悬停高亮星球与相连航线，点击星球进入知识点详情，另含一个霓虹旋转立方体场景/相机/渲染器演示
- **3D 知识宇宙**：在 3D 视界之上用 `d3-force-3d` 做三维力导向布局，星球自动排布成星系；节点带动态光晕与常驻标签，航线是实时更新的发光弧线；点击星球弹出信息浮层（标题、状态、内容摘要），可跳转知识点详情
- **跨平台**：`Electron` 把同一套 React 应用封装成 Windows/macOS 桌面程序；`PWA` 让网站在 Chrome 里可「安装到主屏」并离线打开应用外壳

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
| 3D 力导向 | d3-force-3d（三维电荷斥力 + 链接弹簧 + 中心力） |
| 桌面端 | Electron 45（主进程 + 渲染进程，原生菜单与 IPC 边界） |
| 移动端 / 离线 | PWA（vite-plugin-pwa + Workbox：manifest + Service Worker） |
| 部署 | Docker 多阶段构建 + Nginx（SPA 回退、/api 反向代理） |
| 音频转码 | Web Audio API（decodeAudioData + OfflineAudioContext） |

## 快速开始

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 产物输出到 dist/
npm run preview    # 本地预览生产构建

npm run electron:dev    # 同时启动 Vite 与 Electron 桌面窗口（需先启动后端）
npm run electron:build  # 构建相对路径版本并打包安装包到 release/（耗时较长）
```

需要先启动后端（默认 `http://localhost:3000`），地址配置在 `src/api/axios.js` 的 `baseURL`。

## 目录结构

```
src/App.jsx                      路由表（公开页 / 受保护页）
electron.cjs                     Electron 主进程（窗口、菜单、权限、外链策略）
public/pwa-192x192.png           PWA 图标（192）
public/pwa-512x512.png           PWA 图标（512）
Dockerfile                       课时16 前端镜像（Node 构建 → Nginx）
nginx.conf                       SPA 回退、/api 反向代理、缓存与压缩
docker-compose.yml               前端 + 后端两个容器一键启动
docs/项目总结与汇报.md            课时16 架构、难点、部署与演示脚本
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
src/pages/KnowledgeUniversePage.jsx 3D 知识宇宙（d3-force-3d 力导向布局 + 点击信息浮层）
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

### 3D 知识宇宙（课时14）

`/universe` 由 `KnowledgeUniversePage` 渲染，导航栏「知识宇宙」进入。它和 `/3d-world` 共用同一份图谱数据，但节点位置不再随机：

1. **数据驱动**：`Promise.all` 同时请求 `GET /knowledge-points`（拿正文全文）与 `GET /graph/knowledge-map`（拿节点状态与引用边），按 id 合并。
2. **力导向布局**：`forceSimulation(nodes, 3)` + `forceManyBody().strength(-70)`（星球互相排斥）+ `forceCenter(0, 0, 0)`（向星系中心聚拢）+ `forceLink().distance(38)`（引用关系像引力绳）。模拟由页面自己的 `requestAnimationFrame` 调用 `tick()` 推进，收敛（`alpha <= alphaMin`）后停止计算，避免空转烧 CPU。
3. **节点与边**：所有星球共用一份 `SphereGeometry`，只按 `symbolSize` 缩放；所有航线合并成一个 `LineSegments`（`Float32Array` 顶点缓冲），每帧只更新 position 属性，避免为每条边建独立对象。
4. **点击拾取**：`Raycaster` 把鼠标位置归一化到 NDC 后与球体求交；`pointerdown/up` 位移小于 5px 才算点击，避免和 OrbitControls 拖拽冲突。选中星球放大 1.18 倍并发光，相连航线变琥珀色、其余压暗；空点取消选中。
5. **信息浮层**：选中后右下角面板展示标题、状态与 120 字摘要，「查看知识点详情」跳 `/kp/:id`；悬停有跟随鼠标的标题提示，右上角是状态图例与星球/航线数量。
6. **资源管理**：切换或卸载时停止模拟与动画循环、移除指针监听，并 `dispose()` 几何体、材质与渲染器。

### 跨平台：Electron 桌面端（课时15）

`electron.cjs` 是主进程入口（`package.json` 的 `main`）。课程示例里的 `electron.js` 在本项目改名为 `.cjs`：前端 `package.json` 声明了 `"type": "module"`，同名 `.js` 会被当成 ESM，`require('electron')` 直接报错，而 `.cjs` 始终按 CommonJS 解析。

1. **主进程 / 渲染进程**：主进程有完整 Node.js 环境，负责创建 1200×800 窗口、原生菜单、生命周期与麦克风权限；渲染进程就是 Chromium 里的 React 应用，`nodeIntegration: false`、`contextIsolation: true`、`sandbox: true`，页面拿不到 Node API，XSS 无法升级成任意代码执行。
2. **加载地址**：开发时读 `ELECTRON_START_URL` 加载 `http://localhost:5173` 并打开开发者工具；生产时 `loadFile` 加载 `dist/index.html`。
3. **路由**：`file://` 下 history 路由会找不到页面，`src/main.jsx` 检测协议自动切 `HashRouter`（`/#/agent`）；浏览器环境仍用 `BrowserRouter`。
4. **资源路径**：`electron:build` 先用 `vite build --base ./` 生成相对路径产物，避免 `file://` 把 `/assets/...` 解析到磁盘根目录；Web/PWA 构建仍用绝对路径。
5. **原生菜单（课后挑战）**：`Menu.buildFromTemplate` 提供「文件 → 退出」「视图 → 重新加载/开发者工具/缩放」「帮助 → 关于」，关于弹窗展示版本号。
6. **安全边界**：`setWindowOpenHandler` 把站外链接交给系统浏览器；`will-navigate` 阻止窗口被导航到非本应用地址；权限处理只放行 `media`（录音需要麦克风），其余请求一律拒绝。
7. **打包**：`npm run electron:build` 使用 `electron-builder`，产物在 `release/`（已 gitignore）。本次作业只完成集成与构建验证，没有实际产出安装包；首次打包会下载 Electron/NSIS 依赖，国内网络可在安装前设置 `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/`。

### 跨平台：PWA（课时15）

1. **Manifest**：`vite.config.js` 的 `VitePWA` 配置生成 `dist/manifest.webmanifest`——名称「费曼学习平台」、`display: standalone`、主题色 `#8b5cf6`、192/512 两种图标（512 同时声明 `maskable`），图标由 `public/pwa-*.png` 提供。
2. **Service Worker**：`workbox` 预缓存应用外壳（`**/*.{js,css,html,svg,png,ico,woff2}`，129 个文件约 7.5MB）；主包超过 Workbox 默认 2MB 上限，因此把 `maximumFileSizeToCacheInBytes` 调到 5MB。`navigateFallback: '/index.html'` 保证离线时直接访问 `/agent` 也能回到 SPA；`navigateFallbackDenylist` 排除 `/api`，接口请求不会被当成页面。
3. **注册时机**：`registerType: 'autoUpdate'` + `injectRegister: null`，在 `main.jsx` 里仅当生产构建、协议为 http(s) 且浏览器支持 Service Worker 时注册；Electron 的 `file://` 直接跳过，避免控制台报错。
4. **离线测试**：`npm run build && npm run preview`，Chrome 打开预览地址 → F12 → Application → Manifest 可看到图标与名称，Service Workers 显示 `sw.js` 已激活；Network 勾选 Offline 后刷新，应用外壳仍能打开（后端接口此时不可用，属预期）。地址栏/菜单出现「安装」即可添加到桌面或主屏。

### 容器化部署（课时16）

1. **前端镜像**：`Dockerfile` 两阶段——`node:20-alpine` 里 `npm ci && npm run build`（设置 `ELECTRON_SKIP_BINARY_DOWNLOAD=1`，容器不需要 Electron 二进制），再把 `dist` 复制进 `nginx:stable-alpine`，最终镜像不含源码与 node_modules。
2. **Nginx**：`nginx.conf` 负责三件事——`try_files $uri $uri/ /index.html` 支持 React Router 的 history 路由；`location /api/` 反向代理到 `backend:3000`；`sw.js` 与 `manifest.webmanifest` 禁止长缓存，带哈希的静态资源缓存 7 天。音频上传的 `client_max_body_size` 放到 4MB，大模型请求读超时 120s。
3. **前后端编排**：`docker-compose.yml` 同时构建 `../feynman-platform-backend` 与当前目录，后端通过 `env_file` 读取 `.env`，`vector_store` 挂到命名卷持久化 RAG 索引，前端暴露 8080。
4. **同源策略**：容器构建时传入 `VITE_API_BASE_URL=/api`，浏览器只访问 Nginx，跨域与 CORS 都不需要额外处理。

```bash
# 先在后端目录准备 .env
cd ../feynman-platform-backend && copy .env.example .env

# 回到前端目录启动
docker compose up -d --build
# 前端 http://localhost:8080，后端健康检查 http://localhost:3000/
```

本机没有安装 Docker，因此本次只交付并校验了 Dockerfile / compose / nginx 配置，未实际构建镜像。完整架构、部署步骤、演示脚本与汇报提纲见 [`docs/项目总结与汇报.md`](docs/项目总结与汇报.md)。

### 接口地址

`src/api/axios.js` 默认连 `http://localhost:3000/api`；如需临时指向别的后端实例（例如同时跑多个环境），启动前设置 `VITE_API_BASE_URL=http://localhost:3100/api` 即可，不需要改代码。

## 仓库

- 前端：<https://github.com/wlz720/feynman-platform-frontend>
- 后端：<https://github.com/wlz720/feynman-platform-backend>
