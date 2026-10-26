/* Rewamore managed runtime v1 */
/* NOIR ATELIER · Cinematic revision · Local assets, no framework or CDN. */
'use strict';
(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const html = document.documentElement;
  html.classList.add('js');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const settings = {
    guest: window.RewamoreRuntime.guest || 'Tamu Undangan',
    sliderDelay: 5600,
    galleryDelay: 4500,
    transitionDuration: 1650,
    scrollSpeed: 30,
    musicVolume: .65,
    adatStart: '2026-09-25T09:00:00+07:00',
    adatEnd: '2026-09-26T23:59:59+07:00'
  };
  let motionPaused = reduced.matches, experienceOpen = false;
  let autoScrolling = false, scrollFrame = 0, scrollLast = 0, scrollPosition = 0;
  let toastTimer;
  const format = n => String(n).padStart(2, '0');
  const smooth = () => motionPaused || reduced.matches ? 'instant' : 'smooth';
  const hasDialog = () => !!$('dialog[open]');
  function notify(text) {
    $('#toast').textContent = text;
    $('#toast').classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 3300);
  }
  $('#guestName').textContent = new URLSearchParams(location.search).get('to')?.trim().slice(0, 100) || settings.guest;

  // Audible autoplay is requested on load. If the browser denies it, retry
  // within the first real gesture. A deliberate mute is always respected.
  const audio = $('#soundtrack'), film = $('#memoryFilm');
  let userMuted = false, needsAudioGesture = true;
  audio.volume = settings.musicVolume;
  function musicState() {
    const playing = !audio.paused;
    $('#musicToggle').setAttribute('aria-pressed', String(playing));
    $('#musicToggle').setAttribute('aria-label', playing ? 'Jeda musik' : 'Putar musik');
    $('#musicToggle').title = playing ? 'Jeda musik' : 'Putar musik';
    $('#musicLabel').textContent = playing ? 'Jeda musik' : 'Putar musik';
  }
  async function playMusic(quiet = true) {
    if (userMuted || !film.paused) return;
    try {
      await audio.play();
      if (userMuted) audio.pause();
      else needsAudioGesture = false;
    } catch {
      needsAudioGesture = !userMuted;
      if (!quiet) notify('Musik belum dapat diputar. Ketuk tombol musik untuk mencoba lagi.');
    }
    musicState();
  }
  const unlockAudio = event => {
    if (event.target.closest('#musicToggle, video')) return;
    if (needsAudioGesture && !userMuted && film.paused) playMusic();
  };
  document.addEventListener('pointerdown', unlockAudio, {passive:true});
  document.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') unlockAudio(event);
  });
  $('#musicToggle').addEventListener('click', () => {
    if (audio.paused) {userMuted=false; film.pause(); playMusic(false);}
    else {userMuted=true; needsAudioGesture=false; audio.pause();}
  });
  audio.addEventListener('play', musicState);
  audio.addEventListener('pause', musicState);
  film.addEventListener('play', () => {audio.pause(); needsAudioGesture=false; stopAuto();});

  // Reusable cinema engine. Overlapping requests queue one final direction;
  // outgoing frames stay visible until the incoming mask fully reveals.
  const carousels = [];
  function resetHeroClock() {carousels.forEach(c => c.reset());}
  function swipe(element, callback) {
    let origin = null;
    element.addEventListener('pointerdown', e => {if (e.pointerType !== 'mouse') origin={x:e.clientX,y:e.clientY};});
    element.addEventListener('pointerup', e => {
      if (!origin) return;
      const dx=e.clientX-origin.x, dy=e.clientY-origin.y;
      if (Math.abs(dx)>45 && Math.abs(dx)>Math.abs(dy)*1.3) callback(dx<0 ? 1 : -1);
      origin=null;
    });
    element.addEventListener('pointercancel', () => {origin=null;});
  }
  function createCinema(root, prefix, delay) {
    const slides=$$('.cinema-slide',root), counter=$(`#${prefix}Count`), pause=$(`#${prefix}Pause`);
    const progress=$(`#${prefix}Progress`);
    let index=0, paused=false, visible=false, elapsed=0, sequence=0, running=null, queued=0;
    const reset=()=>{elapsed=0; if(progress)progress.style.transform='scaleX(0)';};
    slides.forEach((slide,i)=>slide.setAttribute('aria-hidden',String(i!==0)));
    function change(direction) {
      if(running){queued=direction;return;}
      const previous=slides[index];
      index=(index+direction+slides.length)%slides.length;
      const next=slides[index];
      slides.forEach(slide=>{
        slide.classList.toggle('active',slide===next);
        slide.classList.toggle('leaving',slide===previous);
        slide.setAttribute('aria-hidden',String(slide!==next));
      });
      counter.textContent=`${format(index+1)} / ${format(slides.length)}`;
      reset();
      if(motionPaused || reduced.matches || !next.animate){previous.classList.remove('leaving');return;}
      const variant=sequence++%3, d=direction>0 ? 1 : -1;
      const from=variant===0
        ? {clipPath:d>0?'inset(0 0 0 100%)':'inset(0 100% 0 0)',transform:`translateX(${d*8}%) scale(1.05)`}
        : variant===1
          ? {clipPath:'inset(0 50% 0 50%)',transform:'scale(1.16)'}
          : {clipPath:'inset(12% 10% 12% 10%)',transform:'scale(1.18)',opacity:0};
      const ticket={animations:[], finish:null};
      running=ticket;
      ticket.finish=()=>{
        if(running!==ticket)return;
        previous.classList.remove('leaving');
        ticket.animations.forEach(animation=>animation.cancel());
        running=null;reset();
        if(queued){const direction=queued;queued=0;change(direction);}
      };
      ticket.animations=[
        next.animate([from,{clipPath:'inset(0 0 0 0)',transform:'translateX(0) scale(1)',opacity:1}],{duration:settings.transitionDuration,easing:'cubic-bezier(.19,1,.22,1)',fill:'both'}),
        previous.animate([{transform:'translateX(0) scale(1)',opacity:1},{transform:`translateX(${-d*5}%) scale(1.035)`,opacity:.65}],{duration:settings.transitionDuration,easing:'cubic-bezier(.19,1,.22,1)',fill:'both'})
      ];
      Promise.all(ticket.animations.map(a=>a.finished)).then(ticket.finish).catch(()=>{});
    }
    $(`#${prefix}Prev`).addEventListener('click',()=>change(-1));
    $(`#${prefix}Next`).addEventListener('click',()=>change(1));
    pause.addEventListener('click',()=>{
      paused=!paused;
      pause.setAttribute('aria-pressed',String(paused));
      pause.setAttribute('aria-label',`${paused?'Putar':'Jeda'} slider ${prefix==='hero'?'pembuka':'janji'}`);
      $('use',pause).setAttribute('href',paused?'#i-play':'#i-pause');reset();
    });
    root.addEventListener('keydown',e=>{
      if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();change(e.key==='ArrowLeft'?-1:1);}
    });
    swipe(root,change);
    new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;reset();},{threshold:.15}).observe(root);
    return {
      reset,
      settle(){queued=0;running?.finish();},
      tick(dt){
        const keyboardFocus=root.contains(document.activeElement);
        if(!experienceOpen||paused||motionPaused||!visible||document.hidden||hasDialog()||keyboardFocus||running)return;
        elapsed+=dt;
        if(progress)progress.style.transform=`scaleX(${Math.min(elapsed/delay,1)})`;
        if(elapsed>=delay)change(1);
      }
    };
  }
  carousels.push(createCinema($('#heroSlider'),'hero',settings.sliderDelay));
  carousels.push(createCinema($('#storySlider'),'story',settings.sliderDelay+850));
  let clockPrevious=performance.now();
  setInterval(()=>{
    const now=performance.now(),dt=Math.min(now-clockPrevious,250);clockPrevious=now;
    carousels.forEach(carousel=>carousel.tick(dt));
  },100);

  // Native modal focus trapping, with a short curtain exit on the menu.
  const dialogOpeners=new WeakMap();
  function openDialog(dialog,opener=document.activeElement){
    stopAuto();dialogOpeners.set(dialog,opener);
    dialog.classList.remove('is-closing');dialog.showModal();
    document.body.classList.add('modal-open');resetHeroClock();
  }
  function closeDialog(dialog,after){
    if(dialog.classList.contains('is-closing'))return;
    const finish=()=>{dialog.close();dialog.classList.remove('is-closing');if(after)requestAnimationFrame(after);};
    if(dialog.id==='menuDialog'&&!motionPaused&&!reduced.matches){dialog.classList.add('is-closing');setTimeout(finish,450);}
    else finish();
  }
  $$('dialog:not(#openingDialog)').forEach(dialog=>{
    $$('[data-close]',dialog).forEach(button=>button.addEventListener('click',()=>closeDialog(dialog)));
    dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog(dialog);});
    dialog.addEventListener('click',event=>{
      if(event.target!==dialog)return;
      const box=dialog.getBoundingClientRect();
      if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)closeDialog(dialog);
    });
    dialog.addEventListener('close',()=>{
      if(!hasDialog())document.body.classList.remove('modal-open');
      if(dialog.id==='menuDialog')$('#menuToggle').setAttribute('aria-expanded','false');
      dialogOpeners.get(dialog)?.focus({preventScroll:true});resetHeroClock();
    });
  });
  $('#menuToggle').addEventListener('click',()=>{$('#menuToggle').setAttribute('aria-expanded','true');openDialog($('#menuDialog'));});
  $$('#menuDialog nav a').forEach(link=>link.addEventListener('click',event=>{
    event.preventDefault();const target=$(link.getAttribute('href'));
    closeDialog($('#menuDialog'),()=>{target.setAttribute('tabindex','-1');target.focus({preventScroll:true});target.scrollIntoView({behavior:smooth()});});
  }));
  $('#showGift').addEventListener('click',()=>openDialog($('#giftDialog')));

  // Photo album: native swipe + desktop drag, snap points and a lightbox.
  const track=$('#galleryTrack'),photos=$$('.gallery-photo');
  let galleryIndex=0,lightIndex=0,galleryPlaying=false,galleryVisible=false,galleryElapsed=0;
  let galleryDrag=null,suppressPhotoClick=false;
  function galleryGo(index){
    galleryIndex=(index+photos.length)%photos.length;
    const item=photos[galleryIndex];
    track.scrollTo({left:item.offsetLeft-parseFloat(getComputedStyle(track).paddingLeft),behavior:smooth()});galleryElapsed=0;
  }
  $('#galleryPrev').addEventListener('click',()=>galleryGo(galleryIndex-1));
  $('#galleryNext').addEventListener('click',()=>galleryGo(galleryIndex+1));
  let galleryTick=false;
  track.addEventListener('scroll',()=>{
    if(galleryTick)return;galleryTick=true;
    requestAnimationFrame(()=>{
      const point=track.scrollLeft+parseFloat(getComputedStyle(track).paddingLeft);let nearest=Infinity;
      photos.forEach((photo,i)=>{const distance=Math.abs(photo.offsetLeft-point);if(distance<nearest){nearest=distance;galleryIndex=i;}});
      $('#galleryCount').textContent=`${format(galleryIndex+1)} / ${format(photos.length)}`;galleryTick=false;
    });
  },{passive:true});
  track.addEventListener('keydown',event=>{
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();galleryGo(galleryIndex+(event.key==='ArrowLeft'?-1:1));}
  });
  function galleryPlay(value){
    galleryPlaying=value;$('#galleryAuto').setAttribute('aria-pressed',String(value));
    $('#galleryAuto').textContent=value?'Jeda galeri Ⅱ':'Putar galeri ▷';galleryElapsed=0;
  }
  $('#galleryAuto').addEventListener('click',()=>{
    if(motionPaused){notify('Aktifkan animasi untuk memutar galeri otomatis.');return;}
    galleryPlay(!galleryPlaying);
  });
  track.addEventListener('pointerdown',event=>{
    galleryPlay(false);suppressPhotoClick=false;
    if(event.pointerType==='mouse'&&event.button===0)galleryDrag={x:event.clientX,scroll:track.scrollLeft};
  });
  window.addEventListener('pointermove',event=>{
    if(!galleryDrag)return;
    const distance=event.clientX-galleryDrag.x;
    if(Math.abs(distance)>7){suppressPhotoClick=true;track.classList.add('dragging');track.scrollLeft=galleryDrag.scroll-distance;}
  });
  const endDrag=()=>{if(!galleryDrag)return;galleryDrag=null;track.classList.remove('dragging');setTimeout(()=>{suppressPhotoClick=false;},0);};
  window.addEventListener('pointerup',endDrag);window.addEventListener('pointercancel',endDrag);
  track.addEventListener('dragstart',e=>e.preventDefault());
  new IntersectionObserver(entries=>{galleryVisible=entries[0].isIntersecting;},{threshold:.15}).observe(track);
  setInterval(()=>{
    if(!galleryPlaying||!galleryVisible||motionPaused||document.hidden||hasDialog()||track.contains(document.activeElement))return;
    galleryElapsed+=200;if(galleryElapsed>=settings.galleryDelay)galleryGo(galleryIndex+1);
  },200);
  let lightAnimation=null;
  function showPhoto(index){
    lightIndex=(index+photos.length)%photos.length;
    const source=$('img',photos[lightIndex]),image=$('#lightboxImage');
    image.src=source.src;image.alt=source.alt;
    $('#lightCount').textContent=`${format(lightIndex+1)} / ${format(photos.length)}`;
    lightAnimation?.cancel();
    if(!motionPaused&&!reduced.matches)lightAnimation=image.animate([{opacity:.1,transform:'translateX(20px) scale(.98)'},{opacity:1,transform:'translateX(0) scale(1)'}],{duration:550,easing:'cubic-bezier(.19,1,.22,1)'});
  }
  photos.forEach((photo,i)=>photo.addEventListener('click',event=>{if(suppressPhotoClick){event.preventDefault();return;}showPhoto(i);openDialog($('#lightbox'));}));
  $('#lightPrev').addEventListener('click',()=>showPhoto(lightIndex-1));
  $('#lightNext').addEventListener('click',()=>showPhoto(lightIndex+1));
  $('#lightbox').addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();showPhoto(lightIndex+(e.key==='ArrowLeft'?-1:1));}});
  swipe($('#lightboxImage'),direction=>showPhoto(lightIndex+direction));

  // Vertical micro controls. Autoscroll cancels on deliberate user input.
  function stopAuto(){
    autoScrolling=false;cancelAnimationFrame(scrollFrame);scrollLast=0;
    $('#autoScroll').setAttribute('aria-pressed','false');$('#autoScroll').setAttribute('aria-label','Mulai autoscroll');
    $('#autoScroll').title='Mulai autoscroll';$('#autoLabel').textContent='Autoscroll';$('#autoGlyph').setAttribute('href','#i-scroll');
  }
  function scrollStep(now){
    if(!autoScrolling)return;
    if(!scrollLast)scrollLast=now;
    scrollPosition+=settings.scrollSpeed*Math.min(now-scrollLast,64)/1000;scrollLast=now;
    window.scrollTo({top:scrollPosition,behavior:'instant'});
    if(scrollY+innerHeight>=html.scrollHeight-3){stopAuto();notify('Anda telah sampai di akhir undangan.');return;}
    scrollFrame=requestAnimationFrame(scrollStep);
  }
  $('#autoScroll').addEventListener('click',()=>{
    if(autoScrolling)return stopAuto();
    if(scrollY+innerHeight>=html.scrollHeight-3){notify('Kembali ke atas untuk mulai membaca lagi.');return;}
    autoScrolling=true;scrollPosition=scrollY;scrollLast=0;
    $('#autoScroll').setAttribute('aria-pressed','true');$('#autoScroll').setAttribute('aria-label','Jeda autoscroll');
    $('#autoScroll').title='Jeda autoscroll';$('#autoLabel').textContent='Jeda scroll';$('#autoGlyph').setAttribute('href','#i-pause');
    scrollFrame=requestAnimationFrame(scrollStep);
  });
  window.addEventListener('wheel',stopAuto,{passive:true});
  window.addEventListener('touchstart',e=>{if(!e.target.closest('#autoScroll'))stopAuto();},{passive:true});
  document.addEventListener('pointerdown',e=>{if(!e.target.closest('#autoScroll'))stopAuto();},{passive:true});
  document.addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' ','Tab','Escape'].includes(e.key))stopAuto();});
  document.addEventListener('focusin',e=>{if(e.target.matches('input,textarea,select,video'))stopAuto();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stopAuto();carousels.forEach(c=>c.settle());}resetHeroClock();});

  function syncMotion(){
    html.classList.toggle('motion-paused',motionPaused);
    $('#motionToggle').setAttribute('aria-pressed',String(motionPaused));
    const label=motionPaused?'Aktifkan animasi':'Jeda animasi';
    $('#motionToggle').setAttribute('aria-label',label);$('#motionToggle').title=label;$('#motionLabel').textContent=label;
    if(motionPaused){galleryPlay(false);stopAuto();film.pause();carousels.forEach(c=>c.settle());lightAnimation?.cancel();}
    resetHeroClock();
  }
  $('#motionToggle').addEventListener('click',()=>{motionPaused=!motionPaused;syncMotion();});
  reduced.addEventListener('change',e=>{motionPaused=e.matches;syncMotion();});
  syncMotion();

  // A short line-by-line reveal is built from trusted static heading markup.
  $$('h2.reveal,.reveal h2').forEach(heading=>{
    const lines=heading.innerHTML.split(/<br\s*\/?\s*>/i);
    heading.innerHTML=lines.map((line,i)=>`<span class="split-line" style="--line-index:${i}"><span>${line}</span></span>`).join('');
  });
  $$('[data-reveal]').forEach(element=>element.classList.add('reveal'));
  const reveals=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(entry.isIntersecting){entry.target.classList.add('visible');reveals.unobserve(entry.target);}
  }),{threshold:.1});
  $$('.reveal').forEach(element=>reveals.observe(element));
  new IntersectionObserver(entries=>{
    $('.marquee-track').classList.toggle('offscreen',!entries[0].isIntersecting);
  }).observe($('.marquee'));
  let pageTick=false;
  function pageState(){
    const max=html.scrollHeight-innerHeight;
    $('.page-progress span').style.transform=`scaleX(${max>0?scrollY/max:0})`;
    $('.masthead').classList.toggle('scrolled',scrollY>40);
    if(!motionPaused&&!reduced.matches){
      const closing=$('.closing'),box=closing.getBoundingClientRect();
      if(box.top<innerHeight&&box.bottom>0)closing.style.setProperty('--photo-shift',`${Math.max(-35,Math.min(35,(box.top-innerHeight/2)*.06))}px`);
    }
    pageTick=false;
  }
  window.addEventListener('scroll',()=>{if(!pageTick){pageTick=true;requestAnimationFrame(pageState);}},{passive:true});
  window.addEventListener('resize',pageState);pageState();

  // Invitation opening: unlock sound in the gesture, then reveal the two doors.
  const opening=$('#openingDialog');
  let openingStarted=false;
  function openInvitation(){
    if(openingStarted)return;openingStarted=true;
    playMusic();stopAuto();window.scrollTo({top:0,behavior:'instant'});
    $('#openInvitation').disabled=true;
    const minimal=motionPaused||reduced.matches;
    opening.classList.add('is-opening');
    const reveal=()=>{html.classList.add('experience-open');};
    if(minimal)reveal();else setTimeout(reveal,430);
    setTimeout(()=>{
      opening.close();document.body.classList.remove('modal-open');
      experienceOpen=true;reveal();$('#heroTitle').focus({preventScroll:true});resetHeroClock();
    },minimal?30:1720);
  }
  $('#openInvitation').addEventListener('click',openInvitation);
  opening.addEventListener('cancel',event=>{event.preventDefault();openInvitation();});
  if(typeof opening.showModal==='function'){
    document.body.classList.add('modal-open');opening.showModal();
  }else{experienceOpen=true;html.classList.add('experience-open');}
  // Attempt without a gesture; rejection is expected in browsers that restrict autoplay.
  playMusic();
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
