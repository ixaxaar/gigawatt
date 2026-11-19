// Client-side wiki search over search.json (title and page text), header menu, and keeping the current page in view in the scrolling page row. No dependencies.
(() => {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const btn = document.getElementById('menubtn'), links = document.getElementById('navlinks');
  if (btn && links) {
    const set = (o) => { links.classList.toggle('open', o); btn.setAttribute('aria-expanded', o); };
    btn.addEventListener('click', () => set(!links.classList.contains('open')));
    addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
    addEventListener('scroll', () => set(false), { passive: true });
  }
  const cur = document.querySelector('.pages a[aria-current=page]');
  if (cur && cur.closest('.pages').scrollWidth > cur.closest('.pages').clientWidth) cur.closest('.pages').scrollLeft = cur.offsetLeft - 24;
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
      ? hits.map(({ p }) => `<li><a href="${esc(p.slug)}.html">${esc(p.title)}<small>${esc(snippet(p.text, term))}</small></a></li>`).join('')
      : '<li><a href="#" tabindex="-1">No matches</a></li>';
    out.hidden = false;
  });
  q.addEventListener('keydown', (e) => { if (e.key === 'Escape') { q.value = ''; out.hidden = true; } });
})();
