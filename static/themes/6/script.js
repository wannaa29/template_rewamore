/* Rewamore managed runtime v1 */
/* Ivory Nocturne · Vanilla JavaScript · No build step or external dependencies. */
'use strict';
(() => {
  document.documentElement.classList.add('js');
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const settings = {
    guest: window.RewamoreRuntime.guest || 'Tamu Undangan',
    sliderDelay: 6200,
    galleryDelay: 4800,
    scrollSpeed: 32, // Pixels per second. Change to 20 for slower reading.
    adatStart: '2026-09-25T09:00:00+07:00',
    adatEnd: '2026-09-26T23:59:59+07:00'
  };
  let motionPaused = reduced.matches;
  let autoScrolling = false, scrollFrame = 0, scrollLast = 0, scrollPosition = 0;
  let toastTimer;
  const notify = text => {
    $('#toast').textContent = text;
    $('#toast').classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 3500);
  };
  const guest = new URLSearchParams(location.search).get('to')?.trim().slice(0, 100) || settings.guest;
  $('#guestName').textContent = guest;
  const format = n => String(n).padStart(2, '0');
  const smooth = () => motionPaused || reduced.matches ? 'instant' : 'smooth';
  const hasDialog = () => !!$('dialog[open]');

  // Dialogs use native modal focus trapping and Escape dismissal.
  const dialogOpeners = new WeakMap();
  function openDialog(dialog, opener = document.activeElement) {
    stopAuto();
    dialogOpeners.set(dialog, opener);
    dialog.showModal();
    document.body.classList.add('modal-open');
    resetHeroClock();
  }
  $$('dialog').forEach(dialog => {
    $$('[data-close]', dialog).forEach(button => button.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => {
      if (!hasDialog()) document.body.classList.remove('modal-open');
      $('#menuToggle').setAttribute('aria-expanded', 'false');
      dialogOpeners.get(dialog)?.focus({preventScroll: true});
      resetHeroClock();
    });
  });
  $('#menuToggle').addEventListener('click', () => {
    $('#menuToggle').setAttribute('aria-expanded', 'true');
    openDialog($('#menuDialog'));
  });
  $$('#menuDialog nav a').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    const target = $(link.getAttribute('href'));
    $('#menuDialog').close();
    requestAnimationFrame(() => {
      target.setAttribute('tabindex', '-1');
      target.focus({preventScroll: true});
      target.scrollIntoView({behavior:smooth()});
    });
  }));
  $('#showGift').addEventListener('click', () => openDialog($('#giftDialog')));

  // Hero: directional mask reveal + slow Ken Burns; automatic timing is paused
  // offscreen, in dialogs, while focused, in hidden tabs, and in reduced motion.
  const slides = $$('.hero-slide');
  const hero = $('#heroSlider');
  let heroIndex = 0, heroPaused = false, heroVisible = true, heroElapsed = 0, heroPrevious = performance.now();
  let transitionTimer;
  function resetHeroClock() { heroElapsed = 0; heroPrevious = performance.now(); }
  function changeHero(direction) {
    const previous = heroIndex;
    heroIndex = (heroIndex + direction + slides.length) % slides.length;
    clearTimeout(transitionTimer);
    slides.forEach((slide, i) => {
      slide.classList.remove('leaving');
      slide.classList.toggle('active', i === heroIndex);
      slide.setAttribute('aria-hidden', String(i !== heroIndex));
    });
    slides[previous].classList.add('leaving');
    transitionTimer = setTimeout(() => slides[previous].classList.remove('leaving'), motionPaused ? 0 : 1800);
    $('#heroCount').textContent = `${format(heroIndex + 1)} / ${format(slides.length)}`;
    resetHeroClock();
  }
  slides.forEach((slide, i) => slide.setAttribute('aria-hidden', String(i !== 0)));
  $('#heroPrev').addEventListener('click', () => changeHero(-1));
  $('#heroNext').addEventListener('click', () => changeHero(1));
  $('#heroPause').addEventListener('click', () => {
    heroPaused = !heroPaused;
    $('#heroPause').setAttribute('aria-pressed', String(heroPaused));
    $('#heroPause').setAttribute('aria-label', heroPaused ? 'Putar slider pembuka' : 'Jeda slider pembuka');
    $('#heroPause').textContent = heroPaused ? '▷' : 'Ⅱ';
    resetHeroClock();
  });
  hero.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); changeHero(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  function swipe(element, callback) {
    let origin = null;
    element.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') origin = {x:e.clientX, y:e.clientY}; });
    element.addEventListener('pointerup', e => {
      if (!origin) return;
      const dx = e.clientX - origin.x, dy = e.clientY - origin.y;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) callback(dx < 0 ? 1 : -1);
      origin = null;
    });
    element.addEventListener('pointercancel', () => { origin = null; });
  }
  swipe(hero, changeHero);
  new IntersectionObserver(entries => {heroVisible = entries[0].isIntersecting; resetHeroClock();}, {threshold:.15}).observe(hero);
  setInterval(() => {
    const now = performance.now(), dt = Math.min(now - heroPrevious, 250);
    heroPrevious = now;
    const focused = $('#beranda').contains(document.activeElement) && document.activeElement?.matches('button, [tabindex]');
    if (heroPaused || motionPaused || !heroVisible || document.hidden || hasDialog() || focused) return;
    heroElapsed += dt;
    if (heroElapsed >= settings.sliderDelay) changeHero(1);
  }, 150);

  // Horizontal photo gallery with scroll snap, touch gestures and lightbox.
  const track = $('#galleryTrack'), photos = $$('.gallery-photo');
  let galleryIndex = 0, lightIndex = 0, galleryPlaying = false, galleryVisible = false, galleryElapsed = 0;
  function galleryGo(index) {
    galleryIndex = (index + photos.length) % photos.length;
    const item = photos[galleryIndex];
    track.scrollTo({left: item.offsetLeft - parseFloat(getComputedStyle(track).paddingLeft), behavior:smooth()});
    galleryElapsed = 0;
  }
  $('#galleryPrev').addEventListener('click', () => galleryGo(galleryIndex - 1));
  $('#galleryNext').addEventListener('click', () => galleryGo(galleryIndex + 1));
  let scrollQueued = false;
  track.addEventListener('scroll', () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      const center = track.scrollLeft + parseFloat(getComputedStyle(track).paddingLeft);
      let nearest = Infinity;
      photos.forEach((p, i) => { const distance = Math.abs(p.offsetLeft - center); if (distance < nearest) {nearest = distance; galleryIndex = i;} });
      $('#galleryCount').textContent = `${format(galleryIndex+1)} / ${format(photos.length)}`;
      scrollQueued = false;
    });
  }, {passive:true});
  track.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); galleryGo(galleryIndex + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });
  function galleryPlay(value) {
    galleryPlaying = value;
    $('#galleryAuto').setAttribute('aria-pressed', String(value));
    $('#galleryAuto').textContent = value ? 'Jeda galeri Ⅱ' : 'Putar galeri ▷';
    galleryElapsed = 0;
  }
  $('#galleryAuto').addEventListener('click', () => {
    if (motionPaused) {notify('Aktifkan animasi untuk memutar galeri otomatis.'); return;}
    galleryPlay(!galleryPlaying);
  });
  track.addEventListener('pointerdown', () => galleryPlay(false));
  new IntersectionObserver(entries => {galleryVisible = entries[0].isIntersecting;}, {threshold:.15}).observe(track);
  setInterval(() => {
    if (!galleryPlaying || !galleryVisible || motionPaused || document.hidden || hasDialog() || track.contains(document.activeElement)) return;
    galleryElapsed += 200;
    if (galleryElapsed >= settings.galleryDelay) galleryGo(galleryIndex + 1);
  }, 200);
  function showPhoto(index) {
    lightIndex = (index + photos.length) % photos.length;
    const source = $('img', photos[lightIndex]);
    $('#lightboxImage').src = source.src;
    $('#lightboxImage').alt = source.alt;
    $('#lightCount').textContent = `${format(lightIndex + 1)} / ${format(photos.length)}`;
    if (!motionPaused && !reduced.matches) $('#lightboxImage').animate([{opacity:.2, transform:'scale(.98)'},{opacity:1,transform:'scale(1)'}], {duration:400,easing:'ease-out'});
  }
  photos.forEach((photo,i) => photo.addEventListener('click', () => { showPhoto(i); openDialog($('#lightbox')); }));
  $('#lightPrev').addEventListener('click', () => showPhoto(lightIndex - 1));
  $('#lightNext').addEventListener('click', () => showPhoto(lightIndex + 1));
  $('#lightbox').addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {e.preventDefault();showPhoto(lightIndex + (e.key === 'ArrowLeft' ? -1 : 1));}
  });
  swipe($('#lightboxImage'), direction => showPhoto(lightIndex + direction));

  // Autoscroll never fights a visitor: manual input, a dialog, hidden tab,
  // form focus or reaching the page end stops it. Resuming is explicit.
  function stopAuto() {
    autoScrolling = false; cancelAnimationFrame(scrollFrame); scrollLast = 0;
    $('#autoScroll').setAttribute('aria-pressed', 'false');
    $('#autoLabel').textContent = 'Autoscroll'; $('#autoIcon').textContent = '↓';
  }
  function scrollStep(now) {
    if (!autoScrolling) return;
    if (!scrollLast) scrollLast = now;
    scrollPosition += settings.scrollSpeed * Math.min(now-scrollLast, 64) / 1000;
    scrollLast = now;
    window.scrollTo({top:scrollPosition,behavior:'instant'});
    if (scrollY + innerHeight >= document.documentElement.scrollHeight - 3) {stopAuto(); notify('Anda telah sampai di akhir undangan.'); return;}
    scrollFrame = requestAnimationFrame(scrollStep);
  }
  $('#autoScroll').addEventListener('click', () => {
    if (autoScrolling) return stopAuto();
    if (scrollY + innerHeight >= document.documentElement.scrollHeight - 3) {notify('Kembali ke atas untuk mulai membaca lagi.');return;}
    autoScrolling = true; scrollPosition = scrollY; scrollLast = 0;
    $('#autoScroll').setAttribute('aria-pressed','true');$('#autoLabel').textContent='Jeda scroll';$('#autoIcon').textContent='Ⅱ';
    scrollFrame = requestAnimationFrame(scrollStep);
  });
  window.addEventListener('wheel', stopAuto, {passive:true});
  window.addEventListener('touchstart', e => {if (!e.target.closest('#autoScroll')) stopAuto();}, {passive:true});
  document.addEventListener('pointerdown', e => {if (!e.target.closest('#autoScroll')) stopAuto();}, {passive:true});
  document.addEventListener('keydown', e => {if (['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' ','Tab','Escape'].includes(e.key)) stopAuto();});
  document.addEventListener('focusin', e => {if (e.target.matches('input,textarea,select,video')) stopAuto();});
  document.addEventListener('visibilitychange', () => { if(document.hidden) stopAuto(); resetHeroClock(); });

  // Audio is opt-in via a direct click. Video playback pauses background music.
  const audio = $('#soundtrack'), film = $('#memoryFilm');
  function musicState() {
    const playing = !audio.paused;
    $('#musicToggle').setAttribute('aria-pressed',String(playing));
    $('#musicToggle').setAttribute('aria-label',playing ? 'Jeda musik' : 'Putar musik');
  }
  async function playMusic() {
    try {await audio.play();} catch {notify('Musik belum dapat diputar. Ketuk tombol musik untuk mencoba lagi.');}
    musicState();
  }
  $('#musicToggle').addEventListener('click', () => {if(audio.paused){film.pause();playMusic();}else audio.pause();});
  audio.addEventListener('play',musicState);audio.addEventListener('pause',musicState);
  film.addEventListener('play', () => {audio.pause();stopAuto();});
  $('#openInvitation').addEventListener('click', () => {
    playMusic(); $('#cerita').scrollIntoView({behavior:smooth()});
    $('#openInvitation').innerHTML='Jelajahi undangan <span>↗</span>';
  });

  function syncMotion() {
    document.documentElement.classList.toggle('motion-paused',motionPaused);
    $('#motionToggle').setAttribute('aria-pressed',String(motionPaused));
    $('#motionToggle').setAttribute('aria-label',motionPaused ? 'Aktifkan animasi' : 'Jeda animasi');
    $('#motionLabel').textContent=motionPaused ? 'Animasi dijeda' : 'Animasi';
    if (motionPaused) {galleryPlay(false);stopAuto();film.pause();}
    resetHeroClock();
  }
  $('#motionToggle').addEventListener('click', () => {motionPaused=!motionPaused;syncMotion();});
  reduced.addEventListener('change', e => {motionPaused=e.matches;syncMotion();});
  syncMotion();
  const reveals = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) {entry.target.classList.add('visible');reveals.unobserve(entry.target);}
  }), {threshold:.09});
  $$('.reveal').forEach(element => reveals.observe(element));
  let pageTick = false;
  function pageState() {
    const max = document.documentElement.scrollHeight - innerHeight;
    $('.page-progress span').style.transform=`scaleX(${max>0 ? scrollY/max : 0})`;
    $('.masthead').classList.toggle('scrolled',scrollY>40);
    pageTick=false;
  }
  window.addEventListener('scroll', () => {if(!pageTick){pageTick=true;requestAnimationFrame(pageState);}}, {passive:true});
  window.addEventListener('resize',pageState); pageState();

  function download(text,name,type='text/plain;charset=utf-8') {
    const url=URL.createObjectURL(new Blob([text],{type})), link=document.createElement('a');
    link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
  }
  $$('[data-copy]').forEach(button=>button.addEventListener('click',async()=>{
    const value=button.dataset.copy;
    try {await navigator.clipboard.writeText(value);button.textContent='Nomor tersalin ✓';setTimeout(()=>button.textContent='Salin nomor rekening ↗',2500);}
    catch {const field=document.createElement('textarea');field.value=value;button.after(field);field.select();let copied=false;try{copied=document.execCommand('copy');}catch{}if(copied){field.remove();button.textContent='Nomor tersalin ✓';}else{button.textContent='Pilih dan salin nomor di bawah';field.focus();}}
  }));
})();
