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

  // ---------- 创作者档案：6 道题 → 推荐群 + 复制档案 + 飞书表单预填 ----------
  // 答案只存在本机浏览器（stk_profile）；飞书链接只带画像类答案，称呼、微信号让用户在飞书里自己填。
  const prof = $("[data-profile]");
  if (prof) {
    const pq = $("[data-pq]", prof), pr = $("[data-pr]", prof), Qs = $$(".pq-q", prof);
    const stepEl = $("[data-pq-step]", prof), pbar = $("[data-pq-bar]", prof), back = $("[data-pq-back]", prof);
    const nextMap = JSON.parse(prof.dataset.next || "{}");
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
        fa.href = form + (form.includes("?") ? "&" : "?") + ps.toString(); fa.textContent = "填完整档案 ↗";
        note.textContent = "会打开飞书表单：你的选择已经帮你填好，只需补称呼、微信号和城市。";
      } else if (lv === "L4") { fa.href = prof.dataset.biz; fa.textContent = "填写合作报价 ↗"; note.textContent = "会打开飞书合作报价表，商务会跟进。"; }
      else { fa.href = prof.dataset.beta; fa.textContent = "填写内测申请 ↗"; note.textContent = "会打开飞书内测申请表，按里面的问题填写就行。"; }
      $("[data-pr-staff]", pr).href = `${BASE}/join/${p}${STATIC ? "/" : ""}?ch=${encodeURIComponent(cp.ch || "direct")}`;
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
    $("[data-pr-redo]", pr).addEventListener("click", () => { localStorage.removeItem("stk_profile"); restoreMarks({}); pr.hidden = true; pq.hidden = false; show(0); });
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
})();
