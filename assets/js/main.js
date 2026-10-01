/* =========================================================
   NativeLab® | interações do site
   ========================================================= */

/* ---------- CONFIGURAÇÃO: preencha antes de publicar ---------- */
const CONFIG = {
  // Endpoint do formulário (ex.: Formspree "https://formspree.io/f/xxxx").
  // Vazio = o formulário abre o WhatsApp com a mensagem preenchida.
  formEndpoint: "",
  whatsapp: "5531983242590",               // DDI + DDD + número, só dígitos
  whatsappMsg: "Olá! Quero agendar uma call com o time da NativeLab.",
  instagram: "https://www.instagram.com/nativelab.br/",

  // Medição de leads (opcional). Preencha para ativar.
  ga4Id: "",          // ex.: "G-XXXXXXXXXX"  (Google Analytics 4)
  metaPixelId: "",    // ex.: "123456789012345" (Meta / Facebook Pixel)
};

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(Math.max(v, a), b);
const docTop = el => el.getBoundingClientRect().top + window.scrollY;
const EASE_OUT = "cubic-bezier(.16, 1, .3, 1)";

/* Estados de entrada (títulos, listas) só existem quando o JS roda e o movimento é permitido */
if (!reduceMotion) document.documentElement.classList.add("m-ready");

/* ---------- Medição (GA4 + Meta Pixel), só carrega se configurado ---------- */
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
  // name: evento GA4; meta: evento padrão do Pixel (opcional)
  return (name, params = {}, meta) => {
    window.gtag?.("event", name, params);
    if (meta) window.fbq?.("track", meta, params);
  };
})();

document.addEventListener("click", e => {
  const a = e.target.closest("a");
  if (!a) return;
  if (a.matches("[data-whatsapp]")) track("whatsapp_click", { location: a.closest("section,footer,div[data-sticky-cta]")?.id || "sticky" }, "Contact");
  else if (/#contato$/.test(a.getAttribute("href") || "")) track("cta_click", { label: a.textContent.trim() });
});

/* ---------- Links externos ---------- */
$$("[data-whatsapp]").forEach(a => {
  a.href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(CONFIG.whatsappMsg)}`;
  a.target = "_blank"; a.rel = "noopener";
});
$$("[data-instagram]").forEach(a => { a.href = CONFIG.instagram; a.target = "_blank"; a.rel = "noopener"; });
$$("[data-year]").forEach(el => el.textContent = new Date().getFullYear());

/* =========================================================
   ROLAGEM
   Desktop (mouse/trackpad): Lenis dá inércia à rolagem.
   Toque e movimento reduzido: rolagem nativa do aparelho.
   ========================================================= */
const lenis = (() => {
  if (reduceMotion || !finePointer || typeof window.Lenis !== "function") return null;
  return new Lenis({ lerp: .09, wheelMultiplier: .9, autoRaf: true, stopInertiaOnNavigate: true });
})();

/* Um único laço de rolagem para todos os efeitos. As medidas (posições, alturas)
   ficam em cache e só são refeitas quando o layout muda, nunca a cada quadro. */
const scroller = (() => {
  const subs = new Set(), measures = new Set();
  let y = window.scrollY, queued = false;
  const run = () => {
    queued = false;
    y = lenis ? lenis.scroll : window.scrollY;
    subs.forEach(f => f(y));
  };
  if (lenis) lenis.on("scroll", run);
  else addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(run); } }, { passive: true });

  let mq = 0;
  const measure = () => { measures.forEach(m => m()); run(); };
  const remeasure = () => { cancelAnimationFrame(mq); mq = requestAnimationFrame(measure); };
  new ResizeObserver(remeasure).observe(document.body);
  addEventListener("resize", remeasure);
  document.fonts?.ready.then(remeasure);

  return {
    on(fn, measureFn) {
      subs.add(fn);
      if (measureFn) { measures.add(measureFn); measureFn(); }
      fn(lenis ? lenis.scroll : window.scrollY);
    },
    to(target, onDone) {
      if (lenis) {
        lenis.scrollTo(target, { duration: 1.3, easing: t => 1 - Math.pow(1 - t, 4), onComplete: onDone });
      } else {
        const top = typeof target === "number" ? target : docTop(target);
        window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
        onDone?.();
      }
    },
    stop() { lenis?.stop(); },
    start() { lenis?.start(); },
  };
})();

/* Âncoras internas: rolagem suave e o foco vai para a seção (teclado e leitor de tela) */
document.addEventListener("click", e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
  const id = a.getAttribute("href").slice(1);
  const target = id && document.getElementById(id);
  if (!target) return;
  e.preventDefault();
  scroller.to(target, () => {
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  });
  history.replaceState(null, "", `#${id}`);
});

