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
    });
  }

  window.addEventListener("storage", function (e) {
    if (e.key === SCHEME_KEY) {
      applySchemeMeta((e.newValue === "light" || e.newValue === "dark") ? e.newValue : "light dark");
    }
  });

  /* ---------- Hero +EV interactive trajectory diagram ---------- */
  var heroVisual = document.getElementById("hero-ev-visual");
  if (heroVisual) {
    var EV_STAGES = {
      noise: {
        tag: "NOISE",
        zh: "短期波动与随机噪音：单次牌局或日常涨跌本身不等于对错",
        en: "Short-term variance: single-hand swings or daily noise reveal little alone"
      },
      ev: {
        tag: "01 · EV",
        zh: "值不值得：分辨信号与噪音，只参与长期期望值为正的牌局",
        en: "Edge check: separate signal from noise and only play positive-EV spots"
      },
      size: {
        tag: "02 · SIZE",
        zh: "投入多少：按把握度与最大回撤硬顶，克制设定下注或仓位尺度",
        en: "Sizing discipline: scale exposure to conviction and hard drawdown caps"
      },
      exit: {
        tag: "03 · EXIT",
        zh: "何时退出：入场前写清证伪条件，触发即弃牌离场，截断左尾风险",
        en: "Exit rules: pre-commit falsification triggers to cut downside tail risk"
      },
      plus: {
        tag: "+EV",
        zh: "长期正期望：过滤噪音后，让时间与样本量站在自己一边",
        en: "Long-run edge: filter noise and let sample size compound over time"
      }
    };
    var readoutTag = heroVisual.querySelector(".hero-ev-readout-tag");
    var readoutText = heroVisual.querySelector(".hero-ev-readout-text");
    var replayBtn = document.getElementById("hero-ev-replay");
    var pauseBtn = document.getElementById("hero-ev-pause");
    var pauseLabel = document.getElementById("hero-ev-pause-label");

    function setEvStage(stage) {
      var info = EV_STAGES[stage];
      if (!info) return;
      heroVisual.setAttribute("data-active-stage", stage);
      if (readoutTag) readoutTag.textContent = info.tag;
      if (readoutText) {
        readoutText.setAttribute("data-zh", info.zh);
        readoutText.setAttribute("data-en", info.en);
        readoutText.textContent = getLang() === "en" ? info.en : info.zh;
      }
    }

    function syncPauseLabel(paused) {
      if (!pauseLabel) return;
      var zh = paused ? "继续脉搏动画" : "暂停脉搏动画";
      var en = paused ? "Play pulse animation" : "Pause pulse animation";
      pauseLabel.setAttribute("data-zh", zh);
      pauseLabel.setAttribute("data-en", en);
      pauseLabel.textContent = getLang() === "en" ? en : zh;
    }

    heroVisual.querySelectorAll("[data-ev-hit]").forEach(function (hit) {
      var stage = hit.getAttribute("data-ev-hit");
      hit.addEventListener("pointerenter", function () { setEvStage(stage); });
      hit.addEventListener("focus", function () { setEvStage(stage); });
      hit.addEventListener("click", function () { setEvStage(stage); });
      hit.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setEvStage(stage);
        }
      });
    });

    if (replayBtn) {
      replayBtn.addEventListener("click", function () {
        heroVisual.classList.remove("is-paused");
        syncPauseLabel(false);
        heroVisual.classList.add("is-replaying");
        void heroVisual.offsetWidth;
        heroVisual.classList.remove("is-replaying");
      });
    }

    if (pauseBtn) {
      pauseBtn.addEventListener("click", function () {
        var paused = heroVisual.classList.toggle("is-paused");
        syncPauseLabel(paused);
      });
    }
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
})();
