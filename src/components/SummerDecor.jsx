/**
 * 日系夏日装饰元素（全部内联 SVG，无位图，轻量）
 * 只做视觉点缀：海浪细线、风铃、金鱼剪影、涟漪。
 * 每屏装饰不超过 3 处，内容永远优先。
 */

/* 一条缓和的海浪细线，用作区块分隔或卡片底缘 */
export function WaveLine({ className = '', height = 14, color = 'rgba(126,200,227,0.55)' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 240 14"
      height={height}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M0 9 C 20 2, 40 2, 60 9 S 100 16, 120 9 S 160 2, 180 9 S 220 16, 240 9"
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* 细线条风铃：挂在 hero 右上角，带极轻微的摆动 */
export function WindChime({ className = '' }) {
  return (
    <svg
      className={`wind-chime ${className}`}
      viewBox="0 0 64 120"
      aria-hidden="true"
      focusable="false"
    >
      <g stroke="rgba(62,127,166,0.55)" strokeWidth="1" fill="none">
        <line x1="32" y1="2" x2="32" y2="26" />
        <path d="M14 26 H50" strokeLinecap="round" />
        <line x1="20" y1="26" x2="20" y2="42" />
        <line x1="44" y1="26" x2="44" y2="42" />
      </g>
      {/* 玻璃铃身：一个半透明的椭圆 */}
      <ellipse cx="32" cy="54" rx="15" ry="17" fill="rgba(126,200,227,0.16)" stroke="rgba(62,127,166,0.5)" strokeWidth="1" />
      <path d="M32 37 V71" stroke="rgba(62,127,166,0.35)" strokeWidth="0.8" />
      <circle cx="20" cy="66" r="7" fill="none" stroke="rgba(62,127,166,0.45)" strokeWidth="1" />
      <circle cx="44" cy="66" r="7" fill="none" stroke="rgba(62,127,166,0.45)" strokeWidth="1" />
      {/* 短册 */}
      <g stroke="rgba(62,127,166,0.45)" strokeWidth="1">
        <line x1="20" y1="74" x2="20" y2="104" />
        <line x1="44" y1="74" x2="44" y2="112" />
        <line x1="32" y1="72" x2="32" y2="96" />
      </g>
      <rect x="16" y="98" width="8" height="9" fill="rgba(232,200,122,0.35)" stroke="rgba(62,127,166,0.35)" strokeWidth="0.8" />
    </svg>
  );
}

/* 金鱼剪影：水彩晕染质感，低透明度，不抢内容 */
export function Goldfish({ className = '', flip = false }) {
  return (
    <svg
      className={className}
      viewBox="0 0 96 56"
      aria-hidden="true"
      focusable="false"
      style={{ transform: flip ? 'scaleX(-1)' : undefined }}
    >
      <g fill="rgba(242,166,141,0.34)">
        {/* 身体 */}
        <ellipse cx="38" cy="28" rx="19" ry="11" />
        {/* 尾鳍 */}
        <path d="M52 28 C62 18, 74 12, 84 8 C78 20, 78 36, 84 48 C74 44, 62 38, 52 28 Z" />
        {/* 背鳍与腹鳍 */}
        <path d="M30 17 C34 10, 44 10, 48 16 C42 15, 35 15, 30 17 Z" fill="rgba(232,200,122,0.28)" />
        <path d="M30 39 C34 46, 44 46, 48 40 C42 41, 35 41, 30 39 Z" fill="rgba(232,200,122,0.24)" />
      </g>
      <circle cx="25" cy="26" r="1.6" fill="rgba(51,71,91,0.42)" />
      <path d="M52 24 C60 20, 66 16, 72 12" stroke="rgba(255,255,255,0.5)" strokeWidth="0.9" fill="none" />
    </svg>
  );
}
