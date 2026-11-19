/* ===========================================================
   Interface language toggle (中 / EN) + post language filter
   =========================================================== */
(function () {
  "use strict";

  var LANG_KEY = "site-lang";
  var FILTER_KEY = "post-filter";

  /* ---------- Interface language (nav labels, about page) ---------- */
  function applyLang(lang) {
    // Text nodes with data-zh / data-en
    document.querySelectorAll("[data-zh][data-en]").forEach(function (el) {
      var val = el.getAttribute(lang === "en" ? "data-en" : "data-zh");
      if (val !== null) el.textContent = val;
    });
    // Whole blocks: .lang-zh / .lang-en
    document.querySelectorAll(".lang-zh").forEach(function (el) {
      el.hidden = lang !== "zh";
    });
    document.querySelectorAll(".lang-en").forEach(function (el) {
      el.hidden = lang !== "en";
    });
    document.documentElement.setAttribute("data-ui-lang", lang);
  }

  function getLang() {
    return localStorage.getItem(LANG_KEY) || "zh";
  }

  var toggle = document.getElementById("lang-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = getLang() === "zh" ? "en" : "zh";
      localStorage.setItem(LANG_KEY, next);
      applyLang(next);
    });
  }
  applyLang(getLang());

  /* ---------- Color scheme toggle (light / dark / system) ---------- */
  var SCHEME_KEY = "color-scheme";
  var schemeMeta = document.querySelector('meta[name="color-scheme"]');
  var themeToggle = document.getElementById("theme-toggle");
  var darkMedia = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function getStoredScheme() {
    try {
      var val = localStorage.getItem(SCHEME_KEY);
      return (val === "light" || val === "dark") ? val : null;
    } catch (e) {
      return null;
    }
  }

  function getSystemScheme() {
    return (darkMedia && darkMedia.matches) ? "dark" : "light";
  }

  function applySchemeMeta(val) {
    if (schemeMeta) schemeMeta.setAttribute("content", val || "light dark");
  }

  var onThemeChangeHooks = [];

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var current = getStoredScheme() || getSystemScheme();
      var target = current === "dark" ? "light" : "dark";
      if (target !== getSystemScheme()) {
        try { localStorage.setItem(SCHEME_KEY, target); } catch (e) {}
        applySchemeMeta(target);
      } else {
        try { localStorage.removeItem(SCHEME_KEY); } catch (e) {}
        applySchemeMeta("light dark");
      }
      onThemeChangeHooks.forEach(function (fn) { fn(); });
    });
  }

  window.addEventListener("storage", function (e) {
    if (e.key === SCHEME_KEY) {
      applySchemeMeta((e.newValue === "light" || e.newValue === "dark") ? e.newValue : "light dark");
      onThemeChangeHooks.forEach(function (fn) { fn(); });
    }
  });

  if (darkMedia && darkMedia.addEventListener) {
    darkMedia.addEventListener("change", function () {
      onThemeChangeHooks.forEach(function (fn) { fn(); });
    });
  }

  /* ---------- Hero Option 1: Interactive Magnetic Vector Field ---------- */
  var vectorCanvas = document.getElementById("hero-vector-field");
  var heroSection = document.getElementById("hero");
  if (vectorCanvas && heroSection && vectorCanvas.getContext) {
    var ctx = vectorCanvas.getContext("2d");
    var reducedMotionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    var prefersReduced = reducedMotionQuery ? reducedMotionQuery.matches : false;
    var cells = [];
    var width = 0;
    var height = 0;
    var dpr = 1;
    var radius = 260;
    var TARGET_ANGLE = -Math.PI / 4;
    var restX = 0;
    var restY = 0;
    var lensX = 0;
    var lensY = 0;
    var targetX = 0;
    var targetY = 0;
    var rafId = null;
    var isHeroVisible = true;
    var darkActive = false;
    var fgRgb = [30, 29, 27];
    var accentRgb = [182, 75, 59];

    function isDarkSchemeActive() {
      var content = schemeMeta ? schemeMeta.getAttribute("content") : "";
      if (content === "dark") return true;
      if (content === "light") return false;
      return getSystemScheme() === "dark";
    }

    function parseCssColor(str, fallback) {
      var s = (str || "").trim();
      if (s.charAt(0) === "#" && (s.length === 7 || s.length === 4)) {
        if (s.length === 4) {
          return [
            parseInt(s.charAt(1) + s.charAt(1), 16),
            parseInt(s.charAt(2) + s.charAt(2), 16),
            parseInt(s.charAt(3) + s.charAt(3), 16)
          ];
        }
        return [
          parseInt(s.slice(1, 3), 16),
          parseInt(s.slice(3, 5), 16),
          parseInt(s.slice(5, 7), 16)
        ];
      }
      var m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      return m ? [+m[1], +m[2], +m[3]] : fallback;
    }

    function syncVectorColors() {
      darkActive = isDarkSchemeActive();
      var cs = getComputedStyle(document.documentElement);
      fgRgb = parseCssColor(
        cs.getPropertyValue(darkActive ? "--fg-dark" : "--fg-light"),
        darkActive ? [230, 232, 235] : [30, 29, 27]
      );
      accentRgb = parseCssColor(
        cs.getPropertyValue(darkActive ? "--accent-dark" : "--accent-light"),
        darkActive ? [229, 113, 95] : [182, 75, 59]
      );
    }

    function shortestAngleDiff(from, to) {
      var diff = (to - from) % Math.PI;
      if (diff > Math.PI / 2) diff -= Math.PI;
      if (diff < -Math.PI / 2) diff += Math.PI;
      return diff;
    }

    function buildVectorGrid() {
      var rect = heroSection.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      if (!width || !height) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      vectorCanvas.width = Math.round(width * dpr);
      vectorCanvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var step = width < 640 ? 32 : 38;
      var cols = Math.max(4, Math.floor((width - 24) / step) + 1);
      var rows = Math.max(4, Math.floor((height - 24) / step) + 1);
      var offsetX = (width - (cols - 1) * step) / 2;
      var offsetY = (height - (rows - 1) * step) / 2;
      radius = Math.min(Math.max(width * 0.27, 175), 310);

      restX = width * 0.72;
      restY = height * 0.42;
      lensX = targetX = restX;
      lensY = targetY = restY;

      cells = [];
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var x = offsetX + c * step;
          var y = offsetY + r * step;
          var baseAngle = Math.sin(c * 1.73 + r * 0.91) * 1.25 + Math.cos(c * 0.61 - r * 1.37) * 1.1;
          var dist = Math.hypot(x - restX, y - restY);
          var t = dist < radius ? 0.5 * (1 + Math.cos(Math.PI * dist / radius)) : 0;
          var influence = t * t;
          var edgeV = Math.min(y / 56, (height - y) / 56, 1);
          var edgeH = Math.min(x / 36, (width - x) / 36, 1);
          var dxText = (x - width * 0.5) / (width < 640 ? 150 : 280);
          var dyText = (y - height * 0.5) / 64;
          var textMask = 1 - 0.68 * Math.exp(-(dxText * dxText + dyText * dyText));
          var edgeFade = Math.max(0.15, Math.min(edgeV, edgeH)) * textMask;
          cells.push({
            x: x,
            y: y,
            baseAngle: baseAngle,
            angle: baseAngle + shortestAngleDiff(baseAngle, TARGET_ANGLE) * influence,
            glow: influence,
            edgeFade: edgeFade
          });
        }
      }
    }

    function renderVectorFrame(instant) {
      if (!width || !height) return;
      var snap = instant || prefersReduced;
      var maxDelta = 0;

      if (snap) {
        lensX = targetX;
        lensY = targetY;
      } else {
        var dxLens = targetX - lensX;
        var dyLens = targetY - lensY;
        lensX += dxLens * 0.12;
        lensY += dyLens * 0.12;
        maxDelta = Math.max(maxDelta, Math.abs(dxLens) * 0.01, Math.abs(dyLens) * 0.01);
      }

      ctx.clearRect(0, 0, width, height);

      // Soft ambient spotlight halo matching the magnetic focus zone
      var haloRadius = radius * 1.08;
      var grad = ctx.createRadialGradient(lensX, lensY, 0, lensX, lensY, haloRadius);
      var haloAlpha = darkActive ? 0.14 : 0.085;
      grad.addColorStop(0, "rgba(" + accentRgb[0] + "," + accentRgb[1] + "," + accentRgb[2] + "," + haloAlpha + ")");
      grad.addColorStop(0.55, "rgba(" + accentRgb[0] + "," + accentRgb[1] + "," + accentRgb[2] + "," + (haloAlpha * 0.35) + ")");
      grad.addColorStop(1, "rgba(" + accentRgb[0] + "," + accentRgb[1] + "," + accentRgb[2] + ",0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      ctx.lineCap = "round";
      var baseAlpha = darkActive ? 0.14 : 0.15;
      var peakAlpha = darkActive ? 0.74 : 0.64;

      for (var i = 0; i < cells.length; i++) {
        var cell = cells[i];
        var dist = Math.hypot(cell.x - lensX, cell.y - lensY);
        var t = dist < radius ? 0.5 * (1 + Math.cos(Math.PI * dist / radius)) : 0;
        var influence = t * t;
        var desiredAngle = cell.baseAngle + shortestAngleDiff(cell.baseAngle, TARGET_ANGLE) * influence;

        if (snap) {
          cell.angle = desiredAngle;
          cell.glow = influence;
        } else {
          var da = shortestAngleDiff(cell.angle, desiredAngle);
          var dg = influence - cell.glow;
          cell.angle += da * 0.12;
          cell.glow += dg * 0.12;
          maxDelta = Math.max(maxDelta, Math.abs(da), Math.abs(dg));
        }

        var halfLen = (9.5 + cell.glow * 4) * 0.5;
        var cosA = Math.cos(cell.angle);
        var sinA = Math.sin(cell.angle);
        var rCol = Math.round(fgRgb[0] + (accentRgb[0] - fgRgb[0]) * cell.glow);
        var gCol = Math.round(fgRgb[1] + (accentRgb[1] - fgRgb[1]) * cell.glow);
        var bCol = Math.round(fgRgb[2] + (accentRgb[2] - fgRgb[2]) * cell.glow);
        var alpha = (baseAlpha + (peakAlpha - baseAlpha) * cell.glow) * cell.edgeFade;

        ctx.strokeStyle = "rgba(" + rCol + "," + gCol + "," + bCol + "," + alpha.toFixed(3) + ")";
        ctx.lineWidth = 1.1 + cell.glow * 0.4;
        ctx.beginPath();
        ctx.moveTo(cell.x - cosA * halfLen, cell.y - sinA * halfLen);
        ctx.lineTo(cell.x + cosA * halfLen, cell.y + sinA * halfLen);
        ctx.stroke();
      }

      if (!snap && isHeroVisible && maxDelta > 0.0015) {
        rafId = window.requestAnimationFrame(function () { renderVectorFrame(false); });
      } else {
        rafId = null;
      }
    }

    function wakeVectorField() {
      if (prefersReduced || !isHeroVisible || rafId !== null) return;
      rafId = window.requestAnimationFrame(function () { renderVectorFrame(false); });
    }

    function refreshVectorTheme() {
      syncVectorColors();
      renderVectorFrame(prefersReduced);
    }

    onThemeChangeHooks.push(refreshVectorTheme);

    heroSection.addEventListener("pointermove", function (e) {
      if (prefersReduced) return;
      var rect = heroSection.getBoundingClientRect();
      targetX = e.clientX - rect.left;
      targetY = e.clientY - rect.top;
      wakeVectorField();
    });

    heroSection.addEventListener("pointerdown", function (e) {
      if (prefersReduced) return;
      var rect = heroSection.getBoundingClientRect();
      targetX = e.clientX - rect.left;
      targetY = e.clientY - rect.top;
      wakeVectorField();
    });

    heroSection.addEventListener("pointerleave", function () {
      if (prefersReduced) return;
      targetX = restX;
      targetY = restY;
      wakeVectorField();
    });

    var resizeTimer = null;
    window.addEventListener("resize", function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        buildVectorGrid();
        renderVectorFrame(true);
      }, 120);
    });

    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (entries) {
        isHeroVisible = entries[0] ? entries[0].isIntersecting : true;
        if (!isHeroVisible && rafId !== null) {
          window.cancelAnimationFrame(rafId);
          rafId = null;
        }
      }, { threshold: 0.02 });
      observer.observe(heroSection);
    }

    if (reducedMotionQuery && reducedMotionQuery.addEventListener) {
      reducedMotionQuery.addEventListener("change", function (e) {
        prefersReduced = e.matches;
        targetX = restX;
        targetY = restY;
        renderVectorFrame(true);
      });
    }

    syncVectorColors();
    buildVectorGrid();
    renderVectorFrame(true);
  }

  /* ---------- Post language & series filter (home + archive) ---------- */
  var chips = document.querySelectorAll(".filter-chip");
  var seriesChips = document.querySelectorAll(".archive-series-chip");
  var items = document.querySelectorAll(".post-item, .archive-item");
  var emptyHint = document.querySelector(".empty-hint");
  var currentLangFilter = chips.length ? (localStorage.getItem(FILTER_KEY) || "all") : "all";
  var currentSeriesFilter = "all";

  function applyCombinedFilters() {
    var visible = 0;
    items.forEach(function (item) {
      var langMatch = currentLangFilter === "all" || item.getAttribute("data-lang") === currentLangFilter;
      var seriesMatch = currentSeriesFilter === "all" || item.getAttribute("data-series") === currentSeriesFilter;
      var show = langMatch && seriesMatch;
      item.style.display = show ? "" : "none";
      if (show) visible++;
    });
    if (emptyHint) emptyHint.hidden = visible !== 0;
    chips.forEach(function (c) {
      c.classList.toggle("active", c.getAttribute("data-filter") === currentLangFilter);
    });
    seriesChips.forEach(function (c) {
      c.classList.toggle("active", c.getAttribute("data-series") === currentSeriesFilter);
    });
    // Hide archive year groups that have no visible items
    document.querySelectorAll(".archive-year").forEach(function (group) {
      var groupItems = group.querySelectorAll(".archive-item");
      var any = Array.prototype.some.call(groupItems, function (i) {
        return i.style.display !== "none";
      });
      group.style.display = any ? "" : "none";
    });
    // Hide featured section when all its items are hidden
    document.querySelectorAll(".featured-section").forEach(function (section) {
      var sectionItems = section.querySelectorAll(".post-item");
      var any = Array.prototype.some.call(sectionItems, function (i) {
        return i.style.display !== "none";
      });
      section.style.display = any ? "" : "none";
    });
  }

  if (chips.length) {
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        currentLangFilter = chip.getAttribute("data-filter");
        localStorage.setItem(FILTER_KEY, currentLangFilter);
        applyCombinedFilters();
      });
    });
  }

  if (seriesChips.length) {
    var params = new URLSearchParams(window.location.search);
    var initialSeries = params.get("series");
    if (initialSeries) {
      var hasMatch = Array.prototype.some.call(seriesChips, function (c) {
        return c.getAttribute("data-series") === initialSeries;
      });
      if (hasMatch) currentSeriesFilter = initialSeries;
    }
    seriesChips.forEach(function (chip) {
      chip.addEventListener("click", function (e) {
        e.preventDefault();
        currentSeriesFilter = chip.getAttribute("data-series") || "all";
        var targetUrl = currentSeriesFilter === "all"
          ? window.location.pathname
          : window.location.pathname + "?series=" + encodeURIComponent(currentSeriesFilter);
        window.history.replaceState(null, "", targetUrl);
        applyCombinedFilters();
      });
    });
  }

  if (chips.length || seriesChips.length) {
    applyCombinedFilters();
  }

  // Track which free tool readers explicitly join the waitlist for.
  document.querySelectorAll(".tool-waitlist-form").forEach(function (form) {
    form.addEventListener("submit", function () {
      var selected = form.querySelector('input[name="tag"]:checked');
      if (selected && window.siteAnalytics) {
        window.siteAnalytics.track("tool_waitlist_vote", {
          tool: selected.value,
          content_slug: window.siteAnalytics.contentSlug(form),
          placement: form.getAttribute("data-placement") || "article_footer_waitlist",
          page_location: window.location.pathname
        });
      }
    });
  });

  /* ---------- Native <dialog> Lightbox (work showcase + article diagrams) ---------- */
  var lightbox = document.getElementById("image-lightbox");
  if (lightbox && typeof lightbox.showModal === "function") {
    var lightboxImg = document.getElementById("lightbox-img");
    var lightboxTitle = document.getElementById("lightbox-title");
    var lightboxSub = document.getElementById("lightbox-subtitle");
    var lightboxCloseBtn = document.getElementById("lightbox-close");
    var supportsDisplayTransition;

    function canTransitionDisplay() {
      if (supportsDisplayTransition !== undefined) return supportsDisplayTransition;
      if (!window.CSS || !window.CSS.supports || !window.CSS.supports("transition-behavior", "allow-discrete") || !document.body) {
        supportsDisplayTransition = false;
        return false;
      }
      var probe = document.createElement("div");
      probe.style.cssText = "transition: display 1s allow-discrete !important; display: block;";
      document.body.appendChild(probe);
      window.getComputedStyle(probe).display;
      probe.style.display = "none";
      supportsDisplayTransition = window.getComputedStyle(probe).display === "block";
      probe.remove();
      return supportsDisplayTransition;
    }

    function supportsTopLayerExit() {
      return !!(window.CSS && window.CSS.supports && window.CSS.supports("overlay", "auto") && canTransitionDisplay());
    }

    function closeLightbox() {
      if (!lightbox.open) return;
      if (!supportsTopLayerExit()) {
        lightbox.setAttribute("data-closing", "");
        var anims = lightbox.getAnimations ? lightbox.getAnimations({ subtree: true }) : [];
        if (anims.length > 0) {
          Promise.race([
            Promise.allSettled(anims.map(function (a) { return a.finished; })),
            new Promise(function (resolve) { window.setTimeout(resolve, 600); })
          ]).then(function () {
            if (!lightbox.hasAttribute("data-closing")) return;
            lightbox.removeAttribute("data-closing");
            if (lightbox.open) lightbox.close();
          });
          return;
        }
        lightbox.removeAttribute("data-closing");
      }
      lightbox.close();
    }

    function openLightbox(opts) {
      if (!opts || !opts.src) return;
      lightbox.removeAttribute("data-closing");
      if (lightboxImg) {
        lightboxImg.src = opts.src;
        lightboxImg.alt = opts.alt || opts.title || "";
      }
      if (lightboxTitle) lightboxTitle.textContent = opts.title || "";
      if (lightboxSub) {
        lightboxSub.textContent = opts.subtitle || "";
        lightboxSub.hidden = !opts.subtitle;
      }
      lightbox.showModal();
    }

    lightbox.addEventListener("close", function () {
      lightbox.removeAttribute("data-closing");
      lightbox.returnValue = "";
    });

    lightbox.addEventListener("cancel", function (e) {
      if (!supportsTopLayerExit()) {
        e.preventDefault();
        closeLightbox();
      }
    });

    if (lightboxCloseBtn) {
      lightboxCloseBtn.addEventListener("click", function () {
        closeLightbox();
      });
    }

    if (!("closedBy" in HTMLDialogElement.prototype)) {
      var pressedOutside = false;
      var isOutsideDialog = function (e) {
        var r = lightbox.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      lightbox.addEventListener("pointerdown", function (e) {
        pressedOutside = isOutsideDialog(e);
      });
      lightbox.addEventListener("pointerup", function (e) {
        if (pressedOutside && isOutsideDialog(e)) closeLightbox();
        pressedOutside = false;
      });
    }

    document.querySelectorAll(".media-zoom-btn[data-lightbox-src]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var lang = getLang();
        var title = lang === "en"
          ? (btn.getAttribute("data-lightbox-title-en") || btn.getAttribute("data-lightbox-title") || "")
          : (btn.getAttribute("data-lightbox-title-zh") || btn.getAttribute("data-lightbox-title") || "");
        var sub = lang === "en"
          ? (btn.getAttribute("data-lightbox-sub-en") || "")
          : (btn.getAttribute("data-lightbox-sub-zh") || "");
        openLightbox({
          src: btn.getAttribute("data-lightbox-src"),
          alt: btn.getAttribute("data-lightbox-alt") || title,
          title: title,
          subtitle: sub
        });
      });
    });

    document.querySelectorAll(".prose img").forEach(function (img) {
      if (img.classList.contains("about-avatar") || img.closest("a")) return;
      img.classList.add("is-zoomable");
      img.tabIndex = 0;
      img.setAttribute("role", "button");
      var handleOpen = function () {
        openLightbox({
          src: img.currentSrc || img.src,
          alt: img.alt || "",
          title: img.alt || (getLang() === "en" ? "Image preview" : "大图预览"),
          subtitle: ""
        });
      };
      img.addEventListener("click", handleOpen);
      img.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleOpen();
        }
      });
    });
  }
})();
