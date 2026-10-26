/* Rewamore managed runtime v1 */
/* The Atelier Edition. Accessible, framework-free invitation interactions. */
(() => {
  'use strict';

  const config = window.WEDDING_CONFIG || {};
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const body = document.body;
  const guest = String(new URLSearchParams(location.search).get('to') || config.guest || '').trim().slice(0, 100) || 'Tamu Undangan';
  let toastTimer;

  function toast(message) {
    const element = $('#toast');
    if (!element) return;
    clearTimeout(toastTimer);
    element.textContent = message;
    element.hidden = false;
    element.classList.add('is-visible');
    toastTimer = setTimeout(() => {
      element.classList.remove('is-visible');
      element.hidden = true;
    }, 4500);
  }

  $$('[data-guest]').forEach(element => { element.textContent = guest; });
  const nameInput = $('#rsvp-name');
  if (nameInput && guest !== 'Tamu Undangan') nameInput.value = guest;

  // IntersectionObserver keeps below-the-fold photos out of the initial request.
  function loadMedia(element) {
    if (!element) return;
    const source = element.dataset.src;
    const background = element.dataset.bg;
    if (source) {
      element.addEventListener('load', () => element.classList.add('is-loaded'), { once: true });
      element.addEventListener('error', () => {
        element.classList.add('load-error');
        element.classList.add('is-loaded');
      }, { once: true });
      if (element.dataset.srcset) {
        element.srcset = element.dataset.srcset;
        delete element.dataset.srcset;
      }
      element.src = source;
      delete element.dataset.src;
      if (element.complete && element.naturalWidth > 0) element.classList.add('is-loaded');
    }
    if (background) {
      const image = new Image();
      image.onload = () => {
        element.style.backgroundImage = `url(${JSON.stringify(background)})`;
        element.classList.add('is-loaded');
      };
      image.onerror = () => element.classList.add('load-error');
      image.src = background;
      delete element.dataset.bg;
    }
  }

  const pendingReveals = new Set();
  function reveal(element) {
    if (body.classList.contains('is-opening')) pendingReveals.add(element);
    else element.classList.add('is-visible');
  }

  if ('IntersectionObserver' in window) {
    const lazyObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        loadMedia(entry.target);
        lazyObserver.unobserve(entry.target);
      });
    }, { rootMargin: '250px 0px', threshold: 0.01 });
    $$('[data-src], [data-bg]').forEach(element => lazyObserver.observe(element));

    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -25px 0px', threshold: 0.08 });
    $$('.reveal, .photo-reveal').forEach(element => {
      if (motion.matches) element.classList.add('is-visible');
      else revealObserver.observe(element);
    });
  } else {
    $$('[data-src], [data-bg]').forEach(loadMedia);
    $$('.reveal, .photo-reveal').forEach(element => element.classList.add('is-visible'));
  }

  const slideshows = $$('.slideshow').map(container => {
    const slides = $$('.slide', container);
    let index = Math.max(0, slides.findIndex(slide => slide.classList.contains('is-active')));
    let timer;
    let inViewport = !('IntersectionObserver' in window);
    function prepare(slide) {
      loadMedia(slide);
      $$('[data-src], [data-bg]', slide).forEach(loadMedia);
    }
    function stop() { clearInterval(timer); timer = undefined; }
    function start() {
      stop();
      if (slides.length < 2 || motion.matches || document.hidden || !inViewport) return;
      timer = setInterval(() => {
        const next = (index + 1) % slides.length;
        prepare(slides[next]);
        slides[next].classList.add('is-active');
        slides[index].classList.remove('is-active');
        index = next;
      }, Number(container.dataset.interval) || 6500);
    }
    if (slides.length) {
      prepare(slides[index]);
      slides[index].classList.add('is-active');
      start();
    }
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        inViewport = entries[0].isIntersecting;
        if (inViewport) start(); else stop();
      }, { threshold: 0.05 });
      observer.observe(container);
    }
    return { start, stop };
  });
  function syncSlideshows() {
    slideshows.forEach(slideshow => document.hidden ? slideshow.stop() : slideshow.start());
    if (motion.matches) $$('.reveal, .photo-reveal').forEach(element => element.classList.add('is-visible'));
  }
  document.addEventListener('visibilitychange', syncSlideshows);
  motion.addEventListener?.('change', syncSlideshows);

  // Audio starts only in response to the visitor opening the invitation.
  const audio = $('#wedding-audio');
  const musicButton = $('#music-toggle');
  if (audio && config.music) audio.src = config.music;
  if (audio) {
    const volume = Number(config.volume ?? 0.28);
    audio.volume = Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 0.28;
  }
  function updateMusic() {
    if (!musicButton) return;
    const playing = Boolean(audio && !audio.paused && !audio.ended);
    musicButton.setAttribute('aria-pressed', String(playing));
    musicButton.setAttribute('aria-label', playing ? 'Jeda musik' : 'Putar musik');
    musicButton.classList.toggle('is-playing', playing);
    const label = $('#audio-label');
    if (label) label.textContent = playing ? 'Sound on' : 'Sound off';
  }
  async function playMusic(silent = false) {
    if (!audio || !audio.getAttribute('src')) {
      if (!silent) toast('Musik pengiring belum tersedia.');
      return;
    }
    try { await audio.play(); }
    catch { if (!silent) toast('Musik belum dapat diputar. Periksa berkas audio lalu coba lagi.'); }
    updateMusic();
  }
  musicButton?.addEventListener('click', () => {
    if (audio && !audio.paused) audio.pause();
    else void playMusic();
  });
  audio?.addEventListener('play', updateMusic);
  audio?.addEventListener('pause', updateMusic);
  audio?.addEventListener('ended', updateMusic);
  audio?.addEventListener('error', updateMusic);
  updateMusic();

  const cover = $('#cover');
  const invitation = $('#invitation');
  let opened = false;
  function openInvitation(event) {
    event?.preventDefault();
    if (opened) return;
    opened = true;
    body.classList.add('invitation-open', 'is-opening');
    if (invitation) { invitation.hidden = false; invitation.inert = false; }
    if (cover) cover.inert = true;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    $('#site-header')?.removeAttribute('hidden');
    $('#floating-controls')?.removeAttribute('hidden');
    $('#menu-toggle')?.removeAttribute('hidden');
    void playMusic(true);
    setTimeout(() => {
      if (cover) cover.hidden = true;
      body.classList.remove('is-opening');
      pendingReveals.forEach(element => element.classList.add('is-visible'));
      pendingReveals.clear();
      syncSlideshows();
      const home = $('#home');
      if (home) {
        home.setAttribute('tabindex', '-1');
        home.focus({ preventScroll: true });
      }
    }, motion.matches ? 0 : 1400);
  }
  $('#open-invitation')?.addEventListener('click', openInvitation);
  $('.skip-link[href="#home"]')?.addEventListener('click', event => {
    event.preventDefault();
    if (!opened) { openInvitation(event); return; }
    const home = $('#home');
    home?.scrollIntoView({ behavior: motion.matches ? 'auto' : 'smooth', block: 'start' });
    home?.focus({ preventScroll: true });
  });

  const sentinel = $('#hero-sentinel');
  const siteHeader = $('#site-header');
  if (sentinel && siteHeader && 'IntersectionObserver' in window) {
    const headerObserver = new IntersectionObserver(entries => {
      const entry = entries[0];
      siteHeader.classList.toggle('is-scrolled', !entry.isIntersecting && entry.boundingClientRect.top < 0);
    }, { threshold: 0 });
    headerObserver.observe(sentinel);
  }

  const menuButton = $('#menu-toggle');
  const menu = $('#menu-panel');
  let menuTimer;
  function closeMenu(restoreFocus = false) {
    if (!menu || !menuButton) return;
    clearTimeout(menuTimer);
    menu.classList.remove('is-open');
    menuButton.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Buka menu navigasi');
    menu.inert = true;
    body.classList.remove('menu-open');
    menuTimer = setTimeout(() => { menu.hidden = true; }, motion.matches ? 0 : 500);
    if (restoreFocus) menuButton.focus({ preventScroll: true });
  }
  function openMenu() {
    if (!menu || !menuButton) return;
    clearTimeout(menuTimer);
    menu.hidden = false;
    menu.inert = false;
    body.classList.add('menu-open');
    menuButton.setAttribute('aria-expanded', 'true');
    menuButton.setAttribute('aria-label', 'Tutup menu navigasi');
    menuButton.classList.add('is-open');
    requestAnimationFrame(() => menu.classList.add('is-open'));
    $('a, button', menu)?.focus({ preventScroll: true });
  }
  menuButton?.addEventListener('click', () => {
    if (menuButton.getAttribute('aria-expanded') === 'true') closeMenu(true);
    else openMenu();
  });
  document.addEventListener('click', event => {
    if (menuButton?.getAttribute('aria-expanded') !== 'true') return;
    if (!menu?.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (menuButton?.getAttribute('aria-expanded') !== 'true') return;
    if (event.key === 'Escape') { event.preventDefault(); closeMenu(true); }
    if (event.key === 'Tab') {
      const focusables = [menuButton, ...$$('a[href], button:not([disabled])', menu)];
      const current = focusables.indexOf(document.activeElement);
      if (event.shiftKey && current <= 0) {
        event.preventDefault(); focusables.at(-1)?.focus();
      } else if (!event.shiftKey && current === focusables.length - 1) {
        event.preventDefault(); menuButton.focus();
      }
    }
  });
  $$('a[href^="#"]', menu || document.createElement('nav')).forEach(link => {
    link.addEventListener('click', event => {
      const id = link.getAttribute('href').slice(1);
      const target = id && document.getElementById(id);
      if (!target) return;
      event.preventDefault();
      closeMenu();
      target.scrollIntoView({ behavior: motion.matches ? 'auto' : 'smooth', block: 'start' });
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      history.replaceState(null, '', `${location.pathname}${location.search}#${encodeURIComponent(id)}`);
    });
  });

  const fullscreenButton = $('#fullscreen-toggle');
  fullscreenButton?.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else toast('Layar penuh tidak tersedia di browser ini.');
    } catch { toast('Browser belum mengizinkan mode layar penuh.'); }
  });
  document.addEventListener('fullscreenchange', () => {
    const active = Boolean(document.fullscreenElement);
    fullscreenButton?.setAttribute('aria-pressed', String(active));
    fullscreenButton?.setAttribute('aria-label', active ? 'Keluar dari layar penuh' : 'Buka layar penuh');
  });

  function downloadFile(content, type, filename) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename;
    body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  // Native dialogs supply keyboard focus trapping and Escape handling.
  const dialogOpeners = new WeakMap();
  function openDialog(dialog, opener) {
    if (!dialog) return;
    const focusReturn = opener && menu?.contains(opener) ? menuButton : opener || document.activeElement;
    closeMenu();
    dialogOpeners.set(dialog, focusReturn);
    dialog.hidden = false;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else { dialog.setAttribute('open', ''); dialog.hidden = false; }
    body.classList.add('modal-open');
  }
  function closeDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === 'function') dialog.close();
    else { dialog.removeAttribute('open'); dialog.hidden = true; afterDialogClose(dialog); }
  }
  function afterDialogClose(dialog) {
    if (!document.querySelector('dialog[open]')) body.classList.remove('modal-open');
    const opener = dialogOpeners.get(dialog);
    if (opener?.isConnected && !opener.closest('[hidden], [inert]')) opener.focus({ preventScroll: true });
  }
  $$('dialog').forEach(dialog => {
    dialog.addEventListener('close', () => afterDialogClose(dialog));
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog(dialog);
    });
  });

  const galleryItems = $$('[data-gallery]');
  const lightbox = $('#lightbox');
  const lightboxImage = $('#lightbox-image');
  const lightboxStatus = $('#lightbox-status');
  const galleryMore = $('#gallery-more');
  const extraPhotos = $$('[data-gallery-extra]');
  galleryMore?.addEventListener('click', () => {
    const expanded = galleryMore.getAttribute('aria-expanded') !== 'true';
    extraPhotos.forEach(item => { item.hidden = !expanded; });
    galleryMore.setAttribute('aria-expanded', String(expanded));
    const label = $('[data-gallery-more-label]', galleryMore) || galleryMore;
    label.textContent = expanded ? 'TAMPILKAN LEBIH SEDIKIT' : 'LIHAT SEMUA MOMEN';
    const icon = $('[aria-hidden="true"]', galleryMore);
    if (icon) icon.textContent = expanded ? '−' : '+';
    if (!expanded) galleryMore.scrollIntoView({ behavior: motion.matches ? 'auto' : 'smooth', block: 'nearest' });
  });
  lightboxImage?.addEventListener('load', () => {
    lightboxImage.classList.remove('is-loading', 'load-error');
    if (lightboxStatus) lightboxStatus.textContent = '';
  });
  lightboxImage?.addEventListener('error', () => {
    lightboxImage.classList.remove('is-loading');
    lightboxImage.classList.add('load-error');
    if (lightboxStatus) lightboxStatus.textContent = 'Foto belum dapat dimuat. Anda dapat membuka foto berikutnya.';
  });
  let galleryIndex = 0;
  function showPhoto(index) {
    if (!galleryItems.length || !lightboxImage) return;
    galleryIndex = (index + galleryItems.length) % galleryItems.length;
    const item = galleryItems[galleryIndex];
    const image = $('img', item);
    const source = item.dataset.gallery || image?.dataset.src || image?.currentSrc || image?.src;
    const caption = item.dataset.caption || image?.alt || `Foto pernikahan ${galleryIndex + 1}`;
    lightboxImage.classList.add('is-loading');
    lightboxImage.classList.remove('load-error');
    if (lightboxStatus) lightboxStatus.textContent = 'Memuat foto…';
    lightboxImage.src = source;
    lightboxImage.alt = caption;
    if (lightboxImage.complete && lightboxImage.naturalWidth > 0) {
      lightboxImage.classList.remove('is-loading');
      if (lightboxStatus) lightboxStatus.textContent = '';
    }
    const count = $('#lightbox-count');
    if (count) count.textContent = `${galleryIndex + 1} / ${galleryItems.length}`;
    const captionElement = $('#lightbox-caption');
    if (captionElement) captionElement.textContent = caption;
  }
  galleryItems.forEach((item, index) => item.addEventListener('click', event => {
    event.preventDefault(); showPhoto(index); openDialog(lightbox, item);
  }));
  $('#lightbox-prev')?.addEventListener('click', () => showPhoto(galleryIndex - 1));
  $('#lightbox-next')?.addEventListener('click', () => showPhoto(galleryIndex + 1));
  $('#lightbox-close')?.addEventListener('click', () => closeDialog(lightbox));
  lightbox?.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); showPhoto(galleryIndex - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); showPhoto(galleryIndex + 1); }
  });
  let touchStart;
  lightboxImage?.addEventListener('touchstart', event => {
    touchStart = { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY };
  }, { passive: true });
  lightboxImage?.addEventListener('touchend', event => {
    if (!touchStart) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) showPhoto(galleryIndex + (dx < 0 ? 1 : -1));
    touchStart = undefined;
  }, { passive: true });

  const giftDialog = $('#gift-dialog');
  $('#gift-open')?.addEventListener('click', event => { event.preventDefault(); openDialog(giftDialog, event.currentTarget); });
  $('#gift-close')?.addEventListener('click', () => closeDialog(giftDialog));
  const accounts = Array.isArray(config.giftAccounts) ? config.giftAccounts.filter(account => account && account.number) : [];
  const accountsContainer = $('#gift-accounts');
  if (accountsContainer) {
    accountsContainer.replaceChildren();
    accounts.forEach(account => {
      const card = document.createElement('article');
      card.className = 'gift-account';
      const bank = document.createElement('h3'); bank.textContent = account.bank || 'Transfer bank';
      const number = document.createElement('p'); number.className = 'account-number'; number.textContent = String(account.number);
      const name = document.createElement('p'); name.textContent = account.name || '';
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'button button-small';
      button.dataset.copy = String(account.number); button.textContent = 'Salin nomor rekening';
      card.append(bank, number, name, button); accountsContainer.append(card);
    });
  }
  const giftEmpty = $('#gift-empty');
  if (giftEmpty) giftEmpty.hidden = accounts.length > 0;
  async function copyText(value, successMessage = 'Nomor rekening berhasil disalin.') {
    if (!value) { toast('Informasi yang ingin disalin belum tersedia.'); return; }
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(value);
      else {
        const input = document.createElement('textarea');
        input.value = value; input.setAttribute('readonly', '');
        input.style.cssText = 'position:fixed;left:-10000px;top:0;opacity:0';
        const focused = document.activeElement;
        (document.querySelector('dialog[open]') || body).append(input);
        input.select();
        const success = document.execCommand('copy'); input.remove();
        focused?.focus({ preventScroll: true });
        if (!success) throw new Error('Copy not supported');
      }
      toast(successMessage);
    } catch { toast('Belum bisa menyalin otomatis. Silakan salin langsung dari teks atau bilah alamat browser.'); }
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-copy]');
    if (button) void copyText(button.dataset.copy);
  });
  $('#copy-invitation')?.addEventListener('click', () => {
    const link = new URL(location.href);
    link.hash = '';
    void copyText(link.href, 'Tautan undangan berhasil disalin.');
  });
  const souvenirDialog = $('#souvenir-dialog');
  $$('[data-open-souvenir], #souvenir-open').forEach(button => button.addEventListener('click', event => {
    event.preventDefault(); openDialog(souvenirDialog, button);
  }));
  $('#souvenir-close')?.addEventListener('click', () => closeDialog(souvenirDialog));
})();
