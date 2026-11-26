/* Siltok 技能图鉴 · 页面逻辑。数据：window.SILTOK_SKILLS（data/skills.js，由 scripts/build-data.mjs 生成）；画：window.SG_ART（assets/art.js）。
   页面里放哪些块由 [data-sg="..."] 占位决定（nav / stats / filter / map / legend / spot / domains / lab / restricted / foot），
   以后嵌进邀请站时只放需要的占位即可。根元素 .sg 上的 data-site 是邀请站根地址，用来拼“加入共创”链接；
   data-full 是完整图鉴页地址（只嵌了地图的页面用：点领域、点“需自行安装”跳过去）；data-hide 列出先不显示的内容（领域 id、restricted、counts）。
   查找元素都限定在 .sg 里面，不碰站点其他部分。 */
(() => {
  "use strict";
  const D = window.SILTOK_SKILLS, A = window.SG_ART;
  const root = document.querySelector(".sg") || document.body;
  if (!D || !A) {
    root.insertAdjacentHTML("afterbegin", '<p style="padding:24px;font:15px/1.6 sans-serif">没读到图鉴数据。先在 siltok-skill-gallery 文件夹里运行：node scripts/build-data.mjs</p>');
    return;
  }

  // ── 小工具
  const $ = (s, el = root) => el.querySelector(s);
  const $$ = (s, el = root) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ico = (k, cls = "") => `<svg class="sg-i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${A.glyph[k] || A.glyph.box}</svg>`;
  const fmtStars = (n) => (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "") + "k" : String(n || 0));
  // data-site：有这个属性才显示“加入共创”。绝对地址（独立图鉴页）开新标签；相对地址（嵌在邀请站里，如 "/" 或 "/siltok-cocreate"）在本页打开
  const SITE = root.hasAttribute("data-site") ? root.dataset.site.replace(/\/$/, "") : null;
  const SITE_EXT = /^https?:/i.test(SITE || "") ? ' target="_blank" rel="noopener"' : "";
  // data-full：本页没有对应分区时，链到完整图鉴页的同名位置
  const FULL = root.dataset.full || "";
  const secHref = (id) => (document.getElementById(id) || !FULL ? "" : FULL) + "#" + id;
  // data-hide：先不显示的内容，空格或逗号分隔。写领域 id 就藏掉这个领域（h3 连同其他领域里标了 H3 的技能一起藏）；
  // restricted：需自行安装的受限项目；counts：各种数量（几个技能、几个预装……），地图上改写领域的英文关键词
  const HIDE = new Set((root.dataset.hide || "").split(/[\s,]+/).filter(Boolean));
  const NOCOUNT = HIDE.has("counts");
  const TIER ={ preinstall: ["预装", "pre"], recommended: ["推荐", "rec"], optional: ["备选", "opt"] };
  const RUN = {
    l: ["本机可跑", "house", "不需要云端 API，在你的机器上就能跑"],
    m: ["部分要云 API", "cloud", "核心在本机，部分环节要云端 API 或 Key"],
    c: ["要云 API / 账号", "cloud", "主要功能依赖云端服务或账号"],
  };
  const SHORT = { film: "影视", animation: "动画", h3: "H3", video: "视频", design: "设计", marketing: "营销", office: "办公", finance: "财经", general: "工具" };
  const LICCLS = { pending: "pending", copyleft: "copyleft", none: "none", custom: "custom" };
  const DOMS = D.domains.filter((d) => !HIDE.has(d.id));
  const SKILLS = D.skills.filter((s) => !HIDE.has(s.domain) && !(s.h3 && HIDE.has("h3")));
  const RESTR = HIDE.has("restricted") ? [] : D.restricted.filter((r) => !HIDE.has(r.domain));
  const dom = Object.fromEntries(D.domains.map((d) => [d.id, d]));
  const model = Object.fromEntries(D.models.map((m) => [m.id, m]));
  const byId = new Map(SKILLS.map((s) => [s.id, s]));
  const rById = new Map(RESTR.map((r) => [r.id, r]));
  const TORD = { preinstall: 0, recommended: 1, optional: 2 };
  const byDom = Object.fromEntries(DOMS.map((d) => [d.id, []]));
  for (const s of SKILLS) (byDom[s.domain] ||= []).push(s);
  for (const k in byDom) byDom[k].sort((a, b) => TORD[a.tier] - TORD[b.tier] || b.stars - a.stars);
  const tally = (list) => ({ pre: list.filter((s) => s.tier === "preinstall").length, rec: list.filter((s) => s.tier === "recommended").length, opt: list.filter((s) => s.tier === "optional").length });
  const domStatus = (id) => (byDom[id].some((s) => s.models.length) ? "live" : byDom[id].some((s) => s.bridge) ? "plan" : "none");
  const hasKey = (s) => s.envKeys.length > 0 || s.keys.length > 0 || /Key|API|账号|Token|AccessKey/i.test(s.needs + s.hint);
  const tierN = (k) => SKILLS.filter((s) => s.tier === k).length; // 按实际显示的技能现算，什么都不藏时和 D.meta.counts 一致
  const C = { all: SKILLS.length, preinstall: tierN("preinstall"), recommended: tierN("recommended"), optional: tierN("optional"), restricted: RESTR.length };

  // ── 筛选
  const state = { tier: "all", local: false, q: "" };
  const hay = (s) => (s._hay ||= [s.name, s.tag, s.does, s.repo, s.example, s.output, s.subskills.join(" "), dom[s.domain].name].join(" ").toLowerCase());
  const matches = (s) => (state.tier === "all" || s.tier === state.tier) && (!state.local || s.run === "l") && (!state.q || hay(s).includes(state.q));
  const filtering = () => state.tier !== "all" || state.local || !!state.q;

  // ── 卡片缩略图：按 id 生成的图案（同一个技能每次一样）
  function thumb(s, big) {
    let h = 2166136261;
    for (const ch of s.id) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    const r = () => ((h = (Math.imul(h, 1664525) + 1013904223) >>> 0) / 4294967296);
    const pid = "sgp-" + s.id + (big ? "-b" : "");
    const type = h % 5, sz = 12 + Math.floor(r() * 8), rot = [0, 30, 45, 60, -30][Math.floor(r() * 5)];
    let def = "", deco = "";
    if (type === 0) def = `<pattern id="${pid}" width="${sz}" height="${sz}" patternUnits="userSpaceOnUse"><circle cx="${sz / 2}" cy="${sz / 2}" r="1.7" fill="currentColor" opacity=".38"/></pattern>`;
    else if (type === 1) def = `<pattern id="${pid}" width="${sz}" height="${sz}" patternUnits="userSpaceOnUse" patternTransform="rotate(${rot})"><path d="M0 0V${sz}" stroke="currentColor" stroke-width="2.2" opacity=".2"/></pattern>`;
    else if (type === 2) { const g = sz * 1.6; def = `<pattern id="${pid}" width="${g}" height="${g}" patternUnits="userSpaceOnUse"><path d="M${g} 0H0V${g}" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".28"/></pattern>`; }
    else if (type === 3) { const cx = 30 + r() * 260, cy = r() * 112; for (let i = 1; i <= 6; i++) deco += `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${i * 22}" fill="none" stroke="currentColor" stroke-width="1.6" opacity="${(0.36 - i * 0.045).toFixed(2)}"/>`; }
    else for (let i = 0; i < 4; i++) { const y = (20 + i * 25 + r() * 6).toFixed(0); deco += `<path d="M-10 ${y}q20-14 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0" fill="none" stroke="currentColor" stroke-width="2.2" opacity="${(0.14 + i * 0.05).toFixed(2)}"/>`; }
    const bx = (r() * 320).toFixed(0), by = (r() * 112).toFixed(0), br = (36 + r() * 44).toFixed(0);
    return `<svg class="sg-pat" viewBox="0 0 320 112" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${def ? `<defs>${def}</defs><rect width="320" height="112" fill="url(#${pid})"/>` : ""}${deco}<circle cx="${bx}" cy="${by}" r="${br}" fill="currentColor" opacity=".13"/></svg>`;
  }

  // ── 技能卡
  function card(s) {
    const d = dom[s.domain], [tl, tc] = TIER[s.tier], run = RUN[s.run] || RUN.l;
    const mods = s.models.map((m) => model[m]?.name || m).join("、");
    const badges = [
      `<span class="sg-b" title="${run[0]}：${run[2]}">${ico(run[1])}</span>`,
      hasKey(s) ? `<span class="sg-b" title="要准备 Key 或账号">${ico("key")}</span>` : "",
      s.models.length ? `<span class="sg-b hl" title="能直接配合本机的 ${esc(mods)}">${ico("chip")}</span>` : "",
      s.bridge ? `<span class="sg-b hl" title="可改接本机模型（自研“本地模型直连”，规划中）">${ico("plug")}</span>` : "",
      s.reviewed ? "" : `<span class="sg-b warn" title="代码还没审查过">${ico("warn")}</span>`,
    ].join("");
    return `<button class="sg-card" type="button" data-id="${s.id}" style="--c:${d.c};--t:${d.t}" aria-label="${esc(s.name)}，${tl}${s.pending ? "（待授权）" : ""}：${esc(s.tag)}">
<span class="sg-thumb">${thumb(s)}<span class="sg-glyph">${ico(s.icon)}</span><span class="sg-tier ${tc}">${tl}${s.pending ? "<em>待授权</em>" : ""}</span>${s.h3 && s.domain !== "h3" ? '<span class="sg-h3b">H3</span>' : ""}</span>
<span class="sg-cbody"><span class="sg-name">${esc(s.name)}</span><span class="sg-tag">${esc(s.tag)}</span>
<span class="sg-cfoot"><span class="sg-badges">${badges}</span><span class="sg-meta">${ico("star")}${fmtStars(s.stars)} · ${esc(s.lic)}</span></span></span></button>`;
  }

  // ── 导航、数字、筛选条、图例
  function renderNav() {
    const el = $('[data-sg="nav"]');
    if (!el) return;
    el.innerHTML = `<a href="#sg-map" data-nav="sg-map">地图</a>` +
      DOMS.map((d) => `<a href="#d-${d.id}" data-nav="d-${d.id}" class="${d.id === "h3" ? "is-h3" : ""}">${esc(d.short || SHORT[d.id] || d.name.slice(0, 2))}</a>`).join("") +
      `<a href="#sg-lab" data-nav="sg-lab">自研</a>` + (RESTR.length ? `<a href="#sg-restricted" data-nav="sg-restricted">自行安装</a>` : "");
  }
  function renderStats() {
    const el = $('[data-sg="stats"]');
    if (!el) return;
    if (NOCOUNT) { el.hidden = true; return; } // 这一块就是数字，不写数量时整块不显示
    const item = (n, label, k, attr) => `<button class="sg-stat" type="button" ${attr}><b>${n}</b><span><span class="sg-key"><i class="${k}"></i></span>${label}</span></button>`;
    el.innerHTML = item(C.preinstall, "预装 · 随机器带", "k-pre", 'data-jump-tier="preinstall"') + item(C.recommended, "推荐 · 自己选装", "k-rec", 'data-jump-tier="recommended"') +
      item(C.optional, "备选 · 暂不收录", "k-opt", 'data-jump-tier="optional"') +
      (RESTR.length ? `<a class="sg-stat" href="${secHref("sg-restricted")}"><b>${C.restricted}</b><span>${ico("lock")}需自行安装</span></a>` : "");
  }
  function renderFilter() {
    const el = $('[data-sg="filter"]');
    if (!el) return;
    const seg = [["all", "全部", C.all], ["preinstall", "预装", C.preinstall], ["recommended", "推荐", C.recommended], ["optional", "备选", C.optional]]
      .map(([k, t, n]) => `<button type="button" data-tier="${k}" aria-pressed="${state.tier === k}">${t}${NOCOUNT ? "" : `<span>${n}</span>`}</button>`).join("");
    el.innerHTML = `<div class="sg-seg" role="group" aria-label="按档位筛选">${seg}</div>
<label class="sg-toggle"><input type="checkbox" data-local> 只看本机可跑</label>
<label class="sg-search">${ico("search")}<input type="search" data-q placeholder="搜技能、用途或仓库" aria-label="搜索技能"></label>`;
  }
  function renderLegend() {
    const el = $('[data-sg="legend"]');
    if (!el) return;
    el.innerHTML = `<span class="sg-key"><i class="k-pre"></i>预装</span><span class="sg-key"><i class="k-rec"></i>推荐</span><span class="sg-key"><i class="k-opt"></i>备选</span>
<span class="sg-key"><i class="k-hl"></i>能配合 / 将改接本机模型</span><span><span class="sg-ln"></span> 已有技能配合本机模型</span><span><span class="sg-ln is-plan"></span> 自研直连后改接（规划中）</span>
${RESTR.length ? `<a class="sg-legend-lock" href="${secHref("sg-restricted")}">${ico("lock")}需自行安装${NOCOUNT ? "的" : ` ${C.restricted} 个`}，单独放${ico("arrow")}</a>` : ""}`;
  }

  // ── 全景技能地图（SVG，宽屏是环形，窄屏是竖排）
  function renderMap(force) {
    const host = $('[data-sg="map"]');
    if (!host) return;
    const wide = host.clientWidth >= 760, mode = wide ? "w" : "t";
    if (!force && host.dataset.mode === mode) return;
    host.dataset.mode = mode;
    const W = wide ? 1240 : 440, H = wide ? 800 : 1250;
    const c = wide ? { x: 620, y: 410 } : { x: 220, y: 236 };
    const RC = wide ? 128 : 120, RR = wide ? 172 : 160, CW = wide ? 108 : 104;
    // 9 个领域用原来的角度；藏掉领域后按个数均分一圈（从正左开始），窄屏最后一行不满 3 个时居中
    const ang = DOMS.length === 9 ? [190, 230, 270, 310, 350, 30, 70, 110, 150] : DOMS.map((_, i) => (180 + (i * 360) / DOMS.length) % 360);
    let spokes = "", nodes = "", dots = "", n = 0;
    DOMS.forEach((d, i) => {
      const list = byDom[d.id], t = tally(list), st = domStatus(d.id), isH3 = d.id === "h3";
      let p;
      if (wide) { const a = (ang[i % ang.length] * Math.PI) / 180, cs = Math.cos(a); p = { x: c.x + 392 * cs, y: c.y + 258 * Math.sin(a), side: cs < -0.2 ? "l" : "r" }; }
      else { const inRow = Math.min(3, DOMS.length - Math.floor(i / 3) * 3); p = { x: 78 + (i % 3) * 142 + (3 - inRow) * 71, y: 520 + Math.floor(i / 3) * 240, side: "b" }; }
      const r = isH3 ? (wide ? 52 : 46) : wide ? 40 : 36;
      if (wide) {
        const dx = p.x - c.x, dy = p.y - c.y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
        const seg = `M${(c.x + ux * (RR + 9)).toFixed(1)} ${(c.y + uy * (RR + 9)).toFixed(1)}L${(p.x - ux * (r + 10)).toFixed(1)} ${(p.y - uy * (r + 10)).toFixed(1)}`;
        if (st !== "none") spokes += `<path class="sg-m-spoke-band ${st === "plan" ? "is-plan" : ""}" d="${seg}"/>`;
        spokes += `<path class="sg-m-spoke is-${st}" d="${seg}"/>`;
      }
      const ring = st === "live" ? `<circle class="sg-m-live" cx="${p.x}" cy="${p.y}" r="${r + 5}"/>` : st === "plan" ? `<circle class="sg-m-plan" cx="${p.x}" cy="${p.y}" r="${r + 5}"/>` : "";
      const body = isH3
        ? `<circle class="sg-m-pulse" cx="${p.x}" cy="${p.y}" r="${r + 4}"/><circle class="sg-m-h3" cx="${p.x}" cy="${p.y}" r="${r}"/><text class="sg-m-h3tx" x="${p.x}" y="${p.y + 13}" text-anchor="middle">H3</text>`
        : `<circle class="sg-m-node" cx="${p.x}" cy="${p.y}" r="${r}"/><g class="sg-m-glyph" transform="translate(${(p.x - 15).toFixed(1)} ${(p.y - 15).toFixed(1)}) scale(1.25)">${A.glyph[d.i] || ""}</g>`;
      let tx, ty, anchor;
      if (p.side === "b") { anchor = "middle"; tx = p.x; ty = p.y + r + 28; }
      else if (p.side === "r") { anchor = "start"; tx = p.x + r + 18; ty = p.y - 12; }
      else { anchor = "end"; tx = p.x - r - 18; ty = p.y - 12; }
      const meta = NOCOUNT ? esc(d.eyebrow.split(" · ").slice(0, 2).join(" · ")) : `${list.length} 个 · ${t.pre} 预装`;
      const label = NOCOUNT ? `${esc(d.name)}：点开看这个领域的技能` : `${esc(d.name)}：${list.length} 个技能，预装 ${t.pre}、推荐 ${t.rec}、备选 ${t.opt}`;
      nodes += `<g class="sg-m-dom" data-dom="${d.id}" tabindex="0" role="link" aria-label="${label}">${ring}${body}
<text class="sg-m-name" x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="${anchor}">${esc(d.name)}</text><text class="sg-m-meta" x="${tx.toFixed(1)}" y="${(ty + 19).toFixed(1)}" text-anchor="${anchor}">${meta}</text></g>`;
      const PER = 9, G = 12.5;
      list.forEach((s, k) => {
        const row = Math.floor(k / PER), col = k % PER, inRow = Math.min(PER, list.length - row * PER);
        const x = anchor === "start" ? tx + 5 + col * G : anchor === "end" ? tx - 5 - (inRow - 1 - col) * G : tx - ((inRow - 1) * G) / 2 + col * G;
        const y = ty + 37 + row * G, cls = TIER[s.tier][1], delay = 200 + n++ * 9;
        if (s.bridge || s.models.length) dots += `<circle class="sg-dot-halo" data-halo="${s.id}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7.4" style="--d:${delay}ms"/>`;
        dots += `<circle class="sg-dot-s sg-dot-${cls}" data-skill="${s.id}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${cls === "opt" ? 3.4 : 4.6}" style="--d:${delay}ms"/>`;
      });
    });
    const chips = D.models.slice(0, 4).map((m, k) => {
      const x = c.x + (k % 2 ? 4 : -CW - 4), y = c.y + (k < 2 ? -22 : 16);
      return `<rect class="sg-m-chip ${m.hl ? "is-hl" : ""}" x="${x}" y="${y}" width="${CW}" height="30" rx="15"/><text class="sg-m-chiptx ${m.hl ? "is-hl" : ""}" x="${x + CW / 2}" y="${y + 19.5}" text-anchor="middle">${esc(m.name)}</text>`;
    }).join("");
    const a1 = RC + 18, a2 = RC + 22;
    const core = `<circle class="sg-m-ring-band" cx="${c.x}" cy="${c.y}" r="${RR}"/><circle class="sg-m-ring" cx="${c.x}" cy="${c.y}" r="${RR}"/>
<circle class="sg-m-core" cx="${c.x}" cy="${c.y}" r="${RC}"/>
<path id="sgArcTop" d="M${c.x - a1} ${c.y}a${a1} ${a1} 0 0 1 ${a1 * 2} 0" fill="none"/><path id="sgArcBot" d="M${c.x - a2} ${c.y}a${a2} ${a2} 0 0 0 ${a2 * 2} 0" fill="none"/>
<text class="sg-m-arc is-strong"><textPath href="#sgArcTop" startOffset="50%" text-anchor="middle">本地模型直连 · 自研方向 · 规划中</textPath></text>
<text class="sg-m-arc"><textPath href="#sgArcBot" startOffset="50%" text-anchor="middle">统一调本机 H3 · LTX · Z-IMAGE · SENSENOVA</textPath></text>
<text class="sg-m-core-k" x="${c.x}" y="${c.y - 66}" text-anchor="middle">SILTOK MACHINE</text><text class="sg-m-core-t" x="${c.x}" y="${c.y - 38}" text-anchor="middle">本机模型</text>
${chips}<text class="sg-m-core-s" x="${c.x}" y="${c.y + 76}" text-anchor="middle">素材不出本机</text>`;
    host.innerHTML = `<svg class="sg-map ${wide ? "" : "is-tall"}" viewBox="0 0 ${W} ${H}" role="img" aria-label="技能地图：中间是本机模型，外圈是${NOCOUNT ? "各个" : ` ${DOMS.length} 个`}领域，每个点是一个技能">${spokes}${core}${nodes}${dots}</svg><div class="sg-tip" role="tooltip"></div>`;
    updateMapDots();
  }
  function updateMapDots() {
    for (const el of $$("[data-skill],[data-halo]")) {
      const s = byId.get(el.dataset.skill || el.dataset.halo);
      if (s) el.classList.toggle("is-off", !matches(s));
    }
  }
  function mapTip(e) {
    const host = $('[data-sg="map"]'), tip = host && $(".sg-tip", host);
    if (!tip) return;
    const t = e.target.closest("[data-skill],[data-dom]");
    if (!t || !host.contains(t)) { tip.classList.remove("is-on"); return; }
    let html;
    if (t.dataset.skill) {
      const s = byId.get(t.dataset.skill);
      html = `<b>${esc(s.name)}</b><small>${TIER[s.tier][0]}${s.pending ? " · 待授权" : ""} · ${esc(s.tag)}</small>`;
    } else {
      const d = dom[t.dataset.dom], k = tally(byDom[d.id]);
      html = `<b>${esc(d.name)}</b><small>${NOCOUNT ? "点开看这个领域的技能" : `预装 ${k.pre} · 推荐 ${k.rec} · 备选 ${k.opt} · 点开看全部`}</small>`;
    }
    const b = host.getBoundingClientRect();
    tip.innerHTML = html;
    tip.style.left = Math.min(Math.max(e.clientX - b.left, 130), b.width - 130) + "px";
    tip.style.top = e.clientY - b.top + "px";
    tip.classList.add("is-on");
  }

  // ── 两张重点卡
  function renderSpot() {
    const el = $('[data-sg="spot"]');
    if (!el) return;
    const h3 = byDom.h3, bridge = SKILLS.filter((s) => s.bridge); // H3 领域藏掉时只剩“本地模型直连”一张，占整行
    el.innerHTML = `<div class="sg-spot-grid"${h3 ? "" : ' style="grid-template-columns:1fr"'}>
${h3 ? `<article class="sg-spot-card sg-spot-h3 sg-reveal"><div class="sg-eyebrow">MINIMAX H3 · 本机主打模型</div>
<h3>H3 专属技能，<br><em>从提示词到出片</em></h3>
<p>${NOCOUNT ? "" : h3.length + " 组"}技能围绕本机的 MiniMax H3：五种模式的提示词、分镜表演、参考视频反推、ComfyUI 批量出片。官方技能写明不调外部 API。</p>
<ul>${h3.slice(0, 6).map((s) => `<li><button type="button" data-open="${s.id}">${esc(s.name)}</button></li>`).join("")}</ul>
<a class="sg-btn sg-btn-acid" href="#d-h3">看 H3 专属 ${ico("arrow")}</a><span class="sg-spot-big" aria-hidden="true">H3</span></article>` : ""}
<article class="sg-spot-card sg-spot-lab sg-reveal" style="--d:90ms"><svg class="sg-i sg-plug" viewBox="0 0 24 24" aria-hidden="true" style="stroke-width:1.1">${A.glyph.plug}</svg>
<div class="sg-eyebrow">自研方向 · 规划中</div><h3>本地模型<em>直连</em></h3>
<p>现成的生图、生视频、配音技能几乎都写死了云端接口。Siltok 计划做一层直连，让它们统一调本机的 H3、LTX、Z-Image、SenseNova。</p>
${NOCOUNT ? "" : `<div class="sg-spot-num"><b>${bridge.length}</b><span>个现成技能等着改接本机模型</span></div>`}
<a class="sg-btn sg-btn-primary" href="#sg-lab">看自研方向 ${ico("arrow")}</a></article></div>`;
  }

  // ── 领域分区
  function renderDomains() {
    const el = $('[data-sg="domains"]');
    if (!el) return;
    el.innerHTML = DOMS.map((d, i) => {
      const list = byDom[d.id], t = tally(list);
      const join = SITE !== null && d.site ? `<a class="sg-btn sg-btn-ghost sg-btn-sm" href="${SITE}/join/?skill=${encodeURIComponent(d.site)}"${SITE_EXT}>想先用上？加入共创 ${ico("arrow")}</a>` : "";
      return `<section class="sg-sec ${d.dark ? "is-dark" : ""}" id="d-${d.id}" data-domain="${d.id}" style="--c:${d.c};--t:${d.t}" aria-labelledby="h-${d.id}">
<div class="sg-wrap"><div class="sg-sec-head">
<div class="sg-sec-copy sg-reveal"><div class="sg-eyebrow"><span class="sg-sec-no">${String(i + 1).padStart(2, "0")}</span>${esc(d.eyebrow)}</div>
<h2 class="sg-h2" id="h-${d.id}">${d.h2}</h2><p class="sg-sub">${esc(d.lead)}</p>
<div class="sg-verbs">${d.verbs.map((v) => `<span>${esc(v)}</span>`).join("")}</div>
<div class="sg-tally">${NOCOUNT ? "" : `<span><b>${t.pre}</b>预装</span><span><b>${t.rec}</b>推荐</span><span><b>${t.opt}</b>备选</span>`}${join}</div></div>
<figure class="sg-stage sg-reveal" style="--d:120ms" aria-hidden="true">${A.scene[d.id] || ""}${d.id === "h3" ? "" : `<span class="sg-stage-word">${esc(d.en)}</span>`}</figure></div>
<div class="sg-grid" data-grid="${d.id}">${list.map(card).join("")}<p class="sg-empty" hidden>这个领域没有符合筛选条件的技能。</p></div></div></section>`;
    }).join("");
  }

  // ── 自研：本地模型直连
  function renderLab() {
    const el = $('[data-sg="lab"]');
    if (!el) return;
    const others = D.gaps.filter((g) => !g.hl), bridge = SKILLS.filter((s) => s.bridge);
    const chips = `<div class="sg-lab-chips">${[["sparkle", "生图"], ["play", "生视频"], ["mic", "配音"], ["subtitle", "转写"]].map(([i, t]) => `<span>${ico(i)}${t}</span>`).join("")}</div>`;
    el.innerHTML = `<div class="sg-wrap"><div class="sg-shead is-center sg-reveal"><div class="sg-eyebrow">自研方向</div>
<h2 class="sg-h2">本地模型<em>直连</em><span class="sg-tag-plan">规划中</span></h2>
<p class="sg-sub">现成的生图、生视频、配音技能，几乎都写死了 OpenAI、火山方舟、MiniMax 云、ElevenLabs、Suno 这些云端接口。Siltok 计划做一个“本地模型”基础技能，统一调本机模型，再把现成技能逐个改接过来。</p></div>
<div class="sg-lab-stage sg-reveal">
<div class="sg-lab-col is-now"><div class="sg-lab-label">现在</div>${chips}<div class="sg-lab-down"></div>
<div class="sg-clouds">${["OpenAI", "火山方舟", "MiniMax 云", "ElevenLabs", "Suno"].map((x) => `<span>${ico("cloud")}${x}</span>`).join("")}</div>
<div class="sg-lab-note"><span>${ico("key")}自己配 Key</span><span>${ico("upload")}素材传到云端</span><span>${ico("coin")}按量计费</span></div></div>
<div class="sg-lab-mid"><div>${ico("arrow")}</div></div>
<div class="sg-lab-col is-next"><div class="sg-lab-label">直连之后</div>${chips}<div class="sg-lab-down"></div>
<div class="sg-machine"><div class="sg-machine-t">Siltok <span class="sg-it">Machine</span></div><div class="sg-models">${D.models.map((m) => `<span class="${m.hl ? "is-hl" : ""}">${esc(m.name)}</span>`).join("")}</div></div>
<div class="sg-lab-note"><span>${ico("house")}本机算力</span><span>${ico("lock")}素材不出本机</span><span>${ico("check")}不用配云端 Key</span></div></div></div>
<div class="sg-wait sg-reveal"><span>等着改接本机模型的现成技能：</span>${bridge.map((s) => `<button type="button" data-open="${s.id}">${ico(s.icon)}${esc(s.name)}</button>`).join("")}</div>
<div class="sg-gaps">${others.map((g, i) => `<div class="sg-gap sg-reveal" style="--d:${(i % 3) * 60}ms"><div class="sg-gap-ic">${ico(g.icon)}</div><h4>${esc(g.name)}</h4><p class="is-now">${esc(g.now)}</p><p class="is-plan">${esc(g.plan)}</p></div>`).join("")}</div></div>`;
  }

  // ── 受限：需自行安装
  function rcard(r) {
    return `<button class="sg-rcard" type="button" data-rid="${r.id}"><span class="sg-rcard-ic">${ico(r.icon)}<span class="sg-lockb">${ico("lock")}</span></span>
<span><b>${esc(r.name)}</b><small>${esc(r.does)}</small><span class="sg-rcard-tags"><span class="sg-lic ${LICCLS[r.grp] || "custom"}">${esc(r.lic)}</span><span class="sg-stamp">需自行安装</span>${r.domain ? `<span class="sg-chip">${esc(SHORT[r.domain] || "")}</span>` : ""}</span></span></button>`;
  }
  function renderRestricted() {
    const el = $('[data-sg="restricted"]');
    if (!el) return;
    if (!RESTR.length) { el.hidden = true; return; }
    const groups = D.restrictedGroups.map((g) => ({ ...g, items: RESTR.filter((r) => r.grp === g.id) })).filter((g) => g.items.length);
    el.innerHTML = `<div class="sg-wrap"><div class="sg-shead sg-reveal"><div class="sg-eyebrow">许可证受限 · 不随机器分发</div>
<h2 class="sg-h2">需要你<em>自行安装</em>的</h2>
<p class="sg-sub">这些项目功能不错，但许可证不允许或不适合随商业产品预装，所以和预装、推荐分开放。图鉴只列来源，想用请到仓库自己装。</p></div>
<div class="sg-shelf sg-reveal">${groups.map((g) => `<div class="sg-rgroup"><div class="sg-rhead"><h3>${esc(g.name)}</h3><span class="sg-mono">${esc(g.lic)} · ${g.items.length} 个</span></div>
<p>${esc(g.body)}</p><div class="sg-rgrid">${g.items.map(rcard).join("")}</div></div>`).join("")}</div></div>`;
  }

  // ── 页脚
  function renderFoot() {
    const el = $('[data-sg="foot"]');
    if (!el) return;
    const src = D.meta.sources.map((s) => `<span class="sg-src">${ico(s.kind === "list" ? "doc" : "box")}${esc(s.label)}${s.asOf ? " · " + esc(s.asOf) : ""}</span>`).join("");
    const pkg = D.meta.sources.find((s) => s.kind === "manifest");
    el.innerHTML = `<div class="sg-wrap"><div class="sg-foot-in"><div><h4>数据来源</h4><p>${src}</p>
<p>Star 数和更新时间来自 GitHub API（截至 ${esc(D.meta.asOf)}）。${esc(D.meta.note)}</p></div>
<div><h4>说明</h4><ul><li>图标和插画都是原创绘制，没有使用任何仓库的截图或图标。</li>
<li>财经类技能只做研究分析，不构成投资建议。</li>
<li>“未审查”指代码还没看过；${pkg ? "“测试”一栏是整合包装进测试环境的结果，还没做实际对话试用。" : "整合包测试结果出来后会补上。"}</li></ul></div></div></div>`;
  }

  // ── 详情抽屉
  const scrim = document.createElement("div");
  scrim.className = "sg-scrim";
  scrim.hidden = true;
  const drawer = document.createElement("aside");
  drawer.className = "sg-drawer";
  drawer.hidden = true;
  drawer.tabIndex = -1;
  drawer.setAttribute("role", "dialog");
  drawer.setAttribute("aria-modal", "true");
  drawer.setAttribute("aria-labelledby", "sgDTitle");
  root.append(scrim, drawer);
  let current = null, lastFocus = null, hideTimer = 0;

  const sec = (title, body) => (body ? `<section class="sg-d-sec"><h4>${title}</h4>${body}</section>` : "");
  const toks = (arr, cls = "") => (arr.length ? `<div class="sg-tokens">${arr.map((x) => `<span class="sg-tok ${cls}">${esc(x)}</span>`).join("")}</div>` : "");
  const verdictCls = (v) => (/缺/.test(v) ? "dep" : /Key/i.test(v) ? "key" : "ok");

  function testsBlock(s) {
    const t = s.tests;
    if (!t) return s.packaged ? "" : `<p>${s.tier === "optional" ? "备选档暂不收录进整合包。" : s.pending ? "拿到授权前不打包，只给仓库链接。" : "推荐档不随包预装，没有做测试；装之前先看仓库说明。"}</p>`;
    if (!Array.isArray(t)) return `<p>${esc(typeof t === "string" ? t : JSON.stringify(t))}</p>`;
    const nOk = (k) => t.filter((x) => x[k] === true).length;
    const scan = [...new Set(t.map((x) => x.security_scan).filter(Boolean))];
    const func = [...new Set(t.map((x) => x.functional_test).filter(Boolean))];
    const sum = `<div class="sg-test-sum"><span class="sg-chip">${ico("check")}装进测试环境 ${nOk("installed_in_test_env")}/${t.length}</span><span class="sg-chip">${ico("check")}SKILL.md 格式 ${nOk("skill_md_valid")}/${t.length}</span>${t[0].date ? `<span class="sg-chip">${esc(t[0].date)}</span>` : ""}</div>`;
    const rows = t.map((x) => {
      const notes = [x.deps_missing?.length ? "测试机上缺：" + x.deps_missing.join("、") : "", x.keys_needed?.length ? "要配：" + x.keys_needed.join("、") : ""].filter(Boolean).join(" · ");
      return `<div class="sg-test"><b>${esc(x.name)}</b>${x.verdict ? `<span class="sg-verdict ${verdictCls(x.verdict)}">${esc(x.verdict.split("：")[0].replace(/，.*$/, ""))}</span>` : ""}${notes ? `<small>${esc(notes)}</small>` : ""}</div>`;
    }).join("");
    return sum + `<div class="sg-tests">${rows}</div>` + (scan.length || func.length ? `<p class="sg-fine" style="margin-top:10px">${esc([...scan.map((x) => "安全扫描：" + x), ...func.map((x) => "实际试用：" + x)].join("；"))}</p>` : "");
  }

  function skillDetail(s) {
    const d = dom[s.domain], [tl, tc] = TIER[s.tier], run = RUN[s.run] || RUN.l;
    const chips = [`<span class="sg-chip ${tc === "opt" ? "" : tc}">${tl}</span>`, s.pending ? '<span class="sg-chip acid">待授权</span>' : "", `<span class="sg-chip">${esc(d.name)}</span>`,
      s.h3 ? '<span class="sg-chip h3">H3</span>' : "", s.packaged ? `<span class="sg-chip">${ico("box")}已收进整合包</span>` : "", s.reviewed ? "" : `<span class="sg-chip warn">${ico("warn")}未审查</span>`].join("");
    const needText = s.needs || s.hint;
    const prep = `<div class="sg-runline"><span class="sg-chip">${ico(run[1])}${run[0]}</span>${hasKey(s) ? `<span class="sg-chip">${ico("key")}要配 Key 或账号</span>` : ""}</div>` +
      (needText && needText !== "无" ? `<p>${esc(needText)}</p>` : "") +
      (s.requires.length ? toks(s.requires) : toks(s.deps)) + toks(s.requiresOptional.map((x) => x + "（可选）")) +
      (s.envKeys.length ? toks(s.envKeys, "key") : needText ? "" : toks(s.keys, "key")) +
      (!needText && !s.requires.length && !s.deps.length && !s.keys.length && !s.envKeys.length ? "<p>不用额外准备，装好就能用。</p>" : "");
    const local = s.models.length
      ? `<div class="sg-local">${ico("chip")}<p>能直接配合本机的 ${esc(s.models.map((m) => model[m]?.name || m).join("、"))}。</p></div>`
      : s.bridge ? `<div class="sg-local">${ico("plug")}<p>生图、出片或配音环节现在走云端接口。等自研的“本地模型直连”做好，会改接本机模型（规划中）。</p></div>` : "";
    const src = `<p><span class="sg-lic ${s.licClass}">${esc(s.lic)}</span>${s.license !== s.lic ? " " + esc(s.license) : ""}</p>` +
      (s.agents ? `<p>支持的 Agent：${esc(s.agents)}</p>` : "") + (s.commit ? `<p>固定在提交 <span class="sg-tok">${esc(s.commit.slice(0, 7))}</span>，换版本前要重新审查。</p>` : "");
    return `<div class="sg-d-scroll"><div class="sg-d-hero ${d.dark ? "is-dark" : ""}" style="--c:${d.c};--t:${d.t}">${thumb(s, true)}<span class="sg-glyph">${ico(s.icon)}</span>
<button class="sg-d-close" type="button" data-close aria-label="关闭">${ico("close")}</button></div>
<div class="sg-d-body"><div class="sg-d-chips">${chips}</div><h3 id="sgDTitle">${esc(s.name)}</h3>
<div class="sg-d-repo"><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.repo)} ${ico("ext")}</a><span>${ico("star")} ${s.stars.toLocaleString("en-US")}</span>${s.updated ? `<span>更新 ${esc(s.updated)}</span>` : ""}</div>
<p class="sg-d-does">${esc(s.does)}</p>
${sec("怎么触发", s.example ? `<div class="sg-say"><span class="sg-say-who">你</span><div class="sg-say-bubble">${esc(s.example)}<button class="sg-copy" type="button" data-copy="${esc(s.example)}" aria-label="复制这句指令" title="复制">${ico("copy")}</button></div></div><p class="sg-fine" style="margin-top:8px">在 Claude Code、Codex 这类 Agent 里装好技能后，直接这样说就会触发。</p>` : "")}
${sec("会产出什么", s.output ? `<p>${esc(s.output)}</p>` : "")}
${sec("需要准备", prep)}
${sec("本机模型", local)}
${sec("限制与注意", s.limits.length ? `<ul>${s.limits.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "")}
${sec(`包含的技能 · ${s.subskills.length}`, s.subskills.length ? toks(s.subskills) : "")}
${sec("测试", testsBlock(s))}
${sec("来源和许可证", src)}</div></div>
<div class="sg-d-foot"><a class="sg-btn sg-btn-primary" href="${esc(s.url)}" target="_blank" rel="noopener">打开仓库 ${ico("ext")}</a><button class="sg-btn sg-btn-line" type="button" data-copy-link>复制链接</button>
<div class="sg-d-nav"><button type="button" data-step="-1" aria-label="上一个">${ico("prev")}</button><button type="button" data-step="1" aria-label="下一个">${ico("next")}</button></div></div>`;
  }

  function restrictedDetail(r) {
    const g = D.restrictedGroups.find((x) => x.id === r.grp) || {};
    return `<div class="sg-d-scroll"><div class="sg-d-hero is-r"><span class="sg-glyph">${ico(r.icon)}</span><button class="sg-d-close" type="button" data-close aria-label="关闭">${ico("close")}</button></div>
<div class="sg-d-body"><div class="sg-d-chips"><span class="sg-stamp">需自行安装</span><span class="sg-chip">${esc(g.name || "")}</span>${r.domain ? `<span class="sg-chip">${esc(dom[r.domain]?.name || "")}</span>` : ""}</div>
<h3 id="sgDTitle">${esc(r.name)}</h3>
<div class="sg-d-repo"><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.repo)} ${ico("ext")}</a><span>${ico("star")} ${r.stars.toLocaleString("en-US")}</span><span class="sg-lic ${LICCLS[r.grp] || "custom"}">${esc(r.lic)}</span></div>
<p class="sg-d-does">${esc(r.does)}</p>
${sec("为什么不预装", `<p>${esc(g.body || "")}</p>${r.license !== r.lic ? `<p>许可证：${esc(r.license)}</p>` : ""}`)}
${sec("处理建议", r.advice ? `<p>${esc(r.advice)}</p>` : "")}
${sec("怎么装", "<p>到仓库按 README 安装到你自己的 Agent 技能目录。Siltok 不随机器分发它，也不替你安装。</p>")}</div></div>
<div class="sg-d-foot"><a class="sg-btn sg-btn-primary" href="${esc(r.url)}" target="_blank" rel="noopener">去仓库安装 ${ico("ext")}</a><button class="sg-btn sg-btn-line" type="button" data-copy-link>复制链接</button></div>`;
  }

  function show() {
    clearTimeout(hideTimer);
    if (drawer.hidden) lastFocus = document.activeElement;
    scrim.hidden = drawer.hidden = false;
    requestAnimationFrame(() => { scrim.classList.add("is-on"); drawer.classList.add("is-on"); });
    document.documentElement.classList.add("sg-lock");
    const c = $("[data-close]", drawer);
    if (c) c.focus({ preventScroll: true });
  }
  function hide() {
    if (!current) return;
    current = null;
    scrim.classList.remove("is-on");
    drawer.classList.remove("is-on");
    document.documentElement.classList.remove("sg-lock");
    hideTimer = setTimeout(() => { drawer.hidden = scrim.hidden = true; drawer.innerHTML = ""; }, 400);
    setHash("");
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }
  function openSkill(id) {
    const s = byId.get(id);
    if (!s) return false;
    current = { kind: "skill", id };
    drawer.innerHTML = skillDetail(s);
    const list = byDom[s.domain].filter(matches), k = list.indexOf(s);
    const [p, n] = $$("[data-step]", drawer);
    if (p) p.disabled = k <= 0;
    if (n) n.disabled = k < 0 || k >= list.length - 1;
    show();
    $(".sg-d-scroll", drawer).scrollTop = 0;
    setHash("skill=" + id);
    return true;
  }
  function openRestricted(id) {
    const r = rById.get(id);
    if (!r) return false;
    current = { kind: "r", id };
    drawer.innerHTML = restrictedDetail(r);
    show();
    setHash("r=" + id);
    return true;
  }
  function step(dir) {
    if (!current || current.kind !== "skill") return;
    const s = byId.get(current.id), list = byDom[s.domain].filter(matches), k = list.indexOf(s);
    const nx = list[k + dir];
    if (nx) openSkill(nx.id);
  }
  function setHash(h) {
    const url = location.pathname + location.search + (h ? "#" + h : "");
    try { history.replaceState(null, "", url); } catch (e) { /* file:// 下个别浏览器不允许，忽略 */ }
  }
  function fromHash() {
    const m = location.hash.match(/^#(skill|r)=([\w-]+)/);
    if (!m) return;
    if (m[1] === "skill") openSkill(m[2]); else openRestricted(m[2]);
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta); ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (e2) { ok = false; }
      ta.remove();
      return ok;
    }
  }

  // ── 筛选生效
  function applyFilter() {
    for (const el of $$(".sg-card")) el.hidden = !matches(byId.get(el.dataset.id));
    for (const g of $$("[data-grid]")) { const empty = $(".sg-empty", g); if (empty) empty.hidden = $$(".sg-card:not([hidden])", g).length > 0; }
    for (const b of $$("[data-tier]")) b.setAttribute("aria-pressed", String(b.dataset.tier === state.tier));
    const lc = $("[data-local]");
    if (lc) lc.checked = state.local;
    updateMapDots();
    let pill = $(".sg-fpill");
    if (!pill) {
      pill = document.createElement("div");
      pill.className = "sg-fpill";
      pill.setAttribute("aria-live", "polite");
      root.appendChild(pill);
    }
    if (filtering()) {
      const shown = SKILLS.filter(matches).length;
      const parts = [state.tier !== "all" ? TIER[state.tier][0] : "", state.local ? "本机可跑" : "", state.q ? `“${state.q}”` : ""].filter(Boolean).join(" · ");
      pill.innerHTML = `<span>正在看：${esc(parts)}${NOCOUNT ? "" : ` · ${shown} 个`}</span><button type="button" data-clear>清除</button>`;
      pill.classList.add("is-on");
    } else pill.classList.remove("is-on");
  }

  // ── 事件
  root.addEventListener("click", async (e) => {
    const t = e.target.closest("[data-id],[data-open],[data-rid],[data-skill],[data-dom],[data-close],[data-copy],[data-copy-link],[data-step],[data-tier],[data-jump-tier],[data-clear]");
    if (!t) return;
    if (t.matches("[data-copy]")) {
      const ok = await copyText(t.dataset.copy);
      if (ok) { t.classList.add("is-done"); t.innerHTML = ico("check"); setTimeout(() => { t.classList.remove("is-done"); t.innerHTML = ico("copy"); }, 1400); }
    } else if (t.matches("[data-copy-link]")) {
      const ok = await copyText(location.href);
      t.textContent = ok ? "已复制" : "复制失败";
      setTimeout(() => (t.textContent = "复制链接"), 1400);
    } else if (t.matches("[data-close]")) hide();
    else if (t.matches("[data-step]")) step(+t.dataset.step);
    else if (t.matches("[data-id],[data-open],[data-skill]")) openSkill(t.dataset.id || t.dataset.open || t.dataset.skill);
    else if (t.matches("[data-rid]")) openRestricted(t.dataset.rid);
    else if (t.matches("[data-dom]")) {
      const sec = document.getElementById("d-" + t.dataset.dom);
      if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
      else if (FULL) location.href = FULL + "#d-" + t.dataset.dom;
    }
    else if (t.matches("[data-tier]")) { state.tier = t.dataset.tier; applyFilter(); }
    else if (t.matches("[data-jump-tier]")) { state.tier = t.dataset.jumpTier; applyFilter(); document.getElementById("sg-map")?.scrollIntoView({ behavior: "smooth", block: "start" }); }
    else if (t.matches("[data-clear]")) { state.tier = "all"; state.local = false; state.q = ""; const q = $("[data-q]"); if (q) q.value = ""; applyFilter(); }
  });
  scrim.addEventListener("click", hide);
  root.addEventListener("change", (e) => { if (e.target.matches("[data-local]")) { state.local = e.target.checked; applyFilter(); } });
  let qTimer = 0;
  root.addEventListener("input", (e) => {
    if (!e.target.matches("[data-q]")) return;
    clearTimeout(qTimer);
    qTimer = setTimeout(() => { state.q = e.target.value.trim().toLowerCase(); applyFilter(); }, 120);
  });
  root.addEventListener("pointermove", (e) => { if (e.target.closest && e.target.closest('[data-sg="map"]')) mapTip(e); });
  $('[data-sg="map"]')?.addEventListener("pointerleave", () => $(".sg-tip")?.classList.remove("is-on"));
  root.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches?.(".sg-m-dom")) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent("click", { bubbles: true })); }
  });
  document.addEventListener("keydown", (e) => {
    if (!current) return;
    if (e.key === "Escape") { e.preventDefault(); hide(); }
    else if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && !e.target.matches?.("input,textarea")) step(e.key === "ArrowRight" ? 1 : -1);
    else if (e.key === "Tab") { // 焦点留在抽屉里
      const f = $$('a[href],button:not([disabled]),[tabindex="0"]', drawer);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  window.addEventListener("hashchange", fromHash);
  let rz = 0;
  window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => renderMap(), 150); });
  const nav = $(".sg-nav");
  window.addEventListener("scroll", () => nav && nav.classList.toggle("is-scrolled", scrollY > 10), { passive: true });

  // ── 渲染
  renderNav(); renderStats(); renderFilter(); renderLegend(); renderMap(true); renderSpot(); renderDomains(); renderLab(); renderRestricted(); renderFoot();
  applyFilter();

  // 进场动画 + 导航高亮
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => es.forEach((x) => { if (x.isIntersecting) { x.target.classList.add("is-in"); io.unobserve(x.target); } }), { threshold: 0.12 });
    $$(".sg-reveal").forEach((el) => io.observe(el));
    const links = new Map($$("[data-nav]").map((a) => [a.dataset.nav, a]));
    const so = new IntersectionObserver((es) => es.forEach((x) => {
      if (!x.isIntersecting) return;
      links.forEach((a) => a.classList.remove("is-on"));
      const a = links.get(x.target.id);
      if (a) { // 窄屏导航可横向滚动：把当前项挪到可见处，只动导航条本身，不动页面
        a.classList.add("is-on");
        const box = a.parentElement;
        if (box.scrollWidth > box.clientWidth) box.scrollTo({ left: a.offsetLeft - box.clientWidth / 2 + a.offsetWidth / 2, behavior: "smooth" });
      }
    }), { rootMargin: "-45% 0px -50% 0px" });
    ["sg-map", ...DOMS.map((d) => "d-" + d.id), "sg-lab", "sg-restricted"].forEach((id) => { const el = document.getElementById(id); if (el) so.observe(el); });
  } else $$(".sg-reveal").forEach((el) => el.classList.add("is-in"));
  fromHash();
})();
