import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  forceSimulation,
  forceManyBody,
  forceCenter,
  forceLink
} from 'd3-force-3d';
import apiClient from '../api/axios';
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
    scene.background = new THREE.Color(0x070d1a);
    scene.fog = new THREE.FogExp2(0x070d1a, 0.0045);

    const camera = new THREE.PerspectiveCamera(
      60,
      currentMount.clientWidth / currentMount.clientHeight,
      0.1,
      2000
    );
    camera.position.set(0, 26, 88);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    currentMount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 20;
    controls.maxDistance = 320;

    // 光照：环境光保证暗部不死黑，点光源制造立体感
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const keyLight = new THREE.PointLight(0xffffff, 260, 0, 0);
    keyLight.position.set(40, 60, 70);
    scene.add(keyLight);

    // 背景星尘：纯装饰，不参与拾取
    const starCount = 700;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i += 1) {
      const radius = 120 + Math.random() * 220;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.cos(phi);
      starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: 0x93a4c4,
      size: 0.7,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.7
    });
    scene.add(new THREE.Points(starGeometry, starMaterial));

    // ---------- 节点：知识点 → 星球 ----------
    // 所有星球共用一个几何体，只按 symbolSize 缩放，省显存也省初始化时间
    const nodeGeometry = new THREE.SphereGeometry(1, 24, 24);
    const nodeMeshes = [];
    const meshById = new Map();

    data.nodes.forEach((node) => {
      const baseColor = nodeColor(node);
      const material = new THREE.MeshStandardMaterial({
        color: baseColor,
        emissive: baseColor,
        emissiveIntensity: 0.12,
        roughness: 0.35,
        metalness: 0.15
      });
      const mesh = new THREE.Mesh(nodeGeometry, material);
      // 后端 symbolSize 为 20~50，映射成 1.6~3.0 的视觉半径
      const baseScale = 1.6 + Math.min(Math.max(node.symbolSize - 20, 0), 30) / 30 * 1.4;
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
    });

    // ---------- 力导向模拟：节点互相排斥，引用边像引力绳 ----------
    const simNodes = data.nodes.map((node) => ({ id: node.id }));
    const simLinks = data.links.map((link) => ({ source: link.source, target: link.target }));

    const simulation = forceSimulation(simNodes, 3)
      .force('charge', forceManyBody().strength(-70))
      .force('center', forceCenter(0, 0, 0))
      .force('link', forceLink(simLinks).id((d) => d.id).distance(38).strength(0.4))
      // 由我们自己的 requestAnimationFrame 驱动，不让 d3 另开定时器
      .stop();

    // ---------- 引用边：一个 LineSegments 承载所有连线 ----------
    const EDGE_BASE_COLOR = new THREE.Color(0x8899bb);
    const EDGE_HIGHLIGHT_COLOR = new THREE.Color(0xffaa33);
    const EDGE_DIM_COLOR = new THREE.Color(0x24324a);

    const edgePositions = new Float32Array(simLinks.length * 6);
    const edgeColors = new Float32Array(simLinks.length * 6);
    for (let i = 0; i < simLinks.length * 2; i += 1) {
      EDGE_BASE_COLOR.toArray(edgeColors, i * 3);
    }

    const edgeGeometry = new THREE.BufferGeometry();
    edgeGeometry.setAttribute('position', new THREE.BufferAttribute(edgePositions, 3));
    edgeGeometry.setAttribute('color', new THREE.BufferAttribute(edgeColors, 3));

    const edgeMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.55
    });
    const edgeLines = simLinks.length
      ? new THREE.LineSegments(edgeGeometry, edgeMaterial)
      : null;
    if (edgeLines) scene.add(edgeLines);

    // 把模拟坐标写回 Three.js 对象
    const applyPositions = () => {
      simNodes.forEach((node) => {
        const mesh = meshById.get(node.id);
        if (mesh) mesh.position.set(node.x, node.y, node.z);
      });
      if (!edgeLines) return;
      simLinks.forEach((link, i) => {
        const source = link.source;
        const target = link.target;
        if (typeof source !== 'object' || typeof target !== 'object') return;
        const offset = i * 6;
        edgePositions[offset] = source.x;
        edgePositions[offset + 1] = source.y;
        edgePositions[offset + 2] = source.z;
        edgePositions[offset + 3] = target.x;
        edgePositions[offset + 4] = target.y;
        edgePositions[offset + 5] = target.z;
      });
      edgeGeometry.attributes.position.needsUpdate = true;
    };

    // 选中时高亮相连航线，其余压暗；取消选中恢复统一色
    const paintEdges = (selectedId) => {
      if (!edgeLines) return;
      simLinks.forEach((link, i) => {
        const connected =
          selectedId &&
          (link.source.id === selectedId || link.target.id === selectedId);
        const color = connected
          ? EDGE_HIGHLIGHT_COLOR
          : selectedId
            ? EDGE_DIM_COLOR
            : EDGE_BASE_COLOR;
        color.toArray(edgeColors, i * 6);
        color.toArray(edgeColors, i * 6 + 3);
      });
      edgeGeometry.attributes.color.needsUpdate = true;
    };

    applyPositions();

    // ---------- 交互：Raycaster 鼠标拾取 ----------
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hoveredMesh = null;
    let selectedId = null;
    let pressedAt = null;

    const setNodeGlow = (mesh, intensity) => {
      if (mesh) mesh.material.emissiveIntensity = intensity;
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
        setNodeGlow(mesh, hoveredMesh === mesh ? 0.35 : 0.12);
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
          setNodeGlow(hoveredMesh, 0.12);
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
        setNodeGlow(hoveredMesh, 0.12);
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
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      if (simulation.alpha() > simulation.alphaMin()) {
        simulation.tick();
        applyPositions();
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // ---------- 清理：停循环、停模拟、移监听、释放 GPU 资源 ----------
    return () => {
      cancelAnimationFrame(frameId);
      simulation.stop();
      clearSelectionRef.current = null;
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      controls.dispose();
      nodeGeometry.dispose();
      data.nodes.forEach((node) => meshById.get(node.id)?.material.dispose());
      starGeometry.dispose();
      starMaterial.dispose();
      edgeGeometry.dispose();
      edgeMaterial.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === currentMount) {
        currentMount.removeChild(renderer.domElement);
      }
    };
  }, [data]);

  const hasNodes = data && data.nodes.length > 0;

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
              <span>d3-force-3d 力导向布局 · 节点会随引用关系自动靠拢</span>
            </div>
            <span className={styles.stageBadge}>🪐 点击星球查看摘要</span>
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
                  {label}
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
