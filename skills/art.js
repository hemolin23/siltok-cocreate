/* Siltok 技能图鉴 · 原创绘制的图标和插画（不使用任何仓库截图或第三方图标）
   glyph：24×24 线性图标，描边用 currentColor；scene：每个领域一张大画面，颜色走 CSS 变量 --c（主色）/ --t（底色） */
window.SG_ART = (() => {
  const glyph = {
    pen: '<path d="M4 20l1.2-4.6L15.6 5a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8 4 20z"/><path d="M13.5 7.1l3.4 3.4"/>',
    board: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16M3 12h18"/><path d="M6 9.5l2-2 2 2M14.5 16.5h4"/>',
    clapper: '<path d="M4 10h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M4 10l-.6-3.2a1 1 0 0 1 .8-1.2l13.7-2.4a1 1 0 0 1 1.2.8L19.6 7 4 10z"/><path d="M8.2 5.7l2 3.2M12.6 4.9l2 3.2"/>',
    scissors: '<circle cx="6.5" cy="6.5" r="2.8"/><circle cx="6.5" cy="17.5" r="2.8"/><path d="M8.6 8.4L20 18M8.6 15.6L20 6"/>',
    people: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19.5c.6-3.3 2.8-5 5.5-5s4.9 1.7 5.5 5"/><circle cx="16.5" cy="9" r="2.6"/><path d="M15.5 14.6c2.6-.2 4.4 1.4 5 4.4"/>',
    chair: '<path d="M5 4.5h14v5H5zM5 13h14"/><path d="M7 9.5l10 10.5M17 9.5L7 20"/>',
    pages: '<path d="M8 3.5h8.5L20 7v11.5a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1z"/><path d="M16 3.5v4h4M10 11h7M10 14h7M10 17h4"/><path d="M4 7v13.5a1 1 0 0 0 1 1h10"/>',
    subtitle: '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M6.5 13.5h5M13.5 13.5h4M8.5 16.5h7"/>',
    timeline: '<rect x="3" y="4" width="9" height="4" rx="1.2"/><rect x="13.5" y="4" width="7.5" height="4" rx="1.2"/><rect x="6" y="10" width="11" height="4" rx="1.2"/><rect x="3" y="16" width="6" height="4" rx="1.2"/><rect x="10.5" y="16" width="10.5" height="4" rx="1.2"/>',
    note: '<path d="M9 18V5.5l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="15.5" r="2.5"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/>',
    parabola: '<path d="M3.5 20.5h17M3.5 20.5V3.5"/><path d="M7 5c2 14 10 14 12 0"/><circle cx="13" cy="15.5" r="1.3"/>',
    bezier: '<path d="M4 19C8 19 9 5 20 5"/><path d="M4 19h5M20 5h-5"/><circle cx="10" cy="19" r="1.6"/><circle cx="14" cy="5" r="1.6"/>',
    brush: '<path d="M20.5 3.5l-9.8 9.8"/><path d="M10.7 13.3c-2.1-.6-3.9.7-4.2 2.8-.2 1.5-.9 2.6-2.5 3 2.8 1.4 6.9.8 7.9-2.4.4-1.3.1-2.6-1.2-3.4z"/>',
    comic: '<rect x="3" y="3.5" width="18" height="17" rx="2"/><path d="M12 3.5v7M3 10.5h18M9.5 10.5v10"/>',
    stick: '<circle cx="12" cy="5" r="2.2"/><path d="M12 7.5v7M12 14.5l-3.5 6M12 14.5l3.5 6M6.5 9.5l5.5 1.5 5.5-3"/>',
    spiral: '<path d="M12 12a1.5 1.5 0 0 1 3 0 3 3 0 0 1-6 0 4.5 4.5 0 0 1 9 0 6 6 0 0 1-12 0 7.5 7.5 0 0 1 15 0"/>',
    rewind: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M11 9l-3.5 3 3.5 3zM16.5 9L13 12l3.5 3z"/>',
    frames: '<rect x="7" y="7" width="13" height="13" rx="2"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/><path d="M10 16.5l2.5-3 2 2 1.5-1.5 2 2.5"/>',
    h3: '<rect x="2.5" y="4.5" width="19" height="15" rx="4"/><text x="12" y="15.7" text-anchor="middle" font-size="9.6" font-weight="800" fill="currentColor" stroke="none" font-family="Avenir Next,PingFang SC,Helvetica,sans-serif">H3</text>',
    nodes: '<rect x="3" y="4" width="7" height="5" rx="1.5"/><rect x="14" y="4" width="7" height="5" rx="1.5"/><rect x="8.5" y="15" width="7" height="5" rx="1.5"/><path d="M6.5 9v1.5a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2V9M12 12.5V15"/>',
    chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>',
    books: '<path d="M4 4.5h4v15H4zM9.5 4.5h4v15h-4z"/><path d="M15.2 5.6l3.8-1 3.6 14.2-3.8 1z"/>',
    braces: '<path d="M8.5 4C6 4 6 5.5 6 7.5S6 11 4 12c2 1 2 2.5 2 4.5S6 20 8.5 20M15.5 4C18 4 18 5.5 18 7.5s0 3.5 2 4.5c-2 1-2 2.5-2 4.5S18 20 15.5 20"/><path d="M10.5 12h3"/>',
    play: '<rect x="3" y="4.5" width="18" height="15" rx="3"/><path d="M10 9v6l5-3z"/>',
    camera: '<rect x="3" y="8" width="12.5" height="10" rx="2"/><path d="M15.5 11.5l5-3v9l-5-3"/><circle cx="6.5" cy="5" r="1.6"/><circle cx="11.5" cy="5" r="1.6"/>',
    sparkle: '<path d="M11 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z"/><path d="M18.5 15.5c.3 1.9 1 2.7 3 3-2 .3-2.7 1.1-3 3-.3-1.9-1-2.7-3-3 2-.3 2.7-1.1 3-3z"/>',
    database: '<ellipse cx="12" cy="6" rx="7.5" ry="2.8"/><path d="M4.5 6v12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V6M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8"/>',
    palette: '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.3 0 1.9-.8 1.9-1.7 0-1.4-1.2-1.6-1.2-2.9 0-1 .8-1.6 1.8-1.6h2.1a3.9 3.9 0 0 0 3.9-3.9C20.5 6.6 16.7 3.5 12 3.5z"/><circle cx="7.7" cy="11" r="1.1"/><circle cx="10" cy="7.3" r="1.1"/><circle cx="14.5" cy="7.3" r="1.1"/>',
    phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/><rect x="9" y="6" width="6" height="6" rx="1"/>',
    diagram: '<rect x="9" y="3" width="6" height="5" rx="1.2"/><rect x="3" y="16" width="6" height="5" rx="1.2"/><rect x="15" y="16" width="6" height="5" rx="1.2"/><path d="M12 8v4M6 16v-2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/>',
    browser: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 8.5h18M7 12.5h6M7 15.5h10"/><path d="M6 6.2h.1M8.2 6.2h.1"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    wand: '<path d="M4 20L15 9M13.5 7.5l3 3"/><path d="M17 3v3M15.5 4.5h3M20.5 9v2.6M19.2 10.3h2.6M9 4v2M8 5h2"/>',
    shieldcheck: '<path d="M12 3l7.5 3v5.5c0 4.4-3.1 8.2-7.5 9.5-4.4-1.3-7.5-5.1-7.5-9.5V6z"/><path d="M8.8 12.2l2.3 2.3 4.3-4.6"/>',
    nib: '<path d="M12 3l6 7-6 11-6-11z"/><circle cx="12" cy="11.5" r="1.6"/><path d="M12 3v7"/>',
    layers: '<path d="M12 3.5l9 4.5-9 4.5L3 8z"/><path d="M3 12l9 4.5 9-4.5M3 16l9 4.5 9-4.5"/>',
    megaphone: '<path d="M3.5 10v4a1 1 0 0 0 1 1h2l9 5V4l-9 5h-2a1 1 0 0 0-1 1z"/><path d="M7 15l1.5 5.5M19 9.5a3.5 3.5 0 0 1 0 5"/>',
    magnifier: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.3 15.3l5.2 5.2M8 12.5v-2M10.5 12.5v-4M13 12.5v-3"/>',
    bubble: '<path d="M4 5.5h16a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1h-9l-4.5 3.5V17H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1z"/><path d="M7.5 10h9M7.5 13h6"/>',
    funnel: '<path d="M3.5 4.5h17l-6.5 8v6.5l-4 2v-8.5z"/>',
    bulb: '<path d="M9 17.5h6M10 20.5h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.3 1 2.2v1.5h5.2V16c0-.9.4-1.7 1-2.2A6 6 0 0 0 12 3z"/>',
    flame: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6 0-3.7 3-5.7 4-9 2.5 1.5 3.4 3.7 3.2 5.8 1-.6 1.7-1.6 2-2.8 1.8 1.6 3.8 3.6 3.8 6.3 0 3.3-2.6 5.7-6.5 5.7z"/>',
    upload: '<path d="M12 15.5V4M7.5 8.5L12 4l4.5 4.5"/><path d="M4 14.5v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
    doc: '<path d="M6.5 3h8l4 4v13a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v4.5h4.5M8.5 11h7M8.5 14h7M8.5 17h4.5"/>',
    slides: '<rect x="3" y="4" width="18" height="12.5" rx="1.5"/><path d="M12 16.5V20M8.5 20.5h7"/><circle cx="9" cy="10.2" r="3"/><path d="M9 7.2v3h3M14.5 9h3M14.5 12h3"/>',
    grid: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 14.5h18M9 4v16M15 4v16"/>',
    translate: '<path d="M3.5 6h9M8 4v2M5.5 6c.5 3 2.5 5.5 5.5 7M10.5 6c-.8 3.5-3 6.3-6.5 7.5"/><path d="M12.5 20.5l4-10 4 10M14 17h5"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18M11 12.5v2h2v-2"/>',
    checklist: '<path d="M4 6.5l1.5 1.5 3-3M4 12.5l1.5 1.5 3-3M4 18.5l1.5 1.5 3-3"/><path d="M11.5 7h9M11.5 13h9M11.5 19h9"/>',
    candles: '<path d="M6 3v4M6 15v6M12 6v3M12 17v3M18 4v3M18 13v6"/><rect x="4" y="7" width="4" height="8" rx="1"/><rect x="10" y="9" width="4" height="8" rx="1"/><rect x="16" y="7" width="4" height="6" rx="1"/>',
    report: '<path d="M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M8.5 7h7M8.5 17v-3M12 17v-5M15.5 17v-7"/>',
    coin: '<circle cx="12" cy="12" r="8.5"/><path d="M14.8 8.8c-.6-.8-1.6-1.3-2.8-1.3-1.7 0-2.9.9-2.9 2.2 0 3 6 1.6 6 4.6 0 1.3-1.3 2.2-3 2.2-1.3 0-2.4-.5-3-1.4M12 6v1.5M12 16.5V18"/>',
    flask: '<path d="M9.5 3h5M10 3v6.2L4.8 18.6A1.6 1.6 0 0 0 6.2 21h11.6a1.6 1.6 0 0 0 1.4-2.4L14 9.2V3"/><path d="M7.2 15h9.6"/>',
    graph: '<circle cx="6" cy="6" r="2.3"/><circle cx="18" cy="7.5" r="2.3"/><circle cx="12" cy="13" r="2.6"/><circle cx="6" cy="19" r="2.3"/><circle cx="18.5" cy="18.5" r="2"/><path d="M7.8 7.5l2.4 3.6M16.1 8.8l-2.3 2.6M10.2 14.8l-2.5 2.6M14.3 14.6l2.6 2.6"/>',
    bolt: '<path d="M13 2.5L4.5 13.5H11l-1 8 8.5-11H12z"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><circle cx="12" cy="12" r="6.6"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M5.5 18.5l1.8-1.8M16.7 7.3l1.8-1.8"/>',
    columns: '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="9.5" y="4" width="5" height="16" rx="1.5"/><rect x="16" y="4" width="5" height="16" rx="1.5"/>',
    cards: '<rect x="7.5" y="3" width="13" height="16" rx="2"/><path d="M5 6.5v12A2.5 2.5 0 0 0 7.5 21h9"/><circle cx="12" cy="8.5" r="1.8"/><path d="M7.5 15.5l4-3.5 3 2.5 2-1.5 4 3"/>',
    motion: '<circle cx="14.5" cy="12" r="5.5"/><path d="M3 9h4.5M2 12h5M3 15h4.5"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4M7.5 13.5h2M11 13.5h2M14.5 13.5h2M7.5 17h2M11 17h2"/>',
    convert: '<path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5"/>',
    box: '<path d="M12 3l8.5 4.5v9L12 21l-8.5-4.5v-9z"/><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9"/>',
    pulse: '<path d="M2.5 12h4L9 6l4 12 2.5-6h6"/>',
    news: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M7 8.5h5v4H7zM14.5 9h3M14.5 12h3M7 15.5h10.5"/>',
    chart: '<path d="M3.5 20.5h17"/><rect x="5" y="12" width="3.2" height="8.5" rx=".8"/><rect x="10.4" y="7" width="3.2" height="13.5" rx=".8"/><rect x="15.8" y="3.5" width="3.2" height="17" rx=".8"/>',
    // 界面用
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5v-3a4 4 0 0 1 8 0v3"/>',
    house: '<path d="M3.5 11L12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5M10 20v-5h4v5"/>',
    cloud: '<path d="M7 18.5h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 9.6 4.5 4.5 0 0 0 7 18.5z"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M10.9 12.1L20 3M16.5 6.5L19 9M14 9l2 2"/>',
    plug: '<path d="M9 3v5M15 3v5"/><path d="M6.5 8h11v3a5.5 5.5 0 0 1-11 0z"/><path d="M12 16.5V21"/>',
    star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/>',
    copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M15.5 8.5v-3a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    arrow: '<path d="M4.5 12h15M13.5 6l6 6-6 6"/>',
    down: '<path d="M12 4.5v15M6 13.5l6 6 6-6"/>',
    ext: '<path d="M14 4.5h5.5V10M19.5 4.5L11 13"/><path d="M18.5 14v4.5A1.5 1.5 0 0 1 17 20H6a1.5 1.5 0 0 1-1.5-1.5V7.5A1.5 1.5 0 0 1 6 6h4.5"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.3 15.3l5.2 5.2"/>',
    warn: '<path d="M12 3.5L21.5 20h-19z"/><path d="M12 10v4.5M12 17.2v.3"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    prev: '<path d="M15 5l-7 7 7 7"/>',
    next: '<path d="M9 5l7 7-7 7"/>',
  };

  const SERIF = "'Instrument Serif','Bodoni 72',Didot,'Playfair Display',Georgia,serif";
  const star4 = (x, y, s) => `M${x} ${y - s}c${s * .09} ${s * .66} ${s * .35} ${s * .91} ${s} ${s}c-${s * .65} ${s * .09}-${s * .91} ${s * .35}-${s} ${s}c-${s * .09}-${s * .65}-${s * .35}-${s * .91}-${s}-${s}c${s * .65}-${s * .09} ${s * .91}-${s * .35} ${s}-${s}z`;
  const svg = (body, extra = "") => `<svg class="sg-scene" viewBox="0 0 560 360" role="img" ${extra}>${body}</svg>`;

  const scene = {
    film: svg(`
<g class="sh"><rect class="k w" x="40" y="36" width="318" height="262" rx="18"/></g>
<rect class="k2 t" x="62" y="60" width="84" height="58" rx="7"/><rect class="k2 t" x="157" y="60" width="84" height="58" rx="7"/><rect class="k2 t" x="252" y="60" width="84" height="58" rx="7"/>
<rect class="k2 t" x="62" y="168" width="84" height="58" rx="7"/><rect class="k2 t" x="157" y="168" width="84" height="58" rx="7"/><rect class="k2 t" x="252" y="168" width="84" height="58" rx="7"/>
<path class="bar" d="M66 136h50M66 150h30M161 136h50M161 150h30M256 136h50M256 150h30M66 244h50M66 258h30M161 244h50M161 258h30M256 244h50M256 258h30"/>
<path class="k2 n" d="M66 108c18-16 32-16 46 0M98 102c12-9 24-9 44 6"/><circle class="a" cx="124" cy="80" r="9"/>
<circle class="k2 w" cx="199" cy="76" r="7"/><path class="k2 n" d="M199 83v15M190 89h18M199 98l-6 12M199 98l6 12"/>
<circle class="k2 w" cx="281" cy="92" r="10"/><circle class="k2 a" cx="307" cy="88" r="12"/>
<circle class="k2 w" cx="104" cy="197" r="17"/><path class="k2 n" d="M97 193h.5M111 193h.5M97 203q7 6 14 0"/>
<path class="k2 n" d="M170 214c20-30 46-30 60-6"/><path class="k2 n" d="M220 198l10 10-13 3"/>
<path class="k2 n" d="M256 218l20-22 14 12 22-24 22 34"/><circle class="a" cx="312" cy="184" r="5"/>
<g transform="translate(372 150)"><g class="sh"><rect class="k w" x="0" y="40" width="148" height="104" rx="12"/></g>
<path class="k2 n" d="M18 78h112M18 100h76M18 122h96"/>
<g transform="rotate(-14 4 40)"><rect class="k i" x="0" y="12" width="148" height="28" rx="6"/><path class="w" d="M16 12h20l-14 28H2zM56 12h20L62 40H42zM96 12h20l-14 28H82zM136 12h12v28h-26z"/></g></g>
<g transform="translate(404 66)"><g class="sh"><rect class="k2 w" x="0" y="0" width="104" height="36" rx="18"/></g><circle class="a sg-blink" cx="22" cy="18" r="6.5"/><text x="64" y="23" text-anchor="middle" class="sg-mono" font-size="13" font-weight="700" fill="#111">REC</text></g>`),

    animation: svg(`
<path class="k n" d="M36 312h488"/>
<path class="k2 n" stroke-dasharray="2 9" d="M60 300C110 40 280 40 330 300C370 180 460 180 500 300"/>
<g class="a"><circle cx="90" cy="200" r="17" opacity=".14"/><circle cx="131" cy="136" r="17" opacity=".22"/><circle cx="195" cy="105" r="17" opacity=".32"/><circle cx="259" cy="136" r="17" opacity=".44"/><circle cx="300" cy="200" r="17" opacity=".58"/><ellipse cx="330" cy="300" rx="26" ry="11" opacity=".85"/><circle cx="377" cy="224" r="17" opacity=".45"/><circle cx="415" cy="210" r="17" opacity=".65"/></g>
<circle class="k a" cx="453" cy="224" r="17"/>
<g transform="translate(372 34)"><g class="sh"><rect class="k w" x="0" y="0" width="152" height="112" rx="14"/></g>
<path class="k2 n" d="M18 92h118M18 92V18" opacity=".3"/><path class="as" d="M18 92h34M136 20H98"/><path class="k n" d="M18 92C52 92 98 20 136 20"/><circle class="k2 a" cx="52" cy="92" r="5.5"/><circle class="k2 a" cx="98" cy="20" r="5.5"/></g>
<g transform="translate(44 34)"><g class="sh"><rect class="k2 w" width="128" height="36" rx="18"/></g><text x="64" y="23" text-anchor="middle" class="sg-mono" font-size="13" fill="#111">24 fps · 12f</text></g>`),

    h3: svg(`
<defs><linearGradient id="sgH3a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb36b"/><stop offset="1" stop-color="#7b4dff"/></linearGradient>
<linearGradient id="sgH3b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fdcff"/><stop offset="1" stop-color="#0b4a8a"/></linearGradient>
<linearGradient id="sgH3c" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#e4f43a"/><stop offset="1" stop-color="#1f9d63"/></linearGradient></defs>
<rect x="34" y="40" width="214" height="128" rx="18" fill="#fff"/>
<text x="56" y="70" class="sg-mono" font-size="12" letter-spacing="2" fill="#8a8a86">PROMPT</text>
<path class="bar" d="M56 96h142M56 118h160M56 140h92"/><rect class="sg-blink" x="156" y="132" width="3" height="16" fill="#111"/>
<path d="M260 104h32M284 95l10 9-10 9" stroke="#e4f43a" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
<rect x="34" y="184" width="104" height="30" rx="15" fill="#e4f43a"/><text x="86" y="204" text-anchor="middle" font-size="13" font-weight="700" fill="#111">本机生成</text>
<rect x="304" y="28" width="224" height="304" rx="16" fill="#202020" stroke="#303030"/>
<path d="M319 42V320M513 42V320" stroke="#e4f43a" stroke-opacity=".5" stroke-width="9" stroke-dasharray="7 21"/>
<rect x="336" y="46" width="160" height="82" rx="7" fill="url(#sgH3a)"/><rect x="336" y="139" width="160" height="82" rx="7" fill="url(#sgH3b)"/><rect x="336" y="232" width="160" height="82" rx="7" fill="url(#sgH3c)"/>
<circle cx="452" cy="80" r="13" fill="#fff" fill-opacity=".85"/><path d="M336 128L372 99l24 18 30-26 38 28 32-20v29z" fill="#111" fill-opacity=".42"/>
<path d="M336 182q20-10 40 0t40 0 40 0 40 0M336 199q20-10 40 0t40 0 40 0 40 0" stroke="#fff" stroke-opacity=".65" stroke-width="3" fill="none"/>
<rect x="398" y="250" width="32" height="46" rx="7" fill="#111" fill-opacity=".55"/><path d="M430 260h7a9 9 0 0 1 0 18h-7" stroke="#111" stroke-opacity=".55" stroke-width="5" fill="none"/>
<text x="28" y="334" font-size="150" font-style="italic" fill="#e4f43a" font-family="${SERIF}">H3</text>
<path fill="#e4f43a" d="${star4(272, 52, 13)}"/><path fill="#fff" fill-opacity=".75" d="${star4(282, 262, 8)}"/><path fill="#e4f43a" fill-opacity=".6" d="${star4(232, 240, 6)}"/>`),

    video: svg(`
<g class="sh"><rect class="k w" x="70" y="24" width="420" height="180" rx="16"/></g>
<rect class="t" x="86" y="40" width="388" height="124" rx="9"/>
<path class="k2 n" d="M86 150l70-40 50 26 64-46 80 44 52-26 72 38" opacity=".35"/>
<circle class="a" cx="280" cy="102" r="28"/><path class="w" d="M271 88v28l24-14z"/>
<path class="bar" d="M96 184h120"/><rect class="i" x="398" y="176" width="76" height="16" rx="8"/><path d="M410 184h52" stroke="#fff" stroke-opacity=".7" stroke-width="4" stroke-linecap="round"/>
<g class="sh"><rect class="k w" x="36" y="222" width="488" height="118" rx="16"/></g>
<rect class="a" x="56" y="238" width="118" height="24" rx="6"/><rect class="a" x="180" y="238" width="86" height="24" rx="6" opacity=".5"/><rect class="a" x="272" y="238" width="150" height="24" rx="6"/><rect class="a" x="428" y="238" width="78" height="24" rx="6" opacity=".5"/>
<path class="wave" d="M60 280v6M76 276v14M92 272v22M108 278v10M124 270v26M140 276v14M156 280v6M172 273v20M188 268v30M204 276v14M220 272v22M236 279v8M252 271v24M268 275v16M284 269v28M300 277v12M316 272v22M332 278v10M348 270v26M364 275v16M380 280v6M396 272v22M412 276v14M428 270v26M444 278v10M460 273v20M476 277v12M492 280v6"/>
<rect class="i" x="56" y="306" width="104" height="20" rx="10"/><rect class="i" x="176" y="306" width="140" height="20" rx="10"/><rect class="i" x="336" y="306" width="112" height="20" rx="10"/>
<path d="M68 316h60M188 316h96M348 316h70" stroke="#fff" stroke-opacity=".7" stroke-width="4" stroke-linecap="round"/>
<path class="k n" d="M300 216v126"/><path class="i" d="M290 210h20l-10 11z"/>`),

    design: svg(`
<g class="sh"><rect class="k w" x="34" y="34" width="392" height="290" rx="18"/></g>
<path class="k2 n" d="M34 74h392"/><circle class="a" cx="58" cy="54" r="6"/><circle class="k2 w" cx="78" cy="54" r="5"/><circle class="k2 w" cx="98" cy="54" r="5"/><rect class="t" x="124" y="46" width="200" height="16" rx="8"/>
<path class="bar" d="M58 98h40M300 98h28M342 98h28"/>
<path class="hl" d="M58 134h196M58 164h150"/>
<rect class="i" x="58" y="192" width="98" height="30" rx="15"/><rect class="k2 w" x="166" y="192" width="80" height="30" rx="15"/>
<rect class="t" x="280" y="114" width="126" height="108" rx="12"/><circle class="a" cx="316" cy="148" r="12"/><path class="a" d="M288 214l40-44 28 28 18-16 28 32z"/>
<rect class="t" x="58" y="244" width="104" height="58" rx="10"/><rect class="t" x="174" y="244" width="104" height="58" rx="10"/><rect class="t" x="290" y="244" width="116" height="58" rx="10"/>
<path class="bar" d="M72 262h50M188 262h50M304 262h56"/>
<path class="i" stroke="#fff" stroke-width="2" stroke-linejoin="round" d="M132 208v30l8-7 7 15 7-3-7-15h11z"/>
<g class="sh"><rect class="k w" x="446" y="40" width="80" height="196" rx="40"/></g>
<circle class="a" cx="486" cy="80" r="20"/><circle class="i" cx="486" cy="130" r="20"/><circle class="k2 t" cx="486" cy="180" r="20"/>
<g class="sh"><rect class="k w" x="446" y="252" width="80" height="72" rx="14"/></g>
<text x="486" y="301" text-anchor="middle" font-size="36" font-style="italic" fill="#111" font-family="${SERIF}">Aa</text>`),

    marketing: svg(`
<g transform="translate(30 132)"><path class="k a" d="M8 40v40a6 6 0 0 0 6 6h18l78 44V-10L32 34H14a6 6 0 0 0-6 6z"/><path class="k n" d="M30 86l12 46"/><path class="k2 n" d="M126 40q16 20 0 40M142 26q30 34 0 68"/></g>
<g class="sh"><rect class="k w" x="206" y="18" width="178" height="324" rx="30"/></g>
<rect class="i" x="267" y="30" width="56" height="10" rx="5"/>
<rect class="t" x="222" y="56" width="146" height="152" rx="14"/><circle class="a" cx="295" cy="116" r="34"/>
<rect class="k2 w" x="283" y="128" width="24" height="58" rx="8"/><rect class="k2 i" x="289" y="117" width="12" height="12" rx="3"/>
<path class="a" d="M236 236c0-6 8-9 12-3 4-6 12-3 12 3 0 7-12 14-12 14s-12-7-12-14z"/>
<path class="bar" d="M274 241h40M236 272h120M236 292h86"/>
<g class="sh"><rect class="k2 w" x="400" y="52" width="126" height="36" rx="18"/></g><text x="463" y="75" text-anchor="middle" font-size="14" font-weight="700" fill="#111">#新品首发</text>
<g class="sh"><rect class="k2 w" x="414" y="102" width="98" height="36" rx="18"/></g><text x="463" y="125" text-anchor="middle" font-size="14" font-weight="700" fill="#111">#种草</text>
<g class="sh"><rect class="k w" x="400" y="186" width="128" height="120" rx="16"/></g>
<path class="bar" d="M416 206h44"/><path class="as" d="M416 286l26-24 20 12 32-38 18 6M496 232l16-3-3 16"/>
<path class="a" opacity=".7" d="M384 36c0-4 5-6 8-2 3-4 8-2 8 2 0 5-8 9-8 9s-8-4-8-9z"/><path class="a" opacity=".45" d="M196 300c0-3 4-5 6-1.5 2-3.5 6-1.5 6 1.5 0 4-6 7-6 7s-6-3-6-7z"/>`),

    office: svg(`
<g transform="rotate(-7 138 188)"><g class="sh"><rect class="k w" x="50" y="70" width="176" height="236" rx="14"/></g>
<path class="hl2" d="M72 104h96"/><path class="bar" d="M72 136h132M72 156h118M72 176h132M72 196h88"/>
<rect class="k2 w" x="72" y="222" width="14" height="14" rx="3"/><path class="k2 n" d="M75 229l3 3 6-6"/><path class="bar" d="M98 229h88"/>
<rect class="k2 w" x="72" y="250" width="14" height="14" rx="3"/><path class="bar" d="M98 257h68"/></g>
<g class="sh"><rect class="k w" x="196" y="40" width="212" height="214" rx="14"/></g>
<path class="t" d="M210 41.25h184a12.75 12.75 0 0 1 12.75 12.75v20H197.25V54A12.75 12.75 0 0 1 210 41.25z"/>
<path class="k2 n" d="M196 74h212M196 108h212M196 142h212M196 176h212M196 210h212M249 40v214M302 40v214M355 40v214" opacity=".28"/>
<rect class="a" x="302" y="108" width="53" height="34"/><path class="k2 n" d="M314 126h28" stroke="#fff"/>
<path class="as" d="M216 200v-14M228 200v-26M240 200v-18"/>
<g transform="rotate(6 440 228)"><g class="sh"><rect class="k w" x="350" y="166" width="182" height="124" rx="12"/></g>
<path class="hl2" d="M368 192h80"/><circle class="t" cx="398" cy="246" r="26"/><path class="a" d="M398 246v-26a26 26 0 0 1 24.7 18z"/><path class="bar" d="M444 236h66M444 256h50"/></g>
<g transform="translate(236 274)"><rect class="a" width="78" height="34" rx="17"/><text x="39" y="23" text-anchor="middle" font-size="14" font-weight="800" fill="#fff" class="sg-mono">PDF</text></g>`),

    finance: svg(`
<g class="sh"><rect class="k w" x="34" y="34" width="356" height="266" rx="18"/></g>
<path class="k2 n" d="M58 70h308M58 130h308M58 190h308" opacity=".08"/><path class="k2 n" d="M58 248h308" opacity=".25"/>
<path class="k2 n" d="M80 186v52M110 176v50M140 166v50M170 146v50M200 156v45M230 131v50M260 116v50M290 121v50M320 96v50M350 81v50"/>
<rect class="k2 w" x="73" y="196" width="14" height="30" rx="2"/><rect class="i" x="103" y="186" width="14" height="25" rx="2"/><rect class="k2 w" x="133" y="171" width="14" height="30" rx="2"/><rect class="k2 w" x="163" y="156" width="14" height="30" rx="2"/><rect class="i" x="193" y="161" width="14" height="30" rx="2"/>
<rect class="k2 w" x="223" y="136" width="14" height="35" rx="2"/><rect class="k2 w" x="253" y="124" width="14" height="32" rx="2"/><rect class="i" x="283" y="131" width="14" height="30" rx="2"/><rect class="k2 w" x="313" y="104" width="14" height="32" rx="2"/><rect class="k2 w" x="343" y="88" width="14" height="33" rx="2"/>
<path class="as" d="M80 222C110 210 130 198 170 182S230 160 260 150s60-22 90-38"/>
<path class="vol" d="M80 284v-14M110 284v-20M140 284v-10M170 284v-18M200 284v-24M230 284v-12M260 284v-16M290 284v-22M320 284v-14M350 284v-26"/>
<g transform="rotate(4 468 178)"><g class="sh"><rect class="k w" x="404" y="60" width="128" height="192" rx="12"/></g>
<path class="a" d="M416 61.25h104a10.75 10.75 0 0 1 10.75 10.75v24H405.25V72A10.75 10.75 0 0 1 416 61.25z"/>
<path class="bar" d="M422 118h90M422 138h76M422 158h90"/><circle class="t" cx="446" cy="208" r="22"/><path class="a" d="M446 208v-22a22 22 0 0 1 21 15z"/><path class="bar" d="M480 200h34M480 218h26"/></g>
<g transform="translate(34 314)"><g class="sh"><rect class="k2 w" width="176" height="34" rx="17"/></g><text x="88" y="22" text-anchor="middle" font-size="13" font-weight="700" fill="#111">仅研究分析 · 不荐股</text></g>`),

    general: svg(`
<g class="sh"><rect x="34" y="40" width="314" height="240" rx="18" fill="#141414"/></g>
<circle cx="58" cy="64" r="6" fill="#ff5f57"/><circle cx="78" cy="64" r="6" fill="#febc2e"/><circle cx="98" cy="64" r="6" fill="#28c840"/>
<text x="58" y="114" class="sg-mono" font-size="17" fill="#e4f43a">› /skill-creator</text>
<path d="M58 144h200M58 168h150M58 192h224" stroke="#fff" stroke-opacity=".18" stroke-width="7" stroke-linecap="round"/>
<path d="M58 230l8 8 16-16" stroke="#3ddc84" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M96 230h120" stroke="#fff" stroke-opacity=".35" stroke-width="7" stroke-linecap="round"/>
<path class="k2 n" d="M424 92l64 48M424 92l-46 76M488 140l-40 74M378 168l70 46M448 214l46 70M448 214l-56 76M488 140l32 74" opacity=".45"/>
<circle class="k w" cx="424" cy="92" r="16"/><circle class="k a" cx="488" cy="140" r="20"/><circle class="k w" cx="378" cy="168" r="13"/><circle class="k i" cx="448" cy="214" r="18"/><circle class="k w" cx="494" cy="284" r="13"/><circle class="k w" cx="392" cy="290" r="11"/><circle class="k t" cx="520" cy="214" r="10"/>
<g transform="translate(58 298)"><g class="sh"><rect class="k2 w" width="200" height="36" rx="18"/></g><text x="100" y="23" text-anchor="middle" font-size="13" font-weight="700" fill="#111">把你的流程做成技能</text></g>
<path fill="#e4f43a" d="${star4(330, 36, 11)}"/>`),
  };

  return { glyph, scene, star4 };
})();
