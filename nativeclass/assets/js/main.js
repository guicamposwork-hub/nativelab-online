/* =========================================================
   NativeClass | LP das aulas ao vivo
   ========================================================= */

/* ---------- CONFIGURAÇÃO: preencha antes de publicar ---------- */
const CONFIG = {
  checkout: "https://pay.kirvano.com/18853490-2a28-4326-97cc-4f1475a59eff",   // checkout da Kirvano (vazio = os botões levam até a oferta)
  esgotado: false,     // true quando as vagas acabarem
  horaAula: 20,        // hora (Brasília) em que a aula termina na segunda: depois disso a página passa para a segunda seguinte

  // Medição (opcional)
  ga4Id: "",           // ex.: "G-XXXXXXXXXX"
  metaPixelId: "",     // ex.: "123456789012345"
};

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
const saveData = navigator.connection?.saveData === true;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(Math.max(v, a), b);

if (!reduceMotion) document.documentElement.classList.add("m-ready");

/* ---------- "Nesta segunda" calculado pelo horário de Brasília ---------- */
(() => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false, weekday: "short",
  }).formatToParts(new Date()).reduce((o, p) => (o[p.type] = p.value, o), {});
  const today = new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day));
  const dow = today.getUTCDay();            // 0 dom … 1 seg
  const isToday = dow === 1 && +parts.hour < CONFIG.horaAula;
  const add = isToday ? 0 : ((8 - dow) % 7 || 7);
  const monday = new Date(today.getTime() + add * 864e5);
  const ddmm = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(monday);

  const text = {
    "phrase": isToday ? "hoje" : "nesta segunda",
    "Phrase": isToday ? "Hoje" : "Nesta segunda",
    "phrase-date": isToday ? "hoje" : `nesta segunda, ${ddmm}`,
  };
  $$("[data-when]").forEach(el => { el.textContent = text[el.dataset.when] ?? el.textContent; });
  const ticker = $(".ticker");
  if (ticker) ticker.setAttribute("aria-label", `Aula ao vivo ${text["phrase-date"]}, no YouTube. Vagas limitadas. R$ 9,99.`);
})();

/* ---------- Medição ---------- */
const track = (() => {
  if (CONFIG.ga4Id) {
    const s = document.createElement("script");
    s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.ga4Id}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag("js", new Date()); gtag("config", CONFIG.ga4Id);
  }
  if (CONFIG.metaPixelId) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");
    fbq("init", CONFIG.metaPixelId); fbq("track", "PageView");
  }
  return (name, params = {}, meta) => {
    window.gtag?.("event", name, params);
    if (meta) window.fbq?.("track", meta, params);
  };
})();

/* ---------- Botões de compra ---------- */
$$("[data-checkout]").forEach(a => {
  if (CONFIG.esgotado) {
    a.classList.add("is-off");
    a.textContent = a.closest(".bar, .dock") ? "Esgotado" : "Vagas esgotadas";
    a.setAttribute("aria-disabled", "true");
    a.removeAttribute("href");
    return;
  }
  if (CONFIG.checkout) { a.href = CONFIG.checkout; a.rel = "noopener"; }
  a.addEventListener("click", () => {
    const place = a.dataset.place;
    track("cta_click", { location: place });
    if (CONFIG.checkout) track("begin_checkout", { location: place, value: 9.99, currency: "BRL" }, "InitiateCheckout");
  });
});

/* ---------- Ticker contínuo: duplica a linha para o loop não ter emenda ---------- */
$$(".ticker-track").forEach(t => { const row = t.firstElementChild; t.append(row.cloneNode(true)); });

