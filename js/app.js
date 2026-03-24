(function () {
  "use strict";

  var FRAME_COUNT = 126;
  var FRAME_SPEED = 2.0;

  var loader    = document.getElementById("loader");
  var loaderBar = document.getElementById("loader-bar");
  var loaderPct = document.getElementById("loader-percent");
  var hero      = document.getElementById("hero");
  var canvas    = document.getElementById("canvas");
  var ctx       = canvas.getContext("2d");
  var scroller  = document.getElementById("scroll-container");
  var darkOverlay = document.getElementById("dark-overlay");
  var sections  = document.querySelectorAll(".scroll-section");

  var frames = [];
  var cur = -1, loaded = 0;

  function pad(n) { return String(n).padStart(4, "0"); }
  function src(i) { return "frames/frame_" + pad(i + 1) + ".webp"; }

  function resize() {
    var dpr = devicePixelRatio || 1;
    var w = innerWidth, h = innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(i) {
    var img = frames[i];
    if (!img || !img.naturalWidth) return;
    var w = innerWidth, h = innerHeight;
    var scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    var dw = img.naturalWidth * scale;
    var dh = img.naturalHeight * scale;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }

  function preload() {
    return new Promise(function (done) {
      for (var i = 0; i < FRAME_COUNT; i++) {
        var img = new Image();
        img.onload = img.onerror = function () {
          loaded++;
          var pct = (loaded / FRAME_COUNT) * 100;
          loaderBar.style.width = pct + "%";
          loaderPct.textContent = Math.round(pct) + "%";
          if (loaded === 1) { resize(); draw(0); cur = 0; }
          if (loaded === FRAME_COUNT) done();
        };
        img.src = src(i);
        frames[i] = img;
      }
    });
  }

  var lenis = new Lenis({
    duration: 1.2,
    easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
    smoothWheel: true,
  });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
  gsap.ticker.lagSmoothing(0);
  lenis.stop();

  function animateHero() {
    var label = hero.querySelector(".section-label");
    var words = hero.querySelectorAll(".word");
    var tagline = hero.querySelector(".hero-tagline");

    gsap.fromTo(label,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8, delay: 0.2, ease: "power3.out" });

    words.forEach(function (w, i) {
      gsap.to(w, { opacity: 1, y: 0, duration: 0.9, delay: 0.4 + i * 0.1, ease: "power3.out" });
    });

    gsap.to(tagline, {
      opacity: 1, y: 0, duration: 0.9,
      delay: 0.4 + words.length * 0.1 + 0.15, ease: "power3.out",
    });
  }

  function initHeroFade() {
    ScrollTrigger.create({
      trigger: scroller, start: "top top", end: "bottom bottom", scrub: true,
      onUpdate: function (self) {
        hero.style.opacity = Math.max(0, 1 - self.progress * 15);
      },
    });
  }

  function initFrameScroll() {
    ScrollTrigger.create({
      trigger: scroller, start: "top top", end: "bottom bottom", scrub: true,
      onUpdate: function (self) {
        var idx = Math.min(
          Math.floor(Math.min(self.progress * FRAME_SPEED, 1) * FRAME_COUNT),
          FRAME_COUNT - 1
        );
        if (idx !== cur) { cur = idx; requestAnimationFrame(function () { draw(cur); }); }
      },
    });
  }

  function initSections() {
    sections.forEach(function (sec) {
      var type = sec.dataset.animation;
      var persist = sec.dataset.persist === "true";
      var enter = +sec.dataset.enter / 100;
      var leave = +sec.dataset.leave / 100;
      var kids = sec.querySelectorAll(
        ".section-label,.section-heading,.section-body,.section-note,.cta-button,.stat,.exp-item"
      );

      var tl = gsap.timeline({ paused: true });
      switch (type) {
        case "fade-up":     tl.from(kids, { y: 50, opacity: 0, stagger: 0.12, duration: 0.9, ease: "power3.out" }); break;
        case "slide-left":  tl.from(kids, { x: -80, opacity: 0, stagger: 0.14, duration: 0.9, ease: "power3.out" }); break;
        case "slide-right": tl.from(kids, { x: 80, opacity: 0, stagger: 0.14, duration: 0.9, ease: "power3.out" }); break;
        case "scale-up":    tl.from(kids, { scale: 0.85, opacity: 0, stagger: 0.12, duration: 1, ease: "power2.out" }); break;
        case "rotate-in":   tl.from(kids, { y: 40, rotation: 3, opacity: 0, stagger: 0.1, duration: 0.9, ease: "power3.out" }); break;
        case "stagger-up":  tl.from(kids, { y: 60, opacity: 0, stagger: 0.15, duration: 0.8, ease: "power3.out" }); break;
        case "clip-reveal":tl.from(kids, { clipPath: "inset(100% 0 0 0)", opacity: 0, stagger: 0.15, duration: 1.2, ease: "power4.inOut" }); break;
      }

      var on = false;
      ScrollTrigger.create({
        trigger: scroller, start: "top top", end: "bottom bottom", scrub: true,
        onUpdate: function (self) {
          var p = self.progress;
          var inside = p >= enter && p <= leave;
          var past = p > leave;
          if (inside && !on) { sec.classList.add("is-visible"); tl.play(); on = true; }
          else if (!inside && on && !(persist && past)) { sec.classList.remove("is-visible"); tl.reverse(); on = false; }
          if (persist && past) sec.classList.add("is-visible");
        },
      });
    });
  }

  function initCounters() {
    document.querySelectorAll(".stat-number").forEach(function (el) {
      var target = +el.dataset.value, dec = +(el.dataset.decimals || 0);
      var o = { v: 0, playing: false };
      var sec = el.closest(".scroll-section");
      var enter = +sec.dataset.enter / 100, leave = +sec.dataset.leave / 100;
      ScrollTrigger.create({
        trigger: scroller, start: "top top", end: "bottom bottom",
        onUpdate: function (self) {
          var p = self.progress;
          if (p >= enter && p <= leave && !o.playing) {
            o.playing = true;
            gsap.to(o, { v: target, duration: 2, ease: "power1.out",
              onUpdate: function () { el.textContent = o.v.toFixed(dec); } });
          } else if (p < enter) { o.playing = false; o.v = 0; el.textContent = "0"; }
        },
      });
    });
  }

  function initMarquees() {
    document.querySelectorAll(".marquee-wrap").forEach(function (el) {
      var speed = +(el.dataset.scrollSpeed) || -25;
      var enter = +(el.dataset.enter) / 100;
      var leave = +(el.dataset.leave) / 100;
      var txt = el.querySelector(".marquee-text");

      gsap.to(txt, { xPercent: speed, ease: "none",
        scrollTrigger: { trigger: scroller, start: "top top", end: "bottom bottom", scrub: true } });

      ScrollTrigger.create({
        trigger: scroller, start: "top top", end: "bottom bottom", scrub: true,
        onUpdate: function (self) {
          var p = self.progress, fade = 0.03, op = 0;
          if      (p >= enter - fade && p < enter) op = (p - (enter - fade)) / fade;
          else if (p >= enter && p <= leave)        op = 1;
          else if (p > leave && p <= leave + fade)  op = 1 - (p - leave) / fade;
          el.style.opacity = op;
        },
      });
    });
  }

  function initOverlay() {
    var s = document.querySelector(".section-stats");
    if (!s) return;
    var enter = +s.dataset.enter / 100, leave = +s.dataset.leave / 100, fade = 0.04;
    ScrollTrigger.create({
      trigger: scroller, start: "top top", end: "bottom bottom", scrub: true,
      onUpdate: function (self) {
        var p = self.progress, op = 0;
        if      (p >= enter - fade && p <= enter) op = ((p - (enter - fade)) / fade) * 0.9;
        else if (p > enter && p < leave)          op = 0.9;
        else if (p >= leave && p <= leave + fade)  op = 0.9 * (1 - (p - leave) / fade);
        darkOverlay.style.opacity = op;
      },
    });
  }

  function initContactModal() {
    var overlay = document.getElementById("contact-modal");
    var openBtn = document.getElementById("open-contact");
    var closeBtn = document.getElementById("close-contact");
    var form = document.getElementById("contact-form");
    var submitBtn = document.getElementById("form-submit");
    var success = document.getElementById("form-success");

    function open() { overlay.classList.add("is-open"); lenis.stop(); }
    function close() { overlay.classList.remove("is-open"); lenis.start(); }

    openBtn.addEventListener("click", open);
    closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && overlay.classList.contains("is-open")) close(); });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      submitBtn.classList.add("is-sending");
      fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { "Accept": "application/json" },
      }).then(function (res) {
        submitBtn.classList.remove("is-sending");
        if (res.ok) {
          form.style.display = "none";
          success.classList.add("is-visible");
          setTimeout(function () {
            close();
            setTimeout(function () {
              form.style.display = "";
              form.reset();
              success.classList.remove("is-visible");
            }, 500);
          }, 2500);
        }
      }).catch(function () {
        submitBtn.classList.remove("is-sending");
      });
    });
  }

  async function init() {
    resize();
    window.addEventListener("resize", function () { resize(); if (cur >= 0) draw(cur); });
    await preload();
    loader.classList.add("hidden");
    lenis.start();
    animateHero();
    initHeroFade();
    initFrameScroll();
    initSections();
    initCounters();
    initMarquees();
    initOverlay();
    initContactModal();
    draw(0);
  }

  init();
})();
