// GIGAWATT site: OS-aware downloads, heat lab calculator, gallery and lightbox. No dependencies.
(() => {
  const REPO = "ixaxaar/gigawatt";

  // ---- hero: a top-down field of racks with blinking thermal dots ----
  const cv = document.getElementById("rackfield");
  if (cv) {
    const ctx = cv.getContext("2d");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, racks = [], visible = true, t0 = performance.now();
    const COL = ["#3ddc97", "#3ddc97", "#3ddc97", "#ffd23f", "#ff4a3a"];
    function layout() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      racks = [];
      const rw = 22, rh = 44, gx = 6, aisle = 34, rowH = rh + 8;
      let y = 18, row = 0;
      while (y < H) {
        for (let x = 12; x < W; x += rw + gx) {
          const load = Math.random();
          racks.push({ x, y, rw, rh, seed: Math.random() * 6.28, speed: 0.5 + Math.random() * 1.5, hot: load > 0.9 ? 4 : load > 0.75 ? 3 : 0, lit: 1 + Math.floor(Math.random() * 4) });
        }
        y += rowH + (row % 2 === 0 ? 4 : aisle); row++;
      }
      draw(0);
    }
    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      for (const r of racks) {
        ctx.fillStyle = "#0d1626"; ctx.fillRect(r.x, r.y, r.rw, r.rh);
        ctx.strokeStyle = "#1c2c47"; ctx.lineWidth = 1; ctx.strokeRect(r.x + .5, r.y + .5, r.rw - 1, r.rh - 1);
        const c = COL[r.hot];
        for (let k = 0; k < 4; k++) {
          const on = k < r.lit && (reduce || Math.sin(t * r.speed + r.seed + k) > -0.6);
          ctx.fillStyle = on ? c : "#16213a"; ctx.fillRect(r.x + 3 + k * 5, r.y + r.rh - 8, 3.5, 3.5);
        }
        ctx.fillStyle = "rgba(155,107,255,.35)"; ctx.fillRect(r.x, r.y, 2, r.rh);
      }
    }
    function frame(now) { if (visible && !reduce) draw((now - t0) / 1000); requestAnimationFrame(frame); }
    new IntersectionObserver(e => { visible = e[0].isIntersecting; }).observe(cv);
    addEventListener("resize", layout); layout(); requestAnimationFrame(frame);
  }

  // ---- downloads: pick the right build from the latest release ----
  const dev = navigator.userAgentData || null;
  const plat = (dev && dev.platform) || navigator.platform || "";
  const ua = navigator.userAgent || "";
  let myOS = "", arch = "";
  if (/android/i.test(ua)) myOS = "android";
  else if (/iphone|ipad|ipod/i.test(ua) || (/mac/i.test(plat) && navigator.maxTouchPoints > 1)) myOS = "ios"; // iPad reports itself as a Mac
  else if (/win/i.test(plat)) myOS = "windows";
  else if (/mac/i.test(plat)) myOS = "macos";
  else if (/linux|x11/i.test(plat + " " + ua)) myOS = "linux";
  const cards = [...document.querySelectorAll(".dl")];
  const main = document.getElementById("dl-main"), note = document.getElementById("dl-note"), ver = document.getElementById("ver");
  const LABEL = { linux: "Linux", windows: "Windows", macos: "macOS", android: "Android" };
  let rel = null;
  const find = k => rel && (rel.assets || []).find(a => a.name.toLowerCase().includes(k) && !a.name.endsWith(".txt"));
  const keyOf = os => ({ linux: "linux", windows: "windows", "macos-arm64": "macos-arm64", "macos-x64": "macos-x64", android: ".apk" })[os];
  // which cards are "yours": works without the GitHub API. On a Mac the chip is only known if the browser says so, otherwise both are offered.
  function mine() {
    if (myOS === "macos") return arch === "arm" ? ["macos-arm64"] : arch === "x86" ? ["macos-x64"] : ["macos-arm64", "macos-x64"];
    return LABEL[myOS] ? [myOS] : [];
  }
  function mark() {
    const ids = mine();
    cards.forEach(c => {
      const on = ids.includes(c.dataset.os);
      c.classList.toggle("rec", on);
      if (on) c.dataset.rec = ids.length > 1 ? "Pick your chip" : "Your platform";
    });
    if (!main || !LABEL[myOS]) return;
    main.textContent = `Download for ${LABEL[myOS]}`;
    const ids1 = ids.length === 1 ? ids[0] : "";
    const asset = ids1 && find(keyOf(ids1));
    main.href = asset ? asset.browser_download_url : ids.length > 1 ? "#download" : "https://github.com/ixaxaar/gigawatt/releases/latest";
    if (note && asset) note.textContent = `${rel.tag_name} · ${(asset.size / 1048576).toFixed(0)} MB · free · also for the other platforms below`;
  }
  mark();
  if (myOS === "macos" && dev && dev.getHighEntropyValues) dev.getHighEntropyValues(["architecture"]).then(v => { arch = /arm/i.test(v.architecture || "") ? "arm" : /x86/i.test(v.architecture || "") ? "x86" : ""; mark(); }).catch(() => {});
  if (ver) {
    const fallback = ver.innerHTML;
    ver.textContent = "Checking the latest release…";
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 6000);
    fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: "application/vnd.github+json" }, signal: ctl.signal })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(r => {
        rel = r;
        ver.textContent = `Latest: ${rel.tag_name} · ${new Date(rel.published_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}`;
        cards.forEach(a => {
          const asset = find(keyOf(a.dataset.os));
          if (!asset) return;
          a.href = asset.browser_download_url;
          const sz = a.querySelector(".sz"); if (sz) sz.textContent = `${(asset.size / 1048576).toFixed(0)} MB`;
        });
        mark();
      })
      .catch(() => { ver.innerHTML = fallback; })
      .finally(() => clearTimeout(timer));
  }

  // ---- heat lab: rack power against what the cooling class can remove (rounded figures, in line with the wiki's power-and-cooling page) ----
  const $ = id => document.getElementById(id);
  const gen = $("gen"), mw = $("mw"), cool = $("cool");
  if (gen && mw && cool) {
    const GEN = { 13: [16, ""], 41: [32, ""], 57: [32, ""], 120: [72, ""], 190: [144, ", projected"] };
    const dots = $("dots"); for (let i = 0; i < 10; i++) dots.appendChild(document.createElement("i"));
    function run() {
      const kw = +gen.value, limit = +cool.value, budget = +mw.value * 1000, per = GEN[kw][0];
      $("mwv").textContent = mw.value;
      $("genhint").textContent = `${per} GPUs and about ${kw} kW per rack${GEN[kw][1]}`;
      const racks = Math.floor(budget / kw);
      $("racks").textContent = racks.toLocaleString();
      $("gpus").textContent = (racks * per).toLocaleString();
      const ratio = kw / limit;
      const cls = ratio <= 0.8 ? "ok" : ratio <= 1 ? "warn" : "bad";
      const msg = { ok: "COOLED", warn: "TIGHT", bad: "OVERHEATING" }[cls];
      // all three explanations are laid out in one grid cell, so the panel is as tall as the longest and never jumps
      const texts = {
        ok: `${kw} kW per rack is comfortably inside what this cooling can remove (${limit} kW).`,
        warn: `${kw} kW is close to the ${limit} kW this cooling can handle. A hot day or one failed unit and racks throttle.`,
        bad: `${kw} kW per rack is more than ${limit} kW of cooling can remove, so these racks could not run as shown. In the game that means thermal failures at three times the normal rate. Step up to a denser cooling class.`,
      };
      $("why").innerHTML = ["ok", "warn", "bad"].map(k => `<p${k === cls ? ' class="cur"' : ""}></p>`).join("");
      [...$("why").children].forEach((p, i) => { p.textContent = texts[["ok", "warn", "bad"][i]]; });
      const v = $("verdict"); v.className = "verdict " + cls; v.textContent = msg;
      $("readout").classList.toggle("bad", cls === "bad");
      const lit = Math.max(1, Math.min(10, Math.round(ratio * 10)));
      [...dots.children].forEach((d, i) => { d.className = i < lit ? "on " + cls : ""; });
    }
    [gen, mw, cool].forEach(el => el.addEventListener("input", run)); run();
  }
})();

