// GIGAWATT site: hero rack field, OS-aware downloads, heat lab calculator. No dependencies.
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
  const nav = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent || "";
  const ua = navigator.userAgent || "";
  let myOS = /android/i.test(ua) ? "android" : /win/i.test(nav) ? "windows" : /mac/i.test(nav) ? "macos" : /linux|x11|cros/i.test(nav + ua) ? "linux" : "";
  fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: "application/vnd.github+json" } })
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(rel => {
      const ver = document.getElementById("ver");
      if (ver) ver.textContent = `Latest: ${rel.tag_name} · ${new Date(rel.published_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}`;
      const find = k => (rel.assets || []).find(a => a.name.toLowerCase().includes(k) && !a.name.endsWith(".txt"));
      const map = { linux: find("linux"), windows: find("windows"), "macos-arm64": find("macos-arm64"), "macos-x64": find("macos-x64"), android: find(".apk") };
      let primary = null;
      document.querySelectorAll(".dl").forEach(a => {
        const asset = map[a.dataset.os];
        if (asset) {
          a.href = asset.browser_download_url;
          a.querySelector("span").textContent += ` · ${(asset.size / 1048576).toFixed(0)} MB`;
        }
        const isMine = a.dataset.os === myOS || (myOS === "macos" && a.dataset.os === "macos-arm64");
        if (isMine && asset) { a.classList.add("rec"); primary = asset; }
      });
      const main = document.getElementById("dl-main"), note = document.getElementById("dl-note");
      if (primary && main) {
        main.href = primary.browser_download_url;
        const label = { linux: "Linux", windows: "Windows", macos: "macOS", android: "Android" }[myOS];
        main.textContent = `Download for ${label}`;
        if (note) note.textContent = `${rel.tag_name} · ${(primary.size / 1048576).toFixed(0)} MB · free · also for the other platforms below`;
      }
    })
    .catch(() => { const v = document.getElementById("ver"); if (v) v.textContent = "See the latest builds on GitHub."; });

  // ---- heat lab ----
  const $ = id => document.getElementById(id);
  const gen = $("gen"), mw = $("mw"), cool = $("cool");
  if (gen && mw && cool) {
    const perRackGPUs = { 13: 16, 41: 32, 57: 32, 132: 72, 190: 144 };
    const dots = $("dots"); for (let i = 0; i < 10; i++) dots.appendChild(document.createElement("i"));
    function run() {
      const kw = +gen.value, limit = +cool.value, budget = +mw.value * 1000;
      $("mwv").textContent = mw.value;
      const racks = Math.floor(budget / kw);
      $("racks").textContent = racks.toLocaleString();
      $("gpus").textContent = (racks * (perRackGPUs[kw] || 0)).toLocaleString();
      const ratio = kw / limit;
      const v = $("verdict"), why = $("why");
      let cls, msg, text;
      if (ratio <= 0.8) { cls = "ok"; msg = "COOLED"; text = `${kw} kW per rack is comfortably inside what this cooling can remove (${limit} kW).`; }
      else if (ratio <= 1) { cls = "warn"; msg = "TIGHT"; text = `${kw} kW is close to the ${limit} kW this cooling can handle. A hot day or one failed unit and racks throttle.`; }
      else { cls = "bad"; msg = "OVERHEATING"; text = `${kw} kW per rack is more than ${limit} kW of cooling can remove. In the game that means thermal failures at three times the normal rate. Pick liquid or immersion.`; }
      v.className = "verdict " + cls; v.textContent = msg; why.textContent = text;
      const lit = Math.max(1, Math.min(10, Math.round(ratio * 10)));
      [...dots.children].forEach((d, i) => { d.className = i < lit ? "on " + cls : ""; });
    }
    [gen, mw, cool].forEach(el => el.addEventListener("input", run)); run();
  }
})();
