#!/usr/bin/env node
// Renders docs/wiki/*.md into site/wiki/*.html (static, no dependencies), plus a search index and the sitemap.
// Run after editing the wiki:  node scripts/build-wiki.mjs   (screenshots live in site/wiki/img, see docs/wiki/README.md)
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'docs', 'wiki');
const OUT = join(ROOT, 'site', 'wiki');
const ORIGIN = 'https://gigawatt.ing';
mkdirSync(OUT, { recursive: true });

// reading order; any page not listed is appended alphabetically
const ORDER = ['index', 'getting-started', 'first-hour', 'power-and-cooling', 'servers-and-racks', 'networking-and-clusters', 'customers-and-contracts',
  'money-and-operations', 'energy-and-spot', 'hardware-roadmap', 'incidents-and-resilience', 'strategy-tips', 'see-it-in-action', 'make-it-yours', 'performance-and-settings', 'faq', 'glossary'];
const files = readdirSync(SRC).filter((f) => f.endsWith('.md') && f !== 'README.md').map((f) => f.replace(/\.md$/, ''));
const slugs = [...ORDER.filter((s) => files.includes(s)), ...files.filter((s) => !ORDER.includes(s)).sort()];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugify = (s) => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function inline(t) {
  let s = esc(t);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, a, u) => `<img loading="lazy" src="${u.replace(/\.png$/, '.webp')}" alt="${a}">`);
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, a, u) => `<a href="${u.replace(/\.md(#|$)/, '.html$1')}">${a}</a>`);
  return s;
}

function render(md) {
  const lines = md.replace(/\r/g, '').split('\n');
  const html = []; const toc = []; let title = ''; let lede = '';
  let i = 0; let lastWasImage = false;
  while (i < lines.length) {
    const ln = lines[i];
    if (!ln.trim()) { i++; continue; }
    let m;
    if ((m = ln.match(/^(#{1,3})\s+(.*)$/))) {
      const lvl = m[1].length; const text = m[2].trim();
      if (lvl === 1 && !title) { title = text; i++; continue; }
      const id = slugify(text); if (lvl === 2) toc.push({ id, text });
      html.push(`<h${lvl} id="${id}">${inline(text)}</h${lvl}>`); i++; lastWasImage = false; continue;
    }
    if (ln.startsWith('```')) {
      const buf = []; i++;
      while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++]);
      i++; html.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`); lastWasImage = false; continue;
    }
    if (/^\|.*\|\s*$/.test(ln) && /^\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? '')) {
      const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = cells(ln); i += 2; const rows = [];
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]));
      html.push(`<div class="tbl"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      lastWasImage = false; continue;
    }
    if (/^\s*[-*]\s+/.test(ln) || /^\s*\d+\.\s+/.test(ln)) {
      const ordered = /^\s*\d+\./.test(ln); const items = [];
      while (i < lines.length && (/^\s*[-*]\s+/.test(lines[i]) || /^\s*\d+\.\s+/.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length))) {
        if (/^\s{2,}\S/.test(lines[i]) && !/^\s*[-*]\s+|^\s*\d+\.\s+/.test(lines[i])) items[items.length - 1] += ' ' + lines[i].trim();
        else items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ''));
        i++;
      }
      html.push(`<${ordered ? 'ol' : 'ul'}>${items.map((x) => `<li>${inline(x)}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>`); lastWasImage = false; continue;
    }
    if (/^>\s?/.test(ln)) {
      const buf = []; while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      html.push(`<blockquote>${inline(buf.join(' '))}</blockquote>`); lastWasImage = false; continue;
    }
    if (/^!\[[^\]]*\]\([^)]+\)\s*$/.test(ln)) {
      const imgHtml = inline(ln.trim()); i++;
      // an italic line right after an image is its caption
      let cap = '';
      while (i < lines.length && !lines[i].trim()) i++;
      if (i < lines.length && /^\*[^*].*\*\s*$/.test(lines[i])) cap = inline(lines[i++].trim().replace(/^\*|\*$/g, ''));
      html.push(`<figure>${imgHtml}${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`); lastWasImage = true; continue;
    }
    const buf = [ln.trim()]; i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|```|\||\s*[-*]\s|\s*\d+\.\s|>|!\[)/.test(lines[i])) buf.push(lines[i++].trim());
    const text = buf.join(' ');
    if (!lede && /^\*[^*].*\*$/.test(text)) { lede = text.replace(/^\*|\*$/g, ''); continue; }
    html.push(`<p>${inline(text)}</p>`); lastWasImage = false;
  }
  void lastWasImage;
  return { title, lede, body: html.join('\n'), toc };
}