/* ---------- Nav: fundo ao rolar, esconde ao descer ---------- */
(() => {
  const nav = $("[data-nav]"), toggle = $(".nav-toggle");
  let lastY = 0;
  scroller.on(y => {
    nav.classList.toggle("is-solid", y > 40);
    const menuOpen = toggle.getAttribute("aria-expanded") === "true";
    if (!menuOpen && y > 600 && y > lastY + 4) nav.classList.add("is-hidden");
    else if (y < lastY - 4 || y < 600) nav.classList.remove("is-hidden");
    lastY = y;
  });

  // Link ativo por seção
  const links = $$(".nav-links a");
  const map = new Map(links.map(a => [a.getAttribute("href").slice(1), a]));
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        links.forEach(l => l.classList.remove("is-current"));
        map.get(e.target.id)?.classList.add("is-current");
      }
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
})();

/* ---------- Menu mobile ---------- */
(() => {
  const btn = $(".nav-toggle"), menu = $("#menu-mobile");
  const set = open => {
    btn.setAttribute("aria-expanded", open);
    btn.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    menu.hidden = !open;
    document.body.style.overflow = open ? "hidden" : "";
    open ? scroller.stop() : scroller.start();
  };
  btn.addEventListener("click", () => set(btn.getAttribute("aria-expanded") !== "true"));
  $$("a", menu).forEach(a => a.addEventListener("click", () => set(false)));
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !menu.hidden) set(false); });
})();

/* ---------- Gota do cursor: a gota que se separa do "N" ---------- */
(() => {
  if (!finePointer || reduceMotion) return;
  const drop = $(".drop"), label = $(".drop-label", drop);
  let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y, vx = 0, vy = 0, big = false, running = false;

  const tick = () => {
    // mola: segue com atraso e estica na direção do movimento (líquido)
    vx += (x - cx) * .18; vy += (y - cy) * .18;
    vx *= .62; vy *= .62;
    cx += vx; cy += vy;
    const speed = Math.min(Math.hypot(vx, vy), 40);
    const angle = Math.atan2(vy, vx) * 180 / Math.PI;
    const stretch = big ? 1 : 1 + speed / 38;
    const squash = big ? 1 : 1 - speed / 120;
    drop.style.transform = `translate3d(${cx}px, ${cy}px, 0) rotate(${angle}deg) scale(${stretch}, ${squash})`;
    label.style.transform = `rotate(${-angle}deg)`;
    // parada: a mola dorme até o próximo movimento do mouse
    if (Math.abs(vx) + Math.abs(vy) < .02 && Math.abs(x - cx) + Math.abs(y - cy) < .1) { running = false; return; }
    requestAnimationFrame(tick);
  };
  const wake = () => { if (!running) { running = true; requestAnimationFrame(tick); } };

  addEventListener("mousemove", e => { x = e.clientX; y = e.clientY; drop.classList.add("is-on"); wake(); }, { passive: true });
  document.addEventListener("mouseleave", () => drop.classList.remove("is-on"));

  $$("[data-drop]").forEach(el => {
    el.addEventListener("mouseenter", () => {
      big = true; label.textContent = el.dataset.drop;
      drop.classList.add("is-big"); wake();
    });
    el.addEventListener("mouseleave", () => { big = false; drop.classList.remove("is-big"); wake(); });
  });
  // Sobre o bloco lime, a gota fica grafite
  const sprint = $(".sprint");
  sprint?.addEventListener("mouseenter", () => drop.classList.add("on-lime"));
  sprint?.addEventListener("mouseleave", () => drop.classList.remove("on-lime"));
})();