/* ---------- Entradas ---------- */
const markIn = el => el.classList.add("is-in");
if (reduceMotion) {
  $$("[data-in], [data-stagger], .hero-title, .proof-statement, .proof-strip, .turn-title, .offer, .final-title").forEach(markIn);
} else {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { markIn(e.target); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -12% 0px" });
  $$("[data-in], [data-stagger], .proof-statement, .proof-strip, .turn-title, .offer, .final-title").forEach(el => {
    if (!el.closest(".hero")) io.observe(el);
  });
}

/* ---------- Números que contam ao aparecer ---------- */
(() => {
  const nums = $$("[data-count]");
  if (reduceMotion) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const el = e.target, end = +el.dataset.count, t0 = performance.now(), dur = 1400;
      const step = now => {
        const p = clamp((now - t0) / dur);
        el.textContent = Math.round(end * (1 - Math.pow(1 - p, 4)));
        if (p < 1) requestAnimationFrame(step);
      };
      el.textContent = "0";
      requestAnimationFrame(step);
    });
  }, { threshold: .6 });
  nums.forEach(n => io.observe(n));
})();

/* ---------- FAQ: abre e fecha com altura suave ---------- */
$$(".faq details").forEach(d => {
  const sum = $("summary", d), body = $(".faq-a", d);
  sum.addEventListener("click", e => {
    if (reduceMotion) return;
    e.preventDefault();
    if (d.dataset.busy) return;
    d.dataset.busy = "1";
    if (!d.open) {
      d.open = true;
      const h = body.scrollHeight;
      body.animate({ height: ["0px", h + "px"], opacity: [0, 1] }, { duration: 480, easing: "cubic-bezier(.16,1,.3,1)" })
        .onfinish = () => delete d.dataset.busy;
    } else {
      const h = body.scrollHeight;
      body.animate({ height: [h + "px", "0px"], opacity: [1, 0] }, { duration: 360, easing: "cubic-bezier(.65,0,.35,1)" })
        .onfinish = () => { d.open = false; delete d.dataset.busy; };
    }
  });
});

/* ---------- Topo sólido, barra fixa no celular e deriva da faixa de fotos ---------- */
(() => {
  const bar = $("[data-bar]"), dock = $("[data-dock]"), hero = $(".hero");
  const offer = $("#oferta"), final = $(".final"), strip = $("[data-drift]");
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = scrollY, vh = innerHeight;
    const heroEnd = hero.offsetTop + hero.offsetHeight - vh * .2;
    const rO = offer.getBoundingClientRect(), rF = final.getBoundingClientRect();
    const rS = strip ? strip.getBoundingClientRect() : null;
    bar.classList.toggle("is-solid", y > 40);
    if (dock) {
      const buyingVisible = (rO.top < vh && rO.bottom > 0) || (rF.top < vh && rF.bottom > 0);
      const on = y > heroEnd && !buyingVisible;
      dock.classList.toggle("is-on", on);
      dock.setAttribute("aria-hidden", String(!on));
      $("a", dock).tabIndex = on ? 0 : -1;
    }
    if (strip && !reduceMotion && innerWidth > 900) {
      const p = clamp((vh - rS.top) / (vh + rS.height));
      strip.style.transform = `translate3d(${(.5 - p) * 60}px, 0, 0)`;
    }
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener("resize", onScroll);
  onScroll();
})();

/* ---------- Gota do cursor + botões magnéticos (desktop) ---------- */
if (finePointer && !reduceMotion) {
  const drop = $(".drop");
  let x = -100, y = -100, dx = x, dy = y;
  addEventListener("pointermove", e => { x = e.clientX; y = e.clientY; drop.classList.add("is-on"); }, { passive: true });
  document.addEventListener("pointerleave", () => drop.classList.remove("is-on"));
  const loop = () => {
    dx += (x - dx) * .2; dy += (y - dy) * .2;
    drop.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    requestAnimationFrame(loop);
  };
  loop();
  $$("a, button, summary").forEach(el => {
    el.addEventListener("pointerenter", () => drop.classList.add("is-big"));
    el.addEventListener("pointerleave", () => drop.classList.remove("is-big"));
  });
  $$("[data-magnet]").forEach(b => {
    let r;
    b.addEventListener("pointerenter", () => { b.style.transform = ""; r = b.getBoundingClientRect(); });
    b.addEventListener("pointermove", e => {
      if (!r) return;
      const mx = (e.clientX - r.left - r.width / 2) * .22, my = (e.clientY - r.top - r.height / 2) * .32;
      b.style.transform = `translate(${mx}px, ${my}px)`;
    });
    b.addEventListener("pointerleave", () => { b.style.transform = ""; });
  });
}

