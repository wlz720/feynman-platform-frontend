import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import apiClient from '../api/axios';

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

function statusColor(node) {
  if (node.reviewList) return STATUS_COLORS.need_review;
  return STATUS_COLORS[node.status] ?? STATUS_COLORS.not_started;
}

function ThreeJSPage() {
  const mountRef = useRef(null);
  const [mode, setMode] = useState('graph');
  const [graphData, setGraphData] = useState(null);
  const [error, setError] = useState('');
  const [hovered, setHovered] = useState(null); // 当前悬停的节点 { name, value }
  const navigate = useNavigate();
  // 点击跳转用 ref 透传，避免把 navigate 放进 3D useEffect 依赖导致场景重建
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

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

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#4c1d95', margin: '0 0 6px' }}>3D 视界</h1>
          <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
            {mode === 'cube'
              ? 'Three.js 三要素演示：场景 + 相机 + 渲染器。左键拖拽旋转视角，滚轮缩放，右键平移。'
              : '知识星球宇宙：每个知识点是一颗星球（颜色=学习状态），引用关系是星际航线。悬停高亮关联，点击星球查看详情。'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            ['graph', '知识宇宙'],
            ['cube', '旋转立方体']
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                border: '1px solid #8b5cf6',
                background: mode === value ? '#8b5cf6' : '#fff',
                color: mode === value ? '#fff' : '#6d28d9',
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <p style={{ color: '#b91c1c' }}>{error}</p>}
      {mode === 'graph' && graphData && graphData.nodes.length === 0 && (
        <p style={{ color: '#6b7280' }}>还没有知识点，先去主页创建几个，再回来探索你的知识宇宙。</p>
      )}

      <div style={{ position: 'relative', marginTop: 16, borderRadius: 12, overflow: 'hidden' }}>
        <div ref={mountRef} style={{ width: '100%', height: '72vh', minHeight: 420 }} />
        {hovered && (
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              background: 'rgba(15, 23, 42, 0.85)',
              color: '#fff',
              padding: '10px 14px',
              borderRadius: 8,
              maxWidth: 320,
              fontSize: 13,
              pointerEvents: 'none'
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{hovered.name}</div>
            <div style={{ color: '#cbd5e1' }}>{(hovered.value || '').slice(0, 80)}...</div>
            <div style={{ color: '#94a3b8', marginTop: 4, fontSize: 12 }}>点击查看知识点详情</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ThreeJSPage;