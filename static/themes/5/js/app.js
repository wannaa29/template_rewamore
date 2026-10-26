/* Rewamore managed runtime v1 */
/* Endah & Evan — progressive, accessible invitation; no third-party runtime. */
(function () {
  'use strict';

  var doc = document;
  var state = {
    opened: false,
    musicWanted: false,
    audioToken: 0,
    musicRamp: 0,
    galleryIndex: 0,
    galleryTrigger: null,
    shareTrigger: null,
    lazyObserver: null,
    revealObserver: null,
    heroVisible: false,
    heroTimer: 0,
    heroIndex: 0,
    heroSlides: [],
    toastTimer: 0
  };
  var motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var venue = 'Kediaman Mempelai Wanita, Jl. Raya Lubuk Gaung (Depan PT SDS), Kecamatan Sungai Sembilan, Kota Dumai';
  var calendarEvents = {
    akad: [{
      id: 'akad-20261016',
      title: 'Akad Nikah Endah & Evan',
      start: '20261016T010000Z',
      location: venue,
      description: 'Akad nikah dr. Dwi Endah Misdina dan Evan Ahmad Al-Gafar Napitupulu. Jumat, 16 Oktober 2026, pukul 08.00 WIB. Waktu selesai tidak ditentukan.'
    }],
    reception: [{
      id: 'resepsi-20261017',
      title: 'Resepsi Endah & Evan',
      start: '20261017T040000Z',
      location: venue,
      description: 'Resepsi pernikahan dr. Dwi Endah Misdina dan Evan Ahmad Al-Gafar Napitupulu. Sabtu, 17 Oktober 2026, pukul 11.00 WIB. Waktu selesai tidak ditentukan.'
    }]
  };
  calendarEvents.all = calendarEvents.akad.concat(calendarEvents.reception);

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
  function decodeGuest(value) {
    // URLSearchParams has already decoded once. Some invitation services encode a second time.
    var decoded = typeof value === 'string' ? value : '';
    for (var pass = 0; pass < 2 && /%[0-9a-f]{2}/i.test(decoded); pass += 1) {
      try { var next = decodeURIComponent(decoded); if (next === decoded) break; decoded = next; }
      catch (error) { break; }
    }
    return normalizeGuest(decoded);
  }
  function scrollBehavior() { return reducedMotion() ? 'auto' : 'smooth'; }
  function safeInit(fn) {
    try { fn(); } catch (error) { console.warn('[Invitation] ' + fn.name + ' could not initialize:', error); }
  }

  // Guest personalization never inserts URL-derived HTML.
  function setupGuest() {
    var guest = decodeGuest(new URLSearchParams(window.location.search).get('to'));
    all('[data-guest]').forEach(function (node) { setText(node, guest || 'Tamu Undangan'); });
    var input = byId('guestName');
    if (input && guest) input.value = guest.slice(0, input.maxLength > 0 ? input.maxLength : 80);
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
      doc.body.classList.add('opened');
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
        var heading = byId('heroHeading');
        if (heading) {
          heading.setAttribute('tabindex', '-1');
          heading.focus({ preventScroll: true });
        }
      }, reducedMotion() ? 0 : 1200);
    }

    on(openButton, 'click', openInvitation);
    if (!cover || !openButton) {
      if (shell) shell.inert = false;
      state.opened = true;
      doc.body.classList.add('opened');
      startReveals();
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
      if (state.musicWanted) {
        state.musicWanted = false;
        pauseMusic(true);
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
      else if (state.musicWanted) playMusic();
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

  function pauseMusic(fade) {
    var audio = byId('weddingAudio');
    var token = ++state.audioToken;
    window.cancelAnimationFrame(state.musicRamp);
    if (!audio) return;
    if (!fade || reducedMotion() || doc.hidden || audio.paused) {
      audio.pause();
      updateAudioButton();
      return;
    }
    var started = performance.now();
    var initial = audio.volume;
    function ramp(now) {
      if (token !== state.audioToken) return;
      var progress = clamp((now - started) / 280, 0, 1);
      audio.volume = initial * (1 - progress);
      if (progress < 1) state.musicRamp = window.requestAnimationFrame(ramp);
      else { audio.pause(); updateAudioButton(); }
    }
    state.musicRamp = window.requestAnimationFrame(ramp);
  }

  function playMusic() {
    var audio = byId('weddingAudio');
    if (!audio || !state.musicWanted || doc.hidden) return;
    var token = ++state.audioToken;
    window.cancelAnimationFrame(state.musicRamp);
    if (!audio.getAttribute('src') && audio.dataset.src) audio.src = audio.dataset.src;
    if (!audio.getAttribute('src')) return;
    audio.volume = reducedMotion() ? 0.45 : (audio.paused ? 0 : audio.volume);
    var playback;
    try { playback = audio.play(); } catch (error) { failed(); return; }
    Promise.resolve(playback).then(function () {
      if (token !== state.audioToken) return;
      if (!state.musicWanted || doc.hidden) { pauseMusic(); return; }
      updateAudioButton();
      if (reducedMotion()) { audio.volume = 0.45; return; }
      var started = performance.now();
      var initial = audio.volume;
      function ramp(now) {
        if (token !== state.audioToken || audio.paused) return;
        var progress = clamp((now - started) / 1400, 0, 1);
        audio.volume = initial + (0.45 - initial) * progress;
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
      if (image.parentElement) image.parentElement.classList.add('image-error');
    }, { once: true });
    if (image.dataset.sizes) image.sizes = image.dataset.sizes;
    if (image.dataset.srcset) image.srcset = image.dataset.srcset;
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

  function setupHero() {
    var container = byId('heroSlides');
    if (!container) return;
    state.heroSlides = all('img[data-slide]', container);
    if (!state.heroSlides.length) return;
    state.heroSlides.forEach(function (slide, index) {
      slide.classList.toggle('is-active', index === 0);
      slide.setAttribute('aria-hidden', String(index !== 0));
    });
    loadImage(state.heroSlides[0]);
    state.heroVisible = true;
    if ('IntersectionObserver' in window) {
      var heroObserver = new IntersectionObserver(function (entries) {
        state.heroVisible = entries[0].isIntersecting;
        scheduleHero();
      }, { threshold: 0.05 });
      heroObserver.observe(container);
    }
    if (motionQuery) {
      var changeMotion = function () {
        doc.documentElement.classList.toggle('motion-off', reducedMotion() || saveData());
        if (state.opened) startReveals();
        scheduleHero();
      };
      if (motionQuery.addEventListener) motionQuery.addEventListener('change', changeMotion);
      else if (motionQuery.addListener) motionQuery.addListener(changeMotion);
    }
    if (navigator.connection && navigator.connection.addEventListener) {
      navigator.connection.addEventListener('change', function () {
        doc.documentElement.classList.toggle('motion-off', reducedMotion() || saveData());
        scheduleHero();
      });
    }
    on(doc, 'visibilitychange', scheduleHero);
    scheduleHero();
  }

  function scheduleHero() {
    window.clearTimeout(state.heroTimer);
    var shouldAnimate = state.opened && state.heroVisible && !doc.hidden && !reducedMotion() && !saveData();
    var container = byId('heroSlides');
    if (container) container.classList.toggle('is-animating', shouldAnimate);
    if (!shouldAnimate || state.heroSlides.length < 2) return;
    var nextIndex = (state.heroIndex + 1) % state.heroSlides.length;
    for (var offset = 1; offset < state.heroSlides.length && state.heroSlides[nextIndex].classList.contains('is-error'); offset += 1) {
      nextIndex = (nextIndex + 1) % state.heroSlides.length;
    }
    if (nextIndex === state.heroIndex) return;
    loadImage(state.heroSlides[nextIndex]);
    state.heroTimer = window.setTimeout(function () {
      var next = state.heroSlides[nextIndex];
      if (next.complete && next.naturalWidth) {
        state.heroSlides[state.heroIndex].classList.remove('is-active');
        state.heroSlides[state.heroIndex].setAttribute('aria-hidden', 'true');
        next.classList.add('is-active');
        next.setAttribute('aria-hidden', 'false');
        state.heroIndex = nextIndex;
      }
      scheduleHero();
    }, 7000);
  }

  // Event dates retain the original invitation's WIB schedule.
  function setupCountdown() {
    var counter = byId('countdown');
    if (!counter) return;
    var target = new Date('2026-10-17T11:00:00+07:00').getTime();
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
        setText(byId('countdownStatus'), 'Hari bahagia kami telah tiba. Terima kasih atas doa dan kasih yang menyertai kami.');
        window.clearTimeout(timer);
      } else {
        setText(byId('countdownStatus'), 'Menuju resepsi · 17 Oktober 2026, 11.00 WIB');
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
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Endah Evan//Wedding Invitation//ID', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
    events.forEach(function (event) {
      lines.push('BEGIN:VEVENT', 'UID:' + event.id + '@endah-evan.invitation', 'DTSTAMP:' + stamp, 'DTSTART:' + event.start,
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
        anchor.download = 'endah-evan-' + kind + '.ics';
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
    on(dialog, 'keydown', function (event) {
      if (!dialog.open) return;
      if (event.key === 'Escape') { event.preventDefault(); closeDialog(dialog); return; }
      if (event.key !== 'Tab') return;
      var controls = all('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]', dialog)
        .filter(function (control) { return !control.hidden && !control.closest('[hidden]'); });
      if (!controls.length) { event.preventDefault(); return; }
      var first = controls[0];
      var last = controls[controls.length - 1];
      if (event.shiftKey && doc.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && doc.activeElement === last) { event.preventDefault(); first.focus(); }
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
    var title = button.dataset.title || (button.querySelector('img') && button.querySelector('img').alt) || 'Foto mempelai';
    if (stage) stage.classList.remove('is-zoomed');
    var zoom = byId('lightboxZoom');
    if (zoom) { zoom.setAttribute('aria-pressed', 'false'); zoom.setAttribute('aria-label', 'Perbesar ilustrasi'); }
    if (image) {
      if (stage) stage.classList.add('is-loading');
      image.classList.remove('is-error');
      image.onload = function () { if (stage) stage.classList.remove('is-loading'); };
      image.onerror = function () {
        if (stage) stage.classList.remove('is-loading');
        image.classList.add('is-error');
        showToast('Ilustrasi belum dapat dimuat. Coba gambar berikutnya.');
      };
      image.src = gallerySource(button);
      image.alt = title;
      if (image.complete && image.naturalWidth && stage) stage.classList.remove('is-loading');
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
    galleryButtons().forEach(function (button, index) {
      on(button, 'click', function () {
        state.galleryTrigger = button;
        showGalleryImage(index);
        openDialog(dialog);
        var close = byId('lightboxClose');
        if (close) close.focus({ preventScroll: true });
      });
    });
    on(byId('lightboxPrev'), 'click', function () { showGalleryImage(state.galleryIndex - 1); });
    on(byId('lightboxNext'), 'click', function () { showGalleryImage(state.galleryIndex + 1); });
    on(byId('lightboxClose'), 'click', function () { closeDialog(dialog); });
    on(byId('lightboxZoom'), 'click', function () {
      if (!stage) return;
      var zoomed = stage.classList.toggle('is-zoomed');
      byId('lightboxZoom').setAttribute('aria-pressed', String(zoomed));
      byId('lightboxZoom').setAttribute('aria-label', zoomed ? 'Kecilkan ilustrasi' : 'Perbesar ilustrasi');
    });
    on(dialog, 'keydown', function (event) {
      if (event.key === 'ArrowLeft') { event.preventDefault(); showGalleryImage(state.galleryIndex - 1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); showGalleryImage(state.galleryIndex + 1); }
      if ((event.key === '+' || event.key === '=') && byId('lightboxZoom')) { event.preventDefault(); byId('lightboxZoom').click(); }
      if ((event.key === '-' || event.key === '0') && stage) {
        event.preventDefault();
        stage.classList.remove('is-zoomed');
        if (byId('lightboxZoom')) {
          byId('lightboxZoom').setAttribute('aria-pressed', 'false');
          byId('lightboxZoom').setAttribute('aria-label', 'Perbesar ilustrasi');
        }
      }
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
      if (stage) stage.classList.remove('is-zoomed');
      if (state.galleryTrigger) state.galleryTrigger.focus({ preventScroll: true });
    });
    on(byId('moreGallery'), 'click', function () {
      all('[data-extra]').forEach(function (element) { element.hidden = false; element.classList.add('is-visible'); });
      byId('moreGallery').hidden = true;
      if (state.opened) startReveals();
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
    area.className = 'clipboard-helper';
    area.style.position = 'fixed';
    area.style.left = '0';
    area.style.top = '0';
    area.style.width = '1px';
    area.style.height = '1px';
    area.style.opacity = '0';
    area.style.pointerEvents = 'none';
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
    doc.documentElement.classList.toggle('motion-off', reducedMotion() || saveData());
    [setupGuest, setupAudio, setupImages, setupHero, setupNavigation,
      setupGallery, setupCopy, setupShare, setupCover].forEach(safeInit);
  }

  // Small pure helpers are also useful for local smoke tests without a browser.
  window.WeddingHelpers = Object.freeze({ normalizeGuest: normalizeGuest, decodeGuest: decodeGuest, makeShareURL: makeShareURL, escapeICS: escapeICS, buildICS: buildICS });
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}());