/* ---------- Hero: inclinação do render/vídeo com o mouse ---------- */
(() => {
  const hero = $(".hero");
  const layers = [$(".hero-render img"), $(".hero-video")].filter(Boolean);
  if (!layers.length || !finePointer || reduceMotion) return;
  layers.forEach(l => l.style.transition = "transform .9s cubic-bezier(.2,.8,.2,1), translate 1.2s cubic-bezier(.16,1,.3,1)");
  hero.addEventListener("mousemove", e => {
    const r = hero.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - .5;
    const py = (e.clientY - r.top) / r.height - .5;
    layers.forEach(l => l.style.translate = `${px * -24}px ${py * -18}px`);
  });
  hero.addEventListener("mouseleave", () => layers.forEach(l => l.style.translate = ""));
})();

/* ---------- Hero: saída com profundidade ao rolar ---------- */
(() => {
  if (reduceMotion) return;
  const hero = $(".hero");
  let h = 1, last = -1;
  scroller.on(y => {
    const p = +clamp(y / h).toFixed(4);
    if (p === last) return;
    last = p;
    hero.style.setProperty("--hp", p);
  }, () => { h = hero.offsetHeight || 1; });
})();

/* ---------- Hero: vídeo do logo 3D ----------
   Entra depois da animação de abertura do render (mesmo enquadramento),
   pausa quando o hero sai da tela. Se o arquivo faltar, fica o render. */
(() => {
  const v = $(".hero-video");
  if (!v || !v.dataset.src || reduceMotion) return;
  const saveData = navigator.connection?.saveData;
  if (saveData) return;
  const isMobile = matchMedia("(max-width: 720px)").matches;
  let src = (isMobile && v.dataset.srcMobile) || v.dataset.src;
  // WebM (VP9) quando o navegador suporta; senão MP4 (H.264)
  if (v.canPlayType('video/webm; codecs="vp9"')) src = src.replace(/\.mp4$/, ".webm");
  v.src = src;
  v.preload = "auto";
  const introDone = new Promise(r => setTimeout(r, 2300));
  const ready = new Promise(r => v.addEventListener("canplaythrough", r, { once: true }));
  Promise.all([introDone, ready]).then(() => {
    v.play().then(() => v.classList.add("is-ready")).catch(() => {});
  });
  v.addEventListener("error", () => v.remove(), { once: true });
  new IntersectionObserver(([e]) => {
    if (!v.classList.contains("is-ready")) return;
    e.isIntersecting ? v.play().catch(() => {}) : v.pause();
  }).observe($(".hero"));
  v.load();
})();

/* ---------- Texto que acende com o scroll ----------
   Progresso contínuo (não por degraus): a borda acesa corre palavra a palavra. */
(() => {
  const el = $("[data-reveal-text]");
  if (!el || reduceMotion) return;
  const words = el.textContent.trim().split(/\s+/);
  el.innerHTML = words.map((w, i) => `<span class="word" style="--i:${i}">${w}</span>`).join(" ");
  el.style.setProperty("--n", words.length);
  let top = 0, height = 0, vh = innerHeight, last = -1;
  scroller.on(y => {
    const start = vh * .85, end = vh * .35;
    const p = +clamp((start - (top - y)) / (start - end + height * .6)).toFixed(3);
    if (p === last) return;
    last = p;
    el.style.setProperty("--p", p);
  }, () => { top = docTop(el); height = el.offsetHeight; vh = innerHeight; });
})();

/* ---------- Pílula deslizante (abas e filtros) ---------- */
function slidingPill(container, selector) {
  if (!container) return () => {};
  const pill = document.createElement("span");
  pill.className = "pill";
  pill.setAttribute("aria-hidden", "true");
  container.prepend(pill);
  container.classList.add("has-pill");
  const move = (instant = false) => {
    const el = $(selector, container);
    if (!el) return;
    if (instant) pill.style.transition = "none";
    pill.style.width = `${el.offsetWidth}px`;
    pill.style.height = `${el.offsetHeight}px`;
    pill.style.transform = `translate3d(${el.offsetLeft}px, ${el.offsetTop}px, 0)`;
    if (instant) { pill.offsetWidth; pill.style.transition = ""; }
  };
  move(true);
  new ResizeObserver(() => move(true)).observe(container);
  document.fonts?.ready.then(() => move(true));
  return move;
}

