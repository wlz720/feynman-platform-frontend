import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 可视化页面的「全屏适配」Hook：
 * - 用 CSS fixed 定位把舞台卡片铺满整个视口（不依赖浏览器 Fullscreen API，
 *   在普通浏览器、内嵌 WebView、Electron 桌面端行为一致，不会因权限/手势被拒）；
 * - 进入/退出后派发 window resize，通知 ECharts / Three.js / Cesium 重算尺寸；
 * - 支持按 Escape 退出。
 *
 * 返回：
 * - stageRef：挂到需要全屏的舞台容器上
 * - isFullscreen：当前是否处于全屏适配状态
 * - toggle：切换全屏适配
 * - fsClassName：需要拼到舞台容器 className 上的状态类名
 */
export function useStageFullscreen() {
  const stageRef = useRef(null);
  const [active, setActive] = useState(false);

  const notifyResize = useCallback(() => {
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
  }, []);

  const toggle = useCallback(() => {
    setActive((prev) => !prev);
    notifyResize();
  }, [notifyResize]);

  // Escape 退出全屏适配
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setActive(false);
        notifyResize();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, notifyResize]);

  const fsClassName = active ? 'fs-active fs-fallback' : '';
  return { stageRef, isFullscreen: active, toggle, fsClassName };
}

export default useStageFullscreen;
