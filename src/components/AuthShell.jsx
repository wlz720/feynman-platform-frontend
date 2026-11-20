import { Goldfish, WaveLine } from './SummerDecor';

const FEATURES = [
  { icon: '◉', text: '录音复述 · 自动转写' },
  { icon: '✦', text: 'AI 教练 · 润色评分' },
  { icon: '▤', text: 'RAG 私有知识库问答' },
  { icon: '◎', text: '2D / 3D 知识图谱' },
];

function AuthShell({ eyebrow, title, subtitle, children, footer }) {
  return (
    <div className="auth-page">
      <div className="auth-shell">
        <aside className="auth-visual">
          <div>
            <div className="auth-brandline">
              <span className="brand-mark">F</span>
              费曼学习平台
            </div>
            <h1>
              把知识讲出来，
              <br />
              才算真的学会。
            </h1>
            <p className="auth-lead">
              用费曼学习法管理你的知识：录一段复述，让 AI 教练指出盲区；
              再用出题测评、RAG 问答和知识图谱，把零散的概念连成自己的知识网络。
            </p>
            <div className="auth-features">
              {FEATURES.map((item) => (
                <div key={item.text} className="auth-feature">
                  <span className="auth-feature-icon">{item.icon}</span>
                  {item.text}
                </div>
              ))}
            </div>
          </div>
          <div className="auth-visual-foot">FEYNMAN LEARNING PLATFORM · 2026</div>
          <div className="auth-visual-art" aria-hidden="true">
            <WaveLine className="auth-visual-wave" height={16} />
            <Goldfish className="auth-visual-fish" />
          </div>
        </aside>

        <section className="auth-form-side">
          <div className="auth-card">
            <span className="auth-eyebrow">{eyebrow}</span>
            <h2 className="auth-title">{title}</h2>
            <p className="auth-subtitle">{subtitle}</p>
            {children}
            {footer}
          </div>
        </section>
      </div>
    </div>
  );
}

export default AuthShell;
