import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';
import styles from './GlobePage.module.css';

/**
 * 课时14：Cesium 数字地球 —— 「知识地球」
 * 把知识点按黄金角螺旋铺到真实地球表面，关联知识点之间画发光跨洲弧线。
 * - 底图使用 Cesium 自带的 NaturalEarthII 离线瓦片，不依赖任何在线服务 / Token；
 * - 悬停光点显示知识点信息，点击跳转详情页；
 * - 地球缓慢自转，拖动 / 缩放时自动暂停，松手后恢复。
 */

/* 与知识图谱 / 3D 知识宇宙保持同一套状态配色 */
const STATUS_META = {
  mastered: { color: '#22c55e', label: '已掌握' },
  need_review: { color: '#f97316', label: '待复习' },
  not_started: { color: '#8b5cf6', label: '未开始' }
};

const getStatus = (node) => {
  if (node?.reviewList) return 'need_review';
  return STATUS_META[node?.status] ? node.status : 'not_started';
};

/* 黄金角螺旋：把 n 个点均匀铺满球面（纬度 -60°~60°，避免挤在极点） */
function spreadOnGlobe(index, total) {
  const t = total <= 1 ? 0.5 : index / (total - 1);
  const lat = Math.asin(2 * t - 1) * (180 / Math.PI) * 0.75;
  const lon = ((index * 137.508) % 360) - 180;
  return { lat, lon };
}

/* 两点之间的大圆弧线：球面插值 + 正弦抬升高度 */
function arcPositions(Cesium, a, b, segments = 48) {
  const va = Cesium.Cartographic.toCartesian(
    Cesium.Cartographic.fromDegrees(a.lon, a.lat)
  );
  const vb = Cesium.Cartographic.toCartesian(
    Cesium.Cartographic.fromDegrees(b.lon, b.lat)
  );
  const na = Cesium.Cartesian3.normalize(va, new Cesium.Cartesian3());
  const nb = Cesium.Cartesian3.normalize(vb, new Cesium.Cartesian3());
  const dot = Math.min(1, Math.max(-1, Cesium.Cartesian3.dot(na, nb)));
  const omega = Math.acos(dot);
  const sinOmega = Math.sin(omega);
  const radius = 6371000;
  const maxAlt = 900000 + omega * 1600000; // 距离越远弧线越高
  const coords = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    let dir;
    if (sinOmega < 1e-6) {
      dir = na;
    } else {
      const ka = Math.sin((1 - t) * omega) / sinOmega;
      const kb = Math.sin(t * omega) / sinOmega;
      dir = new Cesium.Cartesian3(
        na.x * ka + nb.x * kb,
        na.y * ka + nb.y * kb,
        na.z * ka + nb.z * kb
      );
    }
    const alt = 30000 + Math.sin(Math.PI * t) * maxAlt;
    const p = Cesium.Cartesian3.multiplyByScalar(
      Cesium.Cartesian3.normalize(dir, new Cesium.Cartesian3()),
      radius + alt,
      new Cesium.Cartesian3()
    );
    const carto = Cesium.Cartographic.fromCartesian(p);
    coords.push(
      Cesium.Math.toDegrees(carto.longitude),
      Cesium.Math.toDegrees(carto.latitude),
      carto.height
    );
  }
  return coords;
}

