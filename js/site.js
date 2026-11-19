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

  // ---------- 加入社群：两道题 ----------
  const join = $("[data-join]");
  if (join) {
    let p = "";
    const go = (pp, w = "") => { track("path_select", { p: pp, state: w }); cp.p = pp; cp.t = Date.now(); localStorage.setItem("stk_cp", JSON.stringify(cp)); location.href = `${BASE}/join/${pp}${STATIC ? "/" : ""}?ch=${encodeURIComponent(cp.ch || "direct")}${w ? "&w=" + w : ""}`; };
    $$(".q1 .opt", join).forEach((o) => o.addEventListener("click", () => {
      p = o.dataset.p; $$(".q1 .opt", join).forEach((x) => x.classList.toggle("on", x === o));
      if (p === "biz") return go(p, "business");
      $(".q2", join).hidden = false; $(".q2", join).scrollIntoView({ behavior: "smooth", block: "center" });
    }));
    $$(".q2 .opt", join).forEach((o) => o.addEventListener("click", () => p && go(p, o.dataset.w)));
    if (cp.p) {
      const known = $$(".q1 .opt", join).find((o) => o.dataset.p === cp.p);
      if (known) { $(".q-skip", join).hidden = false; $("[data-known]", join).textContent = known.querySelector("b").textContent; $("[data-goknown]", join).addEventListener("click", (e) => { e.preventDefault(); go(cp.p); }); }
    }
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
    $$("[data-sample]").forEach((b) => b.addEventListener("click", () => { ta.value = b.dataset.sample; ta.focus(); }));
    const caseIdx = new URLSearchParams(location.search).get("case");
    if (caseIdx !== null && !ta.value.trim()) {
      const o = $$(".chip-o")[Number(caseIdx)];
      if (o) ta.value = o.dataset.sample;
    }
    const lines = [];
    const say = (s) => { lines.push(`[${new Date().toTimeString().slice(0, 8)}] ${s}`); log.textContent = lines.slice(-9).join("\n"); };
    const fail = (m) => { err.textContent = m; err.hidden = false; go.disabled = false; go.textContent = "生成 5 秒视频"; };
    go.addEventListener("click", async () => {
      err.hidden = true;
      const prompt = ta.value.trim();
      if (prompt.length < 4) return fail("先写一句画面描述。");
      go.disabled = true; go.textContent = "生成中…";
      $(".screen-idle").hidden = true; out.hidden = true; log.hidden = false; pbar.hidden = false; lines.length = 0;
      say("提交任务 · MiniMax H3 标准生成 · 864×480 · 5 秒");
      if (STATIC) { // 静态版没有后端：在浏览器里走一遍流程，最后播放官方示例
        say("演示模式：网页版不连机器，流程走完后播放 MiniMax 官方示例");
        const t0 = Date.now();
        let lastStep = -1;
        const tick = setInterval(() => {
          const pct = Math.min(100, Math.round(((Date.now() - t0) / 8000) * 100));
          $("i", pbar).style.width = pct + "%";
          const step = Math.floor(pct / 25);
          if (pct < 100) { if (step !== lastStep) { lastStep = step; say(`渲染中 ${pct}%`); } return; }
          clearInterval(tick);
          say("完成（演示）");
          out.src = trial.dataset.mocksrc; out.hidden = false; log.hidden = true; pbar.hidden = true; out.play().catch(() => {});
          go.disabled = false; go.textContent = "加入共创，用真机跑";
          go.onclick = () => { location.href = `${BASE}/join/`; };
          track("trial_success");
        }, 400);
        return;
      }
      let r;
      try {
        r = await fetch("/api/trial", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, token: document.body.dataset.token, ch: cp.ch, p: cp.p }) });
      } catch { return fail("网络出错了，稍后再试。"); }
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { if (d.quotaOut) openModal(); say("未提交：" + (d.error || r.status)); return fail(d.error || "提交失败"); }
      showQuota(d.quota);
      say(d.mock ? "模拟模式：走完整流程，最后返回官方示例视频" : "已分配到 Siltok 远程机器");
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
})();
