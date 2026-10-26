/* Rewamore managed runtime v1 */
/* A bounded fallback keeps the invitation readable if the enhancement bundle fails. */
(function () {
  'use strict';
  document.documentElement.classList.add('js');
  window.setTimeout(function () {
    var loader = document.getElementById('preloader');
    if (loader) { loader.classList.add('is-done'); loader.setAttribute('aria-busy', 'false'); }
  }, 6500);
  window.setTimeout(function () {
    if (document.documentElement.classList.contains('js-ready')) return;
    document.documentElement.classList.remove('js');
    document.body.classList.add('opened');
    var cover = document.getElementById('cover');
    var shell = document.getElementById('siteShell');
    var loader = document.getElementById('preloader');
    if (cover) cover.hidden = true;
    if (shell) shell.inert = false;
    if (loader) loader.hidden = true;
    document.querySelectorAll('[data-reveal]').forEach(function (item) { item.classList.add('is-visible'); });
    document.querySelectorAll('img[data-src], img[data-srcset]').forEach(function (image) {
      image.loading = 'lazy';
      image.decoding = 'async';
      if (image.dataset.sizes) image.sizes = image.dataset.sizes;
      if (image.dataset.srcset) image.srcset = image.dataset.srcset;
      if (image.dataset.src) image.src = image.dataset.src;
      image.classList.add('is-loaded');
    });
  }, 8000);
}());