// ---- hero clip: plays by itself unless the visitor asked for reduced motion, and pauses off screen ----
(() => {
  const host = document.getElementById("heroshot"), v = host && host.querySelector("video");
  if (!v) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { v.removeAttribute("autoplay"); v.pause(); return; }
  if (!("IntersectionObserver" in window)) return;
  new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting && !document.documentElement.classList.contains("lb-open")) { const p = v.play(); if (p) p.catch(() => {}); } else v.pause();
  }), { threshold: 0.3 }).observe(v);
})();

// ---- header menu, solid header after the hero ----
(() => {
  const nav = document.querySelector(".nav");
  const onScroll = () => nav && nav.classList.toggle("solid", scrollY > 40);
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
  const btn = document.getElementById("menubtn"), links = document.getElementById("navlinks");
  if (!btn || !links) return;
  const set = open => { links.classList.toggle("open", open); btn.setAttribute("aria-expanded", open); };
  btn.addEventListener("click", () => set(!links.classList.contains("open")));
  links.addEventListener("click", e => { if (e.target.closest("a")) set(false); });
  addEventListener("keydown", e => { if (e.key === "Escape") set(false); });
  addEventListener("scroll", () => set(false), { passive: true });
})();

// ---- gallery: arrows for mouse users, clips play only while on screen ----
(() => {
  const rail = document.getElementById("rail");
  if (!rail) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const prev = document.getElementById("rail-prev"), next = document.getElementById("rail-next");
  const sync = () => {
    if (prev) prev.disabled = rail.scrollLeft < 4;
    if (next) next.disabled = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4;
  };
  const go = dir => rail.scrollBy({ left: dir * Math.round(rail.clientWidth * 0.7), behavior: reduce ? "auto" : "smooth" });
  if (prev) prev.addEventListener("click", () => go(-1));
  if (next) next.addEventListener("click", () => go(1));
  rail.addEventListener("scroll", sync, { passive: true }); addEventListener("resize", sync); sync();
  if (reduce) return; // reduced motion: posters only, clips play in the enlarged view on request
  const vids = [...rail.querySelectorAll("video")];
  if (!("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target, host = v.closest(".shot");
    if (e.isIntersecting && !document.documentElement.classList.contains("lb-open")) { const p = v.play(); if (p) p.catch(() => {}); host.classList.add("playing"); }
    else { v.pause(); host.classList.remove("playing"); }
  }), { root: null, threshold: 0.6 });
  vids.forEach(v => io.observe(v));
})();

