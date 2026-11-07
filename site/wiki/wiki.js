// Client-side wiki search over search.json (title and page text). No dependencies.
(() => {
  const q = document.getElementById('q'), out = document.getElementById('results');
  if (!q || !out) return;
  let index = null;
  const load = () => index || (index = fetch('search.json').then((r) => r.json()).catch(() => []));
  const snippet = (text, term) => {
    const i = text.toLowerCase().indexOf(term);
    if (i < 0) return '';
    const s = Math.max(0, i - 40);
    return (s > 0 ? '…' : '') + text.slice(s, s + 110).trim() + '…';
  };
  q.addEventListener('input', async () => {
    const term = q.value.trim().toLowerCase();
    if (term.length < 2) { out.hidden = true; out.innerHTML = ''; return; }
    const pages = await load();
    const hits = pages
      .map((p) => ({ p, score: (p.title.toLowerCase().includes(term) ? 10 : 0) + (p.text.toLowerCase().split(term).length - 1) }))
      .filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 6);
    out.innerHTML = hits.length
      ? hits.map(({ p }) => `<li><a href="${p.slug}.html">${p.title}<small>${snippet(p.text, term).replace(/</g, '&lt;')}</small></a></li>`).join('')
      : '<li><a href="#" tabindex="-1">No matches</a></li>';
    out.hidden = false;
  });
  q.addEventListener('keydown', (e) => { if (e.key === 'Escape') { q.value = ''; out.hidden = true; } });
})();