/* ---------- Tabs acessíveis (audiência) ---------- */
function setupTabs(list, onChange) {
  const tabs = $$('[role="tab"]', list);
  const select = (t, focus = true) => {
    tabs.forEach(x => {
      const on = x === t;
      x.setAttribute("aria-selected", on);
      x.tabIndex = on ? 0 : -1;
      const p = document.getElementById(x.getAttribute("aria-controls"));
      if (p && !onChange) p.hidden = !on;
    });
    if (focus) t.focus();
    onChange?.(tabs.indexOf(t));
  };
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => select(t, false));
    t.addEventListener("keydown", e => {
      const k = e.key;
      let j = null;
      if (k === "ArrowRight" || k === "ArrowDown") j = (i + 1) % tabs.length;
      if (k === "ArrowLeft" || k === "ArrowUp") j = (i - 1 + tabs.length) % tabs.length;
      if (k === "Home") j = 0;
      if (k === "End") j = tabs.length - 1;
      if (j !== null) { e.preventDefault(); select(tabs[j]); }
    });
  });
  return { select: i => select(tabs[i], false), tabs };
}
(() => {
  const list = $(".tabs");
  const movePill = slidingPill(list, '[aria-selected="true"]');
  setupTabs(list, i => {
    $$('[role="tab"]', list).forEach((t, j) => { document.getElementById(t.getAttribute("aria-controls")).hidden = i !== j; });
    movePill();
  });
})();

/* ---------- Acordeões (FAQ): abrem e fecham com altura suave ---------- */
(() => {
  if (reduceMotion || !Element.prototype.animate) return;
  $$(".faq-list details").forEach(d => {
    const sum = $("summary", d);
    let anim = null, closing = false;
    sum.addEventListener("click", e => {
      e.preventDefault();
      const opening = anim ? closing : !d.open;
      const from = d.offsetHeight;
      anim?.cancel();
      d.style.overflow = "clip";
      if (opening) d.open = true;
      const borders = d.offsetHeight - d.clientHeight;
      const to = opening ? d.offsetHeight : sum.offsetHeight + borders;
      closing = !opening;
      anim = d.animate({ height: [`${from}px`, `${to}px`] }, { duration: opening ? 520 : 360, easing: EASE_OUT });
      anim.onfinish = () => {
        if (closing) d.open = false;
        anim = null; closing = false;
        d.style.overflow = "";
      };
    });
  });
})();

/* ---------- Método NATIVE (loop) ----------
   Desktop: a seção fica presa e a rolagem leva a gota pelo loop.
   Celular/tablet: as etapas mudam por toque, com a gota girando até a etapa. */
