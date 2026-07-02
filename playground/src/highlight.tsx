import type { ReactNode } from 'react';

// A tiny, dependency-free highlighter for short JSX/TS snippets. Tokenizes into
// React spans (no dangerouslySetInnerHTML) — strings, keywords, component tags,
// attribute/property names, function calls, and numbers each get a class.
// Returns just the <code>; wrap it in your own <pre>.
export function Highlight({ src }: { src: string }) {
  const re =
    /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(import|from|export|default|const|let|var|return|await|async|new|function)\b|(<\/?)([A-Za-z][\w]*)|([a-zA-Z_]\w*)(?=\s*[:=][^=])|([a-zA-Z_]\w*)(?=\()|(\b\d+\b)|([{}()[\]<>/=.:,]+)/g;
  const nodes: ReactNode[] = [];
  let last = 0;
  let k = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) nodes.push(src.slice(last, m.index));
    const [full, str, kw, tagOpen, tagName, attr, fn, num, punc] = m;
    if (str) nodes.push(<span key={k++} className="tok-str">{str}</span>);
    else if (kw) nodes.push(<span key={k++} className="tok-key">{kw}</span>);
    else if (tagOpen !== undefined) {
      nodes.push(<span key={k++} className="tok-punc">{tagOpen}</span>);
      if (tagName) nodes.push(<span key={k++} className="tok-tag">{tagName}</span>);
    } else if (attr) nodes.push(<span key={k++} className="tok-attr">{attr}</span>);
    else if (fn) nodes.push(<span key={k++} className="tok-fn">{fn}</span>);
    else if (num) nodes.push(<span key={k++} className="tok-num">{num}</span>);
    else if (punc) nodes.push(<span key={k++} className="tok-punc">{punc}</span>);
    else nodes.push(full);
    last = m.index + full.length;
  }
  if (last < src.length) nodes.push(src.slice(last));
  return <code>{nodes}</code>;
}
