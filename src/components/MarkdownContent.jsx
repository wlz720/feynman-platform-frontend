import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';

let mermaidLoader = null;
function loadMermaid() {
  if (!mermaidLoader) {
    mermaidLoader = import('mermaid').then(({ default: mermaid }) => {
      mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'default' });
      return mermaid;
    });
  }
  return mermaidLoader;
}

function MermaidDiagram({ chart }) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setError('');
    loadMermaid()
      .then((mermaid) => mermaid.render(`mermaid-${Math.random().toString(36).slice(2)}`, chart))
      .then(({ svg: markup }) => {
        if (!cancelled) setSvg(markup);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [chart]);

  if (error) {
    return <pre style={{ color: '#b91c1c', fontSize: 13 }}>流程图语法错误：{error}</pre>;
  }
  return <div style={{ textAlign: 'center', overflowX: 'auto' }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

function textOf(children) {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(textOf).join('');
  return children?.props?.children ?? '';
}

export default function MarkdownContent({ children }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex, rehypeHighlight]}
      components={{
        pre({ node, children: preChildren, ...rest }) {
          const code = Array.isArray(preChildren) ? preChildren[0] : preChildren;
          if (/language-mermaid/.test(code?.props?.className || '')) {
            return <MermaidDiagram chart={textOf(code.props.children).replace(/\n$/, '')} />;
          }
          return <pre {...rest}>{preChildren}</pre>;
        }
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
