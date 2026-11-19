(function () {
  "use strict";

  var SCHEME_KEY = "color-scheme";
  var schemeMeta = document.querySelector('meta[name="color-scheme"]');
  var themeColorMeta = document.querySelector('meta[name="theme-color"]');

  function isDarkSchemeActive() {
    var content = schemeMeta ? schemeMeta.getAttribute("content") : "dark";
    return content !== "light";
  }

  function applyScheme(scheme) {
    var next = scheme === "light" ? "light" : "dark";
    if (schemeMeta) schemeMeta.setAttribute("content", next);
    if (themeColorMeta) themeColorMeta.setAttribute("content", next === "light" ? "#faf7f2" : "#0e1013");
  }

  function toggleTheme() {
    var next = isDarkSchemeActive() ? "light" : "dark";
    try {
      if (next === "light") {
        localStorage.setItem(SCHEME_KEY, "light");
      } else {
        localStorage.removeItem(SCHEME_KEY);
      }
    } catch (e) {}
    applyScheme(next);
  }

  document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
    btn.addEventListener("click", toggleTheme);
  });

  window.addEventListener("storage", function (e) {
    if (e.key === SCHEME_KEY) {
      applyScheme(e.newValue === "light" ? "light" : "dark");
    }
  });
})();
