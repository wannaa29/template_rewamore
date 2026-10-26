/* Rewamore managed runtime v1 */
/* Andi & Sada — interaksi undangan, tanpa dependensi. */
(() => {
  'use strict';

  function initialize() {
    const config = window.INVITATION || {};
    const $ = (id) => document.getElementById(id);
    const body = document.body;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const cleanText = (value, max) => String(value || '').trim().slice(0, max);
    const setText = (id, text) => { const element = $(id); if (element) element.textContent = text; };
    let invitationOpen = body.dataset.open === 'true';
    let motionOverride = null;
    let toastTimer;

    function motionIsPaused() {
      return motionOverride === null ? reducedMotion.matches : motionOverride;
    }

    function toast(message) {
      const element = $('toast');
      if (!element) return;
      clearTimeout(toastTimer);
      // Dialog modal berada pada top layer; status harus berada di layer yang sama.
      const owner = document.querySelector('dialog[open]') || body;
      if (element.parentElement !== owner) owner.append(element);
      element.textContent = message;
      element.classList.add('is-visible');
      toastTimer = setTimeout(() => element.classList.remove('is-visible'), 4400);
    }

    function safePlay(media, onFailure) {
      if (!media) return;
      try {
        const result = media.play();
        if (result && typeof result.catch === 'function') result.catch(() => {
          if (onFailure) onFailure();
        });
      } catch (_) {
        if (onFailure) onFailure();
      }
    }

    const guest = cleanText(new URLSearchParams(window.location.search).get('to'), 120)
      || cleanText(config.guestFallback, 120) || 'Bapak/Ibu/Saudara/i';
    setText('guestName', guest);
    if ($('rsvpName')) $('rsvpName').value = guest.slice(0, 80);

    // Musik hanya diaktifkan dari tindakan pengguna.
    const soundtrack = $('soundtrack');
    const musicToggle = $('musicToggle');
    let musicWanted = false;
    let musicUserDecided = false;
    let musicBeforeHidden = false;
    let musicBeforeVideo = false;
    if (soundtrack) soundtrack.volume = 0.4;

    function updateMusic() {
      const playing = !!soundtrack && !soundtrack.paused && !soundtrack.ended;
      if (musicToggle) {
        musicToggle.setAttribute('aria-pressed', String(playing));
        musicToggle.setAttribute('aria-label', playing ? 'Jeda musik' : 'Putar musik');
        musicToggle.classList.toggle('is-playing', playing);
      }
      setText('musicLabel', playing ? 'Musik aktif' : 'Musik nonaktif');
      body.classList.toggle('music-playing', playing);
    }

    function playMusic() {
      if (!musicWanted || document.hidden || $('videoDialog')?.open) return;
      safePlay(soundtrack, updateMusic);
    }

    if (soundtrack) {
      ['play', 'pause', 'ended', 'error'].forEach((event) => soundtrack.addEventListener(event, updateMusic));
    }
    musicToggle?.addEventListener('click', () => {
      if (!soundtrack) return;
      musicUserDecided = true;
      musicWanted = soundtrack.paused;
      if (musicWanted) playMusic();
      else soundtrack.pause();
      updateMusic();
    });
    updateMusic();

    // Satu mesin gerak untuk foto pembuka dan bab sinematik.
    // Foto keluar tetap digambar hingga foto masuk menutupnya sepenuhnya.
    const carousels = [];
    const transitionDuration = 1800;
    const holdDuration = 3400;
    let keyboardMode = false;
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') keyboardMode = true;
    });
    document.addEventListener('pointerdown', () => { keyboardMode = false; }, { passive: true });

    function enableSwipe(element, next, previous) {
      if (!element) return;
      let start = null;
      element.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'mouse' || event.target.closest('button,a,input,textarea')) return;
        start = { x: event.clientX, y: event.clientY };
      }, { passive: true });
      element.addEventListener('pointerup', (event) => {
        if (!start) return;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        start = null;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) dx < 0 ? next() : previous();
      }, { passive: true });
      element.addEventListener('pointercancel', () => { start = null; });
    }

    function createCarousel(options) {
      const root = $(options.root);
      if (!root) return null;
      const slides = [...root.querySelectorAll(options.slide)];
      if (!slides.length) return null;
      const dots = [...document.querySelectorAll(options.dots)];
      const progress = $(options.progress);
      let index = Math.max(0, slides.findIndex((slide) => slide.classList.contains('is-active')));
      let autoplayTimer;
      let transitionTimer;
      let queued = null;
      let transitioning = false;
      let userPaused = false;
      let keyboardFocused = false;
      let visible = options.hero;
      let transitionCount = 0;
      let firstPlay = true;
      root.dataset.effect = 'slide';
      root.dataset.direction = 'next';
      root.style.setProperty('--transition-duration', `${transitionDuration}ms`);
      root.style.setProperty('--pan-duration', `${holdDuration + transitionDuration + 1600}ms`);

      function canRun() {
        return slides.length > 1 && !userPaused && !keyboardFocused && visible
          && !document.hidden && !motionIsPaused() && !document.querySelector('dialog[open]')
          && (options.hero || invitationOpen);
      }

      function clearAutoplay() {
        clearTimeout(autoplayTimer);
        progress?.classList.remove('is-running');
      }

      function updateControl() {
        const paused = userPaused || motionIsPaused();
        const button = $(options.pause);
        root.classList.toggle('is-paused', !canRun());
        root.classList.toggle('is-autoplay-paused', !canRun());
        if (!button) return;
        button.setAttribute('aria-label', paused ? 'Putar slider otomatis' : 'Jeda slider otomatis');
        button.setAttribute('aria-pressed', String(paused));
        button.classList.toggle('is-paused', paused);
        button.querySelector('use')?.setAttribute('href', paused ? '#i-play' : '#i-pause');
      }

      function updateCaption() {
        const slide = slides[index];
        setText(options.number, String(index + 1).padStart(2, '0'));
        setText(options.caption, slide.dataset.caption || options.captions?.[index]?.caption || 'Sebuah kisah, selamanya');
        if (options.kicker) setText(options.kicker, slide.dataset.kicker || 'ANDI & SADA');
        dots.forEach((dot, dotIndex) => {
          dot.setAttribute('aria-pressed', String(dotIndex === index));
          if (dotIndex === index) dot.setAttribute('aria-current', 'true');
          else dot.removeAttribute('aria-current');
        });
      }

      function schedule() {
        clearAutoplay();
        updateControl();
        if (!canRun() || transitioning) return;
        const delay = firstPlay ? 2600 : holdDuration;
        if (progress) {
          progress.style.setProperty('--slide-duration', `${delay}ms`);
          void progress.offsetWidth;
          progress.classList.add('is-running');
        }
        autoplayTimer = setTimeout(() => {
          firstPlay = false;
          request(index + 1, 'next');
        }, delay);
      }

      function settle(continueQueue = true) {
        clearTimeout(transitionTimer);
        transitioning = false;
        slides.forEach((slide, slideIndex) => {
          slide.classList.remove('is-entering', 'is-leaving');
          slide.classList.toggle('is-active', slideIndex === index);
          slide.setAttribute('aria-hidden', String(slideIndex !== index));
        });
        root.classList.remove('is-transitioning', 'caption-changing');
        const next = queued;
        queued = null;
        if (continueQueue && next && !motionIsPaused() && !document.hidden) {
          request(next.index, next.direction);
        } else schedule();
      }

      function request(target, direction = 'next') {
        const next = (target + slides.length) % slides.length;
        clearAutoplay();
        if (transitioning) {
          queued = { index: next, direction };
          return;
        }
        if (next === index) { schedule(); return; }
        firstPlay = false;
        if (motionIsPaused() || document.hidden) {
          index = next;
          settle(false);
          updateCaption();
          return;
        }
        const outgoing = slides[index];
        const incoming = slides[next];
        root.dataset.direction = direction;
        root.dataset.effect = ['slide', 'curtain', 'zoom'][transitionCount++ % 3];
        // Tidak ada celah kosong: dua foto tetap digambar selama transisi.
        outgoing.classList.remove('is-active');
        outgoing.classList.add('is-leaving');
        incoming.classList.remove('is-entering', 'is-leaving');
        void incoming.offsetWidth;
        incoming.classList.add('is-active', 'is-entering');
        outgoing.setAttribute('aria-hidden', 'true');
        incoming.setAttribute('aria-hidden', 'false');
        index = next;
        transitioning = true;
        root.classList.add('is-transitioning', 'caption-changing');
        updateCaption();
        transitionTimer = setTimeout(() => settle(), transitionDuration);
      }

      function step(delta) {
        const from = queued ? queued.index : index;
        request(from + delta, delta > 0 ? 'next' : 'prev');
      }
      function synchronize() {
        if (!canRun() && transitioning) settle(false);
        else schedule();
      }
      function pointerControl(event) {
        if (event.detail > 0 || !keyboardMode) keyboardFocused = false;
      }
      $(options.previous)?.addEventListener('click', (event) => { pointerControl(event); step(-1); });
      $(options.next)?.addEventListener('click', (event) => { pointerControl(event); step(1); });
      $(options.pause)?.addEventListener('click', (event) => {
        pointerControl(event);
        if (motionIsPaused()) {
          toast('Aktifkan animasi melalui kontrol gerak. Foto tetap dapat diganti dengan tombol panah.');
          return;
        }
        userPaused = !userPaused;
        synchronize();
      });
      dots.forEach((dot, dotIndex) => dot.addEventListener('click', (event) => {
        pointerControl(event);
        request(dotIndex, dotIndex < index ? 'prev' : 'next');
      }));
      root.addEventListener('focusin', (event) => {
        try { keyboardFocused = keyboardMode || !!event.target.matches?.(':focus-visible'); }
        catch (_) { keyboardFocused = keyboardMode; }
        if (keyboardFocused) synchronize();
      });
      root.addEventListener('focusout', (event) => {
        if (!event.relatedTarget || !root.contains(event.relatedTarget)) {
          keyboardFocused = false;
          schedule();
        }
      });
      root.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          keyboardFocused = true;
          step(event.key === 'ArrowRight' ? 1 : -1);
        }
      });
      enableSwipe(root, () => step(1), () => step(-1));
      if ('IntersectionObserver' in window) {
        new IntersectionObserver((entries) => {
          visible = entries[0].isIntersecting && entries[0].intersectionRatio >= 0.08;
          synchronize();
        }, { threshold: [0, 0.08, 0.25] }).observe(root);
      } else visible = true;
      updateCaption();
      settle(false);
      const controller = { synchronize, updateControl, settle: () => settle(false) };
      carousels.push(controller);
      return controller;
    }

    createCarousel({ root: 'heroSlider', slide: '.hero-slide', dots: '[data-hero-dot]', previous: 'heroPrev',
      next: 'heroNext', pause: 'heroPause', number: 'slideNumber', caption: 'slideCaption', progress: 'slideProgress',
      hero: true, captions: config.slides });
    createCarousel({ root: 'chapterSlider', slide: '.chapter-slide', dots: '[data-chapter-dot]', previous: 'chapterPrev',
      next: 'chapterNext', pause: 'chapterPause', number: 'chapterNumber', caption: 'chapterTitle', kicker: 'chapterKicker',
      progress: 'chapterProgress', hero: false });
    function scheduleSlide() { carousels.forEach((carousel) => carousel.synchronize()); }
    function updateSliderControl() { carousels.forEach((carousel) => carousel.updateControl()); }

    // Video foto bersuara senyap; video asli dibuka terpisah agar audio tidak bertumpuk.
    const film = $('film');
    let filmVisible = false;
    let filmUserPaused = false;
    let filmExplicitPlay = false;
    let suppressPause = false;

    function filmShouldPlay() {
      return invitationOpen && filmVisible && !document.hidden && !filmUserPaused
        && (!motionIsPaused() || filmExplicitPlay) && !$('videoDialog')?.open;
    }

    function updateFilmControl() {
      const playing = !!film && !film.paused && !film.ended;
      const button = $('filmPlay');
      if (!button) return;
      button.setAttribute('aria-pressed', String(playing));
      button.setAttribute('aria-label', playing ? 'Jeda film foto' : 'Putar film foto');
      button.classList.toggle('is-playing', playing);
      button.querySelector('use')?.setAttribute('href', playing ? '#i-pause' : '#i-play');
      const label = button.querySelector('[data-film-label]');
      if (label) label.textContent = playing ? 'Jeda film' : 'Putar film';
    }

    function pauseFilm() {
      if (!film || film.paused) return;
      suppressPause = true;
      film.pause();
    }

    function synchronizeFilm() {
      if (filmShouldPlay()) safePlay(film, updateFilmControl);
      else pauseFilm();
      updateFilmControl();
    }

    if (film) {
      film.muted = true;
      film.autoplay = false;
      pauseFilm();
      film.addEventListener('play', () => {
        // Kontrol video bawaan juga merupakan keputusan putar pengguna.
        filmUserPaused = false;
        if (motionIsPaused()) filmExplicitPlay = true;
        updateFilmControl();
      });
      film.addEventListener('pause', () => {
        if (suppressPause) suppressPause = false;
        else if (filmShouldPlay()) filmUserPaused = true;
        updateFilmControl();
      });
      film.addEventListener('error', () => {
        updateFilmControl();
        const button = $('filmPlay');
        if (button) button.setAttribute('aria-label', 'Coba putar film foto kembali');
      });
      if ('IntersectionObserver' in window) {
        new IntersectionObserver((entries) => {
          filmVisible = entries[0].isIntersecting && entries[0].intersectionRatio >= 0.25;
          synchronizeFilm();
        }, { threshold: [0, 0.25] }).observe(film);
      } else {
        filmVisible = true;
      }
    }
    $('filmPlay')?.addEventListener('click', () => {
      if (!film) return;
      if (film.paused) {
        filmUserPaused = false;
        filmExplicitPlay = true;
        safePlay(film, () => toast('Film belum dapat diputar. Gunakan kontrol video atau coba kembali.'));
      } else {
        filmUserPaused = true;
        pauseFilm();
      }
      updateFilmControl();
    });

    function setupDialog(id, openerIds, closerId, onOpen, onClose) {
      const dialog = $(id);
      if (!dialog) return null;
      let returnFocus = null;
      const open = (opener) => {
        if (dialog.open) return;
        returnFocus = opener || document.activeElement;
        if (typeof dialog.showModal !== 'function') {
          toast('Perbarui browser untuk membuka tampilan ini.');
          return;
        }
        dialog.showModal();
        body.classList.add('dialog-open');
        scheduleSlide();
        if (onOpen) onOpen();
      };
      openerIds.forEach((openerId) => $(openerId)?.addEventListener('click', (event) => open(event.currentTarget)));
      $(closerId)?.addEventListener('click', () => dialog.close());
      dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
      });
      dialog.addEventListener('close', () => {
        if (!document.querySelector('dialog[open]')) body.classList.remove('dialog-open');
        const status = $('toast');
        if (status && dialog.contains(status)) {
          clearTimeout(toastTimer);
          status.classList.remove('is-visible');
          body.append(status);
        }
        if (onClose) onClose();
        if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
        scheduleSlide();
      });
      return { dialog, open };
    }

    setupDialog('videoDialog', ['originalVideo'], 'closeVideo', () => {
      musicBeforeVideo = !!soundtrack && !soundtrack.paused;
      soundtrack?.pause();
      pauseFilm();
      const frame = $('youtubeFrame');
      const id = /^[A-Za-z0-9_-]{11}$/.test(config.videoId || '') ? config.videoId : '';
      if (!id) return;
      if (frame) frame.src = `https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1&rel=0`;
    }, () => {
      $('youtubeFrame')?.removeAttribute('src');
      if (musicBeforeVideo && musicWanted) playMusic();
      musicBeforeVideo = false;
      synchronizeFilm();
    });

    const galleryButtons = [...document.querySelectorAll('[data-gallery-index]')];
    const galleryItems = galleryButtons.map((button) => {
      const image = button.querySelector('img');
      return { src: button.dataset.full || image?.currentSrc || image?.src || '', alt: image?.alt || 'Foto mempelai' };
    });
    let galleryIndex = 0;
    function showGalleryImage(index) {
      if (!galleryItems.length) return;
      galleryIndex = (index + galleryItems.length) % galleryItems.length;
      const image = $('lightboxImage');
      if (image) {
        image.classList.remove('image-changing');
        image.src = galleryItems[galleryIndex].src;
        image.alt = galleryItems[galleryIndex].alt;
        if (!motionIsPaused()) {
          void image.offsetWidth;
          image.classList.add('image-changing');
        }
      }
      setText('galleryCounter', `${String(galleryIndex + 1).padStart(2, '0')} / ${String(galleryItems.length).padStart(2, '0')}`);
    }
    const gallery = setupDialog('galleryDialog', [], 'closeGallery');
    galleryButtons.forEach((button, index) => button.addEventListener('click', () => {
      showGalleryImage(index);
      gallery?.open(button);
    }));
    $('galleryPrev')?.addEventListener('click', () => showGalleryImage(galleryIndex - 1));
    $('galleryNext')?.addEventListener('click', () => showGalleryImage(galleryIndex + 1));
    gallery?.dialog.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        showGalleryImage(galleryIndex + (event.key === 'ArrowRight' ? 1 : -1));
      }
    });
    enableSwipe($('lightboxImage'), () => showGalleryImage(galleryIndex + 1), () => showGalleryImage(galleryIndex - 1));
    setupDialog('giftDialog', ['showGift'], 'closeGift');

    document.querySelectorAll('[data-copy]').forEach((button) => button.addEventListener('click', async () => {
      const text = button.dataset.copy || '';
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(text);
        toast('Nomor rekening berhasil disalin.');
      } catch (_) {
        const candidate = button.closest('[data-account],.bank-card')?.querySelector('[data-account-number],.account-number');
        if (candidate && window.getSelection) {
          const range = document.createRange();
          range.selectNodeContents(candidate);
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        }
        toast(`Salin secara manual: ${text}`);
      }
    }));

    // Tanggal asli dipertahankan. Waktu yang sudah lewat tidak dihitung negatif.
    function downloadFile(filename, content, type) {
      try {
        const url = URL.createObjectURL(new Blob([content], { type }));
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      } catch (_) {
        toast('Unduhan belum dapat dibuat. Coba gunakan browser lain.');
      }
    }

    // Reveal diulang setelah elemen benar-benar keluar, bukan saat masih dibaca.
    const revealElements = [...document.querySelectorAll('.reveal')];
    let revealObserver;
    if ('IntersectionObserver' in window) {
      revealObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
        const active = document.activeElement;
        if (motionIsPaused() || (active && entry.target.contains(active))) {
          entry.target.classList.add('is-visible');
          return;
        }
        if (entry.isIntersecting && entry.intersectionRatio >= 0.08) {
          entry.target.classList.add('is-visible');
        } else if (!entry.isIntersecting) {
          const rect = entry.boundingClientRect || entry.target.getBoundingClientRect();
          if (rect.bottom < -90 || rect.top > (window.innerHeight || 800) + 90) {
            entry.target.classList.remove('is-visible');
          }
        }
      }), { threshold: [0, 0.08, 0.2], rootMargin: '100px 0px 100px 0px' });
      revealElements.forEach((element) => revealObserver.observe(element));
    } else revealElements.forEach((element) => element.classList.add('is-visible'));

    // Satu rAF per frame; posisi baca dan parallax tidak memakai loop tak terbatas.
    const parallaxElements = [...document.querySelectorAll('[data-parallax]')];
    let scrollFrame = 0;
    function updateScrollMotion() {
      scrollFrame = 0;
      const doc = document.documentElement;
      const height = Math.max(0, (doc?.scrollHeight || 0) - (window.innerHeight || 0));
      const y = window.scrollY || doc?.scrollTop || 0;
      const progress = $('readingProgress');
      if (progress) progress.style.transform = `scaleX(${height ? Math.min(1, Math.max(0, y / height)) : 0})`;
      parallaxElements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        const viewport = window.innerHeight || 800;
        const offset = motionIsPaused() ? 0 : Math.max(-35, Math.min(35, (viewport / 2 - rect.top - rect.height / 2) * 0.075));
        element.style.setProperty('--parallax-y', `${Number.isFinite(offset) ? offset : 0}px`);
      });
    }
    function queueScrollMotion() {
      if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScrollMotion);
    }
    window.addEventListener('scroll', queueScrollMotion, { passive: true });
    window.addEventListener('resize', queueScrollMotion, { passive: true });

    function synchronizeMotion() {
      const paused = motionIsPaused();
      body.dataset.motion = paused ? 'off' : 'on';
      body.classList.toggle('motion-paused', paused);
      const button = $('motionToggle');
      if (button) {
        button.setAttribute('aria-pressed', String(paused));
        button.setAttribute('aria-label', paused ? 'Aktifkan animasi' : 'Jeda animasi');
      }
      setText('motionLabel', paused ? 'Aktifkan animasi' : 'Jeda animasi');
      if (paused) {
        filmExplicitPlay = false;
        const opening = $('openingScene');
        if (opening) { opening.hidden = true; opening.classList.remove('play'); }
        body.classList.remove('is-opening');
        revealElements.forEach((element) => element.classList.add('is-visible'));
      }
      updateSliderControl();
      scheduleSlide();
      synchronizeFilm();
      updateScrollMotion();
    }
    $('motionToggle')?.addEventListener('click', () => {
      motionOverride = !motionIsPaused();
      synchronizeMotion();
    });
    if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', synchronizeMotion);
    else if (reducedMotion.addListener) reducedMotion.addListener(synchronizeMotion);

    $('openInvitation')?.addEventListener('click', () => {
      if (invitationOpen) return;
      invitationOpen = true;
      const openButton = $('openInvitation');
      if (openButton) openButton.disabled = true;
      if (!musicUserDecided) musicWanted = true;
      playMusic(); // Tetap sinkron dengan gesture pembuka untuk izin audio.
      const scene = $('openingScene');
      const animateOpening = !motionIsPaused() && !!scene;
      if (animateOpening) {
        scene.hidden = false;
        body.classList.add('is-opening');
        requestAnimationFrame(() => scene.classList.add('play'));
      }
      body.dataset.open = 'true';
      body.classList.add('opened');
      const invitation = $('invitation');
      const navigation = $('bottomNav');
      if (invitation) { invitation.inert = false; invitation.removeAttribute('inert'); }
      if (navigation) { navigation.inert = false; navigation.removeAttribute('inert'); }
      if ($('exploreLink')) $('exploreLink').hidden = false;
      $('heroTitle')?.focus({ preventScroll: true });
      const details = $('coverDetails');
      if (details) {
        details.classList.add('is-leaving');
        setTimeout(() => { details.hidden = true; }, motionIsPaused() ? 0 : 700);
      }
      if (animateOpening) {
        let movedByUser = false;
        const cancelTravel = () => { movedByUser = true; };
        window.addEventListener('wheel', cancelTravel, { passive: true, once: true });
        window.addEventListener('touchstart', cancelTravel, { passive: true, once: true });
        window.addEventListener('keydown', cancelTravel, { once: true });
        setTimeout(() => {
          scene.hidden = true;
          scene.classList.remove('play');
          body.classList.remove('is-opening');
          body.classList.add('opening-complete');
          window.removeEventListener('wheel', cancelTravel);
          window.removeEventListener('touchstart', cancelTravel);
          window.removeEventListener('keydown', cancelTravel);
          if (!movedByUser && !motionIsPaused() && document.activeElement === $('heroTitle')) {
            $('chapterSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          scheduleSlide();
          updateScrollMotion();
        }, 2000);
      } else body.classList.add('opening-complete');
      scheduleSlide();
      synchronizeFilm();
      
      updateScrollMotion();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        musicBeforeHidden = !!soundtrack && !soundtrack.paused;
        soundtrack?.pause();
      } else if (musicBeforeHidden && musicWanted) {
        playMusic();
        musicBeforeHidden = false;
      }
      scheduleSlide();
      synchronizeFilm();
    });

    const navLinks = [...document.querySelectorAll('#bottomNav a[href^="#"]')];
    if ('IntersectionObserver' in window && navLinks.length) {
      const visibleSections = new Map();
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => visibleSections.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0));
        const active = [...visibleSections].sort((a, b) => b[1] - a[1])[0];
        if (!active || !active[1]) return;
        navLinks.forEach((link) => {
          const selected = link.hash === `#${active[0]}`;
          link.classList.toggle('is-active', selected);
          if (selected) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      }, { threshold: [0, 0.15, 0.4, 0.7], rootMargin: '-12% 0px -20% 0px' });
      navLinks.forEach((link) => { const target = document.getElementById(link.hash.slice(1)); if (target) observer.observe(target); });
    }

    body.classList.add('js-ready');
    synchronizeMotion();
    
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