const pages = slugs.map((slug) => {
  const md = readFileSync(join(SRC, slug + '.md'), 'utf8');
  const r = render(md);
  return { slug, md, ...r, text: md.replace(/[#*`|>\-\[\]()!]/g, ' ').replace(/\s+/g, ' ').trim() };
});

const nav = (cur) => pages.map((p) => `<li><a href="${p.slug}.html"${p.slug === cur ? ' aria-current="page"' : ''}>${esc(p.title)}</a></li>`).join('');

const shell = (p, idx) => {
  const prev = pages[idx - 1], next = pages[idx + 1];
  const url = `${ORIGIN}/wiki/${p.slug}.html`;
  const desc = esc((p.lede || p.title).slice(0, 180));
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(p.title)} · GIGAWATT Wiki</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${esc(p.title)} · GIGAWATT Wiki">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${ORIGIN}/assets/og.jpg">
<meta property="og:type" content="article">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#050912">
<link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="../assets/ChakraPetch-Bold.ttf" as="font" type="font/ttf" crossorigin>
<link rel="stylesheet" href="../style.css">
<link rel="stylesheet" href="wiki.css">
</head>
<body class="wiki">
<a class="skip" href="#main">Skip to content</a>
<header class="nav">
  <a class="logo" href="../" aria-label="GIGAWATT home">⚡ GIGAWATT</a>
  <nav aria-label="Primary">
    <a href="index.html">Wiki</a>
    <a href="https://github.com/ixaxaar/gigawatt/discussions">Community</a>
    <a href="../#download" class="btn mini go">Download</a>
  </nav>
</header>
<div class="wiki-wrap">
  <aside class="side" aria-label="Wiki pages">
    <label class="sr" for="q">Search the wiki</label>
    <input id="q" type="search" placeholder="Search the wiki…" autocomplete="off">
    <ul id="results" class="results" hidden></ul>
    <ul class="pages">${nav(p.slug)}</ul>
  </aside>
  <main id="main" class="doc">
    <h1>${esc(p.title)}</h1>
    ${p.lede ? `<p class="lede2">${inline(p.lede)}</p>` : ''}
    ${p.toc.length > 2 ? `<nav class="toc" aria-label="On this page"><strong>On this page</strong><ul>${p.toc.map((t) => `<li><a href="#${t.id}">${esc(t.text)}</a></li>`).join('')}</ul></nav>` : ''}
    ${p.body}
    <nav class="pager" aria-label="Previous and next">
      ${prev ? `<a href="${prev.slug}.html">← ${esc(prev.title)}</a>` : '<span></span>'}
      ${next ? `<a href="${next.slug}.html">${esc(next.title)} →</a>` : '<span></span>'}
    </nav>
    <p class="fine">Found a mistake or something missing? <a href="https://github.com/ixaxaar/gigawatt/edit/master/docs/wiki/${p.slug}.md">Edit this page on GitHub</a> or ask in <a href="https://github.com/ixaxaar/gigawatt/discussions">Discussions</a>.</p>
  </main>
</div>
<script src="wiki.js" defer></script>
</body>
</html>
`;
};

pages.forEach((p, i) => writeFileSync(join(OUT, p.slug + '.html'), shell(p, i)));
writeFileSync(join(OUT, 'search.json'), JSON.stringify(pages.map((p) => ({ slug: p.slug, title: p.title, text: p.text.slice(0, 6000) }))));

const urls = [`${ORIGIN}/`, ...pages.map((p) => `${ORIGIN}/wiki/${p.slug}.html`)];
writeFileSync(join(ROOT, 'site', 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u, i) => `  <url><loc>${u}</loc><changefreq>weekly</changefreq><priority>${i === 0 ? '1.0' : '0.6'}</priority></url>`).join('\n')}\n</urlset>\n`);

// every image a page references must exist
const missing = [];
for (const p of pages) for (const m of p.md.matchAll(/!\[[^\]]*\]\((img\/[^)]+)\)/g)) if (!existsSync(join(OUT, m[1].replace(/\.png$/, '.webp')))) missing.push(`${p.slug}: ${m[1]}`);
console.log(`wiki: ${pages.length} pages -> site/wiki`);
if (missing.length) { console.error('missing images:\n  ' + missing.join('\n  ')); process.exit(1); }
