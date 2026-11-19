/* ===========================================================
   Interface language toggle (中 / EN) + post language filter
   =========================================================== */
(function () {
  "use strict";

  var LANG_KEY = "site-lang";
  var FILTER_KEY = "post-filter";
  var onLangChangeHooks = [];

  /* ---------- Interface language (nav labels, about page) ---------- */
  function applyLang(lang) {
    // Text nodes with data-zh / data-en
    document.querySelectorAll("[data-zh][data-en]").forEach(function (el) {
      var val = el.getAttribute(lang === "en" ? "data-en" : "data-zh");
      if (val !== null) el.textContent = val;
    });
    document.querySelectorAll("[data-placeholder-zh][data-placeholder-en]").forEach(function (el) {
      var ph = el.getAttribute(lang === "en" ? "data-placeholder-en" : "data-placeholder-zh");
      if (ph !== null) el.setAttribute("placeholder", ph);
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

  function toggleLang() {
    var next = getLang() === "zh" ? "en" : "zh";
    localStorage.setItem(LANG_KEY, next);
    applyLang(next);
    onLangChangeHooks.forEach(function (fn) { fn(next); });
  }

  var toggle = document.getElementById("lang-toggle");
  if (toggle) {
    toggle.addEventListener("click", toggleLang);
  }
  applyLang(getLang());

  /* ---------- Color scheme toggle (Dark Instrument default, Light Paper optional) ---------- */
  var SCHEME_KEY = "color-scheme";
  var schemeMeta = document.querySelector('meta[name="color-scheme"]');
  var themeColorMeta = document.querySelector('meta[name="theme-color"]');
  var themeToggle = document.getElementById("theme-toggle");

  function isDarkSchemeActive() {
    var content = schemeMeta ? schemeMeta.getAttribute("content") : "dark";
    return content !== "light";
  }

  function applySchemeMeta(val) {
    var scheme = val === "light" ? "light" : "dark";
    if (schemeMeta) schemeMeta.setAttribute("content", scheme);
    if (themeColorMeta) themeColorMeta.setAttribute("content", scheme === "light" ? "#faf7f2" : "#0e1013");
  }

  var onThemeChangeHooks = [];

  function toggleTheme() {
    var target = isDarkSchemeActive() ? "light" : "dark";
    if (target === "light") {
      try { localStorage.setItem(SCHEME_KEY, "light"); } catch (e) {}
    } else {
      try { localStorage.removeItem(SCHEME_KEY); } catch (e) {}
    }
    applySchemeMeta(target);
    onThemeChangeHooks.forEach(function (fn) { fn(); });
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
  }

  window.addEventListener("storage", function (e) {
    if (e.key === SCHEME_KEY) {
      applySchemeMeta(e.newValue === "light" ? "light" : "dark");
      onThemeChangeHooks.forEach(function (fn) { fn(); });
    }
  });

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
          var dxCue = (x - width * 0.5) / 44;
          var dyCue = (y - (height - 46)) / 34;
          var cueMask = 1 - 0.85 * Math.exp(-(dxCue * dxCue + dyCue * dyCue));
          var edgeFade = Math.max(0.15, Math.min(edgeV, edgeH)) * textMask * cueMask;
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

  /* ---------- Shared Native <dialog> Top-Layer Helpers ---------- */
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

  function closeTopLayerDialog(dialog) {
    if (!dialog || !dialog.open) return;
    if (!supportsTopLayerExit()) {
      dialog.setAttribute("data-closing", "");
      var anims = dialog.getAnimations ? dialog.getAnimations({ subtree: true }) : [];
      if (anims.length > 0) {
        Promise.race([
          Promise.allSettled(anims.map(function (a) { return a.finished; })),
          new Promise(function (resolve) { window.setTimeout(resolve, 600); })
        ]).then(function () {
          if (!dialog.hasAttribute("data-closing")) return;
          dialog.removeAttribute("data-closing");
          if (dialog.open) dialog.close();
        });
        return;
      }
      dialog.removeAttribute("data-closing");
    }
    dialog.close();
  }

  function wireTopLayerDialog(dialog, closeBtn) {
    if (!dialog || typeof dialog.showModal !== "function") return false;
    dialog.addEventListener("close", function () {
      dialog.removeAttribute("data-closing");
      dialog.returnValue = "";
    });
    dialog.addEventListener("cancel", function (e) {
      if (!supportsTopLayerExit()) {
        e.preventDefault();
        closeTopLayerDialog(dialog);
      }
    });
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        closeTopLayerDialog(dialog);
      });
    }
    if (!("closedBy" in HTMLDialogElement.prototype)) {
      var pressedOutside = false;
      var isOutsideDialog = function (e) {
        var r = dialog.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      dialog.addEventListener("pointerdown", function (e) {
        pressedOutside = isOutsideDialog(e);
      });
      dialog.addEventListener("pointerup", function (e) {
        if (pressedOutside && isOutsideDialog(e)) closeTopLayerDialog(dialog);
        pressedOutside = false;
      });
    }
    return true;
  }

  /* ---------- Native <dialog> Lightbox (work showcase + article diagrams) ---------- */
  var lightbox = document.getElementById("image-lightbox");
  if (wireTopLayerDialog(lightbox, document.getElementById("lightbox-close"))) {
    var lightboxImg = document.getElementById("lightbox-img");
    var lightboxTitle = document.getElementById("lightbox-title");
    var lightboxSub = document.getElementById("lightbox-subtitle");

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

  /* ---------- Post Reading Progress Hairline Fallback ---------- */
  var readingProgress = document.getElementById("reading-progress");
  if (readingProgress) {
    var progressReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var supportsScrollTimeline = window.CSS && window.CSS.supports && window.CSS.supports("animation-timeline", "scroll()");
    if (!progressReduced && !supportsScrollTimeline) {
      var progressTicking = false;
      var syncProgressFallback = function () {
        progressTicking = false;
        var scrollable = document.documentElement.scrollHeight - window.innerHeight;
        var ratio = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
        readingProgress.style.transform = "scaleX(" + ratio.toFixed(4) + ")";
      };
      var queueProgress = function () {
        if (progressTicking) return;
        progressTicking = true;
        window.requestAnimationFrame(syncProgressFallback);
      };
      syncProgressFallback();
      window.addEventListener("scroll", queueProgress, { passive: true });
      window.addEventListener("resize", queueProgress, { passive: true });
    }
  }

  /* ---------- Post Wide-Desktop Tick Minimap (Scrollspy) ---------- */
  var minimapNav = document.getElementById("post-minimap");
  var postProse = document.querySelector("article.post .prose");
  if (minimapNav && postProse) {
    var headings = Array.prototype.slice.call(postProse.querySelectorAll("h2"));
    if (headings.length >= 2) {
      var usedHeadingIds = {};
      var minimapLinks = [];

      headings.forEach(function (h2, idx) {
        var rawId = (h2.getAttribute("id") || "").trim();
        var baseId = rawId || ("section-" + (idx + 1));
        var finalId = baseId;
        var suffix = 2;
        while (usedHeadingIds[finalId]) {
          finalId = baseId + "-" + suffix;
          suffix++;
        }
        usedHeadingIds[finalId] = true;
        if (h2.id !== finalId) h2.id = finalId;
        h2.setAttribute("tabindex", "-1");

        var link = document.createElement("a");
        link.className = "post-minimap-link";
        link.href = "#" + finalId;

        var label = document.createElement("span");
        label.className = "post-minimap-label";
        label.textContent = (h2.textContent || "").trim();

        var tickWrap = document.createElement("span");
        tickWrap.className = "post-minimap-tick-wrap";
        tickWrap.setAttribute("aria-hidden", "true");
        var tick = document.createElement("span");
        tick.className = "post-minimap-tick";
        tickWrap.appendChild(tick);

        link.appendChild(label);
        link.appendChild(tickWrap);
        minimapNav.appendChild(link);
        minimapLinks.push(link);
      });

      minimapNav.hidden = false;

      var supportsScrollTargetGroup = window.CSS && window.CSS.supports && window.CSS.supports("scroll-target-group", "auto");
      if (supportsScrollTargetGroup) {
        var syncAriaCurrentNative = function () {
          var currentLink = minimapNav.querySelector("a:target-current");
          minimapLinks.forEach(function (link, idx) {
            var active = currentLink ? (link === currentLink) : (idx === 0 && window.scrollY < 160);
            link.setAttribute("aria-current", active ? "true" : "false");
          });
        };
        syncAriaCurrentNative();
        document.addEventListener("scrollend", syncAriaCurrentNative, { passive: true });
        minimapLinks.forEach(function (link) {
          link.addEventListener("click", function () {
            window.setTimeout(syncAriaCurrentNative, 120);
          });
        });
      } else {
        var activeHeadingIdx = -1;
        var minimapTicking = false;
        var syncMinimapFallback = function () {
          minimapTicking = false;
          var nextIdx = 0;
          var docBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 24;
          if (docBottom) {
            nextIdx = headings.length - 1;
          } else {
            for (var i = 0; i < headings.length; i++) {
              if (headings[i].getBoundingClientRect().top <= 140) {
                nextIdx = i;
              }
            }
          }
          if (nextIdx === activeHeadingIdx) return;
          activeHeadingIdx = nextIdx;
          minimapLinks.forEach(function (link, idx) {
            var isActive = idx === activeHeadingIdx;
            link.classList.toggle("target-current", isActive);
            link.setAttribute("aria-current", isActive ? "true" : "false");
          });
        };
        var queueMinimapSync = function () {
          if (minimapTicking) return;
          minimapTicking = true;
          window.requestAnimationFrame(syncMinimapFallback);
        };
        syncMinimapFallback();
        if ("IntersectionObserver" in window) {
          var headingObserver = new IntersectionObserver(queueMinimapSync, {
            rootMargin: "-15% 0px -70% 0px",
            threshold: 0
          });
          headings.forEach(function (h2) { headingObserver.observe(h2); });
        }
        window.addEventListener("scroll", queueMinimapSync, { passive: true });
      }
    }
  }

  /* ---------- Global Command Palette (⌘K / /) ---------- */
  var cmdPalette = document.getElementById("cmd-palette");
  var cmdInput = document.getElementById("cmd-input");
  var cmdResults = document.getElementById("cmd-results");
  var cmdEmpty = document.getElementById("cmd-empty");
  var cmdTrigger = document.getElementById("cmd-trigger");
  var cmdKbdHint = document.getElementById("cmd-kbd-hint");
  var cmdIndexNode = document.getElementById("cmd-index");

  if (cmdKbdHint) {
    var isApple = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || "");
    var cmdModNode = cmdKbdHint.querySelector(".cmd-kbd-mod");
    if (cmdModNode) {
      cmdModNode.textContent = isApple ? "⌘" : "Ctrl";
    } else {
      cmdKbdHint.textContent = isApple ? "⌘ K" : "Ctrl K";
    }
  }

  if (wireTopLayerDialog(cmdPalette, document.getElementById("cmd-close")) && cmdInput && cmdResults) {
    var cmdData = { pages: [], tools: [], posts: [] };
    if (cmdIndexNode) {
      try {
        cmdData = JSON.parse(cmdIndexNode.textContent || "{}") || cmdData;
      } catch (e) {}
    }

    var cmdVisibleItems = [];
    var cmdActiveIdx = 0;

    function buildCommandItems() {
      var lang = getLang();
      var darkNow = isDarkSchemeActive();
      var groups = [
        {
          id: "actions",
          label: lang === "en" ? "Actions" : "快捷操作",
          items: [
            {
              title: lang === "en"
                ? (darkNow ? "Switch to Light Paper theme" : "Switch to Dark Instrument theme")
                : (darkNow ? "切换到「纸墨浅色」主题" : "切换到「深空仪器」暗色主题"),
              sub: lang === "en" ? "Toggle color appearance immediately" : "立即切换全站浅色 / 深色视觉模式",
              meta: darkNow ? (lang === "en" ? "Dark → Light" : "深色 → 浅色") : (lang === "en" ? "Light → Dark" : "浅色 → 深色"),
              keywords: "theme dark light mode 主题 浅色 深色 暗色 纸墨 深空",
              run: function () { toggleTheme(); }
            },
            {
              title: lang === "en" ? "切换为中文界面 (Switch to Chinese)" : "Switch UI to English (切换英文界面)",
              sub: lang === "en" ? "Switch navigation & interface labels to Chinese" : "将全站导航与界面文案切换为英文",
              meta: "中 / EN",
              keywords: "language lang zh en 中文 英文 语言 切换",
              run: function () { toggleLang(); }
            }
          ]
        },
        {
          id: "tools",
          label: lang === "en" ? "Tools" : "自建决策工具",
          items: (cmdData.tools || []).map(function (t) {
            return {
              title: lang === "en" ? (t.title_en || t.title_zh) : t.title_zh,
              sub: lang === "en" ? (t.sub_en || t.sub_zh) : t.sub_zh,
              meta: lang === "en" ? (t.eyebrow_en || t.eyebrow_zh) : t.eyebrow_zh,
              url: t.url,
              keywords: [t.title_zh, t.title_en, t.sub_zh, t.sub_en, t.eyebrow_zh, t.eyebrow_en, "工具 tool"].join(" ")
            };
          })
        },
        {
          id: "posts",
          label: lang === "en" ? "Articles" : "文章",
          items: (cmdData.posts || []).map(function (p) {
            return {
              title: p.title || "",
              sub: p.sub || "",
              meta: p.date || "",
              url: p.url,
              keywords: [p.title, p.sub, p.series, p.date, Array.isArray(p.tags) ? p.tags.join(" ") : ""].join(" ")
            };
          })
        },
        {
          id: "pages",
          label: lang === "en" ? "Pages" : "页面导航",
          items: (cmdData.pages || []).map(function (pg) {
            return {
              title: lang === "en" ? (pg.title_en || pg.title_zh) : pg.title_zh,
              sub: lang === "en" ? (pg.sub_en || pg.sub_zh) : pg.sub_zh,
              meta: pg.url === "/feed.xml" ? "RSS" : (lang === "en" ? "Page" : "页面"),
              url: pg.url,
              keywords: [pg.title_zh, pg.title_en, pg.sub_zh, pg.sub_en, pg.url].join(" ")
            };
          })
        }
      ];
      return groups;
    }

    function updateCmdSelection(scrollIntoView) {
      var optNodes = cmdResults.querySelectorAll(".cmd-item");
      optNodes.forEach(function (node, idx) {
        var selected = idx === cmdActiveIdx;
        node.setAttribute("aria-selected", selected ? "true" : "false");
        if (selected && scrollIntoView) {
          node.scrollIntoView({ block: "nearest" });
        }
      });
      if (cmdVisibleItems[cmdActiveIdx]) {
        cmdInput.setAttribute("aria-activedescendant", "cmd-opt-" + cmdActiveIdx);
      } else {
        cmdInput.setAttribute("aria-activedescendant", "");
      }
    }

    function activateCmdItem(item) {
      if (!item) return;
      if (typeof item.run === "function") {
        closeTopLayerDialog(cmdPalette);
        item.run();
        return;
      }
      if (item.url) {
        closeTopLayerDialog(cmdPalette);
        window.location.href = item.url;
      }
    }

    function renderCmdResults(rawQuery) {
      var q = (rawQuery || "").trim().toLowerCase();
      var tokens = q ? q.split(/\s+/).filter(Boolean) : [];
      var groups = buildCommandItems();
      cmdResults.textContent = "";
      cmdVisibleItems = [];
      cmdActiveIdx = 0;

      groups.forEach(function (group) {
        var matched = tokens.length
          ? group.items.filter(function (item) {
              var hay = (item.title + " " + item.sub + " " + item.keywords).toLowerCase();
              return tokens.every(function (tok) { return hay.indexOf(tok) !== -1; });
            })
          : (group.id === "posts" ? group.items.slice(0, 5) : group.items);

        if (!matched.length) return;

        var groupEl = document.createElement("div");
        groupEl.className = "cmd-group-label";
        groupEl.setAttribute("role", "presentation");
        groupEl.textContent = group.label;
        cmdResults.appendChild(groupEl);

        matched.forEach(function (item) {
          var itemIdx = cmdVisibleItems.length;
          cmdVisibleItems.push(item);

          var el = document.createElement(item.url ? "a" : "button");
          el.className = "cmd-item";
          el.id = "cmd-opt-" + itemIdx;
          el.setAttribute("role", "option");
          el.setAttribute("aria-selected", itemIdx === 0 ? "true" : "false");
          el.setAttribute("data-cmd-idx", String(itemIdx));
          if (item.url) {
            el.href = item.url;
          } else {
            el.type = "button";
          }

          var main = document.createElement("span");
          main.className = "cmd-item-main";
          var titleEl = document.createElement("span");
          titleEl.className = "cmd-item-title";
          titleEl.textContent = item.title;
          main.appendChild(titleEl);
          if (item.sub) {
            var subEl = document.createElement("span");
            subEl.className = "cmd-item-sub";
            subEl.textContent = item.sub;
            main.appendChild(subEl);
          }
          el.appendChild(main);

          if (item.meta) {
            var metaEl = document.createElement("span");
            metaEl.className = "cmd-item-meta";
            metaEl.textContent = item.meta;
            el.appendChild(metaEl);
          }

          cmdResults.appendChild(el);
        });
      });

      var hasResults = cmdVisibleItems.length > 0;
      cmdResults.hidden = !hasResults;
      if (cmdEmpty) cmdEmpty.hidden = hasResults;
      cmdInput.setAttribute("aria-expanded", hasResults ? "true" : "false");
      cmdInput.setAttribute("aria-activedescendant", hasResults ? "cmd-opt-0" : "");
    }

    function openCmdPalette() {
      if (lightbox && lightbox.open) {
        lightbox.close();
      }
      cmdPalette.removeAttribute("data-closing");
      cmdInput.value = "";
      renderCmdResults("");
      cmdPalette.showModal();
      cmdResults.scrollTop = 0;
      window.requestAnimationFrame(function () {
        if (cmdPalette.open) cmdInput.focus();
      });
    }

    if (cmdTrigger) {
      cmdTrigger.addEventListener("click", openCmdPalette);
    }

    cmdInput.addEventListener("input", function () {
      renderCmdResults(cmdInput.value);
      cmdResults.scrollTop = 0;
    });

    cmdInput.addEventListener("keydown", function (e) {
      if (!cmdVisibleItems.length) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        cmdActiveIdx = (cmdActiveIdx + 1) % cmdVisibleItems.length;
        updateCmdSelection(true);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        cmdActiveIdx = (cmdActiveIdx - 1 + cmdVisibleItems.length) % cmdVisibleItems.length;
        updateCmdSelection(true);
      } else if (e.key === "Enter") {
        e.preventDefault();
        activateCmdItem(cmdVisibleItems[cmdActiveIdx]);
      }
    });

    cmdResults.addEventListener("mousemove", function (e) {
      var opt = e.target && e.target.closest ? e.target.closest("[data-cmd-idx]") : null;
      if (!opt) return;
      var idx = parseInt(opt.getAttribute("data-cmd-idx"), 10);
      if (!isNaN(idx) && idx !== cmdActiveIdx && idx >= 0 && idx < cmdVisibleItems.length) {
        cmdActiveIdx = idx;
        updateCmdSelection(false);
      }
    });

    cmdResults.addEventListener("click", function (e) {
      var opt = e.target && e.target.closest ? e.target.closest("[data-cmd-idx]") : null;
      if (!opt) return;
      e.preventDefault();
      var idx = parseInt(opt.getAttribute("data-cmd-idx"), 10);
      if (!isNaN(idx)) activateCmdItem(cmdVisibleItems[idx]);
    });

    document.addEventListener("keydown", function (e) {
      var keyLower = (e.key || "").toLowerCase();
      if ((e.metaKey || e.ctrlKey) && !e.altKey && keyLower === "k") {
        e.preventDefault();
        if (cmdPalette.open) {
          closeTopLayerDialog(cmdPalette);
        } else {
          openCmdPalette();
        }
        return;
      }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        if (cmdPalette.open || (lightbox && lightbox.open) || document.querySelector("dialog[open]")) return;
        var active = document.activeElement;
        var tag = active ? active.tagName : "";
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (active && active.isContentEditable)) {
          return;
        }
        e.preventDefault();
        openCmdPalette();
      }
    });

    onThemeChangeHooks.push(function () {
      if (cmdPalette.open) renderCmdResults(cmdInput.value);
    });
    onLangChangeHooks.push(function () {
      if (cmdPalette.open) renderCmdResults(cmdInput.value);
    });
  }
})();