(() => {
  const STEPS = [
    { t: "Notar", k: "Diagnóstico",
      in: "Uma dor ou um sintoma vago: “achamos que o crescimento estagnou”, “a marca não conversa mais com o público”.",
      do: "Imersão no negócio: dados existentes, entrevistas internas, mercado, concorrência e auditoria de marca, operação e tecnologia.",
      out: "Um diagnóstico claro do que realmente trava o avanço, que pode ser diferente do que você imaginava pedir." },
    { t: "Analisar", k: "Hipótese",
      in: "O diagnóstico.",
      do: "Cruzamento de dados quantitativos e qualitativos para achar a alavanca de maior impacto. Não a mais óbvia: a mais eficaz.",
      out: "Uma hipótese de solução priorizada e testável, não um plano genérico de 12 meses." },
    { t: "Testar", k: "Piloto",
      in: "A hipótese.",
      do: "Prototipagem rápida e barata, como uma campanha piloto, um MVP ou um teste de mensagem, antes de construir em escala.",
      out: "Dados reais de que a hipótese funciona, ou um aprendizado rápido de que é preciso mudar de direção." },
    { t: "Integrar", k: "Construção",
      in: "A hipótese validada.",
      do: "Construção da solução completa, unindo Brand, Growth e Technology na proporção que o problema exigir.",
      out: "A solução implementada e operando no seu negócio." },
    { t: "Validar", k: "Métrica",
      in: "A solução em operação.",
      do: "Medição com base nos indicadores definidos no diagnóstico. Resultado de negócio, não vaidade de entrega.",
      out: "Prova (ou refutação) de que houve movimento real." },
    { t: "Evoluir", k: "Transferência de capacidade",
      in: "A solução validada.",
      do: "Estruturação para o seu time operar, iterar e evoluir a solução sem depender da NativeLab.",
      out: "Uma empresa mais capaz do que era no início. É o critério final de sucesso." },
  ];

  const method = $(".method");
  const pinEl = $("[data-loop-pin]");
  const hint = $("[data-loop-hint]");
  const wrap = $("[data-steps]");
  const btns = $$('[role="tab"]', wrap);
  const R = 160, C = 200, N = btns.length;
  const angleOf = f => f * Math.PI * 2 - Math.PI / 2;     // f: fração da volta (0 = topo)
  btns.forEach((b, i) => {
    const a = angleOf(i / N);
    b.style.setProperty("--x", `${((C + R * Math.cos(a)) / 400) * 100}%`);
    b.style.setProperty("--y", `${((C + R * Math.sin(a)) / 400) * 100}%`);
  });

  const panel = $("[data-step-panel]");
  const ring = $("[data-ring]");
  const dropDot = $("[data-ring-drop]");
  const CIRC = 2 * Math.PI * R;
  let current = -1, dropAngle = angleOf(0), anim, swapT;
  let pinned = false, driving = false, pinTop = 0, pinRange = 1;

  const place = a => { dropDot.setAttribute("cx", C + R * Math.cos(a)); dropDot.setAttribute("cy", C + R * Math.sin(a)); };

  const moveDrop = target => {
    cancelAnimationFrame(anim);
    const from = dropAngle;
    let to = angleOf(target / N);
    while (to < from - 1e-6) to += Math.PI * 2;      // sempre gira para frente: é um loop
    if (reduceMotion) { dropAngle = to; place(to); return; }
    if (Math.abs(to - from) < 1e-3) return;
    dropDot.classList.add("is-moving");
    const t0 = performance.now(), dur = 900;
    const step = now => {
      const k = Math.min((now - t0) / dur, 1);
      const e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      dropAngle = from + (to - from) * e;
      place(dropAngle);
      if (k < 1) anim = requestAnimationFrame(step);
      else dropDot.classList.remove("is-moving");   // a gota se funde à etapa
    };
    anim = requestAnimationFrame(step);
  };

  const render = i => {
    if (i === current) return;
    const s = STEPS[i];
    current = i;
    clearTimeout(swapT);
    panel.classList.add("is-swapping");
    swapT = setTimeout(() => {
      $("[data-step-title]").textContent = s.t;
      $("[data-step-kicker]").textContent = s.k;
      $("[data-step-in]").textContent = s.in;
      $("[data-step-do]").textContent = s.do;
      $("[data-step-out]").textContent = s.out;
      panel.setAttribute("aria-labelledby", `st-${i}`);
      panel.classList.remove("is-swapping");
    }, reduceMotion ? 0 : 200);
    $("[data-step-num]").textContent = i + 1;
    if (!pinned) {
      ring.style.strokeDashoffset = CIRC * (1 - (i + 1) / N);
      moveDrop(i);
    }
  };

  // Posição de rolagem em que cada etapa fica no centro do seu trecho
  const HOLD = .05;                                     // pequena pausa no início e no fim
  const fracToY = f => pinTop + (HOLD + (f * N / (N - 1)) * (1 - HOLD * 2)) * pinRange;
  const scrollToStep = i => scroller.to(fracToY(i / N));

  const tabs = setupTabs(wrap, i => {
    if (pinned && !driving) { scrollToStep(i); return; }
    render(i);
  });
  $("[data-step-next]").addEventListener("click", () => tabs.select((current + 1) % N));
  $("[data-step-prev]").addEventListener("click", () => tabs.select((current - 1 + N) % N));

  const pinQuery = matchMedia("(min-width: 1024px) and (min-height: 640px)");
  const setPinned = () => {
    const on = !!lenis && pinQuery.matches;
    if (on === pinned) return;
    pinned = on;
    method.classList.toggle("is-pinned", on);
    panel.setAttribute("aria-live", on ? "off" : "polite");
    if (!on) {
      // volta ao modo por toque mantendo a etapa atual
      dropAngle = angleOf(current / N); place(dropAngle);
      ring.style.strokeDashoffset = CIRC * (1 - (current + 1) / N);
    }
  };

  scroller.on(y => {
    if (!pinned) return;
    const q = clamp((y - pinTop) / pinRange);
    const f = clamp((q - HOLD) / (1 - HOLD * 2)) * (N - 1) / N;
    ring.style.strokeDashoffset = CIRC * (1 - f);
    dropAngle = angleOf(f); place(dropAngle);
    hint.classList.toggle("is-off", q > .04);
    const i = Math.round(f * N);
    if (i !== current) { driving = true; tabs.select(i); driving = false; }
  }, () => {
    setPinned();
    if (!pinned) return;
    pinTop = docTop(pinEl);
    pinRange = Math.max(pinEl.offsetHeight - innerHeight, 1);
  });

  render(0);
  if (!pinned) { ring.style.strokeDashoffset = CIRC * (1 - 1 / N); place(dropAngle); }
})();

