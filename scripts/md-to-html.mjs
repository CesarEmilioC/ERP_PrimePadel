// Convierte uno o todos los .md de docs/ a HTML listo para imprimir como PDF.
// Uso:
//   node scripts/md-to-html.mjs                   → convierte todos los .md de docs/
//   node scripts/md-to-html.mjs docs/cotizacion.md → solo ese archivo

import { marked } from "marked";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, basename, extname, join } from "node:path";

const ROOT = resolve(process.cwd());
const DOCS = join(ROOT, "docs");

// Archivos a convertir (argumento o todos los .md de docs/)
const targets = process.argv.slice(2).length
  ? process.argv.slice(2).map((f) => resolve(f))
  : readdirSync(DOCS)
      .filter((f) => extname(f) === ".md")
      .map((f) => join(DOCS, f));

const CSS = `
  :root {
    --bg: #0d0d0d;
    --surface: #161616;
    --border: #2a2a2a;
    --text: #e5e5e5;
    --muted: #a3a3a3;
    --orange: #FF8C42;
    --yellow: #F5C518;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', 'Segoe UI', sans-serif;
    background: var(--bg);
    color: var(--text);
    font-size: 14px;
    line-height: 1.7;
    padding: 48px 64px;
    max-width: 900px;
    margin: 0 auto;
  }

  h1 { font-size: 2rem; color: #fff; margin-bottom: 8px; border-bottom: 2px solid var(--orange); padding-bottom: 10px; margin-top: 32px; }
  h2 { font-size: 1.25rem; color: var(--yellow); margin-top: 32px; margin-bottom: 10px; }
  h3 { font-size: 1rem; color: var(--orange); margin-top: 20px; margin-bottom: 6px; }

  p { margin-bottom: 12px; color: var(--text); }

  a { color: var(--orange); text-decoration: none; }
  a:hover { text-decoration: underline; }

  ul, ol { padding-left: 20px; margin-bottom: 12px; }
  li { margin-bottom: 4px; }
  li ul, li ol { margin-top: 4px; margin-bottom: 4px; }

  strong { color: #fff; font-weight: 600; }
  em { color: var(--muted); font-style: italic; }

  code {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 2px 6px;
    font-family: 'Consolas', 'Fira Code', monospace;
    font-size: 12px;
    color: var(--orange);
  }

  pre {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 16px;
    overflow-x: auto;
    margin-bottom: 16px;
  }
  pre code { background: none; border: none; padding: 0; color: var(--text); }

  blockquote {
    border-left: 3px solid var(--orange);
    padding: 8px 16px;
    margin: 16px 0;
    background: var(--surface);
    border-radius: 0 6px 6px 0;
    color: var(--muted);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
    font-size: 13px;
  }
  th {
    background: var(--surface);
    color: var(--yellow);
    padding: 10px 12px;
    text-align: left;
    border-bottom: 2px solid var(--border);
    font-weight: 600;
  }
  td {
    padding: 9px 12px;
    border-bottom: 1px solid var(--border);
    color: var(--text);
  }
  tr:hover td { background: #1a1a1a; }

  hr { border: none; border-top: 1px solid var(--border); margin: 32px 0; }

  /* Header con logo y datos del documento */
  .doc-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 32px;
  }
  .doc-logo { color: #fff; font-size: 1.4rem; font-weight: 700; }
  .doc-logo span { color: var(--orange); }
  .doc-meta { text-align: right; font-size: 12px; color: var(--muted); line-height: 1.8; }

  /* Pie de página */
  .doc-footer {
    margin-top: 48px;
    padding-top: 16px;
    border-top: 1px solid var(--border);
    font-size: 11px;
    color: var(--muted);
    display: flex;
    justify-content: space-between;
  }

  /* Print */
  @media print {
    body { background: #fff; color: #111; padding: 24px 32px; }
    :root {
      --bg: #fff;
      --surface: #f5f5f5;
      --border: #ddd;
      --text: #111;
      --muted: #555;
      --orange: #cc6d1e;
      --yellow: #b8930a;
    }
    a { color: var(--orange); }
    h1 { color: #111; }
    h2 { color: #333; }
    h3 { color: #555; }
    strong { color: #111; }
    pre, code { border: 1px solid #ddd; }
    @page { margin: 20mm 18mm; }
  }
`;

function template(title, body) {
  const now = new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — Prime Padel</title>
  <style>${CSS}</style>
</head>
<body>
  <div class="doc-header">
    <div class="doc-logo">Prime <span>Padel</span></div>
    <div class="doc-meta">
      César Emilio — cesarxemiliox@gmail.com<br>
      Cali, Colombia<br>
      ${now}
    </div>
  </div>

  ${body}

  <div class="doc-footer">
    <span>Prime Padel — ERP de Inventario</span>
    <span>Documento generado el ${now}</span>
  </div>
</body>
</html>`;
}

for (const src of targets) {
  const md = readFileSync(src, "utf8");
  const html = marked(md);
  // Título = primer H1 del markdown o nombre del archivo
  const titleMatch = md.match(/^#\s+(.+)/m);
  const title = titleMatch ? titleMatch[1].replace(/\*\*/g, "") : basename(src, ".md");
  const out = src.replace(/\.md$/, ".html");
  writeFileSync(out, template(title, html), "utf8");
  console.log(`✅ ${basename(src)} → ${basename(out)}`);
}
