import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import apiClient from '../api/axios';
import {
  createGlowTexture,
  createGlowSprite,
  createNodeLabel,
  createStarfield,
  buildArcPoints
} from '../utils/threeScene';
import styles from './ThreeJSPage.module.css';

// 课时13：3D 可视化入门与 Three.js
// 两种模式：
//   cube  —— 课件第二部分的「Hello 3D World」旋转立方体（场景/相机/渲染器三要素演示）
//   graph —— 课件第三部分 + 课后挑战：知识图谱数据映射为 3D「知识星球」，
//            Raycaster 实现鼠标悬停高亮星球与相连航线
const STATUS_COLORS = {
  mastered: 0x5fb89a,
  need_review: 0xe88b6f,
  not_started: 0x9fb9c9
};

const STATUS_HEX = {
  mastered: '#5FB89A',
  need_review: '#E88B6F',
  not_started: '#9FB9C9'
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
    scene.background = new THREE.Color(0x050814);
    scene.fog = new THREE.FogExp2(0x050814, 0.025);

    const camera = new THREE.PerspectiveCamera(
      60,
      currentMount.clientWidth / currentMount.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, mode === 'cube' ? 7 : 22);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
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
    controls.enableDamping = true; // 阻尼让旋转更平滑
    controls.dampingFactor = 0.07;
    controls.minDistance = mode === 'cube' ? 3.2 : 8;
    controls.maxDistance = 70;

    const world = new THREE.Group();
    scene.add(world);

    // ---------- 光照：冷暖双色点光 + 环境光，让星球有体积感 ----------
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const violetLight = new THREE.PointLight(0x3e7fa6, 90, 0, 2);
    violetLight.position.set(-12, 8, 10);
    scene.add(violetLight);
    const cyanLight = new THREE.PointLight(0x22d3ee, 65, 0, 2);
    cyanLight.position.set(13, -7, 9);
    scene.add(cyanLight);

    const glowTexture = createGlowTexture();
    const disposables = []; // 统一记录几何体/材质，卸载时释放显存
    const starfield = createStarfield({ count: 1000, minRadius: 55, maxRadius: 260 });
    scene.add(starfield);
    disposables.push(starfield.geometry, starfield.material);

    // 星云光晕：两团巨大的柔光，作为深空底色
    const nebulaA = createGlowSprite(glowTexture, 0x2f6484, 85, 0.11);
    nebulaA.position.set(-25, 14, -38);
    scene.add(nebulaA);
    const nebulaB = createGlowSprite(glowTexture, 0x0ea5e9, 64, 0.09);
    nebulaB.position.set(28, -16, -30);
    scene.add(nebulaB);
    disposables.push(nebulaA.material, nebulaB.material);

    let cube = null;
    const nodeMeshes = [];
    const lineObjects = []; // { line, sourceId, targetId }
    const meshById = new Map();

    if (mode === 'cube') {
      // Hello 3D World：发光旋转立方体 + 霓虹边线 + 光环
      const geometry = new THREE.BoxGeometry(2.2, 2.2, 2.2, 2, 2, 2);
      const material = new THREE.MeshPhysicalMaterial({
        color: 0x071b12,
        emissive: 0x5fb89a,
        emissiveIntensity: 0.22,
        roughness: 0.12,
        metalness: 0.75,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        transparent: true,
        opacity: 0.92
      });
      cube = new THREE.Mesh(geometry, material);
      world.add(cube);
      disposables.push(geometry, material);

      const edges = new THREE.EdgesGeometry(geometry);
      const edgeMaterial = new THREE.LineBasicMaterial({
        color: 0x86efac,
        transparent: true,
        opacity: 0.95
      });
      cube.add(new THREE.LineSegments(edges, edgeMaterial));
      disposables.push(edges, edgeMaterial);

      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0x7ec8e3,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending
      });
      const ringGeometry = new THREE.TorusGeometry(2.8, 0.035, 8, 120);
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2.15;
      ring.rotation.y = 0.35;
      world.add(ring);
      disposables.push(ringGeometry, ringMaterial);

      const glow = createGlowSprite(glowTexture, 0x5fb89a, 13, 0.24);
      glow.material.depthTest = true;
      glow.position.set(0, 0, -1.6);
      glow.renderOrder = 0;
      world.add(glow);
      disposables.push(glow.material);
      camera.position.set(0, 1.2, 7.2);
    } else {
      // ---------- 数据驱动：知识点 → 星球，引用关系 → 星际航线 ----------
      // 用 Fibonacci 球面均匀撒点，让知识网络从任意角度都有层次，
      // 比纯随机坐标更稳定，也避免所有星球挤在视野中央。
      const nodeGeometry = new THREE.SphereGeometry(0.5, 32, 32);
      disposables.push(nodeGeometry);
      const total = graphData.nodes.length;
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      const showLabels = total <= 14;

      graphData.nodes.forEach((node, index) => {
        const color = statusColor(node);
        const material = new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.5,
          roughness: 0.28,
          metalness: 0.35
        });
        const sphere = new THREE.Mesh(nodeGeometry, material);
        const baseScale = 0.85 + (Math.min(node.symbolSize || 20, 50) / 50) * 0.75;
        sphere.scale.setScalar(baseScale);

        const group = new THREE.Group();
        if (total === 1) {
          group.position.set(0, 0, 0);
        } else {
          const y = 0.82 - (index / (total - 1)) * 1.64;
          const ringRadius = Math.sqrt(Math.max(0, 1 - y * y));
          const theta = goldenAngle * index;
          group.position.set(
            Math.cos(theta) * ringRadius * 8.4,
            y * 6.4,
            Math.sin(theta) * ringRadius * 8.4
          );
        }
        group.add(sphere);
        sphere.userData = {
          id: node.id,
          name: node.name,
          value: node.value,
          baseColor: color,
          baseScale,
          group,
          halo: null,
          label: null
        };

        const halo = createGlowSprite(glowTexture, color, baseScale * 4.4, 0.55);
        halo.position.set(0, 0, 0);
        group.add(halo);
        sphere.userData.halo = halo;
        disposables.push(halo.material);

        // 每条知识轨道环：给星球一点“行星”气质
        const ringGeometry = new THREE.TorusGeometry(baseScale * 1.35, 0.018, 6, 96);
        const ringMaterial = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.32,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2 + (index % 3) * 0.18;
        ring.rotation.z = index * 0.5;
        group.add(ring);
        disposables.push(ringGeometry, ringMaterial);

        if (showLabels) {
          const label = createNodeLabel(node.name, STATUS_HEX[node.status] || STATUS_HEX.not_started);
          label.position.set(0, baseScale * 1.25 + 1.25, 0);
          group.add(label);
          sphere.userData.label = label;
        }

        world.add(group);
        nodeMeshes.push(sphere);
        meshById.set(node.id, group);
        disposables.push(material);
      });

      graphData.links.forEach((link) => {
        const source = meshById.get(link.source);
        const target = meshById.get(link.target);
        if (!source || !target) return;
        const points = buildArcPoints(source.position, target.position, 26, 0.2);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
          color: 0x7c9cff,
          transparent: true,
          opacity: 0.34,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        const line = new THREE.Line(geometry, material);
        line.renderOrder = 1;
        world.add(line);
        lineObjects.push({ line, sourceId: link.source, targetId: link.target });
        disposables.push(geometry, material);
      });

      // 星系中心的一颗小核心，给整个场景一个视觉锚点
      const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0x8fd0e5,
        transparent: true,
        opacity: 0.9
      });
      const coreGeometry = new THREE.SphereGeometry(0.16, 16, 16);
      const core = new THREE.Mesh(coreGeometry, coreMaterial);
      world.add(core);
      disposables.push(coreGeometry, coreMaterial);
    }

    // ---------- Raycaster 鼠标拾取（课后挑战：悬停高亮星球与航线） ----------
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredMesh = null;
    let mouseDownAt = null;

    const setHighlight = (mesh, on) => {
      if (!mesh) return;
      mesh.material.emissiveIntensity = on ? 1.85 : 0.5; // 悬停发光，移开恢复
      const group = mesh.userData.group;
      if (group) group.scale.setScalar(on ? 1.12 : 1);
      if (mesh.userData.halo) {
        mesh.userData.halo.material.opacity = on ? 1 : 0.55;
      }
      if (mesh.userData.label) {
        mesh.userData.label.element.style.opacity = on ? '1' : '0.9';
      }
      const id = mesh.userData.id;
      lineObjects.forEach(({ line, sourceId, targetId }) => {
        const connected = sourceId === id || targetId === id;
        if (on && connected) {
          line.material.color.setHex(0xffb347);
          line.material.opacity = 0.98;
        } else {
          line.material.color.setHex(0x7c9cff);
          line.material.opacity = on ? 0.1 : 0.34;
        }
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
    let elapsed = 0;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      elapsed += 0.016;
      if (cube) {
        cube.rotation.x += 0.008;
        cube.rotation.y += 0.012;
        cube.rotation.z += 0.004;
      } else {
        // 缓慢自转，像一座活的星系；拖拽时 OrbitControls 仍可接管
        world.rotation.y += 0.0009;
      }
      if (starfield.material) {
        starfield.material.opacity =
          starfield.userData.baseOpacity * (0.86 + Math.sin(elapsed * 0.7) * 0.14);
      }
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

    // ---------- 卸载清理：停止循环、移除监听、释放 GPU 资源 ----------
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      controls.dispose();
      disposables.forEach((item) => item.dispose());
      glowTexture.dispose();
      renderer.dispose();
      if (labelRenderer.domElement.parentNode === currentMount) {
        currentMount.removeChild(labelRenderer.domElement);
      }
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
                  ? `${nodes.length} 颗星球 · ${graphData?.links?.length || 0} 条航线 · 颜色表示掌握状态`
                  : '场景 / 相机 / 渲染器 · 霓虹立方体'}
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
