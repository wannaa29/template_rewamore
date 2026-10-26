/* Rewamore managed runtime v1 */
/* Andi & Sada — progressively enhanced invitation. No third-party runtime. */
(function () {
  'use strict';

  var doc = document;
  var state = {
    opened: false,
    musicWanted: false,
    videoOpen: false,
    audioToken: 0,
    musicRamp: 0,
    galleryIndex: 0,
    galleryTrigger: null,
    shareTrigger: null,
    videoTrigger: null,
    lazyObserver: null,
    revealObserver: null,
    heroVisible: false,
    heroTimer: 0,
    heroIndex: 0,
    heroPaused: false,
    heroRequest: 0,
    galleryLoadTimer: 0,
    heroSlides: [],
    wishes: [],
    toastTimer: 0
  };
  var STORAGE_KEY = 'andi-sada-premium-v2';
  var motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var calendarEvents = {
    blessing: [{
      id: 'pemberkatan-20260904',
      title: 'Pemberkatan Andi & Sada',
      start: '20260904T070000Z',
      location: 'GBKP Runggun Bandarlampung',
      description: 'Pemberkatan Andi & Sada. Jumat, 4 September 2026, pukul 14.00 WIB. Waktu selesai tidak ditentukan.'
    }],
    adat: [{
      id: 'adat-20260925',
      title: 'Kerja Adat Mulihi Bulang Andi & Sada — Hari 1',
      start: '20260925T020000Z',
      location: 'Jambur Serbaguna Padang Cermin, Kec. Selesai, Kab. Langkat, Sumatera Utara',
      description: 'Kerja Adat Mulihi Bulang Andi & Sada. Jumat, 25 September 2026, pukul 09.00 WIB. Waktu selesai tidak ditentukan.'
    }, {
      id: 'adat-20260926',
      title: 'Kerja Adat Mulihi Bulang Andi & Sada — Hari 2',
      start: '20260926T020000Z',
      location: 'Jambur Serbaguna Padang Cermin, Kec. Selesai, Kab. Langkat, Sumatera Utara',
      description: 'Kerja Adat Mulihi Bulang Andi & Sada. Sabtu, 26 September 2026, pukul 09.00 WIB. Waktu selesai tidak ditentukan.'
    }]
  };

  function byId(id) { return doc.getElementById(id); }
  function all(selector, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(selector)); }
  function reducedMotion() { return Boolean(motionQuery && motionQuery.matches); }
  function saveData() { return Boolean(navigator.connection && navigator.connection.saveData); }
  function on(element, event, handler, options) { if (element) element.addEventListener(event, handler, options); }
  function setText(element, value) { if (element) element.textContent = value; }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function normalizeGuest(value) {
    return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120) : '';
  }
  function scrollBehavior() { return reducedMotion() ? 'auto' : 'smooth'; }
  function safeInit(fn) {
    try { fn(); } catch (error) { console.warn('[Invitation] ' + fn.name + ' could not initialize:', error); }
  }

  // Guest personalization never inserts URL-derived HTML.
  function setupGuest() {
    var guest = normalizeGuest(new URLSearchParams(window.location.search).get('to'));
    all('[data-guest]').forEach(function (node) { setText(node, guest || window.RewamoreRuntime.guest || 'Tamu Undangan'); });
    var input = byId('guestName');
    if (input) input.value = guest || window.RewamoreRuntime.guest || 'Tamu Undangan';
    var shareName = byId('shareName');
    if (shareName && guest) shareName.value = guest;
  }

  // Decode only the cover before dismissing the small, bounded preload screen.
  function setupCover() {
    var cover = byId('cover');
    var shell = byId('siteShell');
    var openButton = byId('openInvitation');
    var preloader = byId('preloader');
    var coverPhoto = byId('coverPhoto');
    var finished = false;
    if (shell && cover) shell.inert = true;
    if (preloader) preloader.setAttribute('aria-busy', 'true');
    if (openButton) openButton.disabled = false;
    setText(byId('loadStatus'), 'Menyiapkan undangan…');

    function finishLoading() {
      if (finished) return;
      finished = true;
      window.clearTimeout(loadDeadline);
      setText(byId('loadStatus'), 'Undangan siap dibuka');
      if (preloader) {
        preloader.setAttribute('aria-busy', 'false');
        preloader.classList.add('is-done');
        window.setTimeout(function () { preloader.hidden = true; }, reducedMotion() ? 0 : 650);
      }
      if (openButton) openButton.disabled = false;
    }

    var loadDeadline = window.setTimeout(finishLoading, 6000);
    if (!coverPhoto || (coverPhoto.complete && coverPhoto.naturalWidth)) {
      finishLoading();
    } else {
      on(coverPhoto, 'load', finishLoading, { once: true });
      on(coverPhoto, 'error', finishLoading, { once: true });
      if (typeof coverPhoto.decode === 'function') coverPhoto.decode().then(finishLoading).catch(function () {
        if (coverPhoto.complete) finishLoading();
      });
    }

    function openInvitation() {
      if (state.opened) return;
      finishLoading();
      state.opened = true;
      doc.body.classList.add('opened', 'is-opening');
      if (state.heroSlides.length) loadImage(state.heroSlides[0]);
      if (shell) shell.inert = false;
      if (cover) {
        cover.classList.add('is-opened');
        cover.setAttribute('aria-hidden', 'true');
        cover.inert = true;
      }
      state.musicWanted = true;
      playMusic(); // Kept in the original click gesture for mobile autoplay policies.
      startReveals();
      scheduleHero();
      window.setTimeout(function () {
        if (cover) cover.hidden = true;
        doc.body.classList.remove('is-opening');
        doc.body.classList.add('invitation-ready');
        doc.dispatchEvent(new CustomEvent('invitation:opened'));
        var heading = byId('heroHeading');
        if (heading) {
          heading.setAttribute('tabindex', '-1');
          heading.focus({ preventScroll: true });
        }
      }, reducedMotion() ? 0 : 1200);
    }

    on(openButton, 'click', openInvitation);
    on(doc.querySelector('.skip-link'), 'click', function (event) {
      if (!state.opened) { event.preventDefault(); openInvitation(); }
    });
    if (!cover || !openButton) {
      if (shell) shell.inert = false;
      state.opened = true;
      doc.body.classList.add('opened', 'invitation-ready');
      if (state.heroSlides.length) loadImage(state.heroSlides[0]);
      startReveals();
      scheduleHero();
    }
  }

  // Audio state reflects actual playback; blocked playback remains a usable button.
  function setupAudio() {
    var audio = byId('weddingAudio');
    var toggle = byId('musicToggle');
    if (!audio || !toggle) return;
    audio.preload = 'none';
    audio.volume = 0.45;
    audio.loop = true;
    on(toggle, 'click', function () {
      if (state.musicWanted && !audio.paused) {
        state.musicWanted = false;
        pauseMusic();
      } else {
        state.musicWanted = true;
        playMusic();
      }
    });
    on(audio, 'playing', updateAudioButton);
    on(audio, 'pause', updateAudioButton);
    on(audio, 'ended', updateAudioButton);
    on(audio, 'error', function () {
      state.musicWanted = false;
      updateAudioButton();
      setText(byId('musicLabel'), 'Coba putar musik');
    });
    on(doc, 'visibilitychange', function () {
      if (doc.hidden) pauseMusic();
      else if (state.musicWanted && !state.videoOpen) playMusic();
      scheduleHero();
    });
    updateAudioButton();
  }

  function updateAudioButton() {
    var audio = byId('weddingAudio');
    var toggle = byId('musicToggle');
    if (!audio || !toggle) return;
    var playing = !audio.paused && !audio.ended && !audio.error;
    toggle.setAttribute('aria-pressed', String(playing));
    toggle.setAttribute('aria-label', playing ? 'Jeda musik latar' : 'Putar musik latar');
    toggle.classList.toggle('is-playing', playing);
    setText(byId('musicLabel'), playing ? 'Musik menyala' : 'Putar musik');
  }

  function pauseMusic() {
    var audio = byId('weddingAudio');
    state.audioToken += 1;
    window.cancelAnimationFrame(state.musicRamp);
    if (audio) audio.pause();
    updateAudioButton();
  }

  function playMusic() {
    var audio = byId('weddingAudio');
    if (!audio || !state.musicWanted || state.videoOpen || doc.hidden) return;
    var token = ++state.audioToken;
    window.cancelAnimationFrame(state.musicRamp);
    if (!audio.getAttribute('src') && audio.dataset.src) audio.src = audio.dataset.src;
    if (!audio.getAttribute('src')) return;
    audio.volume = reducedMotion() ? 0.45 : 0;
    var playback;
    try { playback = audio.play(); } catch (error) { failed(); return; }
    Promise.resolve(playback).then(function () {
      if (token !== state.audioToken) return;
      if (!state.musicWanted || state.videoOpen || doc.hidden) { pauseMusic(); return; }
      updateAudioButton();
      if (reducedMotion()) { audio.volume = 0.45; return; }
      var started = performance.now();
      function ramp(now) {
        if (token !== state.audioToken || audio.paused) return;
        var progress = clamp((now - started) / 1400, 0, 1);
        audio.volume = 0.45 * progress;
        if (progress < 1) state.musicRamp = window.requestAnimationFrame(ramp);
      }
      state.musicRamp = window.requestAnimationFrame(ramp);
    }).catch(failed);

    function failed() {
      if (token !== state.audioToken) return;
      state.musicWanted = false;
      updateAudioButton();
      setText(byId('musicLabel'), 'Ketuk untuk musik');
    }
  }

  // Images retain intrinsic dimensions in HTML; below-fold downloads start nearby.
  function markImageLoaded(image) {
    image.classList.add('is-loaded');
    if (image.parentElement) image.parentElement.classList.remove('image-error');
  }

  function loadImage(image) {
    if (!image || image.dataset.loadingStarted === 'true') return;
    image.dataset.loadingStarted = 'true';
    on(image, 'load', function () { markImageLoaded(image); }, { once: true });
    on(image, 'error', function () {
      image.classList.add('is-error');
      if (image.parentElement && !image.hasAttribute('data-slide')) image.parentElement.classList.add('image-error');
    }, { once: true });
    if (image.dataset.srcset) image.srcset = image.dataset.srcset;
    if (image.dataset.sizes) image.sizes = image.dataset.sizes;
    if (image.dataset.src) image.src = image.dataset.src;
    if (image.complete && image.naturalWidth) markImageLoaded(image);
    if (state.lazyObserver) state.lazyObserver.unobserve(image);
  }

  function setupImages() {
    var lazyImages = all('img[data-src], img[data-srcset]').filter(function (image) { return !image.hasAttribute('data-slide'); });
    if ('IntersectionObserver' in window) {
      state.lazyObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) { if (entry.isIntersecting) loadImage(entry.target); });
      }, { rootMargin: '400px 0px', threshold: 0.01 });
    }
    lazyImages.forEach(function (image) {
      image.loading = 'lazy';
      image.decoding = 'async';
      if (state.lazyObserver) state.lazyObserver.observe(image);
      else loadImage(image);
    });
    all('img:not([data-src]):not([data-srcset])').forEach(function (image) {
      if (image.complete && image.naturalWidth) markImageLoaded(image);
      else on(image, 'load', function () { markImageLoaded(image); }, { once: true });
    });
  }

  function startReveals() {
    var items = all('[data-reveal]:not(.is-visible)');
    if (reducedMotion() || !('IntersectionObserver' in window)) {
      items.forEach(function (item) { item.classList.add('is-visible'); });
      return;
    }
    if (!state.revealObserver) {
      state.revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          state.revealObserver.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -32px 0px', threshold: 0.08 });
    }
    items.forEach(function (item) { state.revealObserver.observe(item); });
  }

  function updateHeroControls() {
    setText(byId('heroCurrent'), String(state.heroIndex + 1).padStart(2, '0'));
    setText(byId('heroTotal'), String(state.heroSlides.length).padStart(2, '0'));
    var pause = byId('heroPause');
    var stoppedByPreference = reducedMotion() || saveData();
    var paused = state.heroPaused || stoppedByPreference;
    if (pause) {
      pause.disabled = stoppedByPreference;
      pause.setAttribute('aria-pressed', String(paused));
      pause.setAttribute('aria-label', stoppedByPreference ? 'Slideshow otomatis dinonaktifkan sesuai preferensi perangkat' : (paused ? 'Lanjutkan slideshow foto' : 'Jeda slideshow foto'));
      pause.title = pause.getAttribute('aria-label');
      pause.classList.toggle('is-paused', paused);
      setText(pause.querySelector('[data-hero-pause-icon]') || pause, paused ? '▷' : 'Ⅱ');
    }
  }

  function showHeroSlide(index, automatic) {
    if (!state.heroSlides.length) return;
    window.clearTimeout(state.heroTimer);
    var nextIndex = (index + state.heroSlides.length) % state.heroSlides.length;
    var next = state.heroSlides[nextIndex];
    var request = ++state.heroRequest;
    var deadline;
    var finished = false;
    function cleanup() {
      next.removeEventListener('load', activate);
      next.removeEventListener('error', failed);
      window.clearTimeout(deadline);
    }
    function activate() {
      if (finished || request !== state.heroRequest || !next.naturalWidth) return;
      if (automatic && (!state.opened || !state.heroVisible || state.heroPaused || doc.hidden || reducedMotion() || saveData())) { finished = true; cleanup(); return; }
      finished = true;
      cleanup();
      state.heroSlides.forEach(function (slide, slideIndex) {
        slide.classList.toggle('is-active', slideIndex === nextIndex);
        slide.setAttribute('aria-hidden', String(slideIndex !== nextIndex));
      });
      state.heroIndex = nextIndex;
      updateHeroControls();
      scheduleHero();
    }
    function failed() {
      if (finished) return;
      finished = true;
      cleanup();
      if (request !== state.heroRequest) return;
      if (!automatic) showToast('Foto belum dapat dimuat. Silakan pilih foto lainnya atau coba lagi.');
      scheduleHero();
    }
    if (next.classList.contains('is-error')) {
      next.classList.remove('is-error');
      delete next.dataset.loadingStarted;
    }
    next.addEventListener('load', activate);
    next.addEventListener('error', failed);
    deadline = window.setTimeout(failed, 8000);
    loadImage(next);
    if (next.complete && next.naturalWidth && next.getAttribute('src').indexOf('data:') !== 0) activate();
  }

  function setupHero() {
    var container = byId('heroSlides');
    if (!container) return;
    state.heroSlides = all('img[data-slide]', container);
    if (!state.heroSlides.length) return;
    state.heroSlides.forEach(function (slide, index) {
      slide.classList.toggle('is-active', index === 0);
      slide.setAttribute('aria-hidden', String(index !== 0));
    });
    state.heroVisible = true;
    on(byId('heroPrev'), 'click', function () { showHeroSlide(state.heroIndex - 1, false); });
    on(byId('heroNext'), 'click', function () { showHeroSlide(state.heroIndex + 1, false); });
    on(byId('heroPause'), 'click', function () {
      state.heroPaused = !state.heroPaused;
      state.heroRequest += 1;
      updateHeroControls();
      scheduleHero();
    });
    if ('IntersectionObserver' in window) {
      var heroObserver = new IntersectionObserver(function (entries) {
        state.heroVisible = entries[0].isIntersecting;
        scheduleHero();
      }, { threshold: 0.05 });
      heroObserver.observe(container);
    }
    function changeMotion() {
      if (state.opened) startReveals();
      updateHeroControls();
      scheduleHero();
    }
    if (motionQuery) {
      if (motionQuery.addEventListener) motionQuery.addEventListener('change', changeMotion);
      else if (motionQuery.addListener) motionQuery.addListener(changeMotion);
    }
    on(navigator.connection, 'change', changeMotion);
    updateHeroControls();
  }

  function scheduleHero() {
    window.clearTimeout(state.heroTimer);
    if (!state.opened || !state.heroVisible || state.heroPaused || doc.hidden || reducedMotion() || saveData() || state.heroSlides.length < 2) return;
    var nextIndex = (state.heroIndex + 1) % state.heroSlides.length;
    for (var offset = 1; offset < state.heroSlides.length && state.heroSlides[nextIndex].classList.contains('is-error'); offset += 1) {
      nextIndex = (nextIndex + 1) % state.heroSlides.length;
    }
    if (nextIndex === state.heroIndex) return;
    loadImage(state.heroSlides[nextIndex]);
    state.heroTimer = window.setTimeout(function () { showHeroSlide(nextIndex, true); }, 7000);
  }

  // Event dates retain the original invitation's WIB schedule.
  function setupCountdown() {
    var counter = byId('countdown');
    if (!counter) return;
    var target = new Date('2026-09-25T09:00:00+07:00').getTime();
    var timer = 0;
    var labels = ['days', 'hours', 'minutes', 'seconds'];
    function tick() {
      var remaining = Math.max(0, target - Date.now());
      var values = [Math.floor(remaining / 86400000), Math.floor(remaining / 3600000) % 24, Math.floor(remaining / 60000) % 60, Math.floor(remaining / 1000) % 60];
      labels.forEach(function (label, index) {
        all('[data-count="' + label + '"], [data-' + label + ']', counter).forEach(function (node) {
          setText(node, String(values[index]).padStart(2, '0'));
        });
      });
      if (!remaining) {
        counter.classList.add('is-past');
        setText(byId('countdownStatus'), 'Hari bahagia telah berlalu. Terima kasih untuk doa dan kasih yang menyertai kami.');
        window.clearTimeout(timer);
      } else {
        setText(byId('countdownStatus'), 'Menuju hari bahagia kami');
        timer = window.setTimeout(tick, 1000);
      }
    }
    tick();
  }

  function escapeICS(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  }

  function foldICSLine(line) {
    var parts = [];
    var current = '';
    var bytes = 0;
    Array.from(line).forEach(function (character) {
      var size = typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(character).length : unescape(encodeURIComponent(character)).length;
      if (bytes + size > 74) { parts.push(current); current = ' '; bytes = 1; }
      current += character;
      bytes += size;
    });
    parts.push(current);
    return parts.join('\r\n');
  }

  function buildICS(kind) {
    var events = calendarEvents[kind];
    if (!events) return '';
    var stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Andi Sada//Wedding Invitation//ID', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
    events.forEach(function (event) {
      lines.push('BEGIN:VEVENT', 'UID:' + event.id + '@andi-sada.invitation', 'DTSTAMP:' + stamp, 'DTSTART:' + event.start,
        'SUMMARY:' + escapeICS(event.title), 'LOCATION:' + escapeICS(event.location), 'DESCRIPTION:' + escapeICS(event.description), 'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return lines.map(foldICSLine).join('\r\n') + '\r\n';
  }

  function setupCalendar() {
    all('[data-calendar]').forEach(function (button) {
      on(button, 'click', function (event) {
        event.preventDefault();
        var kind = button.dataset.calendar;
        var content = buildICS(kind);
        if (!content) return;
        var blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var anchor = doc.createElement('a');
        anchor.href = url;
        anchor.download = 'andi-sada-' + kind + '.ics';
        doc.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        showToast('Jadwal kalender diunduh');
      });
    });
  }

  // Scroll work is coalesced into one animation frame, with passive listeners.
  function setupNavigation() {
    var bar = byId('readingProgress');
    var links = all('.bottom-nav a[href^="#"]');
    var sections = links.map(function (link) {
      var id;
      try { id = decodeURIComponent(link.hash.slice(1)); } catch (error) { id = link.hash.slice(1); }
      return { link: link, section: byId(id) };
    }).filter(function (entry) { return entry.section; });
    var pending = false;
    function renderScroll() {
      pending = false;
      var scrollTop = window.scrollY || doc.documentElement.scrollTop || 0;
      var scrollRange = Math.max(1, doc.documentElement.scrollHeight - window.innerHeight);
      if (bar) bar.style.transform = 'scaleX(' + clamp(scrollTop / scrollRange, 0, 1) + ')';
      var active = sections[0];
      sections.forEach(function (entry) { if (entry.section.getBoundingClientRect().top <= window.innerHeight * 0.4) active = entry; });
      sections.forEach(function (entry) {
        var selected = entry === active;
        entry.link.classList.toggle('is-active', selected);
        if (selected) entry.link.setAttribute('aria-current', 'location');
        else entry.link.removeAttribute('aria-current');
      });
      var backTop = byId('backTop');
      if (backTop) backTop.classList.toggle('is-visible', scrollTop > window.innerHeight * 0.75);
    }
    function requestRender() {
      if (pending) return;
      pending = true;
      window.requestAnimationFrame(renderScroll);
    }
    on(window, 'scroll', requestRender, { passive: true });
    on(window, 'resize', requestRender, { passive: true });
    on(byId('backTop'), 'click', function () { window.scrollTo({ top: 0, behavior: scrollBehavior() }); });
    links.forEach(function (link) {
      on(link, 'click', function (event) {
        var target = sections.find(function (entry) { return entry.link === link; });
        if (!target) return;
        event.preventDefault();
        target.section.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
        if (history.replaceState) history.replaceState(null, '', link.hash);
      });
    });
    renderScroll();
  }

  // Native dialogs provide focus containment and Escape handling.
  function synchronizeModalLock() {
    doc.body.classList.toggle('modal-open', all('dialog[open]').length > 0);
  }

  function openDialog(dialog) {
    if (!dialog || dialog.open) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else { dialog.setAttribute('open', ''); dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); }
    synchronizeModalLock();
  }

  function closeDialog(dialog) {
    if (!dialog || !dialog.open) return;
    if (typeof dialog.close === 'function') dialog.close();
    else { dialog.removeAttribute('open'); dialog.dispatchEvent(new Event('close')); }
    synchronizeModalLock();
  }

  function setupDialogBackdrop(dialog) {
    if (!dialog) return;
    on(dialog, 'click', function (event) {
      if (event.target !== dialog) return;
      var bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeDialog(dialog);
    });
    on(dialog, 'close', synchronizeModalLock);
  }

  function galleryButtons() { return all('[data-gallery]'); }

  function gallerySource(button) {
    return button.dataset.src || button.dataset.gallery || (button.querySelector('img') && (button.querySelector('img').dataset.src || button.querySelector('img').src)) || '';
  }

  function showGalleryImage(index) {
    var buttons = galleryButtons();
    if (!buttons.length) return;
    state.galleryIndex = (index + buttons.length) % buttons.length;
    var button = buttons[state.galleryIndex];
    var image = byId('lightboxImage');
    var stage = byId('lightboxStage');
    var title = button.dataset.title || (button.querySelector('img') && button.querySelector('img').alt) || 'Kenangan mempelai';
    if (stage) stage.classList.remove('is-zoomed');
    var zoom = byId('lightboxZoom');
    if (zoom) { zoom.setAttribute('aria-pressed', 'false'); zoom.setAttribute('aria-label', 'Perbesar foto'); }
    if (image) {
      window.clearTimeout(state.galleryLoadTimer);
      var source = gallerySource(button);
      var status = byId('lightboxStatus');
      if (stage) { stage.setAttribute('aria-busy', 'true'); stage.classList.add('is-loading'); stage.classList.remove('is-error'); }
      image.classList.remove('is-loaded');
      if (status) { status.hidden = false; setText(status, 'Memuat foto…'); }
      function loaded() {
        window.clearTimeout(state.galleryLoadTimer);
        image.classList.add('is-loaded');
        if (stage) { stage.setAttribute('aria-busy', 'false'); stage.classList.remove('is-loading', 'is-error'); }
        if (status) status.hidden = true;
      }
      function failed() {
        window.clearTimeout(state.galleryLoadTimer);
        if (stage) { stage.setAttribute('aria-busy', 'false'); stage.classList.remove('is-loading'); stage.classList.add('is-error'); }
        if (status) { status.hidden = false; setText(status, 'Foto belum dapat dimuat. Pilih foto lain dengan tombol panah, lalu coba kembali.'); }
      }
      image.onload = loaded;
      image.onerror = failed;
      image.alt = title;
      image.src = source;
      state.galleryLoadTimer = window.setTimeout(failed, 10000);
      if (image.complete && image.naturalWidth) loaded();
    }
    setText(byId('lightboxCaption'), title);
    setText(byId('lightboxCount'), String(state.galleryIndex + 1).padStart(2, '0') + ' / ' + String(buttons.length).padStart(2, '0'));
    if (!saveData()) {
      [-1, 1].forEach(function (offset) {
        var neighbor = buttons[(state.galleryIndex + offset + buttons.length) % buttons.length];
        var preload = new Image();
        preload.decoding = 'async';
        preload.src = gallerySource(neighbor);
      });
    }
  }

  function setupGallery() {
    var dialog = byId('lightbox');
    var stage = byId('lightboxStage');
    if (!dialog) return;
    if (stage && !byId('lightboxStatus')) {
      var status = doc.createElement('p');
      status.id = 'lightboxStatus';
      status.className = 'lightbox-status';
      status.setAttribute('role', 'status');
      status.hidden = true;
      stage.appendChild(status);
    }
    galleryButtons().forEach(function (button, index) {
      on(button, 'click', function () {
        state.galleryTrigger = button;
        showGalleryImage(index);
        openDialog(dialog);
      });
    });
    on(byId('lightboxPrev'), 'click', function () { showGalleryImage(state.galleryIndex - 1); });
    on(byId('lightboxNext'), 'click', function () { showGalleryImage(state.galleryIndex + 1); });
    on(byId('lightboxClose'), 'click', function () { closeDialog(dialog); });
    on(byId('lightboxZoom'), 'click', function () {
      if (!stage) return;
      var zoomed = stage.classList.toggle('is-zoomed');
      byId('lightboxZoom').setAttribute('aria-pressed', String(zoomed));
      byId('lightboxZoom').setAttribute('aria-label', zoomed ? 'Kecilkan foto' : 'Perbesar foto');
    });
    on(dialog, 'keydown', function (event) {
      if (event.key === 'ArrowLeft') { event.preventDefault(); showGalleryImage(state.galleryIndex - 1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); showGalleryImage(state.galleryIndex + 1); }
    });
    var touchStart = null;
    on(stage, 'touchstart', function (event) {
      if (event.touches.length !== 1 || stage.classList.contains('is-zoomed')) { touchStart = null; return; }
      touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }, { passive: true });
    on(stage, 'touchend', function (event) {
      if (!touchStart || !event.changedTouches.length) return;
      var deltaX = event.changedTouches[0].clientX - touchStart.x;
      var deltaY = event.changedTouches[0].clientY - touchStart.y;
      if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) showGalleryImage(state.galleryIndex + (deltaX < 0 ? 1 : -1));
      touchStart = null;
    }, { passive: true });
    on(dialog, 'close', function () {
      window.clearTimeout(state.galleryLoadTimer);
      if (stage) stage.classList.remove('is-zoomed');
      if (state.galleryTrigger) state.galleryTrigger.focus({ preventScroll: true });
    });
    on(byId('moreGallery'), 'click', function () {
      var extra = all('[data-extra]');
      extra.forEach(function (element) { element.hidden = false; element.classList.add('is-visible'); });
      byId('moreGallery').hidden = true;
      if (extra.length) extra[0].focus({ preventScroll: true });
      if (state.opened) startReveals();
    });
    setupDialogBackdrop(dialog);
  }

  function setupVideo() {
    var dialog = byId('videoDialog');
    var container = byId('videoContainer');
    if (!dialog || !container) return;
    on(byId('videoButton'), 'click', function (event) {
      state.videoTrigger = event.currentTarget;
      state.videoOpen = true;
      pauseMusic();
      container.replaceChildren();
      var iframe = doc.createElement('iframe');
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(window.RewamoreRuntime.videoId) + '?autoplay=1&rel=0&playsinline=1';
      iframe.title = window.RewamoreRuntime.title;
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      container.appendChild(iframe);
      openDialog(dialog);
    });
    on(byId('videoClose'), 'click', function () { closeDialog(dialog); });
    on(dialog, 'close', function () {
      container.replaceChildren();
      state.videoOpen = false;
      if (state.musicWanted) playMusic();
      if (state.videoTrigger) state.videoTrigger.focus({ preventScroll: true });
    });
    setupDialogBackdrop(dialog);
  }

  function showToast(message) {
    var toast = byId('toast');
    if (!toast) return;
    window.clearTimeout(state.toastTimer);
    toast.setAttribute('aria-live', 'polite');
    toast.hidden = false;
    setText(toast, message);
    toast.classList.add('is-visible');
    state.toastTimer = window.setTimeout(function () { toast.classList.remove('is-visible'); }, 3400);
  }

  function fallbackCopy(text) {
    var active = doc.activeElement;
    var area = doc.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none;';
    var dialog = all('dialog[open]').pop();
    (dialog || doc.body).appendChild(area);
    area.select();
    area.setSelectionRange(0, area.value.length);
    var success = false;
    try { success = doc.execCommand('copy'); } catch (error) { success = false; }
    area.remove();
    if (active && active.focus) active.focus({ preventScroll: true });
    return success;
  }

  function copyText(text, message) {
    var operation;
    if (navigator.clipboard && window.isSecureContext) operation = navigator.clipboard.writeText(text).then(function () { return true; }).catch(function () { return fallbackCopy(text); });
    else operation = Promise.resolve(fallbackCopy(text));
    return operation.then(function (success) {
      showToast(success ? (message || 'Berhasil disalin') : 'Belum dapat menyalin. Silakan pilih dan salin teks secara manual.');
      return success;
    });
  }

  function setupCopy() {
    all('[data-copy]').forEach(function (button) {
      on(button, 'click', function () { copyText(button.dataset.copy || '', button.dataset.copyMessage || 'Nomor berhasil disalin'); });
    });
  }

  function makeShareURL(name) {
    var url = new URL(window.location.href);
    url.hash = '';
    url.search = '';
    var guest = normalizeGuest(name);
    if (guest) url.searchParams.set('to', guest);
    return url.toString();
  }

  function setupShare() {
    var dialog = byId('shareDialog');
    var input = byId('shareName');
    var output = byId('shareLink');
    if (!dialog || !input || !output) return;
    function updateLink() { output.value = makeShareURL(input.value); }
    on(byId('shareButton'), 'click', function (event) {
      state.shareTrigger = event.currentTarget;
      updateLink();
      openDialog(dialog);
      input.focus();
    });
    on(input, 'input', updateLink);
    on(byId('shareClose'), 'click', function () { closeDialog(dialog); });
    on(byId('copyLink'), 'click', function () {
      updateLink();
      copyText(output.value, window.location.protocol === 'file:' ? 'Alamat lokal disalin. Unggah website ke hosting agar tautannya bisa dibagikan.' : 'Tautan undangan berhasil disalin');
    });
    on(dialog, 'close', function () { if (state.shareTrigger) state.shareTrigger.focus({ preventScroll: true }); });
    setupDialogBackdrop(dialog);
    updateLink();
  }

  function init() {
    doc.documentElement.classList.add('js-ready');
    [setupGuest, setupAudio, setupImages, setupHero, setupNavigation,
      setupGallery, setupVideo, setupCopy, setupShare, setupCover].forEach(safeInit);
  }

  // Small pure helpers are also useful for local smoke tests without a browser.
  window.WeddingHelpers = Object.freeze({ normalizeGuest: normalizeGuest, escapeICS: escapeICS, buildICS: buildICS });
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}());