/* =========================================================
   RETRATO LÍQUIDO (WebGL) · a gota da NativeLab
   - abertura: uma gota cai no retrato e as ondas "formam" a foto;
   - desktop: lente líquida com aro lime segue o mouse, o movimento
     deixa um rastro de gotas e o clique solta uma gota;
   - toque: o dedo solta gotas e, parado, uma gota cai de tempos em tempos.
   Sem WebGL, com movimento reduzido ou economia de dados: foto estática.
   ========================================================= */
const VERT = `attribute vec2 p; varying vec2 v; void main(){ v = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;
const FRAG = `
precision mediump float;
varying vec2 v;
uniform sampler2D tex;
uniform vec2 res, img, mouse;
uniform float t, lens, form, melt, focusX, focusY, lensR;
uniform vec3 drops[6];

vec3 perm(vec3 x){ return mod(((x * 34.) + 1.) * x, 289.); }
float snoise(vec2 v){
  const vec4 C = vec4(.211324865405187, .366025403784439, -.577350269189626, .024390243902439);
  vec2 i = floor(v + dot(v, C.yy)); vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1., 0.) : vec2(0., 1.);
  vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1; i = mod(i, 289.);
  vec3 p = perm(perm(i.y + vec3(0., i1.y, 1.)) + i.x + vec3(0., i1.x, 1.));
  vec3 m = max(.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.); m = m * m; m = m * m;
  vec3 x = 2. * fract(p * C.www) - 1.; vec3 h = abs(x) - .5; vec3 ox = floor(x + .5); vec3 a0 = x - ox;
  m *= 1.79284291400159 - .85373472095314 * (a0 * a0 + h * h);
  vec3 g; g.x = a0.x * x0.x + h.x * x0.y; g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130. * dot(m, g);
}
vec2 cover(vec2 uv){
  float rs = res.x / res.y, ri = img.x / img.y;
  vec2 s = rs > ri ? vec2(1., ri / rs) : vec2(rs / ri, 1.);
  return uv * s + vec2((1. - s.x) * focusX, (1. - s.y) * focusY);
}

