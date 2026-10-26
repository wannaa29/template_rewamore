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

    // Slider sinematik dengan kontrol keyboard dan alternatif swipe.
    const slider = $('heroSlider');
    const slides = [...document.querySelectorAll('.hero-slide')];
    const slideDuration = 6500;
    let slideIndex = 0;
    let slideTimer;
    let sliderPaused = false;
    let sliderHovered = false;
    let sliderFocused = false;
    const progress = $('slideProgress');
    if (progress) progress.style.setProperty('--slide-duration', `${slideDuration}ms`);

    function sliderCanRun() {
      return slides.length > 1 && !sliderPaused && !sliderHovered && !sliderFocused
        && !document.hidden && !motionIsPaused();
    }

    function updateSliderControl() {
      const paused = sliderPaused || motionIsPaused();
      const button = $('heroPause');
      if (!button) return;
      button.setAttribute('aria-label', paused ? 'Putar slider otomatis' : 'Jeda slider otomatis');
      button.setAttribute('aria-pressed', String(paused));
      button.classList.toggle('is-paused', paused);
      button.querySelector('use')?.setAttribute('href', paused ? '#i-play' : '#i-pause');
      button.title = motionIsPaused() ? 'Gerakan dinonaktifkan. Gunakan panah untuk mengganti foto.'
        : paused ? 'Putar slider otomatis' : 'Jeda slider otomatis';
    }

    function scheduleSlide() {
      clearTimeout(slideTimer);
      if (progress) {
        progress.classList.remove('is-running');
        void progress.offsetWidth;
      }
      if (!sliderCanRun()) return;
      progress?.classList.add('is-running');
      slideTimer = setTimeout(() => showSlide(slideIndex + 1), slideDuration);
    }

    function showSlide(index) {
      if (!slides.length) return;
      slideIndex = (index + slides.length) % slides.length;
      slides.forEach((slide, itemIndex) => {
        const active = itemIndex === slideIndex;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', String(!active));
      });
      setText('slideNumber', String(slideIndex + 1).padStart(2, '0'));
      setText('slideCaption', config.slides?.[slideIndex]?.caption || 'Sebuah kisah, selamanya');
      scheduleSlide();
    }

    $('heroPrev')?.addEventListener('click', () => showSlide(slideIndex - 1));
    $('heroNext')?.addEventListener('click', () => showSlide(slideIndex + 1));
    $('heroPause')?.addEventListener('click', () => {
      if (motionIsPaused()) {
        toast('Gerakan sedang dinonaktifkan. Foto tetap dapat diganti dengan tombol panah.');
        return;
      }
      sliderPaused = !sliderPaused;
      updateSliderControl();
      scheduleSlide();
    });
    if (slider) {
      slider.addEventListener('mouseenter', () => { sliderHovered = true; scheduleSlide(); });
      slider.addEventListener('mouseleave', () => { sliderHovered = false; scheduleSlide(); });
      slider.addEventListener('focusin', () => { sliderFocused = true; scheduleSlide(); });
      slider.addEventListener('focusout', (event) => {
        sliderFocused = !!event.relatedTarget && slider.contains(event.relatedTarget);
        scheduleSlide();
      });
      slider.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          showSlide(slideIndex + (event.key === 'ArrowRight' ? 1 : -1));
        }
      });
    }

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
    enableSwipe(slider, () => showSlide(slideIndex + 1), () => showSlide(slideIndex - 1));

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
        image.src = galleryItems[galleryIndex].src;
        image.alt = galleryItems[galleryIndex].alt;
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

    // Reveal ditambahkan secara progresif; konten tetap tersedia tanpa observer.
    const revealElements = [...document.querySelectorAll('.reveal')];
    let revealObserver;
    if ('IntersectionObserver' in window) {
      revealObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      }), { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });
      revealElements.forEach((element) => revealObserver.observe(element));
    } else revealElements.forEach((element) => element.classList.add('is-visible'));

    function synchronizeMotion() {
      const paused = motionIsPaused();
      body.classList.toggle('motion-paused', paused);
      const button = $('motionToggle');
      if (button) {
        button.setAttribute('aria-pressed', String(paused));
        button.setAttribute('aria-label', paused ? 'Aktifkan animasi' : 'Jeda animasi');
      }
      setText('motionLabel', paused ? 'Animasi nonaktif' : 'Animasi aktif');
      if (paused) {
        filmExplicitPlay = false;
        revealElements.forEach((element) => element.classList.add('is-visible'));
      }
      updateSliderControl();
      scheduleSlide();
      synchronizeFilm();
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
      if (!musicUserDecided) musicWanted = true;
      playMusic();
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
      synchronizeFilm();
      
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
    showSlide(0);
    synchronizeMotion();
    
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
