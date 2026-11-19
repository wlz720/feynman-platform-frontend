// 课时15：Electron 主进程
// 主进程 = 应用的「大脑」，拥有完整 Node.js 环境，负责创建窗口、菜单与生命周期；
// 渲染进程 = Chromium，跑我们的 React 应用，默认关闭 Node 访问（nodeIntegration: false）。
const { app, BrowserWindow, Menu, dialog, shell, session } = require('electron');
const path = require('path');

// 开发模式由 electron:dev 脚本注入，指向 Vite 的 5173 端口
const DEV_URL = process.env.ELECTRON_START_URL;
const isDev = Boolean(DEV_URL);

// 统一的窗口尺寸与安全配置
const WINDOW_OPTIONS = {
  width: 1200,
  height: 800,
  minWidth: 960,
  minHeight: 640,
  backgroundColor: '#faf8ff',
  title: '费曼学习平台',
  webPreferences: {
    nodeIntegration: false, // 渲染进程不直接碰 Node，避免 XSS 升级成任意代码执行
    contextIsolation: true, // 预加载脚本与页面上下文隔离
    sandbox: true, // 渲染进程运行在系统沙箱内
    spellcheck: false
  }
};

function buildMenu(win) {
  // 课后挑战：原生菜单栏（文件 → 退出；帮助 → 关于）
  const template = [
    {
      label: '文件',
      submenu: [{ label: '退出', role: 'quit' }]
    },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', role: 'reload' },
        { label: '开发者工具', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '实际大小', role: 'resetZoom' },
        { label: '放大', role: 'zoomIn' },
        { label: '缩小', role: 'zoomOut' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于费曼学习平台',
          click: () => {
            dialog.showMessageBox(win, {
              type: 'info',
              title: '关于',
              message: '费曼学习平台',
              detail: `基于 React + Vite + Node.js 的费曼学习平台\n版本 ${app.getVersion()}\n桌面端由 Electron 封装。`
            });
          }
        }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  const win = new BrowserWindow(WINDOW_OPTIONS);

  if (isDev) {
    // 开发环境加载 Vite 服务器，热更新照常可用
    win.loadURL(DEV_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    // 生产环境加载打包后的静态页面。
    // 前端 main.jsx 检测到 file: 协议会自动切到 HashRouter，避免 history 路由找不到页面。
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  buildMenu(win);

  // 站外链接交给系统浏览器，不在 Electron 窗口里打开
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // 阻止窗口被导航到站外地址，防止钓鱼页面复用应用窗口
  win.webContents.on('will-navigate', (event, url) => {
    const allowed = isDev ? url.startsWith(DEV_URL) : url.startsWith('file://');
    if (!allowed) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  return win;
}

app.whenReady().then(() => {
  // 录音需要麦克风权限：只放行 media，其余请求一律拒绝
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(permission === 'media');
  });
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    return permission === 'media';
  });

  createWindow();

  // macOS：点击 Dock 图标且没有窗口时重新创建
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Windows / Linux：关闭全部窗口即退出；macOS 保留在 Dock
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
