// Siltok 共创计划：渠道参数保存、埋点、对比拖动、B站嵌入、计算器、选路径、在线体验。无第三方依赖。
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const page = document.body.dataset.page || "home";
  const STATIC = document.body.dataset.static === "1"; // GitHub Pages 静态版：没有后端接口
  const BASE = document.body.dataset.base || "";

  // ---------- 设备 ID（cookie 给服务端限额用）与渠道参数（存 30 天） ----------
  let dev = localStorage.getItem("stk_dev");
  if (!/^[a-z0-9]{8,32}$/.test(dev || "")) { dev = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random())).replace(/[^a-z0-9]/gi, "").slice(0, 24).toLowerCase(); localStorage.setItem("stk_dev", dev); }
  document.cookie = `stk_dev=${dev}; path=/; max-age=31536000; SameSite=Lax`;
  const url = new URL(location.href);
  let cp = {};
  try { cp = JSON.parse(localStorage.getItem("stk_cp") || "{}"); } catch {}
  if (!cp.t || Date.now() - cp.t > 30 * 864e5) cp = {};
  const qch = url.searchParams.get("ch"), qp = url.searchParams.get("p");
  if (qch) cp.ch = qch.replace(/[^a-z0-9]/gi, "").slice(0, 10).toLowerCase();
  if (qp) cp.p = qp.replace(/[^a-z]/g, "").slice(0, 12);
  const pathP = (location.pathname.match(/^\/(?:join|for)\/([a-z]+)/) || [])[1];
  if (pathP) cp.p = pathP;
  if (qch || qp || pathP) { cp.t = Date.now(); localStorage.setItem("stk_cp", JSON.stringify(cp)); }
  $$("a[data-keep]").forEach((a) => {
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || !cp.ch) return;
    const u = new URL(href, location.origin);
    if (!u.searchParams.has("ch")) u.searchParams.set("ch", cp.ch);
    a.setAttribute("href", u.pathname + u.search + u.hash);
  });

  const track = (event, extra = {}) => {
    if (STATIC) { // 静态版：有百度统计就记事件，没有就跳过
      if (window._hmt) window._hmt.push(["_trackEvent", event, cp.ch || "direct", (extra.state || cp.p || "").slice(0, 30)]);
      return;
    }
    const body = JSON.stringify({ event, ch: cp.ch || "direct", p: cp.p || "", page: location.pathname, ...extra });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    else fetch("/api/track", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
  };
  track("page_view");
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-track]");
    if (!t) return;
    const name = t.dataset.track;
    if (name === "add_click") track("add_click", { state: $("[data-endpoint]")?.dataset.state || "" });
    else track("cta_click", { state: name });
  });

  // ---------- 导航阴影、进场动画 ----------
  const nav = $("#nav");
  addEventListener("scroll", () => nav && nav.classList.toggle("scrolled", scrollY > 30), { passive: true });
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12 });
  $$(".reveal").forEach((el) => io.observe(el));

  // ---------- 视频卡：进入视口静音自动播放 ----------
  const vio = new IntersectionObserver((es) => es.forEach((e) => { const v = e.target; if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }), { threshold: 0.4 });
  $$("video[data-autoplay]").forEach((v) => vio.observe(v));
  $$(".vsound").forEach((b) => b.addEventListener("click", () => { const v = b.parentElement.querySelector("video"); v.muted = !v.muted; b.textContent = v.muted ? "🔇" : "🔊"; if (v.paused) v.play(); }));

  // ---------- 官方对比：拖动中线 + 同步播放 ----------
  $$("[data-compare]").forEach((fig) => {
    const stage = $(".cmp-stage", fig), a = $(".cmp-a", fig), b = $(".cmp-b", fig), handle = $(".cmp-handle", fig);
    const setX = (pct) => { pct = Math.max(2, Math.min(98, pct)); stage.style.setProperty("--x", pct + "%"); handle.setAttribute("aria-valuenow", Math.round(pct)); };
    const fromEvent = (e) => { const r = stage.getBoundingClientRect(); setX(((e.clientX - r.left) / r.width) * 100); };
    let drag = false;
    stage.addEventListener("pointerdown", (e) => { if (e.target.closest(".cmp-play")) return; drag = true; stage.setPointerCapture(e.pointerId); fromEvent(e); });
    stage.addEventListener("pointermove", (e) => drag && fromEvent(e));
    stage.addEventListener("pointerup", () => { drag = false; });
    handle.addEventListener("keydown", (e) => { const now = Number(handle.getAttribute("aria-valuenow")); if (e.key === "ArrowLeft") setX(now - 5); if (e.key === "ArrowRight") setX(now + 5); });
    const play = () => { a.currentTime = 0; b.currentTime = 0; Promise.all([a.play(), b.play()]).then(() => fig.classList.add("playing")).catch(() => {}); };
    $(".cmp-play", fig).addEventListener("click", play);
    a.addEventListener("timeupdate", () => { if (Math.abs(a.currentTime - b.currentTime) > 0.2 && !b.seeking) b.currentTime = a.currentTime; });
    new IntersectionObserver((es) => es.forEach((e) => { if (!e.isIntersecting) { a.pause(); b.pause(); fig.classList.remove("playing"); } }), { threshold: 0.2 }).observe(fig);
  });

  // ---------- B站官方播放器：点击后再加载 ----------
  $$(".bcard").forEach((card) => {
    $(".bthumb", card).addEventListener("click", () => {
      const f = document.createElement("iframe");
      f.src = `https://player.bilibili.com/player.html?bvid=${encodeURIComponent(card.dataset.bvid)}&autoplay=1&high_quality=1&danmaku=0`;
      f.allow = "autoplay; fullscreen; picture-in-picture";
      f.allowFullscreen = true; f.loading = "lazy"; f.referrerPolicy = "strict-origin-when-cross-origin";
      $(".bthumb", card).replaceWith(f);
      track("cta_click", { state: "bili_" + card.dataset.bvid });
    });
  });

  // ---------- 作品墙筛选 ----------
  const chips = $$(".chips [data-filter]");
  const filter = (k) => { chips.forEach((c) => c.classList.toggle("on", c.dataset.filter === k)); $$(".w-sec").forEach((s) => { s.hidden = k !== "all" && s.dataset.kind !== k; }); };
  chips.forEach((c) => c.addEventListener("click", () => filter(c.dataset.filter)));
  if (chips.length && location.hash === "#creators") filter("creators");

  // ---------- 抽卡计算器 ----------
  $$("[data-calc]").forEach((box) => {
    const d = box.dataset, v = {}; let res = "768";
    const yuan = (n) => "¥" + Math.round(n).toLocaleString("zh-CN");
    const out = (k, s) => { const el = $(`[data-out="${k}"]`, box); if (el) el.textContent = s; };
    const calc = () => {
      $$("input[data-i]", box).forEach((i) => { v[i.dataset.i] = Number(i.value); $(`[data-o="${i.dataset.i}"]`, box).textContent = i.value; });
      const clips = v.shots * v.tries, secs = clips * v.seconds;
      const cloud = secs * Number(res === "2k" ? d.p2k : d.p768), local = secs * Number(d.local);
      const save = (cloud - local) * v.eps, months = save > 0 ? Number(d.machine) / save : 0;
      out("cloud", yuan(cloud)); out("cloudNote", `${clips} 次生成 × ${v.seconds} 秒，按 ¥${res === "2k" ? d.p2k : d.p768}/秒`);
      out("local", yuan(local)); out("localNote", `按 ¥${d.local}/秒（三年折旧）`);
      out("save", yuan(save)); out("payback", months ? `按 ¥20,000 整机，约 ${months < 1 ? "不到 1" : months.toFixed(1)} 个月回本` : "");
    };
    $$("input[data-i]", box).forEach((i) => i.addEventListener("input", calc));
    $$(".seg button", box).forEach((b) => b.addEventListener("click", () => { res = b.dataset.res; $$(".seg button", box).forEach((x) => x.classList.toggle("on", x === b)); calc(); }));
    calc();
  });

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches || !!(navigator.connection && navigator.connection.saveData);

  // ---------- 《黑流树海》图层重拼（时间轴逻辑移植自原作单文件版） ----------
  // 0 ~ P1 秒播连续视频；之后视频隐藏，21 个图层按时间点在黑底上依次落位；T 秒一循环。
  const art = $("[data-art]");
  if (art) {
    const cfg = JSON.parse(art.dataset.art), T = cfg.T, P1 = cfg.P1;
    const cam = $(".art-cam", art), v = $(".art-v", art), bar = $("[data-art-bar]", art), pg = $("i", bar);
    const tcEl = $("[data-art-tc]", art), lyEl = $("[data-art-layer]", art);
    const playB = $("[data-art-play]", art), sndB = $("[data-art-snd]", art), fxB = $("[data-art-fx]", art);
    const n = $$(".art-ly", art).length;
    const L = $$(".art-ly", art).map((el, i) => {
      const s = el.style, cx = ((parseFloat(s.left) + parseFloat(s.width) / 2 - 50) / 100) * 1280, cy = ((parseFloat(s.top) + parseFloat(s.height) / 2 - 50) / 100) * 720, d = Math.hypot(cx, cy) || 1;
      return { el, t: cfg.ts[i], dx: cx / d, dy: cy / d, z: 0.2 + i / n };
    });
    const ease = (x) => 1 - Math.pow(1 - x, 3), cl = (x) => Math.max(0, Math.min(1, x));
    let t = 0, playing = !reduce, fx = matchMedia("(pointer: fine)").matches, sound = false, last = performance.now(), mx = 0, my = 0, tmx = 0, tmy = 0, visible = false, ready = false, raf = 0, k = 1, au = null;
    const fit = () => { k = cam.clientWidth / 1280 || 1; };
    addEventListener("resize", fit); fit();
    Promise.all(L.map((o) => (o.el.decode ? o.el.decode() : Promise.resolve()).catch(() => {}))).then(() => { ready = true; });
    const render = () => {
      const inP1 = t < P1;
      v.style.visibility = inP1 ? "visible" : "hidden";
      if (inP1 && Math.abs(v.currentTime - t) > 0.15) v.currentTime = t;
      if (inP1 && playing && v.paused) v.play().catch(() => {});
      if ((!inP1 || !playing) && !v.paused) v.pause();
      mx += (tmx - mx) * 0.08; my += (tmy - my) * 0.08;
      cam.style.transform = fx && !inP1 ? `scale(${1 + 0.03 * ease(cl((t - P1) / (T - P1)))})` : "";
      let shown = 0;
      L.forEach((o) => {
        if (t < o.t) { o.el.style.opacity = 0; return; }
        shown++;
        if (!fx) { o.el.style.opacity = 1; o.el.style.transform = ""; return; }
        const p = ease(cl((t - o.t) / 0.45)), off = (1 - p) * 40 * k, px = -mx * o.z * 24 * k, py = -my * o.z * 16 * k;
        o.el.style.opacity = p;
        o.el.style.transform = `translate(${(o.dx * off + px).toFixed(1)}px,${(o.dy * off + py).toFixed(1)}px) scale(${(1.04 - 0.04 * p).toFixed(4)})`;
      });
      pg.style.width = (t / T) * 100 + "%"; bar.setAttribute("aria-valuenow", Math.round((t / T) * 100));
      tcEl.textContent = t.toFixed(2).padStart(5, "0"); lyEl.textContent = String(shown).padStart(2, "0");
    };
    const syncAudio = () => { if (!au) return; if (sound && playing && visible) { if (Math.abs(au.currentTime - t) > 0.08) au.currentTime = t; if (au.paused) au.play().catch(() => {}); } else au.pause(); };
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (playing) {
        if (!ready && t < P1 && t + dt >= P1) t = P1 - 0.02; // 图层还没解码好：停在视频最后一帧等
        else t += dt;
        if (t >= T) { t -= T; if (au && sound) au.currentTime = t; }
      }
      if (au && sound && playing && !au.paused && Math.abs(au.currentTime - t) < 0.3) t = au.currentTime; // 开声音时以音频为准
      render(); syncAudio();
      raf = visible && !art.dataset.off ? requestAnimationFrame(loop) : 0;
    };
    const wake = () => { if (!raf && visible && !art.dataset.off) { last = performance.now(); raf = requestAnimationFrame(loop); } };
    art._wake = wake; // 首屏滚走后由钉住滚动暂停 / 恢复
    new IntersectionObserver((es) => es.forEach((e) => { visible = e.isIntersecting && !document.hidden; if (visible) wake(); else { v.pause(); syncAudio(); } }), { threshold: 0 }).observe(art);
    document.addEventListener("visibilitychange", () => { if (document.hidden) { visible = false; v.pause(); syncAudio(); } else if (art.getBoundingClientRect().bottom > 0) { visible = true; wake(); } });
    const setPlay = (on) => { playing = on; art.classList.remove("still"); playB.textContent = on ? "暂停" : "播放"; playB.setAttribute("aria-pressed", on); syncAudio(); wake(); };
    const setFx = (on) => { fx = on; fxB.textContent = "动效增强：" + (on ? "开" : "关"); fxB.setAttribute("aria-pressed", on); };
    setFx(fx);
    if (reduce) { art.classList.add("still"); playB.textContent = "播放"; playB.setAttribute("aria-pressed", false); t = T - 0.01; }
    playB.addEventListener("click", () => setPlay(!playing));
    fxB.addEventListener("click", () => setFx(!fx));
    sndB.addEventListener("click", () => {
      sound = !sound;
      if (sound && !au) { au = new Audio(BASE + cfg.audio); au.preload = "auto"; }
      sndB.textContent = sound ? "静音" : "开声音"; sndB.setAttribute("aria-pressed", sound);
      if (au) { if (sound) au.currentTime = t; syncAudio(); }
      if (sound && !playing) setPlay(true);
    });
    bar.addEventListener("click", (e) => { const r = bar.getBoundingClientRect(); t = cl((e.clientX - r.left) / r.width) * T * 0.999; if (au && sound) au.currentTime = t; art.classList.remove("still"); render(); });
    art.addEventListener("keydown", (e) => {
      if (e.target !== art) return;
      if (e.code === "Space") { e.preventDefault(); setPlay(!playing); }
      if (e.code === "ArrowRight" || e.code === "ArrowLeft") {
        e.preventDefault(); setPlay(false);
        const ts = [0, P1, ...cfg.ts];
        t = e.code === "ArrowRight" ? (ts.find((x) => x > t + 0.001) ?? 0) : ([...ts].reverse().find((x) => x < t - 0.001) ?? 0);
        render();
      }
    });
    const fr = $(".art-frame", art);
    fr.addEventListener("pointermove", (e) => { const r = fr.getBoundingClientRect(); tmx = (e.clientX - r.left) / r.width - 0.5; tmy = (e.clientY - r.top) / r.height - 0.5; });
    fr.addEventListener("pointerleave", () => { tmx = tmy = 0; });
    render();
  }

  // ---------- 故事版拆层：鼠标悬停合成；触屏点按切换；第一次进入视口自动演示一次 ----------
  $$("[data-stack]").forEach((st) => {
    let hover = false, lastType = "mouse";
    const set = (on) => st.classList.toggle("on", on);
    st.addEventListener("pointerdown", (e) => { lastType = e.pointerType; });
    st.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") { hover = true; set(true); } });
    st.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") { hover = false; set(false); } });
    st.addEventListener("click", () => { if (lastType !== "mouse") set(!st.classList.contains("on")); });
    if (!reduce) new IntersectionObserver((es, o) => es.forEach((e) => { if (!e.isIntersecting) return; o.disconnect();
      setTimeout(() => { if (!hover) set(true); }, 1000); setTimeout(() => { if (!hover) set(false); }, 3400); }), { threshold: 0.5 }).observe(st);
  });

  // ---------- 创作者档案：答题 → 留联系方式（飞书预填）→ 出群码 / 活码 + 复制档案 ----------
  // 答案只存在本机浏览器（stk_profile）；飞书链接只带画像类答案，称呼、微信号让用户在飞书里自己填。
  const prof = $("[data-profile]");
  if (prof) {
    const pq = $("[data-pq]", prof), pr = $("[data-pr]", prof), Qs = $$(".pq-q", prof);
    const stepEl = $("[data-pq-step]", prof), pbar = $("[data-pq-bar]", prof), back = $("[data-pq-back]", prof);
    const nextMap = JSON.parse(prof.dataset.next || "{}");
    const qrBox = $("[data-pr-qr]", prof), qrWait = $("[data-pr-wait]", prof);
    const showQr = (on) => { if (qrBox) qrBox.hidden = !on; if (qrWait) qrWait.hidden = on; };
    const withBase = (u) => (u && u.startsWith("/") && !u.startsWith(BASE + "/") ? BASE + u : u);
    let cur = 0;
    const show = (i) => { Qs.forEach((q, j) => { q.hidden = j !== i; }); cur = i; stepEl.textContent = i + 1; pbar.style.width = (i / Qs.length) * 100 + "%"; back.hidden = i === 0; };
    const collect = () => Object.fromEntries(Qs.map((q) => { const on = $$(".pq-opt.on", q); return [q.dataset.q, { field: q.dataset.field, v: on.map((o) => o.dataset.v), x: on.map((o) => o.dataset.x || "") }]; }));
    const restoreMarks = (data) => Qs.forEach((q) => { const a = data[q.dataset.q]; $$(".pq-opt", q).forEach((o) => o.classList.toggle("on", !!a && a.v.includes(o.dataset.v))); const nb = $("[data-pq-next]", q); if (nb) nb.disabled = !$$(".pq-opt.on", q).length; });
    const summary = (data) => "【Siltok 创作者档案】\n" + Object.values(data).filter((a) => a.v.length).map((a) => `${a.field}：${a.v.join("、")}`).join("\n");
    const finish = (data, restored = false) => {
      const p = (data.role && data.role.x[0]) || "indie", lv = (data.join && data.join.x[0]) || "L0", nx = nextMap[lv] || nextMap.L0 || {};
      localStorage.setItem("stk_profile", JSON.stringify({ t: Date.now(), data }));
      cp.p = p; cp.t = Date.now(); localStorage.setItem("stk_cp", JSON.stringify(cp));
      if (!restored) track("profile_done", { state: `${p}_${lv}` });
      pq.hidden = true; pr.hidden = false;
      $("[data-pr-lv]", pr).textContent = `${lv} · ${nx.lv || ""}`;
      $("[data-pr-t]", pr).textContent = nx.t || ""; $("[data-pr-b]", pr).textContent = nx.b || "";
      const card = $("[data-pr-card]", pr); card.textContent = "";
      Object.values(data).forEach((a) => { if (!a.v.length) return; const dt = document.createElement("dt"), dd = document.createElement("dd"); dt.textContent = a.field; dd.textContent = a.v.join("、"); card.append(dt, dd); });
      const form = prof.dataset.form, src = prof.dataset.source || "来源", fa = $("[data-pr-form]", pr), note = $("[data-pr-note]", pr);
      if (form) {
        const ps = new URLSearchParams();
        Object.values(data).forEach((a) => { if (a.v.length) ps.append("prefill_" + a.field, a.v.join(",")); });
        ps.append("prefill_" + src, "官网-" + (cp.ch || "direct")); ps.append("hide_" + src, "1");
        fa.href = form + (form.includes("?") ? "&" : "?") + ps.toString(); fa.textContent = "填写联系方式 ↗";
        note.textContent = "会打开飞书表单：选择题已经帮你填好，只需补称呼和微信号（手机号选填）。填完回到这里点“已填好”。";
      } else if (lv === "L4") { fa.href = prof.dataset.biz; fa.textContent = "填写合作报价 ↗"; note.textContent = "会打开飞书合作报价表，商务会跟进；填完回到这里点“已填好”拿群码。"; }
      else { fa.href = prof.dataset.beta; fa.textContent = "填写内测申请 ↗"; note.textContent = "会打开飞书内测申请表，留下称呼和微信号即可；填完回到这里点“已填好”。"; }
      $("[data-pr-staff]", pr).href = `${BASE}/join/${p}${STATIC ? "/" : ""}?ch=${encodeURIComponent(cp.ch || "direct")}`;
      const rt = JSON.parse(prof.dataset.routes || "{}")[p];
      if (rt && rt.qr && qrBox) { // 这个方向配了“联系我”活码：先加员工，自动打标签、自动发群码
        const im = $("[data-pr-qrimg]", qrBox); im.src = withBase(rt.qr); im.alt = "Siltok 共创计划企业微信活码";
        $("[data-pr-qrname]", qrBox).textContent = "Siltok 共创计划 · 企业微信";
        $("[data-pr-qrtip]", qrBox).textContent = "扫码加企业微信，会自动收到欢迎语和群码";
      }
      showQr(!!localStorage.getItem("stk_contact"));
      if (!restored) pr.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    };
    Qs.forEach((q, i) => {
      const many = q.dataset.type === "many", nb = $("[data-pq-next]", q);
      const advance = () => (i < Qs.length - 1 ? show(i + 1) : finish(collect()));
      $$(".pq-opt", q).forEach((o) => o.addEventListener("click", () => {
        if (many) { o.classList.toggle("on"); nb.disabled = !$$(".pq-opt.on", q).length; return; }
        $$(".pq-opt", q).forEach((x) => x.classList.toggle("on", x === o));
        setTimeout(advance, 220);
      }));
      if (nb) nb.addEventListener("click", advance);
    });
    back.addEventListener("click", () => cur > 0 && show(cur - 1));
    const copyB = $("[data-pr-copy]", pr);
    copyB.addEventListener("click", () => {
      const text = summary(collect());
      const done = () => { copyB.textContent = "已复制 ✓"; setTimeout(() => { copyB.textContent = "复制档案"; }, 2400); track("cta_click", { state: "profile_copy" }); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text) && done());
      else if (fallbackCopy(text)) done();
    });
    const fallbackCopy = (text) => { const ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.append(ta); ta.select(); let ok = false; try { ok = document.execCommand("copy"); } catch {} ta.remove(); return ok; };
    $("[data-pr-done]", pr).addEventListener("click", () => {
      localStorage.setItem("stk_contact", String(Date.now())); showQr(true); track("cta_click", { state: "profile_contact_done" });
      if (qrBox) qrBox.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    });
    $("[data-pr-redo]", pr).addEventListener("click", () => { localStorage.removeItem("stk_profile"); localStorage.removeItem("stk_contact"); showQr(false); restoreMarks({}); pr.hidden = true; pq.hidden = false; show(0); });
    const wantSkill = new URLSearchParams(location.search).get("skill"); // 技能卡片点进来：预选这个方向
    if (wantSkill) { const f = Qs.find((q) => q.dataset.q === "skill"); const o = f && $$(".pq-opt", f).find((x) => x.dataset.v === wantSkill); if (o) { o.classList.add("on"); const nb = $("[data-pq-next]", f); if (nb) nb.disabled = false; } }
    try {
      const saved = JSON.parse(localStorage.getItem("stk_profile") || "null");
      if (saved && saved.data && Date.now() - saved.t < 90 * 864e5) { restoreMarks(saved.data); finish(saved.data, true); }
    } catch {}
  }

  // ---------- 加群终点页：按设备给入口 ----------
  const endp = $("[data-endpoint]");
  if (endp) {
    if (STATIC && cp.ch) { // 静态页按 direct 生成，这里换成实际渠道
      endp.dataset.state = endp.dataset.state.replace(/^[a-z0-9]+_/, cp.ch + "_");
      const tag = $(".fine.mono", endp);
      if (tag) tag.textContent = "渠道标记：" + endp.dataset.state;
    }
    const ua = navigator.userAgent, wx = /MicroMessenger/i.test(ua), mobile = /Mobile|Android|iPhone/i.test(ua);
    $("[data-tip-desktop]").hidden = wx || mobile; $("[data-tip-wechat]").hidden = !wx; $("[data-tip-mobile]").hidden = wx || !mobile;
    if (mobile && !wx && endp.dataset.link) $("[data-addlink]").hidden = false;
    new IntersectionObserver((es, o) => es.forEach((e) => { if (e.isIntersecting) { track("qr_view", { state: endp.dataset.state }); o.disconnect(); } }), { threshold: 0.5 }).observe($("[data-qr]"));
    $$("[data-staff]").forEach((b) => b.addEventListener("click", () => {
      const s = JSON.parse(b.dataset.staff); $("[data-qr]").src = s.qr; $("[data-qr]").alt = s.name + "的企业微信二维码"; $("[data-staffname]").textContent = s.name;
      $$("[data-staff]").forEach((x) => x.classList.toggle("on", x === b));
    }));
  }

  // ---------- 群码过期：到期后隐藏，显示“加企业微信拉你进群” ----------
  $$("[data-expires]").forEach((el) => {
    const d = el.dataset.expires;
    if (d && new Date() > new Date(d + "T23:59:59+08:00")) {
      el.hidden = true;
      const f = el.parentElement.querySelector("[data-expired]");
      if (f) f.hidden = false;
    }
  });

  // ---------- 弹窗 ----------
  const modal = $("#joinModal");
  const openModal = () => { modal.hidden = false; };
  $$("[data-close]").forEach((b) => b.addEventListener("click", () => { modal.hidden = true; if (b.textContent.includes("兑换码")) $("#redeem input")?.focus(); }));
  modal?.addEventListener("click", (e) => { if (e.target === modal) modal.hidden = true; });

  // ---------- 在线体验 ----------
  const trial = $("[data-trial]");
  if (trial) {
    const ta = $("#prompt"), go = $("#go"), err = $("#err"), log = $("#log"), pbar = $("#pbar"), out = $("#out"), quotaEl = $("[data-quota]");
    const showQuota = (q) => { if (q) quotaEl.textContent = `今日剩余 ${q.left} 次`; };
    if (STATIC) { quotaEl.textContent = "演示模式"; $("#redeem").hidden = true; }
    else fetch("/api/trial/quota").then((r) => r.json()).then((d) => showQuota(d.quota)).catch(() => {});
    // 每个示例绑定它自己的成片（data-video）；改写过的提示词在演示模式下不播放任何视频
    const chipsS = $$("[data-sample]");
    const pick = (b) => chipsS.forEach((x) => x.classList.toggle("on", x === b));
    const matchSample = (text) => chipsS.find((b) => b.dataset.video && b.dataset.sample.trim() === text);
    chipsS.forEach((b) => b.addEventListener("click", () => { ta.value = b.dataset.sample; pick(b); ta.focus(); }));
    ta.addEventListener("input", () => pick(matchSample(ta.value.trim()) || null));
    const caseIdx = new URLSearchParams(location.search).get("case");
    if (caseIdx !== null && !ta.value.trim()) {
      const o = $$(".chip-o")[Number(caseIdx)];
      if (o) { ta.value = o.dataset.sample; pick(o); }
    } else pick(matchSample(ta.value.trim()) || null);
    const lines = [];
    const say = (s) => { lines.push(`[${new Date().toTimeString().slice(0, 8)}] ${s}`); log.textContent = lines.slice(-9).join("\n"); };
    const fail = (m) => { err.textContent = m; err.hidden = false; go.disabled = false; go.textContent = "生成 5 秒视频"; };
    const noVideo = () => {
      err.textContent = "网页版不连机器，只能播放示例提示词对应的成片。想用你自己的提示词，";
      const a = document.createElement("a"); a.href = `${BASE}/join${STATIC ? "/" : ""}`; a.textContent = "填档案申请内测，用真机跑 →"; err.append(a);
      err.hidden = false; go.disabled = false; go.textContent = "生成 5 秒视频";
      $(".screen-idle").hidden = false; log.hidden = true; pbar.hidden = true; out.hidden = true;
    };
    go.addEventListener("click", async () => {
      err.hidden = true;
      const prompt = ta.value.trim();
      if (prompt.length < 4) return fail("先写一句画面描述。");
      const sample = matchSample(prompt);
      if ((STATIC || trial.dataset.mock === "1") && !sample) return noVideo();
      go.disabled = true; go.textContent = "生成中…";
      $(".screen-idle").hidden = true; out.hidden = true; log.hidden = false; pbar.hidden = false; lines.length = 0;
      say("提交任务 · MiniMax H3 标准生成 · 864×480 · 5 秒");
      if (STATIC) { // 静态版没有后端：在浏览器里走一遍流程，最后播放官方示例
        say("演示模式：网页版不连机器，流程走完后播放这条示例提示词对应的官方成片");
        const t0 = Date.now();
        let lastStep = -1;
        const tick = setInterval(() => {
          const pct = Math.min(100, Math.round(((Date.now() - t0) / 8000) * 100));
          $("i", pbar).style.width = pct + "%";
          const step = Math.floor(pct / 25);
          if (pct < 100) { if (step !== lastStep) { lastStep = step; say(`渲染中 ${pct}%`); } return; }
          clearInterval(tick);
          say("完成（演示）");
          out.src = sample.dataset.video; out.hidden = false; log.hidden = true; pbar.hidden = true; out.play().catch(() => {});
          go.disabled = false; go.textContent = "加入共创，用真机跑";
          go.onclick = () => { location.href = `${BASE}/join/`; };
          track("trial_success");
        }, 400);
        return;
      }
      let r;
      try {
        r = await fetch("/api/trial", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, token: document.body.dataset.token, ch: cp.ch, p: cp.p, sample: sample ? sample.dataset.case : null }) });
      } catch { return fail("网络出错了，稍后再试。"); }
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { if (d.mockCustom) return noVideo(); if (d.quotaOut) openModal(); say("未提交：" + (d.error || r.status)); return fail(d.error || "提交失败"); }
      showQuota(d.quota);
      say(d.mock ? "模拟模式：走完整流程，最后播放这条示例提示词对应的官方成片" : "已分配到 Siltok 远程机器");
      const t0 = Date.now(); let last = -1;
      const poll = async () => {
        let s;
        try { s = await (await fetch(`/api/trial/${d.id}`)).json(); } catch { return setTimeout(poll, 3000); }
        if (s.progress !== last) { last = s.progress; $("i", pbar).style.width = (s.progress || 0) + "%"; if (s.status === "in_progress") say(`渲染中 ${s.progress || 0}% · 已用 ${Math.round((Date.now() - t0) / 1000)} 秒`); }
        if (s.status === "completed") {
          say(`完成 · 用时 ${Math.round((Date.now() - t0) / 1000)} 秒`);
          out.src = s.video || trial.dataset.mocksrc; out.hidden = false; log.hidden = true; pbar.hidden = true; out.play().catch(() => {});
          go.disabled = false; go.textContent = "再生成一条"; track("trial_success");
        } else if (s.status === "failed" || s.status === "cancelled") { say("失败：" + (s.error || "")); fail(s.error || "生成失败，换个提示词再试。"); }
        else setTimeout(poll, 2000);
      };
      setTimeout(poll, 1200);
    });
    $("#redeem").addEventListener("submit", async (e) => {
      e.preventDefault();
      const code = e.target.code.value.trim(); if (!code) return;
      const r = await fetch("/api/trial/redeem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, ch: cp.ch, p: cp.p }) });
      const d = await r.json().catch(() => ({}));
      err.textContent = d.msg || "兑换失败"; err.hidden = false; err.style.color = r.ok ? "#14804a" : ""; showQuota(d.quota);
    });
  }

  // ---------- 滚动驱动（参照 OpenCreator）：首屏钉住 + 场景切换 ----------
  const pinOK = () => innerWidth > 900 && !reduce;
  const hpin = $("[data-hpin]"), artEl = $("[data-art]"), scn = $("[data-scn]");
  let scnUpdate = () => {};
  const progress = (el) => { const total = el.offsetHeight - innerHeight; return total > 0 ? Math.min(1, Math.max(0, -el.getBoundingClientRect().top / total)) : 0; };
  const onScroll = () => {
    if (hpin) {
      const p = pinOK() ? progress(hpin) : 0;
      hpin.style.setProperty("--p", p.toFixed(4));
      if (artEl) { // 标题和美术卡片淡出后暂停动画，省电
        const off = p > 0.55;
        if (off && !artEl.dataset.off) artEl.dataset.off = "1";
        else if (!off && artEl.dataset.off) { delete artEl.dataset.off; if (artEl._wake) artEl._wake(); }
      }
    }
    scnUpdate();
  };
  let ticking = false;
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; onScroll(); }); } }, { passive: true });
  addEventListener("resize", onScroll);

  if (scn) {
    const lis = $$(".scn-list li", scn), vids = $$(".scn-card video", scn), bgs = $$(".scn-bg img", scn);
    const card = $("[data-scn-card]", scn), stage = $(".scn-stage", scn);
    let cur = -1, inView = false;
    const size = () => { // 卡片按当前视频比例变形：横屏 16:9 ↔ 竖屏 9:16
      const [a, b] = (lis[Math.max(cur, 0)].dataset.ar || "16/9").split("/").map(Number), r = a / b;
      const W = stage.clientWidth || 560, H = Math.min(innerHeight * 0.64, 560);
      let w = Math.min(W, H * r), h = w / r;
      if (h > H) { h = H; w = h * r; }
      card.style.width = Math.round(w) + "px"; card.style.height = Math.round(h) + "px";
    };
    const set = (i) => {
      if (i === cur) return;
      cur = i;
      lis.forEach((l, j) => l.classList.toggle("on", j === i));
      bgs.forEach((g, j) => g.classList.toggle("on", j === i));
      vids.forEach((v, j) => { v.classList.toggle("on", j === i); if (j === i && inView) v.play().catch(() => {}); else v.pause(); });
      $("[data-scn-tag]", scn).textContent = "✦ " + lis[i].dataset.t;
      $("[data-scn-meta]", scn).textContent = lis[i].dataset.meta;
      $("[data-scn-cap]", scn).textContent = lis[i].dataset.cap;
      size();
    };
    scnUpdate = () => { if (pinOK()) set(Math.min(lis.length - 1, Math.floor(progress(scn) * lis.length * 0.999))); };
    lis.forEach((l, i) => l.addEventListener("click", () => {
      if (!pinOK()) return set(i);
      const total = scn.offsetHeight - innerHeight;
      scrollTo({ top: scn.getBoundingClientRect().top + scrollY + total * ((i + 0.5) / lis.length), behavior: "smooth" });
    }));
    new IntersectionObserver((es) => es.forEach((e) => { inView = e.isIntersecting; const v = vids[Math.max(cur, 0)]; if (inView && v) v.play().catch(() => {}); else vids.forEach((x) => x.pause()); }), { threshold: 0.05 }).observe(scn);
    addEventListener("resize", size);
    set(0);
  }
  onScroll();

  // ---------- 故事板（参照 LibTV）：切换案例、点镜头跳到成片对应位置、播放时镜头跟着走 ----------
  const sbx = $("[data-sb]");
  if (sbx) {
    const tabs = $$(".sb-tab", sbx), panels = $$(".sb-case", sbx);
    const mm = (s) => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
    tabs.forEach((t) => t.addEventListener("click", () => {
      tabs.forEach((x) => { x.classList.toggle("on", x === t); x.setAttribute("aria-selected", x === t ? "true" : "false"); });
      panels.forEach((pn) => { const on = pn.dataset.case === t.dataset.case; pn.hidden = !on; if (!on) $(".sb-v", pn).pause(); });
      track("cta_click", { state: "sb_" + t.dataset.case });
    }));
    panels.forEach((pn) => {
      const v = $(".sb-v", pn), shots = $$(".sb-shot", pn);
      let parts = [];
      try { parts = JSON.parse(pn.dataset.parts || "[]"); } catch {}
      let part = parts[0] ? parts[0].id : "";
      const codeEl = $("[data-cur-code]", pn), timeEl = $("[data-cur-time]", pn), detEl = $("[data-cur-detail]", pn);
      const setPart = (id, then) => {
        if (id === part) { if (then) { if (v.readyState >= 1) then(); else { v.addEventListener("loadedmetadata", then, { once: true }); v.load(); } } return; }
        const p = parts.find((x) => x.id === id);
        if (!p) return;
        part = id; v.src = BASE + p.src; v.poster = BASE + p.poster;
        $$(".sb-parts button", pn).forEach((b) => b.classList.toggle("on", b.dataset.part === id));
        if (then) v.addEventListener("loadedmetadata", then, { once: true });
      };
      $$(".sb-parts button", pn).forEach((b) => b.addEventListener("click", () => setPart(b.dataset.part, () => v.play().catch(() => {}))));
      const show = (s) => {
        shots.forEach((x) => x.classList.toggle("on", x === s));
        codeEl.textContent = s.dataset.code;
        timeEl.textContent = `${mm(+s.dataset.t)}–${mm(+s.dataset.end)}`;
        detEl.textContent = "";
        if (s.dataset.detail) {
          let d = {};
          try { d = JSON.parse(s.dataset.detail); } catch {}
          const dl = document.createElement("dl"); dl.className = "sb-params";
          Object.entries(d.d || {}).forEach(([k, val]) => { const dt = document.createElement("dt"), dd = document.createElement("dd"); dt.textContent = k; dd.textContent = val; dl.append(dt, dd); });
          detEl.append(dl);
          (d.p || []).forEach((pp) => { if (!pp.x) return; const h = document.createElement("p"), pre = document.createElement("pre"); h.className = "sb-k mono"; h.textContent = pp.t; pre.className = "sb-prompt"; pre.textContent = pp.x; detEl.append(h, pre); });
        }
        const row = s.parentElement;
        if (row.scrollWidth > row.clientWidth) row.scrollTo({ left: s.offsetLeft - row.clientWidth / 2 + s.clientWidth / 2, behavior: reduce ? "auto" : "smooth" });
      };
      shots.forEach((s) => s.addEventListener("click", () => {
        show(s);
        setPart(s.dataset.part, () => { v.currentTime = +s.dataset.t + 0.05; v.play().catch(() => {}); });
        track("cta_click", { state: "sb_shot_" + pn.dataset.case });
      }));
      let lastAuto = null;
      v.addEventListener("timeupdate", () => {
        const t = v.currentTime;
        const s = shots.find((x) => x.dataset.part === part && t >= +x.dataset.t && t < +x.dataset.end);
        if (s && s !== lastAuto) { lastAuto = s; show(s); }
      });
      $$(".sb-kinds button", pn).forEach((b) => b.addEventListener("click", () => {
        $$(".sb-kinds button", pn).forEach((x) => x.classList.toggle("on", x === b));
        $$(".sb-agrid figure", pn).forEach((f) => { f.hidden = !!b.dataset.k && f.dataset.k !== b.dataset.k; });
      }));
    });
  }

  // ---------- 数字滚动计数（参照 OpenCreator 的统计卡） ----------
  const cio = new IntersectionObserver((es, o) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    o.unobserve(e.target);
    const el = e.target, to = Number(el.dataset.count) || 0;
    if (reduce || !to) return;
    const t0 = performance.now();
    const step = (now) => { const k = Math.min(1, (now - t0) / 1400); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))).toLocaleString("zh-CN"); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }), { threshold: 0.6 });
  $$("[data-count]").forEach((el) => cio.observe(el));

  // ---------- 智能体接入：光点聚合（参照粒子人形影像：方形光点、光丝拖尾、水面倒影） ----------
  // 平时光点顺着水流漂；鼠标移进舞台，光点飞到指针处，拼出 Siltok 字样，外圈一环智能体图标慢慢转；移出就散开。
  // 触屏没有悬停：进入视口自动聚拢，点哪聚到哪。减少动态效果时直接画聚好的静帧。
  const ag = $("[data-ag]");
  if (ag) (() => {
    const cv = $(".ag-cv", ag), bl = $(".ag-bloom", ag), hint = $("[data-ag-hint] span", ag);
    const ctx = cv.getContext("2d"), bctx = bl.getContext("2d");
    if (!ctx || !bctx) return;
    const pc = document.createElement("canvas"), px = pc.getContext("2d"); // 粒子层（也喂给辉光层）
    const sc = document.createElement("canvas"), sx = sc.getContext("2d"); // 合成层：粒子 + 图标 + 字，倒影从这里取
    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    const FONT = '"Avenir Next","PingFang SC","HarmonyOS Sans SC","Microsoft YaHei",sans-serif';
    const chips = $$("[data-ag-chip]");
    const logos = chips.map((el) => ({ img: new Image(), src: $("img", el).src, name: el.dataset.name, ok: false }));
    const COLS = ["#2453ff", "#3f86ff", "#49d0ff", "#c4ecff", "#ffffff", "#e4f43a", ...chips.map((el) => el.dataset.c || "#ffffff")];
    const NC = COLS.length, NL = logos.length, MAXN = 2600;
    const X = new Float32Array(MAXN), Y = new Float32Array(MAXN), VX = new Float32Array(MAXN), VY = new Float32Array(MAXN);
    const SZ = new Float32Array(MAXN), KS = new Float32Array(MAXN), PH = new Float32Array(MAXN), PA = new Float32Array(MAXN), PB = new Float32Array(MAXN);
    const ROLE = new Uint8Array(MAXN), COL = new Uint8Array(MAXN), HX = new Float32Array(MAXN), HY = new Float32Array(MAXN);
    const LX = new Float32Array(NL), LY = new Float32Array(NL), LZ = new Float32Array(NL);
    const G = { rx: 0, ry: 0, fs: 0, logo: 0, small: false }, F = { x: 0, y: 0 }, P = { x: 0, y: 0, on: false };
    let N = 0, W = 0, H = 0, DPR = 1, HZ = 0, TP = [], spacing = null, ghost = null;
    let t = 0, gather = 0, want = 0, rot = 0, acc = 0, last = 0, raf = 0, inView = false, loaded = false;
    const clamp = (v, a, b) => (a > b ? (a + b) / 2 : Math.max(a, Math.min(b, v)));
    const sat = (v) => Math.max(0, Math.min(1, v));
    const ease = (v) => v * v * (3 - 2 * v);
    const pickBase = () => { const r = Math.random(); return r < 0.3 ? 0 : r < 0.6 ? 1 : r < 0.8 ? 2 : r < 0.92 ? 3 : r < 0.985 ? 4 : 5; };
    // 每个图标一张同色光晕贴图（只画一次）
    const glow = COLS.slice(6).map((c) => {
      const s = 128, g = document.createElement("canvas"); g.width = g.height = s;
      const x = g.getContext("2d"), rg = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      rg.addColorStop(0, c + "88"); rg.addColorStop(0.45, c + "26"); rg.addColorStop(1, c + "00");
      x.fillStyle = rg; x.fillRect(0, 0, s, s); return g;
    });
    function loadLogos() {
      if (loaded) return; loaded = true;
      logos.forEach((l) => { l.img.decoding = "async"; l.img.onload = () => { l.ok = true; if (reduce) render(); }; l.img.src = l.src; });
    }

    // “Siltok”字形取点：先量出字的面积，再按要用的光点数定网格间距，排成点阵字（比随机撒点好认）
    function buildText(want) {
      const c = document.createElement("canvas"), g = c.getContext("2d"), font = `800 ${G.fs}px ${FONT}`;
      g.font = font;
      const w = Math.ceil(g.measureText("Siltok").width) + 16, h = Math.ceil(G.fs * 1.3);
      c.width = w; c.height = h;
      g.font = font; g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText("Siltok", w / 2, h / 2);
      const d = g.getImageData(0, 0, w, h).data;
      let area = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 150) area++;
      const st = Math.max(1.8, Math.sqrt(area / Math.max(1, want)));
      TP = [];
      for (let y = st / 2; y < h; y += st) for (let x = st / 2; x < w; x += st) {
        const xi = x | 0, yi = y | 0;
        if (d[(yi * w + xi) * 4 + 3] > 150) TP.push([xi - w / 2, yi - h / 2 - G.fs * 0.16]);
      }
      for (let i = TP.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0, tmp = TP[i]; TP[i] = TP[j]; TP[j] = tmp; }
      // 字形底光：同一个字带模糊光晕画一层，垫在光点下面
      ghost = document.createElement("canvas"); ghost.width = w + 60; ghost.height = h + 60;
      const q = ghost.getContext("2d"); q.font = font; q.textAlign = "center"; q.textBaseline = "middle";
      q.shadowColor = "rgba(80,140,255,1)"; q.shadowBlur = 28; q.fillStyle = "rgba(110,165,255,.5)";
      q.fillText("Siltok", ghost.width / 2, ghost.height / 2);
    }

    // 角色：1 字形 · 2 图标光环 · 3 图标轨道 · 4 外圈反向轨道 · 0 自由光点（聚拢时绕在外圈）
    function assign() {
      N = Math.min(MAXN, Math.max(900, Math.round((W * H) / (G.small ? 240 : 290))));
      buildText(Math.round(N * 0.42));
      const per = G.small ? 9 : 16, nT = Math.min(TP.length, Math.round(N * 0.42));
      const nA = Math.round(N * 0.12), nB = Math.round(N * 0.05);
      for (let i = 0; i < N; i++) {
        HX[i] = X[i] = Math.random() * W; HY[i] = Y[i] = Math.random() * HZ; VX[i] = VY[i] = 0;
        PH[i] = Math.random() * 6.283; KS[i] = 0.016 + Math.random() * 0.03;
        const r = Math.random(); SZ[i] = r < 0.06 ? 2.6 + Math.random() * 1.2 : r < 0.42 ? 1.5 + Math.random() * 0.7 : 0.8 + Math.random() * 0.6;
        COL[i] = pickBase(); ROLE[i] = 0; PA[i] = Math.random() * 6.283; PB[i] = 1.15 + Math.random() * 0.8;
      }
      let j = 0;
      for (let k = 0; k < nT; k++, j++) { ROLE[j] = 1; PA[j] = TP[k][0]; PB[j] = TP[k][1]; SZ[j] = 1.6 + Math.random() * 1.1; COL[j] = [4, 4, 4, 3, 3, 2][(Math.random() * 6) | 0]; }
      for (let l = 0; l < NL; l++) for (let h = 0; h < per; h++, j++) { ROLE[j] = 2; PA[j] = l; PB[j] = (h / per) * 6.283 + Math.random() * 0.4; COL[j] = Math.random() < 0.6 ? 6 + l : 3; }
      for (let k = 0; k < nA; k++, j++) { ROLE[j] = 3; PA[j] = (k / nA) * 6.283 + Math.random() * 0.05; PB[j] = (Math.random() - 0.5) * 12; }
      for (let k = 0; k < nB; k++, j++) { ROLE[j] = 4; PA[j] = (k / nB) * 6.283; PB[j] = (Math.random() - 0.5) * 16; COL[j] = Math.random() < 0.5 ? 0 : 1; }
    }

    function layout() {
      const r = ag.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
      DPR = Math.min(2, window.devicePixelRatio || 1);
      for (const c of [cv, pc, sc]) { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); }
      bl.width = Math.max(1, Math.round(W / 2)); bl.height = Math.max(1, Math.round(H / 2));
      HZ = Math.round(H * 0.8); // 水平线：下面是倒影
      G.small = W < 640;
      G.rx = Math.min(W * (G.small ? 0.4 : 0.3), 380);
      G.ry = Math.min(G.rx * (G.small ? 0.7 : 0.4), HZ * 0.3);
      G.logo = Math.round(G.small ? 30 : Math.min(54, Math.max(40, G.rx * 0.15)));
      G.fs = Math.round(Math.min(G.rx * (G.small ? 0.62 : 0.56), G.small ? 64 : 118));
      spacing = null;
      assign();
      F.x = P.x = W / 2; F.y = P.y = HZ * 0.5;
    }

    function physics() {
      t += 1 / 60; rot += 0.0013; // 图标环约 80 秒转一圈
      gather += (want - gather) * (want > gather ? 0.03 : 0.045);
      const g = ease(sat(gather)), m = G.logo * 0.6;
      F.x += (clamp(P.x, G.rx + m + 40, W - G.rx - m - 40) - F.x) * 0.085;
      F.y += (clamp(P.y, G.ry + m + 16, HZ - G.ry - m - (G.small ? 18 : 34)) - F.y) * 0.085;
      for (let l = 0; l < NL; l++) { const a = rot + (l / NL) * 6.283, z = Math.sin(a); LX[l] = F.x + Math.cos(a) * G.rx; LY[l] = F.y + z * G.ry; LZ[l] = (z + 1) / 2; }
      const damp = 0.955 - 0.115 * g, spin = 0.0035 * g;
      for (let i = 0; i < N; i++) {
        const x = X[i], y = Y[i], r = ROLE[i];
        // 水流：几层正弦叠成的流场，再用一根很软的弹簧拴在各自的“家”附近，平时铺满画面不扎堆
        let ax = (Math.sin(y * 0.011 + t * 0.35 + PH[i] * 0.3) + Math.sin((x + y) * 0.004 - t * 0.2)) * 0.032 + (HX[i] - x) * 0.0006;
        let ay = (Math.cos(x * 0.009 - t * 0.27) * 0.6 + Math.sin(x * 0.003 + PH[i]) * 0.35) * 0.03 + (HY[i] - y) * 0.0006;
        if (g > 0.002) {
          let tx, ty;
          if (r === 1) { tx = F.x + PA[i] + Math.sin(t * 1.7 + PH[i]) * 0.6; ty = F.y + PB[i] + Math.cos(t * 1.3 + PH[i]) * 0.6; }
          else if (r === 2) { const l = PA[i], a = PB[i] + t * 1.25, rr = G.logo * (0.5 + 0.18 * LZ[l]) + 5 + Math.sin(t * 2.2 + PH[i]) * 1.5; tx = LX[l] + Math.cos(a) * rr; ty = LY[l] + Math.sin(a) * rr; }
          else if (r === 3) { const a = PA[i] + t * 0.38; tx = F.x + Math.cos(a) * (G.rx + PB[i]); ty = F.y + Math.sin(a) * (G.ry + PB[i] * 0.4); }
          else if (r === 4) { const a = -(PA[i] + t * 0.22); tx = F.x + Math.cos(a) * (G.rx * 1.16 + PB[i]); ty = F.y + Math.sin(a) * (G.ry * 1.25 + PB[i] * 0.4); }
          else { const a = PA[i] + t * 0.04; tx = F.x + Math.cos(a) * G.rx * PB[i] + Math.sin(t * 0.5 + PH[i]) * 16; ty = F.y + Math.sin(a) * G.ry * PB[i] * 1.15 + Math.cos(t * 0.4 + PH[i]) * 10; }
          const dx = tx - x, dy = ty - y, k = (r ? KS[i] : KS[i] * 0.2) * g, keep = r ? 1 - g : 1 - g * 0.6;
          ax = ax * keep + dx * k; ay = ay * keep + dy * k;
          const d2 = dx * dx + dy * dy;
          if (d2 > 2500) { const s = spin * Math.min(1, d2 / 60000); ax -= dy * s; ay += dx * s; } // 远处的光点打着旋飞进来
        }
        let vx = VX[i] * damp + ax, vy = VY[i] * damp + ay;
        const sp = vx * vx + vy * vy; if (sp > 900) { const f = 30 / Math.sqrt(sp); vx *= f; vy *= f; }
        VX[i] = vx; VY[i] = vy; X[i] = x + vx; Y[i] = y + vy;
        if (g < 0.35 && (X[i] < -60 || X[i] > W + 60 || Y[i] < -60 || Y[i] > HZ + 40)) { X[i] = HX[i]; Y[i] = HY[i]; VX[i] = VY[i] = 0; } // 飞太远就回家
      }
    }

    function logo(l, g) {
      const a = sat((g - 0.2 - l * 0.025) / 0.45);
      if (a <= 0) return;
      const z = LZ[l], s = G.logo * (0.74 + 0.36 * z) * (0.65 + 0.35 * ease(a)), x = LX[l], y = LY[l], L = logos[l];
      sx.globalAlpha = a * (0.45 + 0.55 * z);
      sx.globalCompositeOperation = "lighter"; sx.drawImage(glow[l], x - s * 1.25, y - s * 1.25, s * 2.5, s * 2.5); sx.globalCompositeOperation = "source-over";
      if (L.ok) sx.drawImage(L.img, x - s / 2, y - s / 2, s, s);
      else { sx.fillStyle = "rgba(40,60,130,.9)"; sx.fillRect(x - s / 2, y - s / 2, s, s); }
      if (!G.small) { sx.font = `500 11.5px ${FONT}`; sx.textAlign = "center"; sx.textBaseline = "top"; sx.fillStyle = "rgba(205,222,255,.92)"; sx.fillText(L.name, x, y + s / 2 + 7); }
      sx.globalAlpha = 1;
    }
    function name(g) {
      const a = sat((g - 0.55) / 0.35);
      if (a <= 0) return;
      const f1 = Math.max(11, Math.round(G.fs * 0.12)), y0 = F.y + G.fs * 0.42, txt = "AI TOKEN STATION", font = `600 ${f1}px ${FONT}`;
      sx.globalAlpha = a; sx.textBaseline = "middle"; sx.font = font; sx.fillStyle = "#dbe8ff"; sx.textAlign = "left";
      if (!spacing) { const ws = [...txt].map((ch) => sx.measureText(ch).width), sp = f1 * 0.42; spacing = { ws, sp, total: ws.reduce((p, q) => p + q, 0) + sp * (txt.length - 1) }; }
      let x = F.x - spacing.total / 2;
      [...txt].forEach((ch, i) => { sx.fillText(ch, x, y0); x += spacing.ws[i] + spacing.sp; });
      sx.textAlign = "center";
      if (!G.small) { sx.font = `400 ${Math.max(11, Math.round(f1 * 0.95))}px ${FONT}`; sx.fillStyle = "rgba(160,186,235,.92)"; sx.fillText("硅基词元 · 你的第一台个人 AI 主机", F.x, y0 + f1 * 1.9); }
      sx.globalAlpha = 1;
    }

    const paths = () => Array.from({ length: NC * 2 }, () => new Path2D());
    function render() {
      const g = ease(sat(gather));
      // 1. 粒子层：按颜色和明暗分桶，一桶一次填充；跑得快的光点拖出光丝
      px.setTransform(DPR, 0, 0, DPR, 0, 0); px.globalCompositeOperation = "source-over"; px.globalAlpha = 1; px.clearRect(0, 0, W, H);
      const sq = paths(), st = paths(), tw = t * 3.1;
      for (let i = 0; i < N; i++) {
        const x = X[i], y = Y[i];
        if (x < -30 || x > W + 30 || y < -30 || y > HZ + 4) continue;
        const b = COL[i] * 2 + (Math.sin(tw + PH[i] * 5) > (ROLE[i] === 1 ? -0.6 : 0.3) ? 1 : 0), vx = VX[i], vy = VY[i], s = SZ[i];
        if (vx * vx + vy * vy > 2.2) { st[b].moveTo(x - vx * 2.6, y - vy * 2.6); st[b].lineTo(x, y); }
        sq[b].rect(x - s / 2, y - s / 2, s, s);
      }
      px.globalCompositeOperation = "lighter"; px.lineWidth = 1.1; px.lineCap = "round";
      for (let b = 0; b < NC * 2; b++) { px.globalAlpha = b & 1 ? 1 : 0.5; px.fillStyle = px.strokeStyle = COLS[b >> 1]; px.stroke(st[b]); px.fill(sq[b]); }
      px.globalAlpha = 1;
      // 2. 辉光层：粒子层缩小一半，交给 CSS 模糊后叠在上面
      bctx.clearRect(0, 0, bl.width, bl.height); bctx.drawImage(pc, 0, 0, bl.width, bl.height);
      // 3. 合成层：核心光晕 → 后排图标 → 粒子 → 前排图标 → 产品名
      sx.setTransform(1, 0, 0, 1, 0, 0); sx.globalCompositeOperation = "source-over"; sx.globalAlpha = 1; sx.clearRect(0, 0, sc.width, sc.height);
      sx.setTransform(DPR, 0, 0, DPR, 0, 0);
      if (g > 0.01) {
        sx.save(); sx.translate(F.x, F.y); sx.scale(1, 0.56);
        const rg = sx.createRadialGradient(0, 0, 0, 0, 0, G.rx * 1.15);
        rg.addColorStop(0, `rgba(70,120,255,${0.26 * g})`); rg.addColorStop(0.55, `rgba(40,80,230,${0.08 * g})`); rg.addColorStop(1, "rgba(30,60,200,0)");
        sx.fillStyle = rg; sx.fillRect(-G.rx * 1.2, -G.rx * 1.2, G.rx * 2.4, G.rx * 2.4); sx.restore();
      }
      const ta = sat((g - 0.35) / 0.4);
      if (ta > 0 && ghost) { sx.globalAlpha = 0.55 * ta; sx.globalCompositeOperation = "lighter"; sx.drawImage(ghost, F.x - ghost.width / 2, F.y - G.fs * 0.16 - ghost.height / 2); sx.globalCompositeOperation = "source-over"; sx.globalAlpha = 1; }
      const order = Array.from({ length: NL }, (_, l) => l).sort((a, b) => LZ[a] - LZ[b]);
      for (const l of order) if (LZ[l] < 0.5) logo(l, g);
      sx.setTransform(1, 0, 0, 1, 0, 0); sx.globalCompositeOperation = "lighter"; sx.drawImage(pc, 0, 0); sx.globalCompositeOperation = "source-over";
      sx.setTransform(DPR, 0, 0, DPR, 0, 0);
      for (const l of order) if (LZ[l] >= 0.5) logo(l, g);
      name(g);
      // 4. 上屏 + 水面倒影：一条条错开的细带，越往下越淡
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(sc, 0, 0);
      const hz = Math.round(HZ * DPR), sh = Math.max(2, Math.round(2 * DPR)), n = Math.ceil((cv.height - hz) / sh);
      for (let k = 0; k < n; k++) {
        const sy = hz - (k + 1) * sh * 1.2; if (sy < 0) break;
        ctx.globalAlpha = 0.42 * Math.pow(1 - k / n, 1.6);
        ctx.drawImage(sc, 0, sy, sc.width, sh * 1.2, Math.sin(k * 0.5 + t * 2.3) * (0.8 + k * 0.05) * DPR, hz + k * sh, cv.width, sh);
      }
      ctx.globalAlpha = 1; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const lg = ctx.createLinearGradient(0, 0, W, 0);
      lg.addColorStop(0, "rgba(90,150,255,0)"); lg.addColorStop(0.5, `rgba(130,195,255,${0.16 + 0.22 * g})`); lg.addColorStop(1, "rgba(90,150,255,0)");
      ctx.fillStyle = lg; ctx.fillRect(0, HZ, W, 1);
    }

    function scatter() { // 鼠标离开：光点从中心向外炸开，再回到水流里
      for (let i = 0; i < N; i++) { const dx = X[i] - F.x, dy = Y[i] - F.y, d = Math.hypot(dx, dy) || 1, f = 1.5 + Math.random() * 4.5; VX[i] += (dx / d) * f; VY[i] += (dy / d) * f * 0.6; }
    }
    function still() { want = gather = 1; P.x = W / 2; P.y = HZ * 0.5; for (let s = 0; s < 260; s++) physics(); render(); }
    function frame(now) {
      raf = 0;
      if (!inView || document.hidden) return;
      const dt = last ? Math.min(100, now - last) : 16.7; last = now; acc += dt;
      let n = 0; while (acc >= 16.6 && n < 3) { physics(); acc -= 16.6; n++; } // 固定 60 步/秒，高刷屏也不会变快
      if (acc > 50) acc = 0;
      if (n) render();
      raf = requestAnimationFrame(frame);
    }
    const kick = () => { if (!raf && inView && !document.hidden && !reduce) { last = 0; raf = requestAnimationFrame(frame); } };

    const pos = (e) => { const r = ag.getBoundingClientRect(); P.x = e.clientX - r.left; P.y = e.clientY - r.top; };
    if (fine) {
      const on = (e) => { pos(e); P.on = true; if (!want) { want = 1; ag.classList.add("is-on"); } };
      ag.addEventListener("pointerenter", on); ag.addEventListener("pointermove", on);
      ag.addEventListener("pointerleave", () => { P.on = false; want = 0; ag.classList.remove("is-on"); scatter(); });
    } else {
      if (hint) hint.textContent = "轻点画面，光点会聚到你点的地方";
      ag.addEventListener("pointerdown", pos);
    }
    new IntersectionObserver((es) => es.forEach((e) => {
      inView = e.isIntersecting;
      if (!inView) return;
      loadLogos();
      if (reduce) return;
      if (!fine && !want) { want = 1; ag.classList.add("is-on"); }
      kick();
    }), { threshold: 0.12 }).observe(ag);
    document.addEventListener("visibilitychange", kick);
    new ResizeObserver(() => { const r = ag.getBoundingClientRect(); if (Math.round(r.width) === W && Math.round(r.height) === H) return; layout(); if (reduce) still(); }).observe(ag);
    ag.classList.add("ag-live");
    layout();
    if (reduce) { ag.classList.add("is-on"); loadLogos(); still(); }
  })();
})();
