/* Reeled Studios — KartX · interações e animações */
(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fmtTime = (t) => {
    const m = Math.floor(t / 60), s = t - m * 60;
    return `${m}:${s.toFixed(3).padStart(6, "0")}`;
  };
  const nf = (n, d = 0) => n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

  /* ================================================== LOADER: luzes de largada */
  const loader = $("#loader");
  const lights = $$(".lights i");
  let started = false;
  function finishLoader() {
    if (started) return;
    started = true;
    loader.classList.add("done");
    document.body.classList.remove("is-loading");
    setTimeout(() => document.body.classList.add("ready"), 250);
    startHud();
  }
  if (reduce) {
    finishLoader();
  } else {
    lights.forEach((l, i) => setTimeout(() => l.classList.add("on"), 250 + i * 260));
    setTimeout(() => { $(".lights").classList.add("go"); $(".loader__hint").textContent = "VAI!"; }, 250 + 5 * 260 + 260);
    setTimeout(finishLoader, 250 + 5 * 260 + 650);
    loader.addEventListener("click", finishLoader);
  }

  /* ================================================== NAV, progresso, scrollspy */
  const nav = $("#nav");
  const tabs = $$("#navTabs a");
  const ink = $("#navInk");
  const progress = $("#progress");
  const burger = $("#burger");

  function moveInk(a) {
    if (!a || !ink) return;
    ink.style.left = a.offsetLeft + "px";
    ink.style.width = a.offsetWidth + "px";
  }
  function setActive(id) {
    tabs.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + id));
    moveInk(tabs.find((a) => a.classList.contains("is-active")));
  }
  window.addEventListener("load", () => moveInk(tabs[0]));
  window.addEventListener("resize", () => moveInk(tabs.find((a) => a.classList.contains("is-active"))));
  moveInk(tabs[0]);

  const sections = $$("[data-section]");
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        const id = e.target.id === "trailer" ? "kartx" : e.target.id;
        setActive(id);
      }
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  sections.forEach((s) => spy.observe(s));

  burger.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    burger.setAttribute("aria-expanded", open);
  });
  tabs.forEach((a) => a.addEventListener("click", () => { nav.classList.remove("open"); burger.setAttribute("aria-expanded", false); }));

  /* parallax + progresso + nav compacta (um rAF por rolagem) */
  const parallax = $$("[data-parallax]");
  let ticking = false;
  function onScroll() {
    const y = window.scrollY;
    const h = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
    nav.classList.toggle("scrolled", y > 40);
    if (!reduce) {
      parallax.forEach((el) => {
        const r = el.getBoundingClientRect();
        const c = r.top + r.height / 2 - innerHeight / 2;
        el.style.translate = `0 ${(c * parseFloat(el.dataset.parallax)).toFixed(1)}px`;
      });
    }
    ticking = false;
  }
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ================================================== revelações + contadores */
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      // escalonamento entre irmãos que entram juntos
      if (!el.style.getPropertyValue("--d") && el.parentElement) {
        const sib = [...el.parentElement.children].filter((c) => c.classList.contains("reveal") || c.classList.contains("reveal-clip"));
        const i = sib.indexOf(el);
        if (i > 0) el.style.setProperty("--d", Math.min(i, 8) * 0.08 + "s");
      }
      el.classList.add("in");
      revealIO.unobserve(el);
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
  const observeReveals = (root = document) => $$(".reveal, .reveal-clip", root).forEach((el) => revealIO.observe(el));
  observeReveals();

  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target, to = +el.dataset.count, suf = el.dataset.suffix || "";
      const t0 = performance.now(), dur = 1400 + to * 4;
      const step = (t) => {
        const k = Math.min(1, (t - t0) / dur), v = 1 - Math.pow(1 - k, 4);
        el.textContent = Math.round(to * v) + suf;
        if (k < 1) requestAnimationFrame(step);
      };
      reduce ? (el.textContent = to + suf) : requestAnimationFrame(step);
      countIO.unobserve(el);
    });
  }, { threshold: 0.6 });
  $$("[data-count]").forEach((el) => countIO.observe(el));

  /* ================================================== HERO: linhas de velocidade */
  function speedLines(canvas, opts) {
    const ctx = canvas.getContext("2d");
    let w, h, dpr, parts = [], visible = true, last = 0;
    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);
    const spawn = () => ({ x: w + Math.random() * w, y: Math.random() * h, l: 60 + Math.random() * 260, v: 18 + Math.random() * 30, a: 0.15 + Math.random() * 0.5, mint: Math.random() < 0.35 });
    for (let i = 0; i < opts.count; i++) { const p = spawn(); p.x = Math.random() * w * 2; parts.push(p); }
    function frame(t) {
      requestAnimationFrame(frame);
      if (!visible || reduce) return;
      if (opts.fps && t - last < 1000 / opts.fps) return;
      last = t;
      opts.draw(ctx, w, h, parts, spawn, t);
    }
    requestAnimationFrame(frame);
  }

  speedLines($("#speedLines"), {
    count: 46,
    draw(ctx, w, h, parts, spawn) {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.x -= p.v;
        if (p.x + p.l < 0) Object.assign(p, spawn());
        const g = ctx.createLinearGradient(p.x, 0, p.x + p.l, 0);
        const c = p.mint ? "16,232,160" : "255,255,255";
        g.addColorStop(0, `rgba(${c},${p.a})`);
        g.addColorStop(1, `rgba(${c},0)`);
        ctx.strokeStyle = g;
        ctx.lineWidth = p.mint ? 2 : 1;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.l, p.y); ctx.stroke();
      }
    },
  });

  /* linhas radiais de mangá no trailer (12 fps, como desenho animado) */
  speedLines($("#mangaLines"), {
    count: 0, fps: 12,
    draw(ctx, w, h) {
      ctx.clearRect(0, 0, w, h);
      const cx = w * 0.62, cy = h * 0.42, R = Math.hypot(w, h);
      ctx.fillStyle = "#0a0a0a";
      for (let i = 0; i < 110; i++) {
        const a = Math.random() * Math.PI * 2;
        const r0 = R * (0.42 + Math.random() * 0.25);
        const wd = 0.002 + Math.random() * 0.007;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        ctx.lineTo(cx + Math.cos(a - wd) * R, cy + Math.sin(a - wd) * R);
        ctx.lineTo(cx + Math.cos(a + wd) * R, cy + Math.sin(a + wd) * R);
        ctx.closePath();
        ctx.globalAlpha = 0.25 + Math.random() * 0.5;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
  });

  /* ================================================== HUD do hero (simulação de corrida) */
  function startHud() {
    const elSpeed = $("#hudSpeed"), elGear = $("#hudGear"), elRpm = $("#hudRpm"), elTime = $("#hudTime");
    const elPos = $("#hudPos"), elLap = $("#hudLap"), board = $("#hudBoard");
    const names = ["CPU 01", "CPU 02", "CPU 03", "CPU 04", "CPU 05", "CPU 06"];
    let order = [...names, "VOCÊ"];
    const shifts = [0, 28, 52, 78, 112, 150]; // km/h de troca (shifter 5 marchas)
    let speed = 0, target = 168, t = 0, lap = 1, lastT = performance.now(), overtakeAt = 2.2;

    function renderBoard() {
      board.innerHTML = order.map((n, i) => `<li class="${n === "VOCÊ" ? "me" : ""}"><b>${i + 1}</b>${n}<em>${i === 0 ? "LÍDER" : "+" + (i * 0.41 + 0.12).toFixed(3)}</em></li>`).join("");
      elPos.textContent = order.indexOf("VOCÊ") + 1;
    }
    renderBoard();

    function tick(now) {
      const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
      t += dt;
      // acelera, freia na curva, acelera de novo
      speed += (target - speed) * (target > speed ? 0.9 : 2.4) * dt;
      if (Math.abs(target - speed) < 6) target = target > 100 ? 48 + Math.random() * 30 : 150 + Math.random() * 30;
      let gear = 1;
      for (let i = 1; i < shifts.length; i++) if (speed > shifts[i]) gear = i + 1;
      gear = Math.min(5, gear);
      const lo = shifts[gear - 1], hi = shifts[gear] || 185;
      const rpm = Math.min(1, 0.35 + 0.65 * (speed - lo) / (hi - lo));
      elSpeed.textContent = Math.round(speed);
      elGear.textContent = speed < 2 ? "N" : gear;
      elRpm.style.width = (rpm * 100).toFixed(1) + "%";
      elTime.textContent = fmtTime(t);
      if (t > overtakeAt) { // ultrapassagem
        const i = order.indexOf("VOCÊ");
        if (i > 0) { [order[i - 1], order[i]] = [order[i], order[i - 1]]; renderBoard(); }
        overtakeAt = t + 1.6 + Math.random() * 2.2;
        if (i <= 0) { // venceu a volta: recomeça
          lap = lap >= 3 ? 1 : lap + 1;
          if (lap === 1) { order = [...names, "VOCÊ"]; renderBoard(); }
          elLap.textContent = lap; t = 0;
        }
      }
      requestAnimationFrame(tick);
    }
    if (!reduce) requestAnimationFrame(tick);
  }

  /* ================================================== VEÍCULOS */
  const CARS = [
    { name: "KART PADRÃO", img: "car-padrao", engine: "Motor 2 tempos · 1 marcha", desc: "Kart de referência: leve, direto e previsível.",
      stats: [["VELOCIDADE MÁXIMA", 79, "km/h", 0, 250], ["0–60 KM/H", 2.3, "s", 2, 3, true], ["FRENAGEM", 0.94, "g", 2, 2], ["MASSA", 165, "kg", 0, 700], ["CÂMBIO", 1, "marcha", 0, 6]] },
    { name: "KART SHIFTER", img: "car-shifter", engine: "Motor 2 tempos · 5 marchas, automático ou manual", desc: "Câmbio de 5 marchas, muito mais aderente e rápido: exige tração e frenagem bem planejadas.",
      stats: [["VELOCIDADE MÁXIMA", 180, "km/h", 0, 250], ["0–60 KM/H", 1.35, "s", 2, 3, true], ["0–100 KM/H", 3.0, "s", 2, 4, true], ["FRENAGEM", 1.4, "g", 2, 2], ["MASSA", 165, "kg", 0, 700], ["CÂMBIO", 5, "marchas", 0, 6]] },
    { name: "FÓRMULA REGIONAL", img: "car-formula", engine: "1.8 turbo · sequencial de 6 marchas", desc: "Monoposto com asas e pneus largos: muita potência e carga aerodinâmica.", paint: true,
      stats: [["VELOCIDADE MÁXIMA", 250, "km/h", 0, 250], ["0–100 KM/H", 2.5, "s", 2, 4, true], ["FRENAGEM", 2.0, "g", 2, 2], ["MASSA", 640, "kg", 0, 700], ["CÂMBIO", 6, "marchas", 0, 6]] },
  ];
  const carImg = $("#carImg"), carStats = $("#carStats"), carPaint = $("#carPaint");
  const picks = $$(".pick");
  let carIdx = 0, carBusy = false;
  // pré-carrega
  ["car-padrao", "car-shifter", "car-formula", "car-formula-blue", "car-formula-rain"].forEach((n) => { const i = new Image(); i.src = `assets/img/${n}.jpg`; });

  function renderStats(car) {
    carStats.innerHTML = car.stats.map(([label, v, unit, dec, max, inverse], i) => {
      const pct = inverse ? (1 - v / (max * 1.15)) * 100 : (v / max) * 100;
      return `<li style="--i:${i}"><span>${label}</span><b data-v="${v}" data-dec="${dec}" data-unit="${unit}">0 ${unit}</b><i style="--w:0%" data-w="${pct.toFixed(1)}%"></i></li>`;
    }).join("");
    requestAnimationFrame(() => requestAnimationFrame(() => $$("i", carStats).forEach((i) => i.style.setProperty("--w", i.dataset.w))));
    $$("b", carStats).forEach((b) => {
      const to = +b.dataset.v, dec = +b.dataset.dec, unit = b.dataset.unit, t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / 700), e = 1 - Math.pow(1 - k, 3);
        b.textContent = `${nf(to * e, dec)} ${unit}`;
        if (k < 1) requestAnimationFrame(step);
      };
      reduce ? (b.textContent = `${nf(to, dec)} ${unit}`) : requestAnimationFrame(step);
    });
  }
  function swapImg(src) {
    if (reduce) { carImg.src = src; return; }
    carBusy = true;
    carImg.classList.add("out");
    setTimeout(() => {
      carImg.src = src;
      carImg.classList.remove("out"); carImg.classList.add("in");
      void carImg.offsetWidth;
      carImg.classList.remove("in");
      setTimeout(() => (carBusy = false), 400);
    }, 380);
  }
  function setCar(i, force) {
    i = (i + CARS.length) % CARS.length;
    if ((i === carIdx && !force) || carBusy) return;
    carIdx = i;
    const c = CARS[i];
    picks.forEach((p, k) => { p.classList.toggle("is-on", k === i); p.setAttribute("aria-selected", k === i); });
    swapImg(`assets/img/${c.img}.jpg`);
    $("#carTitle").textContent = c.name;
    $("#carEngine").textContent = c.engine;
    $("#carDesc").textContent = c.desc;
    carPaint.hidden = !c.paint;
    $$(".sw", carPaint).forEach((s, k) => s.classList.toggle("is-on", k === 0));
    const name = $("#carName");
    name.style.animation = "none"; void name.offsetWidth; name.style.animation = "rowIn .5s var(--ease-out) both";
    renderStats(c);
  }
  picks.forEach((p) => p.addEventListener("click", () => setCar(+p.dataset.car)));
  $$(".sw", carPaint).forEach((s) => s.addEventListener("click", () => {
    if (carBusy) return;
    $$(".sw", carPaint).forEach((x) => x.classList.toggle("is-on", x === s));
    swapImg(`assets/img/${s.dataset.paint}.jpg`);
  }));
  renderStats(CARS[0]);

  /* ================================================== MODOS */
  const ICONS = {
    anime: '<circle cx="32" cy="32" r="12" fill="none" stroke="currentColor" stroke-width="3"/><path d="M32 4v10M32 50v10M4 32h10M50 32h10M12 12l7 7M45 45l7 7M52 12l-7 7M19 45l-7 7" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M26 32l4 4 8-8" fill="none" stroke="currentColor" stroke-width="3"/>',
    clock: '<circle cx="32" cy="36" r="22" fill="none" stroke="currentColor" stroke-width="3"/><path d="M26 6h12M32 6v8M32 36V22M48 16l4-4" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
    weekend: '<path d="M12 52V40h10v12M27 52V28h10v24M42 52V14h10v38" fill="currentColor"/>',
    cones: '<path d="M10 52l8-22 8 22zM26 52l8-30 8 30zM42 52l7-18 7 18z" fill="currentColor"/><path d="M6 54h52" stroke="currentColor" stroke-width="3"/>',
    bracket: '<path d="M8 10l24 22L8 54M56 10L32 32l24 22" fill="none" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/>',
    endurance: '<circle cx="32" cy="32" r="24" fill="none" stroke="currentColor" stroke-width="3"/><path d="M32 32V14M32 32l12 8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="32" r="3" fill="currentColor"/>',
    wheel: '<circle cx="32" cy="32" r="24" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="32" cy="34" r="6" fill="none" stroke="currentColor" stroke-width="3"/><path d="M10 28c8-4 36-4 44 0M32 40v16" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>',
  };
  const MODES = [
    ["ANIME", "anime", "#ff2e3d", "A corrida inteira no traço de mangá da abertura.", ["Tinta e papel, karts em cor", "Linhas de velocidade", "Qualquer pista e kart"], "1 A 4 NA TELA", "NOVO"],
    ["CONTRA O RELÓGIO", "clock", "#59bfff", "Sozinho na pista, contra o seu recorde.", ["Voltas livres", "Fantasma da melhor volta", "Delta ao vivo"], "1 JOGADOR"],
    ["FIM DE SEMANA", "weekend", "#ffb833", "Treino livre, classificação e corrida.", ["Sessões cronometradas", "Grid da classificação", "Clima de cada sessão"], "1 JOGADOR · ONLINE"],
    ["AUTOCROSS", "cones", "#ff7326", "Cones e portões, uma volta perfeita.", ["3 tentativas", "Cone derrubado +2 s", "Portão perdido +10 s"], "1 JOGADOR"],
    ["TORNEIO MATA-MATA", "bracket", "#d959ff", "Duelos 1 x 1 com 8 pilotos.", ["Quartas, semi e final", "Rivais mais fortes a cada fase", "Baterias curtas"], "1 JOGADOR · ATÉ 8 ONLINE"],
    ["ENDURANCE", "endurance", "#1aeb9e", "Prova por tempo, em equipe, com troca de piloto no pit.", ["De 5 minutos a 6 horas", "Companheiro CPU ou dupla", "Pedais + volante"], "ATÉ 4 NA TELA · ONLINE"],
    ["DOIS NUM KART", "wheel", "#ff5c73", "Um no volante, o outro nos pedais.", ["Corrida em dupla", "Na mesma tela ou online", "Combinem cada curva"], "2 OU 4 NA TELA · ONLINE"],
  ];
  $("#modes").innerHTML = MODES.map(([n, ic, c, tag, facts, pl, badge]) => `
    <article class="mode reveal tilt" style="--c:${c}">
      ${badge ? `<span class="mode__badge">${badge}</span>` : ""}
      <div class="mode__icon"><svg viewBox="0 0 64 64">${ICONS[ic]}</svg></div>
      <h3>${n}</h3><p>${tag}</p>
      <ul>${facts.map((f) => `<li>${f}</li>`).join("")}</ul>
      <footer>${pl}</footer>
    </article>`).join("");
  observeReveals($("#modes"));

  /* inclinação 3D nos cartões */
  if (!reduce && matchMedia("(hover: hover)").matches) {
    document.addEventListener("pointermove", (e) => {
      const card = e.target.closest?.(".tilt");
      $$(".tilt.tilting").forEach((c) => { if (c !== card) { c.classList.remove("tilting"); c.style.transform = ""; } });
      if (!card) return;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.classList.add("tilting");
      card.style.transform = `perspective(900px) rotateY(${(x - 0.5) * 10}deg) rotateX(${(0.5 - y) * 8}deg) translateY(-6px)`;
      card.style.setProperty("--mx", x * 100 + "%");
      card.style.setProperty("--my", y * 100 + "%");
    });
  }

  /* ================================================== PISTAS */
  const TRACKS = (window.KARTX_TRACKS || []).slice();
  function trackPath(pts, W, H, pad) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    pts.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
    const s = Math.min((W - pad * 2) / (x1 - x0 || 1), (H - pad * 2) / (y1 - y0 || 1));
    const ox = (W - (x1 - x0) * s) / 2, oy = (H - (y1 - y0) * s) / 2;
    const P = pts.map(([x, y]) => [ox + (x - x0) * s, oy + (y - y0) * s]);
    // curva suave (Catmull-Rom fechada → Bézier)
    let d = `M${P[0][0].toFixed(1)},${P[0][1].toFixed(1)}`;
    const n = P.length;
    for (let i = 0; i < n; i++) {
      const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d + "Z";
  }
  const lenTxt = (t) => t.minLen === t.maxLen ? (t.len >= 1000 ? `${nf(t.len / 1000, 2)} km` : `${t.len} m`)
    : (t.maxLen >= 1000 ? `${nf(t.minLen / 1000, 1)}–${nf(t.maxLen / 1000, 1)} km` : `${t.minLen}–${t.maxLen} m`);

  const grid = $("#trackGrid");
  grid.innerHTML = TRACKS.map((t, i) => `
    <button class="tcard reveal" style="--c:${t.color}" data-i="${i}">
      <span class="tnum">${String(i + 1).padStart(2, "0")}</span>
      <svg viewBox="0 0 200 110"><path d="${trackPath(t.pts, 200, 110, 8)}"/></svg>
      <b>${t.name}</b><small>${t.variants} layout${t.variants > 1 ? "s" : ""} · ${lenTxt(t)}</small>
    </button>`).join("");
  observeReveals(grid);

  const big = $("#trackBig"), view = $("#trackView");
  let trackIdx = -1, dotRaf = 0, autoTimer = 0, userPicked = false;
  function showTrack(i) {
    if (i === trackIdx) return;
    trackIdx = i;
    const t = TRACKS[i];
    $$(".tcard", grid).forEach((c, k) => c.classList.toggle("is-on", k === i));
    view.style.setProperty("--tc", t.color);
    $("#tvEyebrow").textContent = `CIRCUITO ${String(i + 1).padStart(2, "0")} / ${TRACKS.length} · ${t.layout}`;
    $("#tvName").textContent = t.name;
    $("#tvVariants").textContent = t.variants;
    $("#tvLen").textContent = lenTxt(t);
    const d = trackPath(t.pts, 1000, 640, 40);
    big.innerHTML = `
      <defs><filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <path d="${d}" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="34" stroke-linejoin="round"/>
      <path d="${d}" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="22" stroke-linejoin="round"/>
      <path class="tv-line" d="${d}" fill="none" stroke="${t.color}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round" filter="url(#glow)"/>
      <circle class="tv-dot-trail" r="16" fill="${t.color}" opacity=".25"/>
      <circle class="tv-dot" r="9" fill="#fff" stroke="${t.color}" stroke-width="4"/>
      <rect class="tv-start" width="10" height="34" fill="url(#chk)"/>
      <pattern id="chk" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="#fff"/><rect x="5" y="5" width="5" height="5" fill="#fff"/></pattern>`;
    const line = $(".tv-line", big), dot = $(".tv-dot", big), trail = $(".tv-dot-trail", big), start = $(".tv-start", big);
    const L = line.getTotalLength();
    const p0 = line.getPointAtLength(0), p1 = line.getPointAtLength(4);
    const ang = Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180 / Math.PI;
    start.setAttribute("transform", `translate(${p0.x},${p0.y}) rotate(${ang}) translate(-5,-17)`);
    line.style.strokeDasharray = L;
    line.style.strokeDashoffset = L;
    line.getBoundingClientRect();
    line.style.transition = reduce ? "none" : "stroke-dashoffset 1.6s cubic-bezier(.6,0,.2,1)";
    line.style.strokeDashoffset = 0;
    // ponto que dá voltas + cronômetro
    cancelAnimationFrame(dotRaf);
    const lapSec = t.len / 17.5;           // tempo de volta estimado (~63 km/h de média)
    const anim = Math.max(5, Math.min(11, t.len / 450)) * 1000;
    const tStart = performance.now() + (reduce ? 0 : 1500);
    const lapEl = $("#tvLap");
    const loop = (now) => {
      const k = Math.max(0, ((now - tStart) % anim) / anim);
      const p = line.getPointAtLength(k * L), q = line.getPointAtLength(Math.max(0, k * L - 18));
      dot.setAttribute("cx", p.x); dot.setAttribute("cy", p.y);
      trail.setAttribute("cx", q.x); trail.setAttribute("cy", q.y);
      lapEl.textContent = fmtTime(k * lapSec);
      dotRaf = requestAnimationFrame(loop);
    };
    dotRaf = requestAnimationFrame(loop);
  }
  grid.addEventListener("click", (e) => {
    const c = e.target.closest(".tcard");
    if (!c) return;
    userPicked = true; clearInterval(autoTimer);
    showTrack(+c.dataset.i);
    if (innerWidth <= 1020) view.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  });
  if (TRACKS.length) {
    // começa por Salvador, a pista brasileira
    const sv = Math.max(0, TRACKS.findIndex((t) => t.id === "SV"));
    let firstShown = false;
    new IntersectionObserver(([e]) => {
      clearInterval(autoTimer);
      if (!e.isIntersecting) return;
      if (!firstShown) { firstShown = true; trackIdx = -1; showTrack(sv); }
      if (!userPicked && !reduce) autoTimer = setInterval(() => showTrack((trackIdx + 1) % TRACKS.length), 7000);
    }, { threshold: 0.35 }).observe(view);
  }

  /* ================================================== IA: episódios de treino */
  (function aiViz() {
    const svg = $("#aiViz");
    const W = 300, H = 160;
    const ideal = (x) => 80 + Math.sin(x / 38) * 42 + Math.sin(x / 13) * 6;
    const path = (noise, seed) => {
      let d = "", r = seed;
      for (let x = 0; x <= W; x += 6) {
        r = (r * 9301 + 49297) % 233280;
        const n = (r / 233280 - 0.5) * noise * Math.sin(x / 20 + seed);
        d += (x ? "L" : "M") + x + "," + (ideal(x) + n).toFixed(1);
      }
      return d;
    };
    const best = path(0, 1);
    svg.innerHTML = `
      <path d="${best}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="26" stroke-linecap="round"/>
      <g id="aiTries"></g>
      <path id="aiBest" d="${best}" fill="none" stroke="#10e8a0" stroke-width="3" stroke-linecap="round"/>
      <text x="0" y="12" fill="#8a95b5" font-size="10" font-weight="700" letter-spacing="1.5" font-family="Roboto">EPISÓDIO <tspan id="aiEp" fill="#f2f5ff">0</tspan></text>
      <text x="300" y="12" text-anchor="end" fill="#8a95b5" font-size="10" font-weight="700" letter-spacing="1.5" font-family="Roboto">RECOMPENSA <tspan id="aiRw" fill="#10e8a0">0%</tspan></text>`;
    const tries = $("#aiTries", svg), bestEl = $("#aiBest", svg), ep = $("#aiEp", svg), rw = $("#aiRw", svg);
    const L = bestEl.getTotalLength();
    let k = 0, visible = false;
    new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(svg);
    function step() {
      if (visible && !reduce) {
        k = (k + 1) % 40;
        const noise = 90 * Math.pow(1 - k / 40, 2);
        const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
        p.setAttribute("d", path(noise, k * 7 + 3));
        p.setAttribute("fill", "none");
        p.setAttribute("stroke", `rgba(89,191,255,${0.15 + 0.5 * (k / 40)})`);
        p.setAttribute("stroke-width", "1.5");
        tries.appendChild(p);
        if (tries.children.length > 10) tries.firstChild.remove();
        if (k === 0) tries.innerHTML = "";
        ep.textContent = nf(k * 312 + 40);
        rw.textContent = Math.round(20 + 79 * Math.pow(k / 39, 0.7)) + "%";
        bestEl.style.strokeDasharray = L;
        bestEl.style.strokeDashoffset = L * (1 - k / 39);
      }
      setTimeout(step, 220);
    }
    if (reduce) { ep.textContent = "12.208"; rw.textContent = "99%"; } else step();
  })();

  /* ================================================== GALERIA + LIGHTBOX */
  const SHOTS = [
    ["hero-kart", "Kart padrão na reta dos boxes", "corrida"],
    ["g-formula-follow", "Fórmula Regional · câmera de perseguição", "corrida"],
    ["g-chuva-lente", "Chuva forte na lente", "clima"],
    ["a-duelo", "Modo Anime · duelo", "anime"],
    ["g-garagem-formula", "Garagem · pintura do Fórmula", "garagem"],
    ["hero-shifter", "Kart Shifter na largada", "corrida"],
    ["g-spray-frente", "Pista de gelo · spray", "clima"],
    ["g-menu-modos", "Menu · modos de jogo", "menu"],
    ["g-formula-pov", "Grid de largada · cockpit", "corrida"],
    ["a-cockpit", "Modo Anime · cockpit", "anime"],
    ["g-chuva-formula", "Fórmula com pintura de chuva", "garagem"],
    ["g-neve-lente", "Neve na lente", "clima"],
    ["g-detalhe", "Showroom · detalhe do pneu", "garagem"],
    ["g-menu-pistas", "Menu · escolha a pista", "menu"],
    ["g-anime-2", "Modo Anime · corrida", "anime"],
    ["g-cockpit-shifter", "Kart Shifter no showroom", "garagem"],
    ["g-spray-lateral", "Gelo · spray lateral", "clima"],
    ["g-loading", "Tela de carregamento", "menu"],
    ["a-aereo", "Modo Anime · vista aérea", "anime"],
    ["g-kart-race", "Kart padrão em corrida", "corrida"],
    ["g-garagem-kart", "Garagem · kart personalizado", "garagem"],
    ["g-painel", "Painel digital do volante", "corrida"],
  ];
  const masonry = $("#masonry");
  masonry.innerHTML = SHOTS.map(([src, cap, cat], i) => `
    <button class="shot reveal" data-cat="${cat}" data-i="${i}" data-cap="${cap}" aria-label="${cap}">
      <img src="assets/img/${src}-sm.jpg" alt="${cap}" loading="lazy" width="720" height="405">
    </button>`).join("");
  observeReveals(masonry);
  $$("#masonry img").forEach((img) => img.addEventListener("load", () => { img.removeAttribute("height"); }, { once: true }));

  $("#filters").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    $$("#filters button").forEach((x) => x.classList.toggle("is-on", x === b));
    const f = b.dataset.f;
    $$(".shot", masonry).forEach((s, i) => {
      const show = f === "all" || s.dataset.cat === f;
      s.classList.toggle("hide", !show);
      if (show && !reduce) s.animate([{ opacity: 0, transform: "translateY(20px) scale(.97)" }, { opacity: 1, transform: "none" }], { duration: 500, delay: (i % 9) * 40, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" });
    });
  });

  const lb = $("#lightbox"), lbImg = $("#lbImg"), lbCap = $("#lbCap");
  let lbIdx = 0;
  const visibleShots = () => $$(".shot:not(.hide)", masonry).map((s) => +s.dataset.i);
  function lbShow(i) {
    lbIdx = i;
    const [src, cap] = SHOTS[i];
    lbImg.classList.add("swap");
    const img = new Image();
    img.onload = () => { lbImg.src = img.src; lbImg.alt = cap; lbCap.textContent = cap; lbImg.classList.remove("swap"); };
    img.src = `assets/img/${src}.jpg`;
  }
  function lbStep(d) {
    const v = visibleShots(), k = v.indexOf(lbIdx);
    lbShow(v[(k + d + v.length) % v.length]);
  }
  masonry.addEventListener("click", (e) => {
    const s = e.target.closest(".shot");
    if (!s) return;
    lbShow(+s.dataset.i);
    openModal(lb);
  });
  $("#lbPrev").addEventListener("click", () => lbStep(-1));
  $("#lbNext").addEventListener("click", () => lbStep(1));
  let touchX = null;
  lb.addEventListener("touchstart", (e) => (touchX = e.touches[0].clientX), { passive: true });
  lb.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) lbStep(dx < 0 ? 1 : -1);
    touchX = null;
  });

  /* ================================================== MODAIS (trailer) */
  const vm = $("#videoModal"), tv = $("#trailerVideo");
  let openEl = null, lastFocus = null;
  function openModal(m) {
    lastFocus = document.activeElement;
    openEl = m;
    m.classList.add("open"); m.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    $(".modal__x", m).focus({ preventScroll: true });
  }
  function closeModal() {
    if (!openEl) return;
    openEl.classList.remove("open"); openEl.setAttribute("aria-hidden", "true");
    if (openEl === vm) tv.pause();
    openEl = null;
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  $$("[data-trailer]").forEach((b) => b.addEventListener("click", () => {
    openModal(vm);
    tv.currentTime = 0;
    tv.play().catch(() => {});
  }));
  $$("[data-close]").forEach((b) => b.addEventListener("click", closeModal));

  /* vídeo do trailer toca mudo quando aparece na tela */
  $$("video[data-autoplay-visible]").forEach((v) => {
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { if (v.preload === "none") { v.preload = "auto"; v.load(); } v.play().catch(() => {}); }
      else v.pause();
    }, { threshold: 0.3 }).observe(v);
  });
  /* pausa o vídeo do hero fora da tela (economiza bateria) */
  const heroVid = $(".hero__video");
  new IntersectionObserver(([e]) => (e.isIntersecting ? heroVid.play().catch(() => {}) : heroVid.pause())).observe(heroVid);

  /* ================================================== TECLADO (como no menu do jogo) */
  const garageEl = $("#garage");
  const inView = (el) => { const r = el.getBoundingClientRect(); return r.top < innerHeight * 0.7 && r.bottom > innerHeight * 0.3; };
  document.addEventListener("keydown", (e) => {
    if (e.target.closest?.("input, textarea")) return;
    if (e.key === "Escape") { closeModal(); nav.classList.remove("open"); return; }
    if (openEl === lb) {
      if (e.key === "ArrowLeft") lbStep(-1);
      if (e.key === "ArrowRight") lbStep(1);
      return;
    }
    if (openEl) return;
    if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && inView(garageEl)) {
      e.preventDefault();
      setCar(carIdx + (e.key === "ArrowRight" ? 1 : -1));
      return;
    }
    if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && inView(view)) {
      e.preventDefault();
      userPicked = true; clearInterval(autoTimer);
      showTrack((trackIdx + (e.key === "ArrowRight" ? 1 : -1) + TRACKS.length) % TRACKS.length);
      return;
    }
    const k = e.key.toLowerCase();
    if ((k === "q" || k === "e") && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const ids = tabs.map((a) => a.getAttribute("href").slice(1));
      const y = window.scrollY + innerHeight * 0.4;
      let cur = 0;
      ids.forEach((id, i) => { const s = document.getElementById(id); if (s && s.offsetTop <= y) cur = i; });
      const next = Math.max(0, Math.min(ids.length - 1, cur + (k === "e" ? 1 : -1)));
      document.getElementById(ids[next]).scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    }
  });
})();
