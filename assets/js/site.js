/* Meat Puppets with Random Weapons from a Box: website behaviour. Vanilla JavaScript, no framework, no network calls.
   Every page reads without JavaScript; this file only adds the interactive parts. */
(() => {
  "use strict";

  // ---- Configuration: the only place to edit at launch --------------------------------------------------------
  // Store listings: leave empty until they exist; the buttons then show a "coming soon" toast.
  // Until the Google Play listing exists, the Android button downloads the release APK attached to the latest GitHub
  // release of SysCake/meat-puppets-site (tools/website/release_apk.sh): a fixed URL, new builds need no site change.
  const STORES = {
    apple: "", // e.g. "https://apps.apple.com/app/id0000000000"
    google: "https://github.com/SysCake/meat-puppets-site/releases/latest/download/MeatPuppets.apk", // later e.g. "https://play.google.com/store/apps/details?id=it.syscake.meatpuppets"
  };
  // The trailer: a YouTube id (played through youtube-nocookie.com) or a self-hosted MP4. Empty = "please stand by".
  const VIDEO = {
    youtubeId: "",
    src: "assets/video/animatic-v1.mp4", // temporary: the animatic (docs/trailer/ANIMATIC.md) until the trailer is on YouTube
    poster: "assets/img/keyart-1600.webp",
  };

  const WEAPONS = [
    { id: "bat", name: "Baseball Bat", img: "assets/img/weapon-bat.webp", line: "The balanced one. A three-hit combo and a charged swing that staggers. Also good for batting bottles at faces." },
    { id: "sword", name: "Sword", img: "assets/img/weapon-sword.webp", line: "Halfway between the bat and the chainsaw. More power, not much less mobility. Sparkles when raised. Nobody knows why." },
    { id: "chainsaw", name: "Chainsaw", img: "assets/img/weapon-chainsaw.webp", line: "Slow. Loud. Devastating. Its charged thrust has super armor and walks straight through a flurry." },
    { id: "chain", name: "Chain", img: "assets/img/weapon-chain.webp", line: "Barely tickles when thrown. Wrapped round a neck and held, it is a different conversation." },
    { id: "plunger", name: "Plunger", img: "assets/img/weapon-plunger.webp", line: "Low damage, high suction. Stick it on their face and watch the Breath bar go down. Boing." },
    { id: "toy", name: "The Toy", img: "assets/img/weapon-toy.webp", line: "Soft, bendy and harmless. Until your opponent runs out of stamina and starts panting with their mouth open." },
    { id: "pistol", name: "Pistol", img: "assets/img/weapon-pistol.webp", line: "You will shoot yourself. The League hands you a sponsored wheelchair. You keep the pistol." },
  ];

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  // ---- Toast ----------------------------------------------------------------------------------------------------
  let toastTimer;
  function toast(text) {
    let el = $(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = text;
    requestAnimationFrame(() => el.classList.add("is-on"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-on"), 3200);
  }

  // ---- Header and navigation ----------------------------------------------------------------------------------
  const header = $(".site-header");
  const onScrollHeader = () => header && header.classList.toggle("is-scrolled", window.scrollY > 20);
  onScrollHeader();
  window.addEventListener("scroll", onScrollHeader, { passive: true });

  const toggle = $(".nav-toggle");
  if (toggle) {
    const close = () => { document.body.classList.remove("nav-open"); toggle.setAttribute("aria-expanded", "false"); };
    toggle.addEventListener("click", () => {
      const open = document.body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    $$(".nav a").forEach((a) => a.addEventListener("click", close));
    document.addEventListener("keydown", (e) => e.key === "Escape" && close());
  }

  // ---- Store buttons ----------------------------------------------------------------------------------------------
  $$("[data-store]").forEach((a) => {
    const url = STORES[a.dataset.store];
    if (url && url.endsWith(".apk")) {
      a.href = url;
      a.setAttribute("download", "");
    } else if (url) {
      a.href = url;
      a.rel = "noopener";
      a.target = "_blank";
    } else {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        toast(a.dataset.store === "apple" ? "Coming soon to the App Store. Your puppet is still printing!" : "Coming soon to Google Play. Your puppet is still printing!");
      });
    }
  });

  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  // ---- Reveal on scroll -----------------------------------------------------------------------------------------
  const revealables = $$(".reveal, .weapon");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add("is-in"); io.unobserve(entry.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    revealables.forEach((el) => io.observe(el));
  } else {
    revealables.forEach((el) => el.classList.add("is-in"));
  }

  // ---- Sprite-sheet FX (goo, steam, explosion) -----------------------------------------------------------------
  const HUES = [0, 70, 150, 200, 280];
  function spawnFx(layer, x, y, kind = "goo", hue) {
    if (reduceMotion || !layer) return;
    const fx = document.createElement("span");
    fx.className = `fx fx--${kind}`;
    fx.style.left = `${x}px`;
    fx.style.top = `${y}px`;
    if (hue !== undefined) fx.style.filter = `hue-rotate(${hue}deg) saturate(1.3)`;
    fx.style.transform = `rotate(${Math.round(Math.random() * 360)}deg)`;
    layer.appendChild(fx);
    fx.addEventListener("animationend", (e) => { if (e.animationName === "fx-y") fx.remove(); });
    setTimeout(() => fx.remove(), 2000);
  }

  // ---- Home hero: tilt and goo on click --------------------------------------------------------------------------
  const hero = $(".hero");
  if (hero) {
    const art = $(".hero-art .bulbs", hero);
    const layer = $(".goo-layer", hero);
    if (art && !reduceMotion && window.matchMedia("(hover: hover)").matches) {
      hero.addEventListener("pointermove", (e) => {
        const r = hero.getBoundingClientRect();
        const dx = (e.clientX - r.left) / r.width - 0.5;
        const dy = (e.clientY - r.top) / r.height - 0.5;
        art.style.setProperty("--ry", `${(dx * 6).toFixed(2)}deg`);
        art.style.setProperty("--rx", `${(4 - dy * 5).toFixed(2)}deg`);
      });
    }
    hero.addEventListener("pointerdown", (e) => {
      if (e.target.closest("a, button")) return;
      const r = hero.getBoundingClientRect();
      spawnFx(layer, e.clientX - r.left, e.clientY - r.top, "goo", HUES[Math.floor(Math.random() * HUES.length)]);
    });
  }

  // ---- THE BOX slot machine ----------------------------------------------------------------------------------------
  $$("[data-slot]").forEach((root) => {
    const machine = $(".slot-machine", root);
    const reels = $$(".reel", root);
    const result = $(".slot-result", root);
    const pull = $("[data-pull]", root);
    const bribeBtn = $("[data-bribe]", root);
    const bribeMenu = $(".bribe-menu", root);
    const fxLayer = $(".slot-fx", root);
    if (!machine || reels.length !== 3) return;

    const strips = reels.map((reel) => {
      const strip = document.createElement("div");
      strip.className = "reel-strip";
      reel.appendChild(strip);
      return strip;
    });
    const cell = () => reels[0].clientHeight;
    const fill = (strip, ids) => {
      strip.innerHTML = ids.map((id) => {
        const w = WEAPONS.find((x) => x.id === id);
        return `<img src="${w.img}" alt="" draggable="false">`;
      }).join("");
      strip.style.setProperty("--cell", `${cell()}px`);
    };
    // Initial faces: bat, chainsaw, plunger, like the painted reels.
    ["bat", "chainsaw", "plunger"].forEach((id, i) => fill(strips[i], [id]));
    window.addEventListener("resize", () => strips.forEach((s) => s.style.setProperty("--cell", `${cell()}px`)));

    if (bribeMenu) {
      bribeMenu.innerHTML = WEAPONS.map((w) => `<button type="button" data-pick="${w.id}"><img src="${w.img}" alt="">${w.name}</button>`).join("");
      bribeBtn && bribeBtn.addEventListener("click", () => {
        const open = bribeMenu.classList.toggle("is-open");
        bribeBtn.setAttribute("aria-expanded", String(open));
      });
      bribeMenu.addEventListener("click", (e) => {
        const b = e.target.closest("[data-pick]");
        if (!b) return;
        bribeMenu.classList.remove("is-open");
        bribeBtn.setAttribute("aria-expanded", "false");
        spin(b.dataset.pick, true);
      });
    }

    let busy = false;
    function spin(forced, bribed = false) {
      if (busy) return;
      busy = true;
      const target = forced || WEAPONS[Math.floor(Math.random() * WEAPONS.length)].id;
      machine.classList.add("is-spinning");
      pull && pull.setAttribute("disabled", "");
      const h = cell();
      const last = reduceMotion ? 0 : 1500 + 2 * 380;
      strips.forEach((strip, i) => {
        const current = strip.lastElementChild ? WEAPONS.find((w) => strip.lastElementChild.src.endsWith(w.img.split("/").pop())) : WEAPONS[0];
        const n = reduceMotion ? 0 : 14 + i * 5;
        const ids = [current ? current.id : "bat"];
        for (let k = 0; k < n; k++) ids.push(WEAPONS[Math.floor(Math.random() * WEAPONS.length)].id);
        ids.push(target);
        fill(strip, ids);
        strip.style.transition = "none";
        strip.style.transform = "translateY(0)";
        strip.offsetHeight; // reflow so the transition starts from the top
        const ms = reduceMotion ? 0 : 1500 + i * 380;
        strip.style.transition = `transform ${ms}ms cubic-bezier(0.15, 0.85, 0.25, 1.04)`;
        strip.style.transform = `translateY(${-(ids.length - 1) * h}px)`;
        strip.addEventListener("transitionend", () => {
          fill(strip, [target]);
          strip.style.transition = "none";
          strip.style.transform = "translateY(0)";
        }, { once: true });
      });
      setTimeout(() => {
        machine.classList.remove("is-spinning");
        pull && pull.removeAttribute("disabled");
        busy = false;
        const w = WEAPONS.find((x) => x.id === target);
        if (result) {
          result.innerHTML = `<img src="${w.img}" alt=""><div><h3>${w.name}!</h3><p>${bribed ? "<b>Bribe accepted.</b> " : ""}${w.line}</p></div>`;
          result.classList.remove("is-new");
          result.offsetWidth;
          result.classList.add("is-new");
        }
        if (fxLayer) {
          const r = fxLayer.getBoundingClientRect();
          spawnFx(fxLayer, r.width * 0.5, r.height * 0.28, "steam");
        }
      }, last + 60);
    }
    pull && pull.addEventListener("click", () => spin());
  });

  // ---- League TV: the trailer ------------------------------------------------------------------------------------
  const hasVideo = Boolean(VIDEO.youtubeId || VIDEO.src);
  function videoMarkup(autoplay) {
    if (VIDEO.youtubeId) {
      return `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(VIDEO.youtubeId)}?rel=0&modestbranding=1${autoplay ? "&autoplay=1" : ""}" title="Meat Puppets trailer" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    }
    if (VIDEO.src) {
      return `<video src="${VIDEO.src}" poster="${VIDEO.poster}" controls playsinline ${autoplay ? "autoplay" : ""}></video>`;
    }
    return "";
  }
  function testCardMarkup() {
    return `<div class="test-card" aria-hidden="true">
      <div class="bars"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
      <div class="mid"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
      <div class="low"></div><canvas width="160" height="90"></canvas>
      <div class="card-label"><b>Trailer coming soon</b><span>The League is still printing the actors. Please stand by.</span></div></div>`;
  }
  // TV static over the test card, only while visible.
  function startNoise(canvas) {
    if (!canvas || reduceMotion) return;
    const ctx = canvas.getContext("2d");
    const img = ctx.createImageData(canvas.width, canvas.height);
    let visible = false, last = 0;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
    (function frame(t) {
      if (visible && t - last > 70) {
        last = t;
        for (let i = 0; i < img.data.length; i += 4) {
          const v = Math.random() * 255;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
          img.data[i + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
      }
      requestAnimationFrame(frame);
    })(0);
  }

  // The TV: as you scroll it grows until its screen fills the viewport ("takeover"); the trailer plays inside it.
  // With reduced motion the TV stays put and the trailer still plays in its screen.
  const tvSection = $(".tv-section");
  if (tvSection) {
    const screen = $(".tv-screen", tvSection);
    const tv = $(".tv-wrap", tvSection);
    screen.classList.toggle("has-test-card", !hasVideo);
    screen.insertAdjacentHTML("afterbegin", hasVideo ? `<img src="${VIDEO.poster}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">` : testCardMarkup());
    startNoise($("canvas", screen));
    $(".play-btn", tvSection).addEventListener("click", () => {
      if (!hasVideo) { toast("Trailer coming soon. Please stand by!"); return; }
      screen.innerHTML = videoMarkup(true) + `<span class="on-air">On air</span>`;
    });

    if (!reduceMotion) {
      tvSection.classList.add("tv-section--takeover");
      let base = null;
      const update = () => {
        if (!base) return;
        const r = tvSection.getBoundingClientRect();
        const vh = window.innerHeight, vw = document.documentElement.clientWidth;
        const p = clamp(-r.top / (r.height - vh), 0, 1);
        const e = (() => { const x = clamp((p - 0.12) / 0.6, 0, 1); return x * x * (3 - 2 * x); })();
        tvSection.style.setProperty("--p", p.toFixed(3));
        // Landscape: cover the viewport. Portrait phones: fill the width only, or a 16:9 trailer loses its sides.
        const s1 = vw >= vh ? Math.max(vw / base.sw, vh / base.sh) * 1.03 : vw / base.sw;
        const s = 1 + (s1 - 1) * e;
        // Screen centre moves from where it is (sticky, so constant) to the viewport centre.
        const tx = base.cx + (vw / 2 - base.cx) * e;
        const ty = base.cy + (vh / 2 - base.cy) * e;
        const dx = tx - base.wx - s * (base.cx - base.wx);
        const dy = ty - base.wy - s * (base.cy - base.wy);
        tv.style.transformOrigin = "0 0";
        tv.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${s.toFixed(4)})`;
      };
      // Measure while the sticky stage is pinned at the top, so the geometry is the pinned one.
      const remeasure = () => {
        const sticky = $(".tv-sticky", tvSection);
        const st = sticky.getBoundingClientRect().top;
        tv.style.transform = "none";
        const w = tv.getBoundingClientRect();
        const s = screen.getBoundingClientRect();
        // Positions relative to the sticky stage, then placed at the stage's pinned top (0).
        base = { wx: w.left, wy: w.top - st, cx: s.left + s.width / 2, cy: s.top - st + s.height / 2, sw: s.width, sh: s.height };
        update();
      };
      window.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
      window.addEventListener("resize", remeasure);
      window.addEventListener("load", remeasure);
      remeasure();
    }
  }

  // ---- Rulebook: HP / Breath / Stamina demo --------------------------------------------------------------------
  const demo = $("[data-hud-demo]");
  if (demo) {
    const st = { hp: 100, breath: 100, stamina: 100, plunger: false };
    const rows = { hp: $(".hud-row--hp", demo), breath: $(".hud-row--breath", demo), stamina: $(".hud-row--stamina", demo) };
    const note = $(".hud-note", demo);
    const visor = $(".hud-visor", demo);
    const mouth = $(".hud-mouth", demo);
    const say = (t) => (note.textContent = t);
    const render = () => {
      Object.entries(rows).forEach(([k, row]) => {
        $(".hud-fill", row).style.setProperty("--v", `${Math.round(st[k])}%`);
        $("output", row).textContent = `${Math.round(st[k])}%`;
      });
      rows.hp.classList.toggle("is-low", st.hp < 30);
      const panting = st.stamina < 30;
      visor.textContent = st.hp <= 0 ? "x_x" : st.plunger ? "O₂?!" : st.breath <= 0 ? "!!!" : panting ? "@_@" : "^_^";
      mouth.textContent = st.hp <= 0 ? "KO. The trillionaires applaud politely." : st.plunger ? "Mouth: plungered." : panting ? "Mouth: wide open, panting. Careful with The Toy." : "Mouth: closed, breathing through the nose.";
    };
    setInterval(() => {
      if (st.hp <= 0) return;
      if (st.plunger) st.breath = Math.max(0, st.breath - 4);
      else st.breath = Math.min(100, st.breath + 1.2);
      if (st.breath <= 0) st.hp = Math.max(0, st.hp - 4.5); // full HP gone in about 2-3 s
      if (!st.plunger) st.stamina = Math.min(100, st.stamina + 0.8);
      if (st.hp <= 0) { st.plunger = false; say("KO! Breath at zero drains hit points in seconds. Next time, rip it off sooner."); }
      render();
    }, 100);
    demo.addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]");
      if (!b) return;
      const act = b.dataset.act;
      if (act === "reset") { Object.assign(st, { hp: 100, breath: 100, stamina: 100, plunger: false }); say("A fresh puppet, printed in 3 seconds flat."); }
      else if (st.hp <= 0) { say("This puppet is KO. Print a new one."); }
      else if (act === "run") { st.stamina = Math.max(0, st.stamina - 34); say(st.stamina < 30 ? "Out of stamina: the puppet pants with its mouth open. Your opponent can see it." : "Running, swinging and dodging all cost stamina. Your opponent has no stamina bar: read the body."); }
      else if (act === "plunger") { if (!st.plunger) { st.plunger = true; say("SHLUCK! A plunger on the face. Breath drains fast. Mash to rip it off!"); } }
      else if (act === "rip") {
        if (st.plunger) { st.plunger = false; st.hp = Math.max(0, st.hp - 10); say("PLOP! Ripped off, at the price of 10% of max HP. Breath refills gradually."); }
        else say("Nothing on your face. Yet.");
      }
      render();
    });
    render();
  }

  // ---- Rulebook: touch controls -------------------------------------------------------------------------------
  const phone = $("[data-controls]");
  if (phone) {
    const label = $(".ctl-label", phone);
    $$(".ctl", phone).forEach((b) => {
      const show = () => {
        $$(".ctl", phone).forEach((x) => x.classList.toggle("is-active", x === b));
        label.innerHTML = `<b>${b.dataset.title}</b>${b.dataset.text}`;
      };
      b.addEventListener("click", show);
      b.addEventListener("mouseenter", show);
      b.addEventListener("focus", show);
    });
  }

  // ---- The Box: anatomy hotspots ------------------------------------------------------------------------------
  const anatomy = $("[data-anatomy]");
  if (anatomy) {
    const notes = $$(".anatomy-notes li");
    $$(".hotspot", anatomy).forEach((h) => {
      h.addEventListener("click", () => {
        const i = Number(h.dataset.note);
        $$(".hotspot", anatomy).forEach((x) => x.setAttribute("aria-expanded", String(x === h)));
        notes.forEach((n, k) => n.classList.toggle("is-active", k === i));
        notes[i] && notes[i].scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
      });
    });
  }

  // ---- League: proteins -----------------------------------------------------------------------------------------
  const picker = $("[data-proteins]");
  if (picker) {
    const stage = $(".splat-stage", picker);
    const label = $(".splat-label", picker);
    picker.addEventListener("click", (e) => {
      const b = e.target.closest("[data-color]");
      if (!b) return;
      $$("[data-color]", picker).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      stage.style.setProperty("--protein", b.dataset.color);
      label.textContent = b.dataset.paste;
      stage.classList.remove("is-splatting");
      stage.offsetWidth;
      stage.classList.add("is-splatting");
    });
  }

  // ---- League: commentator quotes -------------------------------------------------------------------------------
  const quoteBox = $("[data-quotes]");
  if (quoteBox) {
    const lines = JSON.parse(quoteBox.dataset.quotes);
    const q = $("q", quoteBox);
    let i = 0;
    if (!reduceMotion) setInterval(() => {
      q.style.opacity = 0;
      setTimeout(() => { i = (i + 1) % lines.length; q.textContent = lines[i]; q.style.opacity = 1; }, 300);
    }, 5200);
  }
})();
