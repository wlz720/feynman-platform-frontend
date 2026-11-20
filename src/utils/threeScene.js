import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

// 3D 场景通用视觉组件：柔和光晕、文字标签、星尘背景。
// 单独抽出来，课时13 与课时14 共用，避免两个页面各写一份 Canvas 纹理代码。

export function createGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.22, 'rgba(255,255,255,0.82)');
  gradient.addColorStop(0.55, 'rgba(255,255,255,0.22)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createGlowSprite(glowTexture, color, size = 3, opacity = 0.6) {
  const material = new THREE.SpriteMaterial({
    map: glowTexture,
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(size, size, 1);
  sprite.renderOrder = 2;
  return sprite;
}

// 用 CSS2D 做标签：文字始终保持屏幕像素大小，不会被 3D 透视缩成一条线。
export function createNodeLabel(text, accent = '#7EC8E3') {
  const div = document.createElement('div');
  div.className = 'three-label';
  div.textContent = String(text || '未命名知识点');
  div.style.borderColor = accent;
  return new CSS2DObject(div);
}

export function createStarfield({
  count = 900,
  minRadius = 90,
  maxRadius = 300,
  size = 0.9,
  opacity = 0.8
} = {}) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const palette = [0xffffff, 0xbfdbfe, 0x8fd0e5, 0x93c5fd];

  for (let i = 0; i < count; i += 1) {
    const radius = minRadius + Math.random() * (maxRadius - minRadius);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi);
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

    const color = new THREE.Color(palette[Math.floor(Math.random() * palette.length)]);
    color.toArray(colors, i * 3);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false
  });
  const points = new THREE.Points(geometry, material);
  points.userData.baseOpacity = opacity;
  return points;
}

// 把两点的连线弯成一条弧，视觉上更像“航线/引力丝”，而不是生硬的直线。
export function buildArcPoints(start, end, segments = 24, bow = 0.18) {
  const direction = end.clone().sub(start);
  const distance = direction.length();
  const mid = start.clone().add(end).multiplyScalar(0.5);
  let perpendicular = new THREE.Vector3(0, 1, 0).cross(direction);
  if (perpendicular.lengthSq() < 0.001) {
    perpendicular = new THREE.Vector3(1, 0, 0).cross(direction);
  }
  perpendicular.normalize().multiplyScalar(distance * bow);
  const control = mid.add(perpendicular);
  const curve = new THREE.QuadraticBezierCurve3(start, control, end);
  return curve.getPoints(segments);
}
