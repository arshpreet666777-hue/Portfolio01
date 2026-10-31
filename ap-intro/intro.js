/* ARSH.FX — website intro (real-time port of the rendered intro video).
 *
 * Add to <head>, before any other script:
 *   <script>try{if(!sessionStorage.getItem('apIntroSeen')&&!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('ap-intro-pending')}catch(e){}</script>
 *   <style>html.ap-intro-pending body{overflow:hidden}html.ap-intro-pending::after{content:"";position:fixed;inset:0;background:#010200;z-index:9999;animation:apIntroFailsafe 0s 6s forwards}@keyframes apIntroFailsafe{to{visibility:hidden}}</style>
 *   <script src="ap-intro/intro.js" defer></script>
 *
 * Plays once per browser session, can be skipped (button / Esc / Enter), and
 * fires `ap-intro:done` on document when the site is revealed.
 * Optional: window.AP_INTRO_CONFIG = { once: 'session' | 'always', audio: 'intro-audio.mp3' | null }
 */
(function () {
  'use strict';
  const doc = document, html = doc.documentElement;
  const CFG = Object.assign({ once: 'session', audio: 'intro-audio.mp3' }, window.AP_INTRO_CONFIG || {});
  const BASE = (doc.currentScript && doc.currentScript.src || '').replace(/[^/]*$/, '');
  const DONE_EVT = 'ap-intro:done';
  const DUR = 8.3;

  const pending = html.classList.contains('ap-intro-pending') || CFG.once === 'always';
  if (!pending) { window.__apIntroActive = false; doc.dispatchEvent(new CustomEvent(DONE_EVT)); return; }
  window.__apIntroActive = true;
  try { sessionStorage.setItem('apIntroSeen', '1'); } catch (e) {}

  // ---------- design canvas: fixed width, height follows the screen's aspect ----------
  const vw0 = innerWidth, vh0 = innerHeight, ar = vw0 / vh0;
  const clampN = (v, a, b) => Math.min(b, Math.max(a, v));
  const W = ar >= 1.25 ? 1920 : 1080;
  const H = Math.round(ar >= 1.25 ? clampN(1920 / ar, 900, 1536) : clampN(1080 / ar, 1350, 2400));
  const VERT = H > W, CX = W / 2, CY = H / 2;

  // ---------- helpers (same motion maths as the video) ----------
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const E = {
    outCubic: t => 1 - Math.pow(1 - t, 3),
    inCubic: t => t * t * t,
    outExpo: t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
    inExpo: t => t <= 0 ? 0 : Math.pow(2, 10 * t - 10),
    inOutCubic: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  };
  const P = (t, a, b) => clamp((t - a) / (b - a));
  const spring = (t, t0, from, to, freq = 1.8, damp = 7) => { const x = t - t0; if (x <= 0) return from; return to + (from - to) * Math.exp(-damp * x) * Math.cos(2 * Math.PI * freq * x); };
  const vel = (fn, t) => (fn(t + .004) - fn(t - .004)) / .008;
  function el(tag, cls, inner, parent, style) { const e = doc.createElement(tag); if (cls) e.className = cls; if (inner != null) e.innerHTML = inner; if (style) e.style.cssText = style; parent.appendChild(e); return e; }
  function tf(e, x, y, s = 1, r = 0) { e.style.transform = `translate(${x.toFixed(2)}px,${y.toFixed(2)}px) translate(-50%,-50%) rotate(${r.toFixed(3)}deg) scale(${s.toFixed(4)})`; }
  function fx(e, blur, op) { e.style.filter = blur > 0.08 ? `blur(${blur.toFixed(2)}px)` : 'none'; if (op != null) e.style.opacity = clamp(op).toFixed(3); }
  function words(parent, list, style) { return list.map((w, i) => el('span', 'api-w', w + (i < list.length - 1 ? ' ' : ''), parent, style || '')); }
  function reveal(e, t, start, dur, dx = 30, dy = 0, blur = 20, skew = 0) {
    const p = E.outCubic(P(t, start, start + dur));
    e.style.opacity = P(t, start, start + dur * .45).toFixed(3);
    e.style.transform = `translate(${((1 - p) * dx).toFixed(2)}px,${((1 - p) * dy).toFixed(2)}px) skewX(${((1 - p) * skew).toFixed(2)}deg)`;
    const lb = Math.pow(1 - P(t, start, start + dur), 1.3);
    e.style.filter = lb > .004 ? `blur(${(lb * blur).toFixed(2)}px)` : 'none';
  }

  const DARK_BG = 'radial-gradient(85% 60% at 50% 115%, rgba(150,225,35,.62) 0%, rgba(80,140,10,.3) 42%, rgba(0,0,0,0) 74%), radial-gradient(35% 30% at 6% 106%, rgba(120,190,20,.26), rgba(0,0,0,0) 70%), radial-gradient(35% 30% at 94% 106%, rgba(120,190,20,.22), rgba(0,0,0,0) 70%), #010200';
  const LIGHT_BG = 'radial-gradient(62% 58% at 102% 108%, rgba(166,226,46,.92), rgba(166,226,46,0) 72%), radial-gradient(50% 50% at -4% 108%, rgba(166,226,46,.6), rgba(166,226,46,0) 70%), linear-gradient(180deg,#FFFFFF 0%,#FAFFF0 40%,#E2F9B0 100%)';

  // ---------- styles (scoped to #ap-intro) ----------
  el('style', null, `
html.ap-intro-on,html.ap-intro-on body{overflow:hidden!important}
#ap-intro{position:fixed;inset:0;z-index:9999;background:#010200;overflow:hidden;transition:opacity .45s ease}
#ap-intro *{box-sizing:border-box;margin:0;padding:0;font-family:'APIntroPJ',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
#ap-intro .api-stage{position:absolute;left:0;top:0;transform-origin:0 0;overflow:hidden}
#ap-intro .api-scene{position:absolute;inset:0;overflow:hidden;display:none}
#ap-intro .api-a{position:absolute;left:0;top:0;transform-origin:50% 50%}
#ap-intro .api-bg{position:absolute;left:0;top:0;width:100%;height:100%}
#ap-intro .api-w{display:inline-block;white-space:pre}
#ap-intro .api-mask{position:relative;overflow:hidden;display:block}
#ap-intro .api-ui{position:absolute;right:max(18px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));display:flex;gap:10px;z-index:5;opacity:0;transition:opacity .5s ease}
#ap-intro .api-btn{font:600 13px/1 'APIntroPJ',system-ui,sans-serif;letter-spacing:.02em;color:#EAFFC8;background:rgba(10,16,6,.72);border:1px solid rgba(184,245,53,.45);border-radius:999px;padding:10px 16px;display:inline-flex;align-items:center;gap:8px;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);transition:background .2s,color .2s}
#ap-intro .api-btn:hover,#ap-intro .api-btn:focus-visible{background:#B8F535;color:#0E1A04;outline:none}
`, doc.head);

  // ---------- overlay ----------
  const root = el('div', null, null, doc.body, '');
  root.id = 'ap-intro';
  root.setAttribute('aria-label', 'Intro animation');
  const stage = el('div', 'api-stage', null, root, `width:${W}px;height:${H}px;will-change:transform`);
  function fit() {
    const vw = innerWidth, vh = innerHeight, s = Math.max(vw / W, vh / H);
    stage.style.transform = `translate(${((vw - W * s) / 2).toFixed(2)}px,${((vh - H * s) / 2).toFixed(2)}px) scale(${s.toFixed(5)})`;
  }
  fit(); addEventListener('resize', fit);
  html.classList.add('ap-intro-on');
  html.classList.remove('ap-intro-pending');
  const $ = sel => root.querySelector(sel);

  const SC = [['A', -1, 1.877], ['B', 1.877, 3.253], ['C', 3.253, 6.131], ['D', 6.131, 99]];
  const S = {}; for (const [id, a, b] of SC) S[id] = { el: el('div', 'api-scene', null, stage, ''), a, b };

  // =====================================================================
  // A  lime line draws, giant "Hi" rises out of it, dot bounces, push-in
  // =====================================================================
  const sA = S.A.el;
  el('div', 'api-bg', null, sA, `background:${DARK_BG}`);
  const gA = el('div', 'api-a', null, sA, `width:${W}px;height:${H}px;will-change:transform`);
  const FA = VERT ? 400 : 520, LY = CY + (VERT ? 130 : 150), LW = W * (VERT ? .84 : .7);
  const lineA = el('div', 'api-a', null, gA, `width:${LW}px;height:5px;border-radius:3px;background:linear-gradient(90deg,rgba(200,247,90,0),#D4FA70 30%,#D4FA70 70%,rgba(200,247,90,0));box-shadow:0 0 24px rgba(184,245,53,.8)`);
  const maskA = el('div', null, null, gA, `position:absolute;left:0;top:0;width:${W}px;height:${LY}px;overflow:hidden`);
  const hiA = el('div', 'api-a', 'Hi', maskA, `font-weight:800;font-size:${FA}px;letter-spacing:-.05em;line-height:1;color:#EEFFD0;text-shadow:0 0 60px rgba(184,245,53,.45)`);
  const dotA = el('div', 'api-a', null, gA, `width:${FA * .17}px;height:${FA * .17}px;border-radius:50%;background:#B8F535;box-shadow:0 0 40px rgba(184,245,53,.8)`);
  let HIW = 0;
  const riseA = t => t < .3 ? 1 : spring(t, .3, 1, 0, 1.5, 7.5);
  function sAf(t) {
    const cam = lerp(1, 1.04, P(t, .5, 1.4)) * (1 + .32 * E.inExpo(P(t, 1.38, 1.877)));
    tf(gA, CX, CY, cam); fx(gA, 14 * E.inExpo(P(t, 1.45, 1.877)), 1);
    tf(lineA, CX, LY + 3); lineA.style.transform += ` scaleX(${E.outExpo(P(t, .04, .5)).toFixed(4)})`;
    lineA.style.opacity = (P(t, .02, .08) * (1 - .65 * P(t, .9, 1.3))).toFixed(3);
    const r = riseA(t);
    tf(hiA, CX, LY - FA * .38 + r * FA * 1.02); fx(hiA, Math.min(18, Math.abs(vel(riseA, t)) * FA * .0016), 1);
    const ds = t < .84 ? 0 : Math.max(0, spring(t, .84, 0, 1, 2.1, 7.5));
    tf(dotA, CX + HIW / 2 + FA * .16, LY - FA * .085 + spring(t, .84, -FA * .5, 0, 1.9, 7), ds);
  }

  // =====================================================================
  // B  "Welcome to / my portfolio" — masked lines, lime highlighter
  // =====================================================================
  const sB = S.B.el;
  el('div', 'api-bg', null, sB, `background:${LIGHT_BG}`);
  const FB = VERT ? 112 : 140;
  const blockB = el('div', 'api-a', null, sB, `font-weight:800;font-size:${FB}px;letter-spacing:-.045em;line-height:1.08;color:#1F3A06;white-space:nowrap;will-change:transform`);
  const mB = [0, 1].map(() => el('div', 'api-mask', null, blockB, `padding:0 ${FB * .18}px ${FB * .06}px`));
  const tB0 = el('div', null, 'Welcome to', mB[0], 'display:inline-block;transform-origin:0 100%');
  const tB1 = el('div', null, 'my <span style="position:relative;display:inline-block;padding:0 .14em"><span id="api-hlB" style="position:absolute;left:0;right:0;top:.1em;bottom:.02em;border-radius:.16em;background:#B8F535;box-shadow:0 10px 30px rgba(150,210,30,.45);transform-origin:0 50%;z-index:0"></span><span style="position:relative;z-index:1">portfolio</span></span>', mB[1], 'display:inline-block;transform-origin:0 100%');
  const hlB = $('#api-hlB');
  const tagB = el('div', 'api-a', null, sB, `font-weight:700;font-size:${VERT ? 30 : 32}px;letter-spacing:.22em;color:#4E8A0E`);
  const tagBi = el('div', null, '<span style="width:14px;height:14px;border-radius:50%;background:#7CC417;box-shadow:0 0 14px rgba(124,196,23,.8)"></span>ARSHPREET · 2026', tagB, 'display:flex;align-items:center;gap:14px');
  function sBf(t) {
    const exit = E.inCubic(P(t, 3.02, 3.253));
    tf(blockB, CX, CY + 18 - exit * 90, lerp(1, 1.045, P(t, 1.877, 3.253))); fx(blockB, exit * 16, 1);
    [tB0, tB1].forEach((e, i) => { const s = 1.92 + i * .12, p = P(t, s, s + .62), q = p <= 0 ? 0 : E.outBack(p, .9);
      e.style.transform = `translateY(${((1 - q) * 115).toFixed(2)}%) rotate(${((1 - E.outCubic(p)) * 5).toFixed(2)}deg)`; });
    hlB.style.transform = `scaleX(${E.outExpo(P(t, 2.42, 2.8)).toFixed(4)})`;
    tf(tagB, CX, CY - (VERT ? FB * 1.45 : FB * 1.38) - exit * 90); reveal(tagBi, t, 2.05, .4, 0, 14, 12);
  }

  // =====================================================================
  // C  "Are you looking for a" + slot roller + big "?" whose dot irises open
  // =====================================================================
  const sC = S.C.el;
  el('div', 'api-bg', null, sC, `background:${DARK_BG}`);
  const gC = el('div', 'api-a', null, sC, `width:${W}px;height:${H}px;will-change:transform`);
  const qY = VERT ? CY - 330 : CY - 190, rY = VERT ? CY - 120 : CY + 10;
  const lnC = el('div', 'api-a', null, gC, `white-space:nowrap;font-weight:600;font-size:${VERT ? 60 : 72}px;letter-spacing:-.03em;color:#EAFFC8`);
  const wC = words(lnC, ['Are', 'you', 'looking', 'for', 'a']);
  const ITEMS = ['Video Editor', 'Motion Graphics Artist', 'Video Editor', 'Motion Graphics Artist'];
  let FR = VERT ? 84 : 118, SP = 0, WH = 0, IW = [], IWMAX = 1;
  const win = el('div', null, null, gC, `position:absolute;left:0;width:${W}px;overflow:hidden`);
  const roll = el('div', null, null, win, 'position:absolute;left:0;top:0;width:100%;height:100%');
  const items = ITEMS.map(s => el('div', 'api-a', s, roll, 'white-space:nowrap;font-weight:800;letter-spacing:-.045em;line-height:1;color:#B8F535;text-shadow:0 0 34px rgba(184,245,53,.55)'));
  const ulC = el('div', 'api-a', null, gC, 'height:6px;border-radius:3px;background:#B8F535;box-shadow:0 0 18px rgba(184,245,53,.8)');
  const QH = VERT ? 440 : 560, QX = VERT ? CX : W * .885, QYc = VERT ? CY + 300 : CY + 20;
  const qSvg = el('div', 'api-a', `<svg viewBox="0 0 200 300" width="${QH * 200 / 300}" height="${QH}" style="overflow:visible;display:block"><path id="api-qhook" d="M48 82 Q48 22 100 22 Q152 22 152 78 Q152 118 112 138 Q100 145 100 172 L100 192" fill="none" stroke="#B8F535" stroke-width="34" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1" style="filter:drop-shadow(0 0 18px rgba(184,245,53,.7))"/></svg>`, gC, '');
  const qHook = $('#api-qhook');
  const qDot = el('div', 'api-a', null, sC, `width:${QH * .15}px;height:${QH * .15}px;border-radius:50%;background:#B8F535;box-shadow:0 0 30px rgba(184,245,53,.8)`);
  const rollK = t => {
    if (t < 3.5) return -1.25;
    if (t < 4.62) return lerp(-1.25, 0, E.outBack(P(t, 3.5, 3.96), 1.35));
    return lerp(0, 3, E.outBack(P(t, 4.62, 5.14), 1.05));
  };
  function sCf(t) {
    const iris = E.inCubic(P(t, 5.74, 6.131));
    tf(gC, CX, CY, lerp(1, 1.05, P(t, 3.253, 5.74)) * (1 + .06 * iris)); fx(gC, iris * 6, 1);
    tf(lnC, CX, qY); wC.forEach((w, i) => reveal(w, t, 3.3 + i * .085, .34, 24, 10, 18, -8));
    const k = rollK(t), v = Math.abs(vel(rollK, t)) * SP;
    items.forEach((e, i) => tf(e, CX, WH / 2 + (i - k) * SP));
    const vb = Math.min(22, v * .006);
    roll.style.filter = vb > .05 ? `blur(${vb.toFixed(2)}px)` : 'none';
    const kc = clamp(k, 0, 3), i0 = Math.floor(kc), i1 = Math.min(3, i0 + 1);
    const uw = lerp(IW[i0], IW[i1], kc - i0) * E.outExpo(P(t, 3.72, 4.1));
    tf(ulC, CX, rY + WH / 2 + 16); ulC.style.transform += ` scaleX(${(uw / IWMAX).toFixed(4)})`;
    ulC.style.opacity = P(t, 3.72, 3.8).toFixed(3);
    const qr = t < 4.95 ? -28 : spring(t, 4.95, -28, 0, 1.4, 6.5), qs = t < 4.95 ? .6 : spring(t, 4.95, .6, 1, 1.6, 7);
    tf(qSvg, QX, QYc, qs, qr); qSvg.style.opacity = P(t, 4.95, 5.05).toFixed(3);
    qHook.setAttribute('stroke-dashoffset', (1 - E.outCubic(P(t, 4.97, 5.35))).toFixed(4));
    const dS = QH / 300, ang = qr * Math.PI / 180, ly = (252 - 150) * dS * qs;
    const dx = QX - ly * Math.sin(ang), dy = QYc + ly * Math.cos(ang);
    const pop = t < 5.24 ? 0 : Math.max(0, spring(t, 5.24, 0, 1, 2.2, 8));
    const big = Math.hypot(W, H) * 2.3 / (QH * .15);
    tf(qDot, lerp(dx, CX, iris), lerp(dy, CY, iris), pop * qs * lerp(1, big, iris));
  }

  // =====================================================================
  // D  lime: "You're in the / right place ✓" — masked rise, dark pill wipe, check
  // =====================================================================
  const sD = S.D.el;
  el('div', 'api-bg', null, sD, 'background:radial-gradient(70% 70% at 50% 45%,#CFFB66 0%,#B8F535 55%,#9FDB22 100%)');
  const FD = VERT ? 118 : 168;
  const blockD = el('div', 'api-a', null, sD, `text-align:center;font-weight:800;font-size:${FD}px;letter-spacing:-.05em;line-height:1.06;color:#142608;white-space:nowrap;will-change:transform`);
  const mD = [0, 1].map((_, i) => el('div', 'api-mask', null, blockD, `padding:${i ? FD * .06 : 0}px ${FD * .2}px ${i ? FD * .24 : FD * .05}px`));
  const lD = [
    el('div', null, 'You’re in the', mD[0], 'display:inline-block'),
    el('div', null, '<span id="api-sj" style="position:relative;display:inline-block;padding:0 .18em"><span id="api-pill" style="position:absolute;left:0;right:0;top:.04em;bottom:-.17em;border-radius:.5em;background:#142608;box-shadow:0 14px 34px rgba(20,38,8,.35);clip-path:inset(0 100% 0 0 round .5em)"></span><span id="api-sjT" style="position:relative;color:transparent;-webkit-background-clip:text;background-clip:text;background-image:linear-gradient(90deg,#C8F75A 0%,#142608 0%)">right place</span></span><span id="api-chk" style="display:inline-block;vertical-align:middle;margin-left:.22em;width:.78em;height:.78em;border-radius:50%;background:#142608;position:relative;top:-.06em;transform:scale(0)"><svg viewBox="0 0 100 100" style="position:absolute;inset:0;width:100%;height:100%;display:block"><path id="api-chkP" d="M28 52 L44 67 L73 36" fill="none" stroke="#C8F75A" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/></svg></span>', mD[1], 'display:inline-block'),
  ];
  const sj = $('#api-sj'), sjT = $('#api-sjT'), pillD = $('#api-pill'), chk = $('#api-chk'), chkP = $('#api-chkP');
  let SJW = 0, SJTW = 0;
  function sDf(t) {
    const exit = E.inExpo(P(t, 7.86, 8.258));
    tf(blockD, CX, CY, lerp(1, 1.04, P(t, 6.131, 7.86)) * (1 + 1.4 * exit)); fx(blockD, exit * 22, 1);
    root.style.opacity = (1 - E.inOutCubic(P(t, 7.9, 8.3))).toFixed(3);
    lD.forEach((e, i) => { const s = 6.17 + i * .1, p = P(t, s, s + .6), q = p <= 0 ? 0 : E.outBack(p, .9);
      e.style.transform = `translateY(${((1 - q) * 112).toFixed(2)}%) rotate(${((1 - E.outCubic(p)) * 4).toFixed(2)}deg)`; });
    // slow, even wipe; the text colour flips exactly at the pill's leading edge
    const w = E.inOutCubic(P(t, 6.78, 7.38));
    pillD.style.clipPath = `inset(0 ${((1 - w) * 100).toFixed(3)}% 0 0 round .5em)`;
    const stop = (clamp((w * SJW - (SJW - SJTW) / 2) / SJTW) * 100).toFixed(3);
    sjT.style.backgroundImage = `linear-gradient(90deg,#C8F75A ${stop}%,#142608 ${stop}%)`;
    const cs = t < 7.34 ? 0 : Math.max(0, spring(t, 7.34, 0, 1, 2, 7.5));
    chk.style.transform = `scale(${cs.toFixed(4)})`;
    chkP.setAttribute('stroke-dashoffset', (1 - E.outCubic(P(t, 7.43, 7.7))).toFixed(4));
  }

  // ---------- film grain (moved with transforms so it stays on the compositor) ----------
  const gc = doc.createElement('canvas'); gc.width = gc.height = 256;
  { const x = gc.getContext('2d'), d = x.createImageData(256, 256); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); }
  const grain = el('div', null, null, stage, `position:absolute;left:0;top:0;width:${W + 256}px;height:${H + 256}px;background-image:url(${gc.toDataURL()});background-size:256px;mix-blend-mode:overlay;opacity:.05;pointer-events:none;will-change:transform`);

  // ---------- UI: sound + skip ----------
  const ui = el('div', 'api-ui', null, root, '');
  let audio = null, soundOn = false;
  const sndBtn = CFG.audio ? el('button', 'api-btn', '🔇 Sound', ui, '') : null;
  const skipBtn = el('button', 'api-btn', 'Skip intro <span aria-hidden="true">→</span>', ui, '');
  sndBtn && sndBtn.setAttribute('type', 'button'); skipBtn.setAttribute('type', 'button');
  if (sndBtn) {
    audio = new Audio(BASE + CFG.audio); audio.preload = 'auto';
    sndBtn.addEventListener('click', () => {
      soundOn = !soundOn;
      if (soundOn) { audio.currentTime = Math.min(t, DUR - .05); audio.volume = 1; audio.play().catch(() => {}); sndBtn.textContent = '🔊 Sound'; }
      else { audio.pause(); sndBtn.textContent = '🔇 Sound'; }
    });
  }
  skipBtn.addEventListener('click', () => finish(true));
  const onKey = e => { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); finish(true); } };
  addEventListener('keydown', onKey);

  // ---------- main loop ----------
  const FN = { A: sAf, B: sBf, C: sCf, D: sDf };
  let t = 0, last = 0, raf = 0, ended = false;
  function render(tt) {
    for (const id in S) { const s = S[id], on = tt >= s.a && tt < s.b; s.el.style.display = on ? 'block' : 'none'; if (on) FN[id](tt); }
    const g = Math.floor(tt * 60);
    grain.style.transform = `translate(${-((g * 73) % 256)}px,${-((g * 151) % 256)}px)`;
  }
  function frame(now) {
    if (ended) return;
    // follow the audio clock when sound is on; otherwise advance by frame time
    // (capped, so a backgrounded tab resumes where it left off instead of skipping ahead)
    if (soundOn && audio && !audio.paused) t = audio.currentTime;
    else t += Math.min(.05, (now - last) / 1000);
    last = now;
    if (t >= DUR) { render(DUR); finish(false); return; }
    render(t);
    raf = requestAnimationFrame(frame);
  }
  function finish(skipped) {
    if (ended) return; ended = true;
    cancelAnimationFrame(raf);
    removeEventListener('keydown', onKey); removeEventListener('resize', fit);
    if (audio && !audio.paused) { const a = audio, v0 = a.volume, st = performance.now(); (function f(n) { const k = Math.min(1, (n - st) / 350); a.volume = v0 * (1 - k); if (k < 1) requestAnimationFrame(f); else a.pause(); })(st); }
    html.classList.remove('ap-intro-on');
    window.__apIntroActive = false;
    doc.dispatchEvent(new CustomEvent(DONE_EVT, { detail: { skipped } }));
    root.style.pointerEvents = 'none';
    if (skipped) root.style.opacity = '0';
    setTimeout(() => root.remove(), skipped ? 500 : 50);
  }

  // ---------- fonts, measurements, start ----------
  const FONTS = [['600', 'pj-600.woff2'], ['700', 'pj-700.woff2'], ['800', 'pj-800.woff2']];
  const fontLoad = Promise.all(FONTS.map(([w, f]) => { const ff = new FontFace('APIntroPJ', `url(${BASE}fonts/${f}) format("woff2")`, { weight: w }); doc.fonts.add(ff); return ff.load().catch(() => {}); }));
  Promise.race([fontLoad, new Promise(r => setTimeout(r, 2500))]).then(() => {
    for (const id in S) S[id].el.style.display = 'block';
    HIW = hiA.offsetWidth;
    items.forEach(e => e.style.fontSize = FR + 'px');
    const maxW = Math.max(...items.map(e => e.offsetWidth)), lim = VERT ? W * .88 : W * .6;
    if (maxW > lim) { FR *= lim / maxW; items.forEach(e => e.style.fontSize = FR + 'px'); }
    IW = items.map(e => e.offsetWidth); IWMAX = Math.max(...IW); SP = FR * 1.3; WH = FR * 1.32;
    ulC.style.width = IWMAX + 'px';
    win.style.top = (rY - WH / 2) + 'px'; win.style.height = WH + 'px';
    const fitW = (e, l) => { const w = e.offsetWidth; if (w > l) e.style.fontSize = (parseFloat(getComputedStyle(e).fontSize) * l / w) + 'px'; };
    fitW(lnC, W * .88); fitW(blockB, W * .9); fitW(blockD, W * .9);
    SJW = sj.offsetWidth; SJTW = sjT.offsetWidth;
    render(0);
    ui.style.opacity = '1';
    last = performance.now();
    raf = requestAnimationFrame(frame);
  });
})();
