/* =================================================================
   AMG HYDROVAC — interactions & animation
   Vanilla JS. No dependencies. Performance + a11y first.
   ================================================================= */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isSmall = window.matchMedia("(max-width: 760px)").matches;

  /* ---------- Lead source: remember the first page of the visit for the quote form ---------- */
  var LANDING_KEY = "amgLanding";
  try {
    if (!window.sessionStorage.getItem(LANDING_KEY)) {
      var q = window.location.search || "";
      var tag = /[?&](gclid|gbraid|wbraid)=/.test(q) ? " [google-ads]" : (/[?&]utm_/.test(q) ? " [utm" + q.slice(0, 80) + "]" : "");
      window.sessionStorage.setItem(LANDING_KEY, window.location.pathname + window.location.hash + tag);
      var extRef = document.referrer || "";
      if (extRef && extRef.indexOf(window.location.host) === -1) window.sessionStorage.setItem("amgReferrer", extRef.slice(0, 200));
    }
  } catch (err) { /* private mode: no landing memory */ }

  /* ---------- Header: solidify on scroll ---------- */
  var header = document.querySelector(".site-header");
  function onScrollHeader() {
    if (header) header.classList.toggle("is-stuck", window.scrollY > 24);
  }
  onScrollHeader();
  window.addEventListener("scroll", onScrollHeader, { passive: true });

  /* ---------- Mobile menu ---------- */
  var toggle = document.querySelector(".menu-toggle");
  var menu = document.querySelector(".mobile-menu");
  function setMenu(open) {
    document.body.classList.toggle("menu-open", open);
    if (toggle) toggle.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
  }
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      setMenu(!document.body.classList.contains("menu-open"));
    });
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { setMenu(false); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setMenu(false);
    });
    // Keep keyboard focus inside the full-screen menu while it's open.
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Tab" || !document.body.classList.contains("menu-open")) return;
      var focusables = [toggle].concat([].slice.call(menu.querySelectorAll("a")));
      var first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (focusables.indexOf(document.activeElement) === -1) { e.preventDefault(); first.focus(); }
    });
  }

  /* ---------- Current year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---------- Scroll reveal via IntersectionObserver ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if (prefersReduced || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Count-up stats ---------- */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var decimals = (el.getAttribute("data-decimals")) ? parseInt(el.getAttribute("data-decimals"), 10) : 0;
    var dur = 1600, start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    requestAnimationFrame(step);
  }
  var counters = document.querySelectorAll("[data-count]");
  if (counters.length) {
    if (prefersReduced || !("IntersectionObserver" in window)) {
      counters.forEach(function (el) {
        var t = parseFloat(el.getAttribute("data-count"));
        var d = el.getAttribute("data-decimals") ? parseInt(el.getAttribute("data-decimals"), 10) : 0;
        el.textContent = t.toFixed(d).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      });
    } else {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { animateCount(entry.target); cio.unobserve(entry.target); }
        });
      }, { threshold: 0.6 });
      counters.forEach(function (el) { cio.observe(el); });
    }
  }

  /* ---------- Hero headline reveal ---------- */
  var heroLines = document.querySelectorAll(".hero h1 .line > span");
  if (heroLines.length && !prefersReduced) {
    heroLines.forEach(function (span, i) {
      span.style.transform = "translateY(110%)";
      span.style.transition = "transform 0.9s cubic-bezier(0.22,1,0.36,1)";
      span.style.transitionDelay = (0.15 + i * 0.1) + "s";
    });
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        heroLines.forEach(function (span) { span.style.transform = "translateY(0)"; });
      });
    });
  }

  /* ---------- Subtle parallax (transform-only, rAF) ---------- */
  if (!prefersReduced && !isSmall) {
    var parallaxEls = [].slice.call(document.querySelectorAll("[data-parallax]"));
    if (parallaxEls.length) {
      var ticking = false;
      var update = function () {
        var y = window.scrollY;
        parallaxEls.forEach(function (el) {
          var speed = parseFloat(el.getAttribute("data-parallax")) || 0.15;
          el.style.transform = "translate3d(0," + (y * speed).toFixed(1) + "px,0)";
        });
        ticking = false;
      };
      window.addEventListener("scroll", function () {
        if (!ticking) { requestAnimationFrame(update); ticking = true; }
      }, { passive: true });
    }
  }

  /* ---------- Hero particle field ("dust in worklight") ---------- */
  var canvas = document.querySelector(".hero__canvas");
  if (canvas && !prefersReduced && !isSmall) {
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var particles = [];
    var W = 0, H = 0, running = true, rafId = null;

    function resize() {
      var rect = canvas.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function seed() {
      var count = Math.min(56, Math.floor(W / 22));
      particles = [];
      for (var i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * 1.8 + 0.4,
          vy: -(Math.random() * 0.28 + 0.06),
          vx: (Math.random() - 0.5) * 0.18,
          a: Math.random() * 0.5 + 0.1,
          tw: Math.random() * 0.02 + 0.004
        });
      }
    }
    function tick() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.y += p.vy; p.x += p.vx; p.a += p.tw;
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
        if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
        var alpha = 0.18 + Math.abs(Math.sin(p.a)) * 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(245,166,35," + alpha.toFixed(3) + ")";
        ctx.fill();
      }
      rafId = requestAnimationFrame(tick);
    }
    resize(); seed(); tick();
    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () { resize(); seed(); }, 200);
    });
    // Pause when hero scrolls out of view (saves battery/CPU)
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          running = e.isIntersecting;
          if (running && rafId === null) { tick(); }
          if (!running && rafId) { cancelAnimationFrame(rafId); rafId = null; }
        });
      }, { threshold: 0 }).observe(canvas);
    }
  }

  /* ---------- Accordion ---------- */
  document.querySelectorAll(".acc-q").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var expanded = btn.getAttribute("aria-expanded") === "true";
      var panel = document.getElementById(btn.getAttribute("aria-controls"));
      btn.setAttribute("aria-expanded", String(!expanded));
      if (panel) panel.style.maxHeight = expanded ? null : panel.scrollHeight + "px";
    });
  });

  /* ---------- Quote form (client-side validation + success UX) ---------- */
  var form = document.querySelector("#quote-form");
  if (form) {
    var success = document.querySelector("#form-success");
    function validateField(field) {
      var control = field.querySelector("input, textarea, select");
      if (!control || !control.hasAttribute("required")) return true;
      var ok = control.value.trim() !== "";
      if (ok && control.type === "email") ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(control.value);
      field.classList.toggle("invalid", !ok);
      // Expose the error state to assistive tech (err spans carry id="<field>-err").
      if (ok) control.removeAttribute("aria-invalid");
      else control.setAttribute("aria-invalid", "true");
      return ok;
    }
    form.querySelectorAll(".field").forEach(function (field) {
      var control = field.querySelector("input, textarea, select");
      if (control) control.addEventListener("blur", function () { validateField(field); });
      if (control) control.addEventListener("input", function () { if (field.classList.contains("invalid")) validateField(field); });
    });
    var errorEl = document.querySelector("#form-error");
    function showSuccess() {
      // Google Ads conversion: quote form submitted (Submit lead form).
      if (typeof gtag === "function") {
        gtag("event", "conversion", {
          send_to: "AW-18297054824/FeLaCJzA6OEcEOjM25RE",
          value: 1.0,
          currency: "CAD"
        });
      }
      form.style.display = "none";
      if (success) {
        success.classList.add("show");
        var mount = document.getElementById("estimate-mount");
        if (mount && window.AMGQuote) { try { window.AMGQuote.show(form, mount); } catch (err) { /* estimate is optional */ } }
        // Move focus to the confirmation so keyboard/screen-reader users hear it.
        success.setAttribute("tabindex", "-1");
        success.focus({ preventScroll: true });
        success.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "center" });
      }
    }
    function showError(btn, msg) {
      if (btn) { btn.disabled = false; btn.textContent = "Get My Rate Sheet"; }
      if (errorEl) {
        errorEl.textContent = msg || "Sorry — something went wrong sending your request. Please call 1-888-482-4504 or email quotes@amghydrovac.ca.";
        errorEl.classList.add("show");
      }
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (errorEl) { errorEl.classList.remove("show"); errorEl.textContent = ""; }
      var valid = true;
      form.querySelectorAll(".field").forEach(function (field) {
        if (!validateField(field)) valid = false;
      });
      if (!valid) {
        var firstInvalid = form.querySelector(".field.invalid input, .field.invalid textarea, .field.invalid select");
        if (firstInvalid) firstInvalid.focus();
        return;
      }
      // Set reply-to so you can reply straight to the requester.
      var rt = form.querySelector('input[name="replyto"]');
      var emailInput = form.querySelector("#email");
      if (rt && emailInput) rt.value = emailInput.value;

      // Rate sheet: fill the hidden fields so the lead email carries the minimum shown to the visitor.
      if (window.AMGQuote) { try { window.AMGQuote.prepare(form); } catch (err) { /* estimate is optional */ } }

      // Lead-source fields: which page they landed on, which page they converted on, and where they came from.
      var landingField = form.querySelector('input[name="landing_page"]');
      var sourceField = form.querySelector('input[name="source_page"]');
      var refField = form.querySelector('input[name="referrer"]');
      var landing = "";
      try { landing = window.sessionStorage.getItem(LANDING_KEY) || ""; } catch (err) { landing = ""; }
      if (landingField) landingField.value = landing || window.location.pathname;
      if (sourceField) sourceField.value = window.location.pathname + window.location.hash;
      var storedRef = "";
      try { storedRef = window.sessionStorage.getItem("amgReferrer") || ""; } catch (err) { storedRef = ""; }
      if (refField) refField.value = (storedRef || document.referrer || "direct").slice(0, 200);

      var btn = form.querySelector("button[type=submit]");
      if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }

      // If no real access key is set yet, run in demo mode (shows success, sends nothing).
      var keyField = form.querySelector('input[name="access_key"]');
      var configured = keyField && keyField.value && keyField.value.indexOf("YOUR_ACCESS_KEY") === -1;
      if (!configured) {
        setTimeout(showSuccess, 700);
        return;
      }

      // Real submission via the form's action endpoint (Web3Forms / Formspree compatible).
      fetch(form.getAttribute("action"), {
        method: "POST",
        headers: { "Accept": "application/json" },
        body: new FormData(form)
      }).then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok && data.success !== false, data: data }; })
          .catch(function () { return { ok: res.ok, data: {} }; });
      }).then(function (r) {
        if (r.ok) showSuccess();
        else showError(btn, r.data && r.data.message);
      }).catch(function () { showError(btn); });
    });
  }

  /* ---------- Sticky mobile action bar ---------- */
  var stickyBar = document.querySelector(".sticky-bar");
  if (stickyBar) {
    var heroCta = document.querySelector(".hero__actions");
    var onStickyScroll = function () {
      var show = window.scrollY > 80;
      if (show && heroCta) {
        // Keep the bar hidden while the hero buttons would sit underneath it (short phones).
        var r = heroCta.getBoundingClientRect();
        var barTop = window.innerHeight - stickyBar.offsetHeight;
        if (r.bottom > barTop && r.top < window.innerHeight) show = false;
      }
      stickyBar.classList.toggle("is-shown", show);
    };
    onStickyScroll();
    window.addEventListener("scroll", onStickyScroll, { passive: true });
  }

  /* ---------- Google Ads: phone-tap tracking (every tel: link) ---------- */
  // Counts a tap on a tel: link, not a completed call, so the matching Google Ads action
  // ("Website phone tap (tel link)") is Secondary. Delegated on document so it also covers
  // the links the service-area checker injects after load.
  var PHONE_TAP_SEND_TO = "AW-18297054824/Osl_CPT9wpEdEOjM25RE";
  var PHONE_TAP_KEY = "amgPhoneTapAt";
  var PHONE_TAP_GAP = 30 * 60 * 1000;
  var phoneTapAt = 0; // in-memory fallback when sessionStorage is unavailable
  function phoneTapLast() {
    var stored = 0;
    try { stored = parseInt(window.sessionStorage.getItem(PHONE_TAP_KEY), 10) || 0; } catch (err) { stored = 0; }
    return Math.max(phoneTapAt, stored);
  }
  function phoneTapRemember(now) {
    phoneTapAt = now;
    try { window.sessionStorage.setItem(PHONE_TAP_KEY, String(now)); } catch (err) { /* private mode: memory only */ }
  }
  document.addEventListener("click", function (e) {
    // The tapped node can be the <svg> icon or text inside the link.
    var el = e.target;
    while (el && el !== document && !(el.tagName && el.tagName.toLowerCase() === "a")) el = el.parentNode;
    if (!el || el === document) return;
    if ((el.getAttribute("href") || "").toLowerCase().indexOf("tel:") !== 0) return;
    if (typeof gtag !== "function") return;
    var now = Date.now();
    var last = phoneTapLast();
    if (last && now - last < PHONE_TAP_GAP) return; // one event per visit
    phoneTapRemember(now);
    gtag("event", "conversion", { send_to: PHONE_TAP_SEND_TO });
  }, true);

  /* ---------- Photo gallery lightbox (native <dialog>) ---------- */
  var lightbox = document.querySelector(".lightbox");
  var galleryEls = [].slice.call(document.querySelectorAll(".g-item"));
  if (lightbox && galleryEls.length && typeof lightbox.showModal === "function") {
    var lbImg = lightbox.querySelector("img");
    var lbTag = lightbox.querySelector(".lightbox__cap b");
    var lbCap = lightbox.querySelector(".lightbox__cap span");
    var lbIndex = 0;

    function lbLoaded(el) {
      var img = el.querySelector("img");
      return !!img && !el.classList.contains("is-missing") && img.complete && img.naturalWidth > 0;
    }
    function lbAvailable() {
      return galleryEls.filter(lbLoaded);
    }
    function lbShow(items, i) {
      lbIndex = (i + items.length) % items.length;
      var item = items[lbIndex];
      var img = item.querySelector("img");
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt || "";
      var tag = item.querySelector(".g-tag");
      var cap = item.querySelector(".g-cap");
      if (lbTag) lbTag.textContent = tag ? tag.textContent : "";
      if (lbCap) lbCap.textContent = cap ? cap.textContent : "";
      var nav = lightbox.querySelectorAll(".lightbox__btn--prev, .lightbox__btn--next");
      nav.forEach(function (b) { b.style.display = items.length > 1 ? "" : "none"; });
    }
    galleryEls.forEach(function (el) {
      el.addEventListener("click", function () {
        if (!lbLoaded(el)) return; // no photo yet (placeholder, still loading, or failed)
        var items = lbAvailable();
        lbShow(items, items.indexOf(el));
        lightbox.showModal();
      });
      el.setAttribute("tabindex", "0");
      el.setAttribute("role", "button");
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); el.click(); }
      });
    });
    lightbox.querySelector(".lightbox__btn--close").addEventListener("click", function () { lightbox.close(); });
    lightbox.querySelector(".lightbox__btn--prev").addEventListener("click", function () { lbShow(lbAvailable(), lbIndex - 1); });
    lightbox.querySelector(".lightbox__btn--next").addEventListener("click", function () { lbShow(lbAvailable(), lbIndex + 1); });
    lightbox.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") lbShow(lbAvailable(), lbIndex - 1);
      if (e.key === "ArrowRight") lbShow(lbAvailable(), lbIndex + 1);
    });
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) lightbox.close(); // click on backdrop
    });
  }

  /* ---------- Service-area checker ---------- */
  var areaForm = document.querySelector(".area-check");
  if (areaForm) {
    // Cities we service (plus common community aliases → the serviced municipality).
    var AREA_CITIES = {
      "pickering": "Pickering", "ajax": "Ajax", "whitby": "Whitby", "oshawa": "Oshawa",
      "clarington": "Clarington", "bowmanville": "Clarington", "courtice": "Clarington", "newcastle": "Clarington",
      "toronto": "Toronto", "scarborough": "Scarborough", "north york": "North York", "etobicoke": "Etobicoke",
      "east york": "Toronto", "downtown toronto": "Toronto",
      "markham": "Markham", "vaughan": "Vaughan", "woodbridge": "Vaughan", "maple": "Vaughan",
      "concord": "Vaughan", "thornhill": "Vaughan",
      "richmond hill": "Richmond Hill", "aurora": "Aurora", "newmarket": "Newmarket",
      "whitchurch-stouffville": "Whitchurch-Stouffville", "whitchurch stouffville": "Whitchurch-Stouffville", "stouffville": "Whitchurch-Stouffville",
      "mississauga": "Mississauga", "brampton": "Brampton", "caledon": "Caledon", "bolton": "Caledon",
      "oakville": "Oakville", "burlington": "Burlington", "milton": "Milton",
      "halton hills": "Halton Hills", "georgetown": "Halton Hills", "acton": "Halton Hills",
      "hamilton": "Hamilton", "stoney creek": "Stoney Creek", "ancaster": "Ancaster",
      "dundas": "Hamilton", "waterdown": "Hamilton", "binbrook": "Hamilton",
      "kitchener": "Kitchener", "waterloo": "Waterloo", "cambridge": "Cambridge", "guelph": "Guelph",
      "niagara falls": "Niagara Falls", "st catharines": "St. Catharines", "saint catharines": "St. Catharines",
      "welland": "Welland", "grimsby": "Grimsby"
    };
    // Postal FSA prefixes → serviced municipality.
    var AREA_FSA = {
      L1V:"Pickering",L1W:"Pickering",L1X:"Pickering",L1Y:"Pickering",
      L1S:"Ajax",L1T:"Ajax",L1Z:"Ajax",
      L1M:"Whitby",L1N:"Whitby",L1P:"Whitby",L1R:"Whitby",
      L1G:"Oshawa",L1H:"Oshawa",L1J:"Oshawa",L1K:"Oshawa",L1L:"Oshawa",
      L1B:"Clarington",L1C:"Clarington",L1E:"Clarington",
      L3P:"Markham",L3R:"Markham",L3S:"Markham",L6B:"Markham",L6C:"Markham",L6E:"Markham",L6G:"Markham",
      L4J:"Vaughan",L4K:"Vaughan",L4L:"Vaughan",L4H:"Vaughan",L6A:"Vaughan",
      L4B:"Richmond Hill",L4C:"Richmond Hill",L4E:"Richmond Hill",L4S:"Richmond Hill",
      L4G:"Aurora",L3X:"Newmarket",L3Y:"Newmarket",L4A:"Whitchurch-Stouffville",
      L4T:"Mississauga",L4V:"Mississauga",L4W:"Mississauga",L4X:"Mississauga",L4Y:"Mississauga",L4Z:"Mississauga",
      L5A:"Mississauga",L5B:"Mississauga",L5C:"Mississauga",L5E:"Mississauga",L5G:"Mississauga",L5H:"Mississauga",
      L5J:"Mississauga",L5K:"Mississauga",L5L:"Mississauga",L5M:"Mississauga",L5N:"Mississauga",L5R:"Mississauga",
      L5S:"Mississauga",L5T:"Mississauga",L5V:"Mississauga",L5W:"Mississauga",
      L6P:"Brampton",L6R:"Brampton",L6S:"Brampton",L6T:"Brampton",L6V:"Brampton",L6W:"Brampton",
      L6X:"Brampton",L6Y:"Brampton",L6Z:"Brampton",L7A:"Brampton",
      L7C:"Caledon",L7E:"Caledon",L7K:"Caledon",
      L6H:"Oakville",L6J:"Oakville",L6K:"Oakville",L6L:"Oakville",L6M:"Oakville",
      L7L:"Burlington",L7M:"Burlington",L7N:"Burlington",L7P:"Burlington",L7R:"Burlington",L7S:"Burlington",L7T:"Burlington",
      L9T:"Milton",L9E:"Milton",L7G:"Halton Hills",L7J:"Halton Hills",
      L8B:"Hamilton",L8H:"Hamilton",L8K:"Hamilton",L8L:"Hamilton",L8M:"Hamilton",L8N:"Hamilton",L8P:"Hamilton",
      L8R:"Hamilton",L8S:"Hamilton",L8T:"Hamilton",L8V:"Hamilton",L8W:"Hamilton",
      L9A:"Hamilton",L9B:"Hamilton",L9C:"Hamilton",L9K:"Hamilton",L9H:"Hamilton",
      L8E:"Stoney Creek",L8G:"Stoney Creek",L8J:"Stoney Creek",L9G:"Ancaster",
      N2A:"Kitchener",N2B:"Kitchener",N2C:"Kitchener",N2E:"Kitchener",N2G:"Kitchener",N2H:"Kitchener",
      N2K:"Kitchener",N2M:"Kitchener",N2N:"Kitchener",N2P:"Kitchener",N2R:"Kitchener",
      N2J:"Waterloo",N2L:"Waterloo",N2T:"Waterloo",N2V:"Waterloo",
      N1R:"Cambridge",N1S:"Cambridge",N1T:"Cambridge",N3C:"Cambridge",N3E:"Cambridge",N3H:"Cambridge",
      N1C:"Guelph",N1E:"Guelph",N1G:"Guelph",N1H:"Guelph",N1K:"Guelph",N1L:"Guelph",
      L2E:"Niagara Falls",L2G:"Niagara Falls",L2H:"Niagara Falls",L2J:"Niagara Falls",
      L2M:"St. Catharines",L2N:"St. Catharines",L2P:"St. Catharines",L2R:"St. Catharines",
      L2S:"St. Catharines",L2T:"St. Catharines",L2V:"St. Catharines",L2W:"St. Catharines",
      L3B:"Welland",L3C:"Welland",L3M:"Grimsby"
    };
    // Toronto FSAs by first two characters.
    var AREA_M = { M1:"Scarborough", M2:"North York", M3:"North York", M4:"Toronto", M5:"Toronto", M6:"Toronto", M7:"Toronto", M8:"Etobicoke", M9:"Etobicoke" };

    var areaInput = areaForm.querySelector("input");
    var areaResult = areaForm.querySelector(".area-check__result");

    function areaLookup(raw) {
      var norm = raw.toLowerCase().replace(/[.,'’]/g, "").replace(/\s+/g, " ").trim();
      if (!norm) return null;
      var pc = norm.replace(/\s/g, "").toUpperCase();
      // Looks like a postal code (or the first half of one)?
      if (/^[A-Z]\d/.test(pc)) {
        if (AREA_M[pc.slice(0, 2)]) return { yes: true, city: AREA_M[pc.slice(0, 2)] };
        if (AREA_FSA[pc.slice(0, 3)]) return { yes: true, city: AREA_FSA[pc.slice(0, 3)] };
        if (pc[0] === "L" || pc[0] === "N" || pc[0] === "M") return { yes: false, near: true };
        return { yes: false, near: false };
      }
      // City / town name match (exact first, then longest contained key).
      if (AREA_CITIES[norm]) return { yes: true, city: AREA_CITIES[norm] };
      var best = "";
      for (var key in AREA_CITIES) {
        if (norm.indexOf(key) !== -1 && key.length > best.length) best = key;
      }
      if (best) return { yes: true, city: AREA_CITIES[best] };
      return { yes: false, near: false };
    }

    function areaRender(res) {
      if (!res) { areaResult.classList.remove("show"); return; }
      var icon, html;
      if (res.yes) {
        icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>';
        html = "<strong>Yes — we service " + res.city + ".</strong> <a href=\"contact.html\">Request a quote</a> or call <a href=\"tel:+18884824504\">1-888-482-4504</a> for 24/7 dispatch.";
      } else {
        icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>';
        html = "<strong>Contact us to confirm.</strong> We regularly mobilize across Southern Ontario" + (res.near ? " and may already cover your area" : "") + " — call <a href=\"tel:+18884824504\">1-888-482-4504</a> and we'll give you a straight answer.";
      }
      areaResult.innerHTML = icon + "<span>" + html + "</span>";
      areaResult.classList.remove("is-yes", "is-maybe");
      areaResult.classList.add("show", res.yes ? "is-yes" : "is-maybe");
    }

    areaForm.addEventListener("submit", function (e) {
      e.preventDefault();
      areaRender(areaLookup(areaInput.value));
    });
  }
})();