void main(){
  vec2 asp = vec2(res.x / res.y, 1.);
  vec2 disp = vec2(0.);
  float ring = 0.;

  // ondas das gotas: anéis que se abrem e perdem força
  for (int i = 0; i < 6; i++) {
    vec3 d = drops[i];
    if (d.z < 0.) continue;
    vec2 q = (v - d.xy) * asp;
    float r = length(q);
    float x = r - d.z * .42;
    float w = sin(x * 46.) * exp(-x * x * 90.) * exp(-d.z * 1.25) * smoothstep(0., .08, d.z);
    disp += (q / (r + 1e-4)) / asp * w * .03;
    ring += abs(w);
  }

  // lente líquida: aumenta o que está dentro e refrata na borda
  vec2 q = (v - mouse) * asp;
  float r = length(q);
  float inside = smoothstep(lensR, lensR * .2, r);
  disp -= q / asp * inside * .16 * lens;
  float edge = smoothstep(lensR * .78, lensR * .97, r) * smoothstep(lensR * 1.06, lensR * .97, r) * lens;
  disp += q / asp * edge * .035;

  // formação (abertura) e derretimento (saída): gel escorrendo
  vec2 flow = vec2(snoise(v * 2.4 + vec2(0., t * .25)), snoise(v * 2.4 + vec2(7.3, -t * .2)));
  float liquid = form + melt;
  disp += flow * liquid * .05;
  disp.y += form * form * .16 * (snoise(vec2(v.x * 5., t * .5)) * .5 + .5);

  vec2 uv = cover(v + disp);
  float split = ring * .006 + edge * .01 + liquid * .006;
  vec4 c = texture2D(tex, uv);
  vec3 col = vec3(texture2D(tex, uv + vec2(split, 0.)).r, c.g, texture2D(tex, uv - vec2(split, 0.)).b);

  // luz lime nas cristas e no aro da lente
  float glow = clamp(ring * .35 + edge * .8 + form * .5 * smoothstep(.2, .9, abs(flow.x)), 0., .75);
  col = mix(col, vec3(.71, 1., 0.) * (.45 + col.g * .8), glow);
  // a foto nasce do escuro enquanto se forma
  col *= 1. - form * .55;
  float a = c.a * (1. - form * form);
  gl_FragColor = vec4(col * a, a);
}`;

function liquidPortrait(fig, opts) {
  const canvas = $("canvas", fig), imgEl = $("img", fig);
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: false, alpha: true });
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
  const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  ["tex", "res", "img", "mouse", "t", "lens", "form", "melt", "focusX", "focusY", "lensR"].forEach(n => U[n] = gl.getUniformLocation(prog, n));
  U.drops = gl.getUniformLocation(prog, "drops[0]");

  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgEl); }
  catch { return null; }   // ex.: aberto via file:// (imagem bloqueada para o WebGL)
  gl.uniform2f(U.img, imgEl.naturalWidth, imgEl.naturalHeight);

  const drops = Array.from({ length: 6 }, () => ({ x: 0, y: 0, born: -1 }));
  const flat = new Float32Array(18);
  let nextDrop = 0;
  const now = () => performance.now() / 1000;
  let mx = .5, my = .5, tx = .5, ty = .5, lens = 0, lensT = 0;
  let formStart = -1, visible = false, running = false, trail = { x: -1, y: -1 };

  function frame() {
    if (!visible) { running = false; return; }
    const tNow = now();
    mx += (tx - mx) * .14; my += (ty - my) * .14; lens += (lensT - lens) * .1;
    const form = formStart < 0 ? 1 : Math.pow(1 - clamp((tNow - formStart) / opts.formDur), 3);
    const melt = opts.melt ? opts.melt() : 0;
    let active = form > .001 || Math.abs(lensT - lens) > .002 || lens > .002;
    drops.forEach((d, i) => {
      const age = d.born < 0 ? -1 : tNow - d.born;
      const alive = age >= 0 && age < 3.2;
      flat[i * 3] = d.x; flat[i * 3 + 1] = d.y; flat[i * 3 + 2] = alive ? age : -1;
      if (alive) active = true;
    });
    gl.uniform2f(U.mouse, mx, my);
    gl.uniform1f(U.t, tNow % 1000);
    gl.uniform1f(U.lens, lens);
    gl.uniform1f(U.form, form);
    gl.uniform1f(U.melt, melt);
    gl.uniform3fv(U.drops, flat);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    // parado, não gasta bateria: volta a desenhar quando algo acontece
    if (active) requestAnimationFrame(frame); else running = false;
  }
  const wake = () => { if (visible && !running) { running = true; requestAnimationFrame(frame); } };
  const addDrop = (x, y) => { const d = drops[nextDrop]; d.x = x; d.y = y; d.born = now(); nextDrop = (nextDrop + 1) % drops.length; wake(); };

  const resize = () => {
    const r = fig.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.max(1, Math.round(r.width * dpr)); canvas.height = Math.max(1, Math.round(r.height * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(U.res, canvas.width, canvas.height);
    gl.uniform1f(U.focusX, opts.focusX ? opts.focusX() : .5);
    gl.uniform1f(U.focusY, 1 - opts.focusY());
    gl.uniform1f(U.lensR, clamp(130 / Math.max(r.height, 1), .1, .3));   // lente com ~130px de raio
    wake();
  };

  let rect = fig.getBoundingClientRect();
  const measure = () => { rect = fig.getBoundingClientRect(); };
  addEventListener("scroll", measure, { passive: true });
  fig.addEventListener("pointerenter", measure);
  const toLocal = e => [(e.clientX - rect.left) / rect.width, 1 - (e.clientY - rect.top) / rect.height];
  if (finePointer) {
    const dropEl = $(".drop");
    fig.addEventListener("pointermove", e => {
      [tx, ty] = toLocal(e); lensT = 1; dropEl?.classList.add("is-lens");
      if (Math.hypot(tx - trail.x, ty - trail.y) > .16) { addDrop(tx, ty); trail = { x: tx, y: ty }; }
      wake();
    });
    fig.addEventListener("pointerleave", () => { lensT = 0; dropEl?.classList.remove("is-lens"); wake(); });
  }
  fig.addEventListener("pointerdown", e => { const [x, y] = toLocal(e); addDrop(x, y); });

  // toque: uma gota cai sozinha de tempos em tempos enquanto o retrato está na tela
  const autoDrop = () => {
    if (visible && !document.hidden) addDrop(.3 + Math.random() * .4, .35 + Math.random() * .4);
    setTimeout(autoDrop, opts.autoEvery * (.8 + Math.random() * .4));
  };

  const start = () => {
    if (formStart >= 0) return;
    formStart = now();
    addDrop(opts.dropAt[0], opts.dropAt[1]);
    if (!finePointer && opts.autoEvery) setTimeout(autoDrop, opts.autoEvery);
  };

  resize();
  addEventListener("resize", resize);
  fig.classList.add("is-gl");
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) { if (opts.startOnView) start(); wake(); }
  }, { threshold: opts.startOnView ? .45 : 0 }).observe(fig);
  return { start, wake };
}

(() => {
  const heroFig = $('[data-liquid="hero"]'), finalFig = $('[data-liquid="final"]');
  const heroTitle = $(".hero-title"), heroIns = $$(".hero [data-in]");
  let revealed = false;
  const revealHero = () => { if (revealed) return; revealed = true; heroTitle.classList.add("is-in"); heroIns.forEach(markIn); };
  setTimeout(revealHero, 1800);   // segurança: o texto nunca fica escondido

  if (reduceMotion || saveData) { revealHero(); return; }
  const mobile = () => innerWidth <= 900;
  const whenLoaded = (img, fn) => (img.complete && img.naturalWidth) ? fn() : img.addEventListener("load", fn, { once: true });

  if (heroFig) {
    const img = $("img", heroFig);
    img.addEventListener("error", revealHero, { once: true });
    let heroH = heroFig.offsetHeight * 1.2;
    addEventListener("resize", () => { heroH = heroFig.offsetHeight * 1.2; });
    whenLoaded(img, () => {
      const liq = liquidPortrait(heroFig, {
        focusX: () => mobile() ? .64 : .62,
        focusY: () => mobile() ? .14 : .2,
        dropAt: [.6, .62],
        formDur: 2.2,
        autoEvery: 3600,
        melt: () => clamp(scrollY / heroH) * .5,   // derrete de leve ao sair da tela
      });
      if (!liq) { revealHero(); return; }
      liq.start();
      setTimeout(revealHero, 650);
      addEventListener("scroll", liq.wake, { passive: true });
    });
  } else revealHero();

  if (finalFig) {
    const img = $("img", finalFig);
    img.loading = "eager";   // precisa estar pronta quando a seção chegar
    whenLoaded(img, () => liquidPortrait(finalFig, {
      focusY: () => .24,
      dropAt: [.5, .55],
      formDur: 1.6,
      autoEvery: 5200,
      startOnView: true,
    }));
  }
})();
