import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import {
  forceSimulation,
  forceManyBody,
  forceCenter,
  forceLink
} from 'd3-force-3d';
import apiClient from '../api/axios';
import {
  createGlowTexture,
  createGlowSprite,
  createNodeLabel,
  createStarfield,
  buildArcPoints
} from '../utils/threeScene';
import styles from './KnowledgeUniversePage.module.css';

// 课时14：Three.js 进阶——数据驱动的 3D 知识宇宙
// 与课时13 的 ThreeJSPage 的区别：
//   1. 节点位置不再随机，而由 d3-force-3d 力导向模拟自动布局；
//   2. 节点与边在每一帧跟随模拟结果移动，形成会「呼吸」的星系；
//   3. 点击星球用 React 浮层展示内容摘要（替代 alert），并可跳转详情。
const STATUS_COLORS = {
  mastered: 0x22c55e,
  need_review: 0xf97316,
  not_started: 0x8b5cf6
};

const STATUS_LABELS = {
  mastered: '已掌握',
  need_review: '需复习',
  not_started: '未开始'
};

const STATUS_HEX = {
  mastered: '#22c55e',
  need_review: '#f97316',
  not_started: '#8b5cf6'
};

function nodeColor(node) {
  if (node.reviewList) return STATUS_COLORS.need_review;
  return STATUS_COLORS[node.status] ?? STATUS_COLORS.not_started;
}

function nodeStatusLabel(node) {
  if (node.reviewList) return STATUS_LABELS.need_review;
  return STATUS_LABELS[node.status] ?? STATUS_LABELS.not_started;
}

