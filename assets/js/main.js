/* ===========================================================
   Site interactions
   =========================================================== */
(function () {
  "use strict";

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