/* ---------- Clientes: faixa de logos em loop ----------
   O grupo de logos é repetido até ficar mais largo que a tela e depois duplicado:
   a faixa anda -50% e recomeça sem emenda. Cópias ficam ocultas para leitores de tela. */
(() => {
  const m = $("[data-marquee]");
  if (!m || reduceMotion) return;
  const group = $(".marquee-group", m);
  const originals = [...group.children];
  const track = document.createElement("div");
  track.className = "marquee-track";
  m.prepend(track);
  track.append(group);
  const hide = el => { el.setAttribute("aria-hidden", "true"); $$("img", el).forEach(i => i.alt = ""); return el; };
  const build = () => {
    while (group.scrollWidth < m.clientWidth && group.children.length < 60) {
      originals.forEach(li => group.append(hide(li.cloneNode(true))));
    }
    $$(".marquee-group[aria-hidden]", track).forEach(g => g.remove());
    track.append(hide(group.cloneNode(true)));
    track.style.setProperty("--dur", `${(group.scrollWidth / 55).toFixed(1)}s`);   // ~55 px por segundo
    m.classList.add("is-running");
  };
  build();
  let rt;
  addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(build, 200); });
  // fora da tela, a faixa para
  new IntersectionObserver(([e]) => { track.style.animationPlayState = e.isIntersecting ? "" : "paused"; }).observe(m);
})();

/* ---------- Bloco lime (a call): cresce ao entrar ---------- */
(() => {
  if (reduceMotion) return;
  const el = $(".sprint");
  let top = 0, vh = innerHeight, last = -1;
  scroller.on(y => {
    const p = +clamp((y + vh - top) / (vh * .75)).toFixed(4);
    if (p === last) return;
    last = p;
    el.style.setProperty("--sp", p);
  }, () => {
    el.style.setProperty("--sp", 1);                   // mede sem a escala aplicada
    top = docTop(el); vh = innerHeight; last = -1;
  });
})();

/* ---------- Entradas: títulos linha a linha, listas em sequência ---------- */
(() => {
  if (reduceMotion) return;
  const heads = $$(".display-2, .display-3, .footer-statement");
  heads.forEach(h => {
    h.dataset.lines = "";
    $$(":scope > span", h).forEach((line, l) => {
      line.innerHTML = `<span class="ln" style="--l:${l}">${line.innerHTML}</span>`;
    });
  });
  const lists = $$(".pillars, .sprint-steps, .faq-list, .timeline, .skills, .founder-gallery");
  lists.forEach(list => {
    list.dataset.stagger = "";
    [...list.children].forEach((c, i) => c.style.setProperty("--i", Math.min(i, 7)));
  });
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      io.unobserve(e.target);
    });
  }, { rootMargin: "0px 0px -12% 0px" });
  [...heads, ...lists].forEach(el => io.observe(el));
})();