// ---- lightbox: readable enlargement, focus trap, inert page, scroll lock ----
(() => {
  const lb = document.getElementById("lb");
  if (!lb) return;
  const img = lb.querySelector("img"), vid = lb.querySelector("video"), cap = document.getElementById("lb-cap"), scroller = document.getElementById("lb-scroll"), x = document.getElementById("lb-x");
  let last = null, inerted = [];
  const root = document.documentElement;
  const centre = () => { scroller.scrollLeft = Math.max(0, (scroller.scrollWidth - scroller.clientWidth) / 2); scroller.scrollTop = 0; };
  const open = (b) => {
    last = b;
    const video = b.dataset.video;
    lb.classList.toggle("isvideo", !!video);
    if (video) { vid.poster = b.dataset.poster || ""; vid.src = video; vid.currentTime = 0; cap.innerHTML = ""; cap.append(Object.assign(document.createElement("b"), { textContent: b.dataset.cap || "Clip" })); const p = vid.play(); if (p) p.catch(() => {}); }
    else { img.onload = centre; img.src = b.dataset.zoom; img.alt = b.querySelector("img").alt; cap.textContent = b.querySelector(".cap, figcaption").textContent; }
    lb.hidden = false; lb.classList.add("open"); root.classList.add("lb-open");
    inerted = [...document.body.children].filter(el => el !== lb && el.tagName !== "SCRIPT");
    inerted.forEach(el => { el.inert = true; });
    document.querySelectorAll(".rail video, .heroshot video").forEach(v => v.pause());
    x.focus(); if (!video) centre();
  };
  const close = () => {
    lb.classList.remove("open"); lb.hidden = true; root.classList.remove("lb-open");
    vid.pause(); vid.removeAttribute("src"); vid.load(); img.removeAttribute("src");
    inerted.forEach(el => { el.inert = false; }); inerted = [];
    if (last) last.focus();
  };
  document.querySelectorAll("[data-zoom],[data-video]").forEach(b => b.addEventListener("click", () => open(b)));
  x.addEventListener("click", close);
  scroller.addEventListener("click", e => { if (e.target === scroller) close(); });
  addEventListener("keydown", e => {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key !== "Tab") return;
    const stops = [x, scroller].concat(lb.classList.contains("isvideo") ? [vid] : []);
    const i = stops.indexOf(document.activeElement);
    e.preventDefault();
    stops[(i + (e.shiftKey ? stops.length - 1 : 1)) % stops.length].focus();
  });
  document.addEventListener("focusin", e => { if (lb.classList.contains("open") && !lb.contains(e.target)) x.focus(); });
})();
