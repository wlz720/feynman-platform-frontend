import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import apiClient from '../api/axios';
import styles from './ThreeJSPage.module.css';

// 课时13：3D 可视化入门与 Three.js
// 两种模式：
//   cube  —— 课件第二部分的「Hello 3D World」旋转立方体（场景/相机/渲染器三要素演示）
//   graph —— 课件第三部分 + 课后挑战：知识图谱数据映射为 3D「知识星球」，
//            Raycaster 实现鼠标悬停高亮星球与相连航线
const STATUS_COLORS = {
  mastered: 0x22c55e,
  need_review: 0xf97316,
  not_started: 0x8b5cf6
};

const STATUS_HEX = {
  mastered: '#22c55e',
  need_review: '#f97316',
  not_started: '#8b5cf6'
};

function statusColor(node) {
  if (node.reviewList) return STATUS_COLORS.need_review;
  return STATUS_COLORS[node.status] ?? STATUS_COLORS.not_started;
}

function ThreeJSPage() {
  const mountRef = useRef(null);
  const [mode, setMode] = useState('graph');
  const [graphData, setGraphData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState(null); // 当前悬停的节点 { name, value }
  const navigate = useNavigate();
  // 点击跳转用 ref 透传，避免把 navigate 放进 3D useEffect 依赖导致场景重建；
  // ref 写入放在 effect 里（渲染期间写 ref 违反 React 规范，lint 会告警）
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  // 获取图谱数据（graph 模式用）
  useEffect(() => {
    let cancelled = false;
    apiClient
      .get('/graph/knowledge-map')
      .then((res) => {
        if (!cancelled) setGraphData(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.msg || '获取图谱数据失败，请确认后端已启动');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;
    if (mode === 'graph' && !graphData) return; // 等数据到位再建场景

    // ---------- 三要素：场景 / 相机 / 渲染器 ----------
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a2a3a);

    const camera = new THREE.PerspectiveCamera(
      75,
      currentMount.clientWidth / currentMount.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 2, 12);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    currentMount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // 阻尼让旋转更平滑

    // ---------- 光照：MeshStandardMaterial 必须有光才可见 ----------
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const pointLight = new THREE.PointLight(0xffffff, 120);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    const disposables = []; // 统一记录几何体/材质，卸载时释放显存
    let cube = null;
    const nodeMeshes = [];
    const lineObjects = []; // { line, sourceId, targetId }
    const meshById = new Map();

    if (mode === 'cube') {
      // Hello 3D World：绿色旋转立方体
      const geometry = new THREE.BoxGeometry(2, 2, 2);
      const material = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.4 });
      cube = new THREE.Mesh(geometry, material);
      scene.add(cube);
      disposables.push(geometry, material);
      camera.position.set(0, 0, 5);
    } else {
      // ---------- 数据驱动：知识点 → 星球，引用关系 → 星际航线 ----------
      const sphereGeometry = new THREE.SphereGeometry(0.35, 32, 32);
      disposables.push(sphereGeometry);
      graphData.nodes.forEach((node) => {
        const material = new THREE.MeshStandardMaterial({
          color: statusColor(node),
          roughness: 0.35,
          metalness: 0.1
        });
        const sphere = new THREE.Mesh(sphereGeometry, material);
        sphere.position.set(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10
        );
        // 节点大小随 symbolSize 缩放（后端按正文长度给出 20~50）
        const scale = 0.7 + (node.symbolSize || 20) / 50;
        sphere.scale.setScalar(scale);
        sphere.userData = { id: node.id, name: node.name, value: node.value, baseColor: material.color.getHex() };
        scene.add(sphere);
        nodeMeshes.push(sphere);
        meshById.set(node.id, sphere);
        disposables.push(material);
      });

      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x8899bb, transparent: true, opacity: 0.45 });
      disposables.push(lineMaterial);
      graphData.links.forEach((link) => {
        const source = meshById.get(link.source);
        const target = meshById.get(link.target);
        if (!source || !target) return;
        const geometry = new THREE.BufferGeometry().setFromPoints([source.position, target.position]);
        const line = new THREE.Line(geometry, lineMaterial.clone());
        scene.add(line);
        lineObjects.push({ line, sourceId: link.source, targetId: link.target });
        disposables.push(geometry, line.material);
      });
    }

    // ---------- Raycaster 鼠标拾取（课后挑战：悬停高亮星球与航线） ----------
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredMesh = null;
    let mouseDownAt = null;

    const setHighlight = (mesh, on) => {
      if (!mesh) return;
      mesh.material.emissive.setHex(on ? 0x552200 : 0x000000); // 悬停发光，移开恢复
      const id = mesh.userData.id;
      lineObjects.forEach(({ line, sourceId, targetId }) => {
        const connected = sourceId === id || targetId === id;
        line.material.color.setHex(on && connected ? 0xffaa33 : 0x8899bb);
        line.material.opacity = on ? (connected ? 0.95 : 0.15) : 0.45;
      });
    };

    const updateMouse = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onMouseMove = (event) => {
      if (mode !== 'graph') return;
      updateMouse(event);
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeMeshes);
      const hit = intersects[0]?.object || null;
      if (hit !== hoveredMesh) {
        setHighlight(hoveredMesh, false);
        hoveredMesh = hit;
        setHighlight(hoveredMesh, true);
        setHovered(hit ? { name: hit.userData.name, value: hit.userData.value } : null);
        renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
      }
    };

    // 点击星球跳详情；用按下/抬起位移区分「点击」与「拖拽旋转」
    const onMouseDown = (event) => {
      mouseDownAt = { x: event.clientX, y: event.clientY };
    };
    const onMouseUp = (event) => {
      if (mode !== 'graph' || !mouseDownAt) return;
      const moved = Math.hypot(event.clientX - mouseDownAt.x, event.clientY - mouseDownAt.y);
      mouseDownAt = null;
      if (moved > 5) return;
      updateMouse(event);
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeMeshes);
      if (intersects.length) {
        navigateRef.current(`/kp/${intersects[0].object.userData.id}`);
      }
    };

    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mouseup', onMouseUp);

    // ---------- 动画循环 ----------
    let frameId = 0;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      if (cube) {
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
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

    // ---------- 卸载清理：停止循环、移除监听、释放 GPU 资源 ----------
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      controls.dispose();
      disposables.forEach((item) => item.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === currentMount) {
        currentMount.removeChild(renderer.domElement);
      }
      setHovered(null);
    };
  }, [mode, graphData]);

  const nodes = graphData?.nodes || [];
  const counts = {
    mastered: nodes.filter((node) => !node.reviewList && node.status === 'mastered').length,
    need_review: nodes.filter((node) => node.reviewList || node.status === 'need_review').length,
    not_started: nodes.filter(
      (node) => !node.reviewList && node.status !== 'mastered' && node.status !== 'need_review'
    ).length
  };
  const showGraph = mode === 'graph';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <span className="eyebrow">THREE.JS WORLD</span>
          <h1 className="page-title">3D 视界</h1>
          <p className="page-subtitle">
            {mode === 'cube'
              ? 'Three.js 三要素演示：场景 + 相机 + 渲染器。左键拖拽旋转，滚轮缩放，右键平移。'
              : '每个知识点是一颗星球（颜色=学习状态），引用关系是星际航线。悬停高亮关联，点击星球查看详情。'}
          </p>
        </div>
        <div className={styles.modeSwitch}>
          <div className="segmented" role="group" aria-label="切换 3D 模式">
            <button
              type="button"
              className={mode === 'graph' ? 'active' : ''}
              onClick={() => setMode('graph')}
            >
              知识宇宙
            </button>
            <button
              type="button"
              className={mode === 'cube' ? 'active' : ''}
              onClick={() => setMode('cube')}
            >
              旋转立方体
            </button>
          </div>
        </div>
      </div>

      {showGraph && (
        <div className={styles.legendRow}>
          <span className={styles.legendPill}>
            <span className={styles.legendDot} style={{ background: STATUS_HEX.mastered }} />
            已掌握 <span className={styles.legendCount}>{counts.mastered}</span>
          </span>
          <span className={styles.legendPill}>
            <span className={styles.legendDot} style={{ background: STATUS_HEX.need_review }} />
            需复习 <span className={styles.legendCount}>{counts.need_review}</span>
          </span>
          <span className={styles.legendPill}>
            <span className={styles.legendDot} style={{ background: STATUS_HEX.not_started }} />
            未开始 <span className={styles.legendCount}>{counts.not_started}</span>
          </span>
        </div>
      )}

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 14 }} role="alert">
          {error}
        </div>
      )}

      {showGraph && loading ? (
        <div className="card card-pad">
          <div className="loading-block">
            <span className="spinner" />
            正在构建你的知识宇宙…
          </div>
        </div>
      ) : showGraph && nodes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🌌</div>
          <h3 className="empty-title">宇宙里还没有星球</h3>
          <p className="empty-text">
            先创建几个知识点，它们会变成星球；当正文提到另一个知识点的标题时，星球之间会出现航线。
          </p>
        </div>
      ) : (
        <div className={styles.stageCard}>
          <div className={styles.stageHead}>
            <div className={styles.stageTitle}>
              <strong>{showGraph ? '知识宇宙' : 'Hello 3D World'}</strong>
              <span>
                {showGraph
                  ? `${nodes.length} 颗星球 · 颜色表示掌握状态`
                  : '场景 / 相机 / 渲染器 · 绿色立方体'}
              </span>
            </div>
            <span className={styles.stageBadge}>
              {showGraph ? '🪐 悬停高亮 · 点击进入' : '🖱 拖拽旋转 · 滚轮缩放'}
            </span>
          </div>
          <div className={styles.canvasWrap}>
            <div ref={mountRef} className={styles.canvas} />
            {hovered && (
              <div className={styles.hoverCard}>
                <div className={styles.hoverName}>{hovered.name}</div>
                {(hovered.value || '').trim() && (
                  <div className={styles.hoverText}>
                    {(hovered.value || '').slice(0, 80)}
                    {(hovered.value || '').length > 80 ? '…' : ''}
                  </div>
                )}
                <div className={styles.hoverHint}>点击查看知识点详情</div>
              </div>
            )}
            <span className={styles.canvasHint}>左键拖拽旋转 · 滚轮缩放 · 右键平移</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ThreeJSPage;