export default function GlobePage() {
  const navigate = useNavigate();
  const mountRef = useRef(null);
  const tooltipRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [counts, setCounts] = useState({ total: 0, mastered: 0, needReview: 0 });
  /* Electron 桌面端走 file:// 协议，Web Worker 无法加载，给出友好提示 */
  const isDesktopFile = window.location.protocol === 'file:';

  useEffect(() => {
    if (isDesktopFile) {
      setLoading(false);
      return undefined;
    }
    const mount = mountRef.current;
    if (!mount) return undefined;

    let disposed = false;
    let viewer = null;
    let handler = null;
    let removeRotate = null;
    let resumeTimer = null;

    const init = async () => {
      /* Cesium 静态资源（Workers/Assets/Widgets）由 vite 复制到 /cesium/ */
      window.CESIUM_BASE_URL = new URL('cesium/', document.baseURI).href;
      const Cesium = await import('cesium');
      await import('cesium/Build/Cesium/Widgets/widgets.css');
      const graph = (await apiClient.get('/graph/knowledge-map')).data;
      if (disposed) return;

      const nodes = (graph?.nodes || []).filter((n) => n && n.id);
      if (nodes.length === 0) {
        setError('还没有知识点，先去创建几个，再回来看你的知识地球。');
        setLoading(false);
        return;
      }

      /* 离线底图：Cesium 安装包自带的 NaturalEarthII 瓦片，无需 Token */
      const imagery = await Cesium.TileMapServiceImageryProvider.fromUrl(
        Cesium.buildModuleUrl('Assets/Textures/NaturalEarthII')
      );
      if (disposed) return;

      viewer = new Cesium.Viewer(mount, {
        baseLayer: new Cesium.ImageryLayer(imagery),
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        animation: false,
        timeline: false,
        fullscreenButton: false,
        selectionIndicator: false,
        infoBox: false,
        creditContainer: document.createElement('div'),
        requestRenderMode: false
      });
      viewer.scene.globe.enableLighting = true;
      viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#0b1026');
      viewer.scene.skyAtmosphere.brightnessShift = 0.1;
      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#05060f');

      /* 知识点光点 + 常驻标签 */
      const placed = new Map();
      nodes.forEach((node, i) => {
        const { lat, lon } = spreadOnGlobe(i, nodes.length);
        placed.set(node.id, { lat, lon });
        const meta = STATUS_META[getStatus(node)];
        const color = Cesium.Color.fromCssColorString(meta.color);
        const size = Math.min(16, Math.max(9, (node.symbolSize || 30) / 3));
        viewer.entities.add({
          id: `kp-${node.id}`,
          position: Cesium.Cartesian3.fromDegrees(lon, lat, 30000),
          point: {
            pixelSize: size,
            color,
            outlineColor: Cesium.Color.WHITE.withAlpha(0.85),
            outlineWidth: 2
          },
          label: {
            text: node.name || '未命名',
            font: '600 13px "Microsoft YaHei", sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.fromCssColorString('#05060f'),
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -20),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3.2e7)
          },
          properties: { kp: node }
        });
        /* 光晕：更大的半透明点垫底 */
        viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(lon, lat, 29000),
          point: {
            pixelSize: size * 2.4,
            color: color.withAlpha(0.18)
          }
        });
      });

      /* 关联弧线 */
      const idSet = new Set(nodes.map((n) => n.id));
      (graph?.links || []).forEach((link) => {
        const s = typeof link.source === 'object' ? link.source?.id : link.source;
        const t = typeof link.target === 'object' ? link.target?.id : link.target;
        if (!idSet.has(s) || !idSet.has(t) || s === t) return;
        const a = placed.get(s);
        const b = placed.get(t);
        if (!a || !b) return;
        viewer.entities.add({
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights(
              arcPositions(Cesium, a, b)
            ),
            width: 2.5,
            arcType: Cesium.ArcType.NONE,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.22,
              color: Cesium.Color.fromCssColorString('#a78bfa').withAlpha(0.9)
            })
          }
        });
      });

      setCounts({
        total: nodes.length,
        mastered: nodes.filter((n) => getStatus(n) === 'mastered').length,
        needReview: nodes.filter((n) => getStatus(n) === 'need_review').length
      });

      /* 初始视角：面向中国上空 */
      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(105, 28, 2.4e7)
      });

      /* 开发环境挂一个调试句柄，方便控制台排查渲染问题（生产构建会剔除） */
      if (import.meta.env.DEV) window.__globe = { viewer, Cesium };

      /* 自转：绕地轴缓慢旋转，交互时暂停 3 秒 */
      let interacting = false;
      const tick = () => {
        if (!interacting && viewer && !viewer.isDestroyed()) {
          viewer.camera.rotate(Cesium.Cartesian3.UNIT_Z, -0.00045);
        }
      };
      viewer.clock.onTick.addEventListener(tick);
      removeRotate = () => viewer?.clock.onTick.removeEventListener(tick);
      const pause = () => {
        interacting = true;
        clearTimeout(resumeTimer);
        resumeTimer = setTimeout(() => { interacting = false; }, 3000);
      };
      mount.addEventListener('pointerdown', pause);
      mount.addEventListener('wheel', pause, { passive: true });

      /* 悬停提示 + 点击跳详情 */
      handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
      handler.setInputAction((movement) => {
        const picked = viewer.scene.pick(movement.endPosition);
        const entity = picked?.id;
        const kp = entity?.properties?.kp?.getValue?.(viewer.clock.currentTime);
        const tip = tooltipRef.current;
        if (kp) {
          viewer.scene.canvas.style.cursor = 'pointer';
          if (tip) {
            const meta = STATUS_META[getStatus(kp)];
            tip.style.display = 'block';
            tip.style.left = `${movement.endPosition.x + 14}px`;
            tip.style.top = `${movement.endPosition.y + 10}px`;
            tip.innerHTML = '';
            const title = document.createElement('strong');
            title.textContent = kp.name || '未命名';
            const info = document.createElement('span');
            info.textContent = `${meta.label} · 点击查看详情`;
            tip.append(title, info);
          }
        } else {
          viewer.scene.canvas.style.cursor = 'grab';
          if (tip) tip.style.display = 'none';
        }
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
      handler.setInputAction((click) => {
        const picked = viewer.scene.pick(click.position);
        const kp = picked?.id?.properties?.kp?.getValue?.(viewer.clock.currentTime);
        if (kp?.id != null) navigate(`/kp/${kp.id}`);
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

      setLoading(false);
    };

    init().catch((err) => {
      if (!disposed) {
        setError(err?.message || '知识地球加载失败，请稍后重试。');
        setLoading(false);
      }
    });

    return () => {
      disposed = true;
      clearTimeout(resumeTimer);
      removeRotate?.();
      handler?.destroy();
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
    };
  }, [navigate, isDesktopFile]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <span className="eyebrow">CESIUM GLOBE</span>
          <h1 className="page-title">知识地球</h1>
          <p className="page-subtitle">
            Cesium 数字地球：每个光点都是一个知识点（颜色=学习状态），发光弧线连接相关内容。点击光点查看详情。
          </p>
        </div>
        <div className={styles.legend}>
          <span className={styles.legendPill}>
            <i className={styles.legendDot} style={{ background: '#22c55e', color: '#22c55e' }} />
            已掌握 <b className={styles.legendCount}>{counts.mastered}</b>
          </span>
          <span className={styles.legendPill}>
            <i className={styles.legendDot} style={{ background: '#f97316', color: '#f97316' }} />
            待复习 <b className={styles.legendCount}>{counts.needReview}</b>
          </span>
          <span className={styles.legendPill}>
            <i className={styles.legendDot} style={{ background: '#8b5cf6', color: '#8b5cf6' }} />
            未开始 <b className={styles.legendCount}>{counts.total - counts.mastered - counts.needReview}</b>
          </span>
        </div>
      </div>

      <div className={styles.stageCard}>
        {isDesktopFile ? (
          <div className={styles.notice}>
            <p>桌面端（Electron）暂不支持 3D 地球渲染。</p>
            <p>请在浏览器中打开本平台后访问「知识地球」。</p>
          </div>
        ) : (
          <>
            <div ref={mountRef} className={styles.stage} />
            <div ref={tooltipRef} className={styles.tooltip} />
            {loading && <div className={styles.notice}>正在点亮你的知识地球…</div>}
            {error && <div className={styles.notice}>{error}</div>}
            {!loading && !error && (
              <div className={styles.hint}>拖动旋转 · 滚轮缩放 · 点击光点查看详情</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}