/* ---------- Sobre: os números sobem de zero quando aparecem ---------- */
(() => {
  if (reduceMotion) return;
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    const el = e.target, n = +el.dataset.count, t0 = performance.now(), dur = 1400;
    const step = now => {
      const k = Math.min((now - t0) / dur, 1);
      el.textContent = `${Math.round(n * (1 - Math.pow(1 - k, 4)))}+`;
      if (k < 1) requestAnimationFrame(step);
    };
    el.textContent = "0+";
    requestAnimationFrame(step);
  }), { rootMargin: "0px 0px -15% 0px" });
  $$("[data-count]").forEach(el => io.observe(el));
})();

/* ---------- Sobre: se uma foto faltar, esconde o ícone quebrado ---------- */
$$(".founder img").forEach(img => {
  const miss = () => img.classList.add("is-missing");
  if (img.complete && !img.naturalWidth) miss();
  img.addEventListener("error", miss);
});

/* ---------- Formulário ---------- */
(() => {
  const form = $("[data-form]");
  const status = $("[data-form-status]");
  if (!form) return;

  const validate = () => {
    let ok = true;
    $$(".field", form).forEach(f => { f.classList.remove("is-error"); $(".err", f)?.remove(); });
    $$("[required]", form).forEach(input => {
      const bad = !input.value.trim() || (input.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value));
      if (bad) {
        ok = false;
        const f = input.closest(".field");
        f.classList.add("is-error");
        const msg = document.createElement("span");
        msg.className = "err";
        msg.textContent = input.type === "email" && input.value ? "Confira o e-mail: falta algo no endereço." : "Preencha este campo para continuar.";
        f.appendChild(msg);
      }
    });
    return ok;
  };

  form.addEventListener("submit", async e => {
    e.preventDefault();
    status.className = "form-status";
    if (!validate()) { status.textContent = "Faltam alguns campos obrigatórios."; $(".is-error input", form)?.focus(); return; }
    const data = Object.fromEntries(new FormData(form));
    const btn = $("button[type=submit]", form);

    if (!CONFIG.formEndpoint) {
      const texto = `Olá! Quero agendar uma call com a NativeLab.\n\nNome: ${data.nome}\nEmpresa: ${data.empresa}\nPapel: ${data.papel}` + (data.mensagem ? `\n\nO que está travando: ${data.mensagem}` : "");
      const url = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(texto)}`;
      track("generate_lead", { papel: data.papel, method: "whatsapp" }, "Lead");
      const win = window.open(url, "_blank", "noopener");
      if (!win) location.href = url;
      status.textContent = "Abrimos o WhatsApp com a sua mensagem pronta. É só enviar.";
      return;
    }

    btn.disabled = true; btn.textContent = "Enviando…";
    try {
      const res = await fetch(CONFIG.formEndpoint, { method: "POST", headers: { Accept: "application/json" }, body: new FormData(form) });
      if (!res.ok) throw new Error();
      form.reset();
      track("generate_lead", { papel: data.papel }, "Lead");
      status.classList.add("is-ok");
      status.textContent = "Recebemos. O nosso time responde em breve para marcar a call.";
    } catch {
      status.textContent = "Não foi possível enviar agora. Tente de novo ou chame no WhatsApp.";
    } finally {
      btn.disabled = false; btn.textContent = "Enviar pelo WhatsApp";
    }
  });
})();

/* ---------- CTA fixo no mobile ---------- */
(() => {
  const bar = $("[data-sticky-cta]");
  if (!bar) return;
  const hero = $(".hero"), contact = $("#contato"), sprint = $(".sprint");
  let pastHero = false, inContact = false, inSprint = false;
  const sync = () => bar.classList.toggle("is-on", pastHero && !inContact && !inSprint);
  new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting; sync(); }).observe(hero);
  new IntersectionObserver(([e]) => { inContact = e.isIntersecting; sync(); }, { rootMargin: "0px 0px -20% 0px" }).observe(contact);
  new IntersectionObserver(([e]) => { inSprint = e.isIntersecting; sync(); }, { threshold: .3 }).observe(sprint);
})();
