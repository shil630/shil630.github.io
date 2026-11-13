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