function KnowledgeUniversePage() {
  const mountRef = useRef(null);
  const navigate = useNavigate();
  // navigate 通过 ref 透传：路由对象不进 3D useEffect 依赖，避免重建整个场景；
  // ref 写入放在 effect 里（渲染期间写 ref 违反 React 规范，lint 会告警）
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null); // 点击选中的知识点
  // 悬停提示直接操作 DOM：鼠标移动是高频事件，走 React state 会每帧重渲染
  const tooltipRef = useRef(null);
  // 3D 场景内部的清除选中逻辑，供浮层「关闭」按钮调用
  const clearSelectionRef = useRef(null);

  // ---------- 1. 拉取数据：知识点全文 + 图谱节点/引用边 ----------
  useEffect(() => {
    let alive = true;
    Promise.all([
      apiClient.get('/knowledge-points'),
      apiClient.get('/graph/knowledge-map')
    ])
      .then(([kpRes, graphRes]) => {
        if (!alive) return;
        const contentById = new Map(kpRes.data.map((kp) => [kp._id, kp.content]));
        setData({
          nodes: graphRes.data.nodes.map((node) => ({
            ...node,
            content: contentById.get(node.id) || node.value || ''
          })),
          links: graphRes.data.links
        });
        setError('');
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.response?.data?.msg || '获取知识宇宙数据失败，请确认后端已启动');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // ---------- 2. 数据到位后搭建 3D 场景 ----------
  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount || !data) return;
    if (data.nodes.length === 0) return;

    // 场景 / 相机 / 渲染器：Three.js 三要素
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x03050d);
    scene.fog = new THREE.FogExp2(0x03050d, 0.0042);

    const camera = new THREE.PerspectiveCamera(
      60,
      currentMount.clientWidth / currentMount.clientHeight,
      0.1,
      2000
    );
    camera.position.set(0, 16, 92);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.domElement.style.cursor = 'grab';
    currentMount.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.left = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    labelRenderer.domElement.style.zIndex = '1';
    currentMount.appendChild(labelRenderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 20;
    controls.maxDistance = 320;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.45;
    let autoRotateTimer = 0;
    const pauseAutoRotate = () => {
      controls.autoRotate = false;
      window.clearTimeout(autoRotateTimer);
      autoRotateTimer = window.setTimeout(() => {
        controls.autoRotate = true;
      }, 3500);
    };
    controls.addEventListener('start', pauseAutoRotate);

    // 光照：冷暖两色点光 + 环境光，保证星球暗部不死黑
    scene.add(new THREE.AmbientLight(0xffffff, 0.62));
    const violetLight = new THREE.PointLight(0x8b5cf6, 180, 0, 2);
    violetLight.position.set(-55, 42, 62);
    scene.add(violetLight);
    const cyanLight = new THREE.PointLight(0x22d3ee, 120, 0, 2);
    cyanLight.position.set(48, -36, 40);
    scene.add(cyanLight);

    const glowTexture = createGlowTexture();

    // 背景星尘与两团星云柔光
    const starfield = createStarfield({ count: 1100, minRadius: 90, maxRadius: 320, size: 0.95 });
    scene.add(starfield);
    const nebulaA = createGlowSprite(glowTexture, 0x7c3aed, 130, 0.12);
    nebulaA.position.set(-45, 30, -90);
    scene.add(nebulaA);
    const nebulaB = createGlowSprite(glowTexture, 0x0ea5e9, 100, 0.08);
    nebulaB.position.set(55, -35, -80);
    scene.add(nebulaB);

    // 中心微光与几圈若隐若现的星系轨道
    const coreGlow = createGlowSprite(glowTexture, 0xc4b5fd, 38, 0.18);
    scene.add(coreGlow);
    const orbitRingObjects = [];
    [46, 74, 108].forEach((radius, index) => {
      const geometry = new THREE.TorusGeometry(radius, 0.06, 6, 220);
      const material = new THREE.MeshBasicMaterial({
        color: index === 1 ? 0x38bdf8 : 0x8b5cf6,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const ring = new THREE.Mesh(geometry, material);
      ring.rotation.x = Math.PI / 2 + index * 0.22;
      ring.rotation.z = index * 0.35;
      scene.add(ring);
      orbitRingObjects.push({ ring, geometry, material });
    });

    // ---------- 节点：知识点 → 星球 ----------
    // 所有星球共用一个几何体，只按 symbolSize 缩放，省显存也省初始化时间
    const nodeGeometry = new THREE.SphereGeometry(1, 28, 28);
    const nodeMeshes = [];
    const meshById = new Map();
    const visualById = new Map();
    const showLabels = data.nodes.length <= 14;

    data.nodes.forEach((node) => {
      const baseColor = nodeColor(node);
      const material = new THREE.MeshStandardMaterial({
        color: baseColor,
        emissive: baseColor,
        emissiveIntensity: 0.24,
        roughness: 0.3,
        metalness: 0.3
      });
      const mesh = new THREE.Mesh(nodeGeometry, material);
      // 后端 symbolSize 为 20~50，映射成 2.0~3.6 的视觉半径
      const baseScale = 2.0 + Math.min(Math.max(node.symbolSize - 20, 0), 30) / 30 * 1.6;
      mesh.scale.setScalar(baseScale);
      mesh.userData = {
        id: node.id,
        name: node.name,
        content: node.content,
        status: node.status,
        reviewList: node.reviewList,
        baseColor,
        baseScale
      };
      scene.add(mesh);
      nodeMeshes.push(mesh);
      meshById.set(node.id, mesh);

      // 光晕与标签独立放在场景里：不随节点选中缩放，光晕大小更稳定
      const halo = createGlowSprite(glowTexture, baseColor, baseScale * 3.8, 0.55);
      scene.add(halo);

      let label = null;
      if (showLabels) {
        label = createNodeLabel(node.name, STATUS_HEX[node.status] || STATUS_HEX.not_started);
        scene.add(label);
      }

      visualById.set(node.id, { halo, label, baseScale });
    });

    // ---------- 力导向模拟：节点互相排斥，引用边像引力绳 ----------
    const simNodes = data.nodes.map((node) => ({ id: node.id }));
    const simLinks = data.links.map((link) => ({ source: link.source, target: link.target }));

    const simulation = forceSimulation(simNodes, 3)
      .force('charge', forceManyBody().strength(-46))
      .force('center', forceCenter(0, 0, 0))
      .force('link', forceLink(simLinks).id((d) => d.id).distance(30).strength(0.55))
      // 由我们自己的 requestAnimationFrame 驱动，不让 d3 另开定时器
      .stop();

    // ---------- 引用边：每条航线是一段弯曲的发光弧线 ----------
    const EDGE_BASE_COLOR = new THREE.Color(0x6f8cff);
    const EDGE_HIGHLIGHT_COLOR = new THREE.Color(0xffb347);
    const EDGE_DIM_COLOR = new THREE.Color(0x24324a);
    const EDGE_SEGMENTS = 18;
    const edgeObjects = [];

    simLinks.forEach((link) => {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(EDGE_SEGMENTS * 3);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const material = new THREE.LineBasicMaterial({
        color: EDGE_BASE_COLOR,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const line = new THREE.Line(geometry, material);
      line.renderOrder = 1;
      scene.add(line);
      edgeObjects.push({ link, line, geometry, material });
    });

    // 把模拟坐标写回 Three.js 对象（节点、光晕、标签、弧线）
    const applyPositions = () => {
      simNodes.forEach((node) => {
        // 星系半径限制在 38 以内，避免极端斥力把个别星球甩出视野
        const radius = Math.hypot(node.x || 0, node.y || 0, node.z || 0);
        if (radius > 38) {
          const scale = 38 / radius;
          node.x *= scale;
          node.y *= scale;
          node.z *= scale;
        }
        const mesh = meshById.get(node.id);
        if (mesh) mesh.position.set(node.x, node.y, node.z);
        const visual = visualById.get(node.id);
        if (visual) {
          const lift = visual.baseScale * 1.6 + 1.1;
          visual.halo.position.set(node.x, node.y, node.z);
          if (visual.label) visual.label.position.set(node.x, node.y + lift, node.z);
        }
      });

      edgeObjects.forEach(({ link, geometry }) => {
        const source = link.source;
        const target = link.target;
        if (typeof source !== 'object' || typeof target !== 'object') return;
        const start = new THREE.Vector3(source.x, source.y, source.z);
        const end = new THREE.Vector3(target.x, target.y, target.z);
        const points = buildArcPoints(start, end, EDGE_SEGMENTS - 1, 0.16);
        const position = geometry.attributes.position;
        points.forEach((point, index) => {
          position.setXYZ(index, point.x, point.y, point.z);
        });
        position.needsUpdate = true;
      });
    };

    // 选中时高亮相连航线，其余压暗；取消选中恢复统一色
    const paintEdges = (selectedId) => {
      edgeObjects.forEach(({ link, material }) => {
        const connected =
          selectedId &&
          (link.source.id === selectedId || link.target.id === selectedId);
        material.color.copy(
          connected ? EDGE_HIGHLIGHT_COLOR : selectedId ? EDGE_DIM_COLOR : EDGE_BASE_COLOR
        );
        material.opacity = connected ? 0.98 : selectedId ? 0.12 : 0.4;
      });
    };

    applyPositions();

    // ---------- 交互：Raycaster 鼠标拾取 ----------
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hoveredMesh = null;
    let selectedId = null;
    let pressedAt = null;

    const setNodeGlow = (mesh, intensity) => {
      if (!mesh) return;
      mesh.material.emissiveIntensity = intensity;
      const visual = visualById.get(mesh.userData.id);
      if (visual?.halo) {
        visual.halo.material.opacity = intensity >= 0.4 ? 0.95 : 0.55;
      }
    };

    const pickNode = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(nodeMeshes, false)[0]?.object ?? null;
    };

    const clearSelection = () => {
      if (!selectedId) return;
      const mesh = meshById.get(selectedId);
      if (mesh) {
        mesh.scale.setScalar(mesh.userData.baseScale);
        setNodeGlow(mesh, hoveredMesh === mesh ? 0.35 : 0.24);
        const visual = visualById.get(mesh.userData.id);
        if (visual?.label) visual.label.element.style.opacity = '0.9';
      }
      selectedId = null;
      paintEdges(null);
    };

    const selectNode = (mesh) => {
      if (!mesh || selectedId === mesh.userData.id) return;
      clearSelection();
      selectedId = mesh.userData.id;
      mesh.scale.setScalar(mesh.userData.baseScale * 1.18);
      setNodeGlow(mesh, 0.55);
      const visual = visualById.get(mesh.userData.id);
      if (visual?.label) visual.label.element.style.opacity = '1';
      paintEdges(selectedId);
      hideTooltip();
      setSelected({
        id: mesh.userData.id,
        name: mesh.userData.name,
        content: mesh.userData.content,
        statusLabel: nodeStatusLabel(mesh.userData)
      });
    };

    clearSelectionRef.current = () => {
      clearSelection();
      setSelected(null);
    };

    const showTooltip = (name, event) => {
      const tip = tooltipRef.current;
      if (!tip) return;
      const rect = renderer.domElement.getBoundingClientRect();
      tip.textContent = name;
      tip.style.display = 'block';
      tip.style.left = `${event.clientX - rect.left + 14}px`;
      tip.style.top = `${event.clientY - rect.top + 14}px`;
    };

    const hideTooltip = () => {
      if (tooltipRef.current) tooltipRef.current.style.display = 'none';
    };

    const onPointerMove = (event) => {
      const hit = pickNode(event);
      if (hit !== hoveredMesh) {
        if (hoveredMesh && hoveredMesh.userData.id !== selectedId) {
          setNodeGlow(hoveredMesh, 0.24);
        }
        hoveredMesh = hit;
        if (hit && hit.userData.id !== selectedId) setNodeGlow(hit, 0.35);
        renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
      }
      if (hit) {
        showTooltip(hit.userData.name, event);
      } else {
        hideTooltip();
      }
    };

    const onPointerDown = (event) => {
      pressedAt = { x: event.clientX, y: event.clientY };
    };

    const onPointerUp = (event) => {
      if (!pressedAt) return;
      const moved = Math.hypot(event.clientX - pressedAt.x, event.clientY - pressedAt.y);
      pressedAt = null;
      // 位移超过 5px 视为拖拽旋转视角，不触发选中
      if (moved > 5) return;
      const hit = pickNode(event);
      if (hit) {
        selectNode(hit);
      } else {
        clearSelection();
        setSelected(null);
      }
    };

    const onPointerLeave = () => {
      if (hoveredMesh && hoveredMesh.userData.id !== selectedId) {
        setNodeGlow(hoveredMesh, 0.24);
      }
      hoveredMesh = null;
      hideTooltip();
      renderer.domElement.style.cursor = 'grab';
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);

    // ---------- 动画循环：模拟未收敛时推进，收敛后只渲染 ----------
    let frameId = 0;
    let elapsed = 0;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      elapsed += 0.016;
      if (simulation.alpha() > simulation.alphaMin()) {
        simulation.tick();
        applyPositions();
      }
      starfield.material.opacity = 0.82 * (0.86 + Math.sin(elapsed * 0.65) * 0.14);
      coreGlow.material.opacity = 0.16 + Math.sin(elapsed * 0.9) * 0.045;
      orbitRingObjects.forEach(({ ring }, index) => {
        ring.rotation.z += 0.0006 * (index + 1);
      });
      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
      labelRenderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // ---------- 清理：停循环、停模拟、移监听、释放 GPU 资源 ----------
    return () => {
      cancelAnimationFrame(frameId);
      window.clearTimeout(autoRotateTimer);
      simulation.stop();
      controls.removeEventListener('start', pauseAutoRotate);
      clearSelectionRef.current = null;
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      controls.dispose();
      nodeGeometry.dispose();
      data.nodes.forEach((node) => {
        const mesh = meshById.get(node.id);
        mesh?.material.dispose();
        const visual = visualById.get(node.id);
        visual?.halo.material.dispose();
        visual?.label?.element?.remove();
      });
      edgeObjects.forEach(({ geometry, material }) => {
        geometry.dispose();
        material.dispose();
      });
      orbitRingObjects.forEach(({ geometry, material }) => {
        geometry.dispose();
        material.dispose();
      });
      starfield.geometry.dispose();
      starfield.material.dispose();
      nebulaA.material.dispose();
      nebulaB.material.dispose();
      coreGlow.material.dispose();
      glowTexture.dispose();
      renderer.dispose();
      if (labelRenderer.domElement.parentNode === currentMount) {
        currentMount.removeChild(labelRenderer.domElement);
      }
      if (renderer.domElement.parentNode === currentMount) {
        currentMount.removeChild(renderer.domElement);
      }
    };
  }, [data]);

  const hasNodes = data && data.nodes.length > 0;
  const counts = {
    mastered: data?.nodes.filter((node) => !node.reviewList && node.status === 'mastered').length || 0,
    need_review: data?.nodes.filter((node) => node.reviewList || node.status === 'need_review').length || 0,
    not_started:
      data?.nodes.filter(
        (node) => !node.reviewList && node.status !== 'mastered' && node.status !== 'need_review'
      ).length || 0
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <span className="eyebrow">KNOWLEDGE UNIVERSE</span>
          <h1 className="page-title">3D 知识宇宙</h1>
          <p className="page-subtitle">
            数据驱动的三维知识网络：力导向算法自动布局每颗知识星球，引用关系是星际航线。
            拖拽旋转视角、滚轮缩放、点击星球查看内容摘要。
          </p>
        </div>
        <Link to="/graph" className="btn btn-secondary">
          切换到 2D 图谱
        </Link>
      </div>

      {loading && (
        <div className="card card-pad">
          <div className="loading-block">
            <span className="spinner" />
            正在加载知识宇宙…
          </div>
        </div>
      )}
      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}
      {!loading && data && data.nodes.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🌌</div>
          <h3 className="empty-title">星系还是空的</h3>
          <p className="empty-text">
            先去主页创建几个知识点，再回来看看你的知识星系如何生长。
          </p>
          <Link to="/kp/new" className="btn btn-primary">
            + 新建知识点
          </Link>
        </div>
      )}

      {hasNodes && (
        <div className={styles.universeCard}>
          <div className={styles.stageHead}>
            <div className={styles.stageTitle}>
              <strong>知识星系</strong>
              <span>d3-force-3d 力导向布局 · 光晕与弧线随知识关系生长</span>
            </div>
            <div className={styles.stageStats}>
              <span className={styles.stageBadge}>🪐 点击星球查看摘要</span>
              <span className={styles.stageBadge}>✦ {data.nodes.length} 星球</span>
              <span className={styles.stageBadge}>↗ {data.links.length} 航线</span>
            </div>
          </div>
          <div className={styles.canvasWrap}>
            <div ref={mountRef} className={styles.canvas} />

            <div className={styles.helpCard}>
              <strong>怎么逛这片星系</strong>
              左键拖拽旋转 · 滚轮缩放 · 右键平移
              <br />
              点击星球查看知识点摘要
            </div>

            <div className={styles.legendCard}>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <div key={key} className={styles.legendItem}>
                  <span
                    className={styles.legendDot}
                    style={{ background: STATUS_HEX[key] }}
                  />
                  {label} <span className={styles.legendCount}>{counts[key]}</span>
                </div>
              ))}
              <div className={styles.legendMeta}>
                {data.nodes.length} 颗星球 / {data.links.length} 条航线
              </div>
            </div>

            <div ref={tooltipRef} className={styles.tooltip} />

            {selected && (
              <div className={styles.selectionCard}>
                <div className={styles.selectionHead}>
                  <div className={styles.selectionName}>{selected.name}</div>
                  <button
                    type="button"
                    className={styles.closeBtn}
                    onClick={() => clearSelectionRef.current?.()}
                    aria-label="关闭知识点摘要"
                  >
                    ×
                  </button>
                </div>
                <span className={styles.selectionStatus}>● {selected.statusLabel}</span>
                <p className={styles.selectionPreview}>
                  {selected.content.slice(0, 120)}
                  {selected.content.length > 120 ? '…' : ''}
                </p>
                <button
                  type="button"
                  className={styles.detailBtn}
                  onClick={() => navigateRef.current(`/kp/${selected.id}`)}
                >
                  查看知识点详情 →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default KnowledgeUniversePage;
