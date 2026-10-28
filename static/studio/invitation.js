/* Rewamore: shared runtime for the ten supplied invitation designs.
   All user content enters via escaped JSON and textContent; no client HTML. */
(function () {
  'use strict';
  var source = document.getElementById('rewamore-data');
  if (!source) return;
  var data;
  try { data = JSON.parse(source.textContent); } catch (_) { return; }
  var runtime = data.runtime || {};
  var guest = String(data.guest || 'Tamu Undangan');
  var title = String(runtime.calendarTitle || data.title || ('Pernikahan ' + data.groomName + ' & ' + data.brideName));
  var eventDate = data.eventDate || '';
  var videoId = /^[A-Za-z0-9_-]{11}$/.test(runtime.videoId || '') ? runtime.videoId : '';
  var all = function (selector, root) { return Array.from((root || document).querySelectorAll(selector)); };
  var query = function (selector, root) { return (root || document).querySelector(selector); };
  var setText = function (selector, value) { all(selector).forEach(function (el) { el.textContent = value; }); };

  // Called by the original theme config.js files, after the DOM is parsed.
  window.RewamoreRuntime = {
    guest: guest, title: title, eventDate: eventDate, videoId: videoId,
    legacyInvitation: function () {
      return {
        guestFallback: guest, eventStart: eventDate, eventEnd: eventDate,
        videoId: videoId, slides: Array.isArray(runtime.slides) ? runtime.slides : [],
        calendar: { title: title, location: runtime.calendarLocation || '' }
      };
    },
    legacyWedding: function () {
      var audio = query('#wedding-audio');
      var audioSource = audio && (audio.getAttribute('src') || (query('source', audio) || {}).src);
      return {
        guest: guest, date: eventDate, endDate: '',
        music: runtime.music || audioSource || '/static/themes/' + data.themeSlug + '/assets/ambient.wav',
        volume: 0.28,
        event: { title: title, venue: runtime.calendarLocation || '', address: '' },
        giftAccounts: Array.isArray(runtime.giftAccounts) ? runtime.giftAccounts : []
      };
    }
  };

  function status(message, form) {
    var el = form && query('#rsvpStatus, #rsvp-status, [data-server-status]', form);
    if (!el) {
      el = document.getElementById('rewamore-status');
      if (!el) {
        el = document.createElement('p');
        el.id = 'rewamore-status'; el.setAttribute('role', 'status');
        el.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);max-width:90vw;width:max-content;padding:12px 18px;border-radius:12px;background:#20241f;color:white;z-index:99999;box-shadow:0 5px 30px #0003;font:14px/1.5 sans-serif';
        document.body.appendChild(el);
      }
      el.hidden = false;
      clearTimeout(status.timer);
      status.timer = setTimeout(function () { el.hidden = true; }, 6000);
    }
    el.textContent = message;
  }

  // The source archive omits the remote portraits used by themes 3 and 4.
  // A bundled sample replaces a failed image; customer uploads always take priority.
  var fallbackImage = '/static/themes/1/assets/IMG_20260822_120640.jpg';
  function imageFallback(image) {
    if (!image || image.tagName !== 'IMG' || image.dataset.rwFallback === 'true') return;
    image.dataset.rwFallback = 'true';
    image.removeAttribute('srcset'); image.removeAttribute('data-srcset');
    image.src = fallbackImage;
    image.alt = 'Foto contoh pengganti; foto undangan dapat diunggah melalui editor.';
    image.classList.add('is-loaded');
  }
  document.addEventListener('error', function (event) {
    if (event.target && event.target.tagName === 'IMG') imageFallback(event.target);
  }, true);

  function setupBranding() {
    // Initials are rendered from the saved, theme-specific content by the server.
    // Do not replace them with derived initials here: clients may have chosen custom monograms.
    // Apply only safe wrapping so long names cannot force the layout beyond a phone viewport.
    all('h1, h2, h3, .name, .names, .couple, .couple-name, .hero-names, .groom-name, .bride-name, [data-guest]').forEach(function (node) {
      if (node.closest('form, nav, button, .rw-guestbook')) return;
      node.style.overflowWrap = 'anywhere';
      node.style.wordBreak = 'normal';
      node.style.maxWidth = '100%';
    });
  }

  function setupGuest() {
    all('[data-guest], #guestName:not(input), .guest-name').forEach(function (el) { el.textContent = guest; });
    all('#rsvpName, #rsvp-name, input#guestName').forEach(function (el) {
      el.value = guest === 'Tamu Undangan' ? '' : guest.slice(0, el.maxLength > 0 ? el.maxLength : 160);
    });
  }

  function setupCountdown() {
    var target = Date.parse(eventDate);
    var ids = ['countdownDays', 'countdownHours', 'countdownMinutes', 'countdownSeconds'];
    var units = ['days', 'hours', 'minutes', 'seconds'];
    var numbers = all('#countdownNumbers b');
    function tick() {
      var seconds = Number.isFinite(target) ? Math.max(0, Math.floor((target - Date.now()) / 1000)) : 0;
      var values = [Math.floor(seconds / 86400), Math.floor(seconds % 86400 / 3600), Math.floor(seconds % 3600 / 60), seconds % 60];
      values.forEach(function (value, index) {
        var text = String(value).padStart(2, '0');
        setText('#' + ids[index] + ', [data-count="' + units[index] + '"], #countdown [data-unit="' + units[index] + '"]', text);
        if (numbers[index]) numbers[index].textContent = text;
      });
      var message = !Number.isFinite(target) ? 'Tanggal acara akan diumumkan.' : target > Date.now() ? 'Menuju hari bahagia kami' : 'Hari bahagia telah tiba. Terima kasih atas doa Anda.';
      setText('#countdownLabel, #countdownStatus, #countdown-caption', message);
    }
    tick();
    if (Number.isFinite(target) && target > Date.now()) setInterval(tick, 1000);
    if (Number.isFinite(target)) setText('#countdownNote', new Date(target).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }));
    else setText('#countdownNote', '');
  }

  function escapeICS(value) {
    return String(value || '').replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  }
  function stamp(value) { return new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z'); }
  function foldICS(line) {
    var result = [], part = '', size = 0;
    Array.from(line).forEach(function (character) {
      var bytes = new TextEncoder().encode(character).length;
      if (size + bytes > 74) { result.push(part); part = ' '; size = 1; }
      part += character; size += bytes;
    });
    result.push(part); return result.join('\r\n');
  }
  function calendarText() {
    if (!Number.isFinite(Date.parse(eventDate))) return null;
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Rewamore//Invitation//ID', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
      'UID:' + (data.id || data.slug || 'preview') + '@rewamore', 'DTSTAMP:' + stamp(new Date()),
      'DTSTART:' + stamp(eventDate), 'SUMMARY:' + escapeICS(title),
      'LOCATION:' + escapeICS(runtime.calendarLocation || ''),
      'DESCRIPTION:' + escapeICS('Undangan pernikahan ' + data.groomName + ' & ' + data.brideName),
      'END:VEVENT', 'END:VCALENDAR', ''].map(foldICS).join('\r\n');
  }
  document.addEventListener('click', function (event) {
    var target = event.target.closest && event.target.closest('[data-calendar], #saveCalendar, #calendar-button');
    if (target) {
      event.preventDefault(); event.stopImmediatePropagation();
      var content = calendarText();
      if (!content) { status('Tanggal utama acara belum diatur.'); return; }
      var url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }));
      var a = document.createElement('a'); a.href = url; a.download = (data.slug || 'undangan') + '.ics';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
    }
    var video = event.target.closest && event.target.closest('#originalVideo, #videoButton');
    if (video && !videoId) { event.preventDefault(); event.stopImmediatePropagation(); status('Video belum ditambahkan.'); }
  }, true);

  function attendanceValue(form) {
    var field = query('input[name="attendance"]:checked, select[name="attendance"], select#attendance', form);
    var raw = field ? field.value.trim().toLowerCase() : '';
    if (!raw) return '';
    if (/tidak|berhalangan|maaf|belum bisa|declined|^no$/.test(raw)) return 'no';
    if (/belum|maybe|pasti|memastikan/.test(raw)) return 'maybe';
    if (/hadir|yes|attending/.test(raw)) return 'yes';
    return '';
  }
  function payloadFor(form) {
    var name = query('[name="name"], #rsvpName, #rsvp-name, input#guestName', form);
    var message = query('[name="message"], #rsvpMessage, #rsvp-message, #guestMessage, #message', form);
    var count = query('[name="party_size"], [name="guests"], [name="count"], #guestCount, #rsvp-guests', form);
    var website = query('[name="website"], #wishWebsite', form);
    return {
      name: name ? name.value.trim() : '',
      attendance: attendanceValue(form),
      party_size: count ? String(Math.min(10, Math.max(1, Number(count.value) || 1))) : '1',
      message: message ? message.value.trim() : '',
      website: website ? website.value : '',
      publish_message: message && message.value.trim() ? 'true' : '',
      csrfmiddlewaretoken: data.csrfToken || ''
    };
  }

  var pending = new WeakSet();
  document.addEventListener('submit', async function (event) {
    var form = event.target;
    if (!form.matches('#rsvpForm, #rsvp-form')) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (pending.has(form)) return;
    if (!form.reportValidity()) return;
    var payload = payloadFor(form);
    // Editor previews are intentionally not persisted. Simulate the submission locally
    // so the owner can verify the complete RSVP + published-wish experience before launch.
    if (data.preview) {
      if (!payload.name || !payload.attendance) { status('Lengkapi nama dan pilihan kehadiran Anda.', form); return; }
      if (payload.message) {
        wishesCache.unshift({ name: payload.name, message: payload.message, attendance: payload.attendance, created_at: new Date().toISOString(), preview: true });
        renderWishes();
      }
      status(payload.message
        ? 'Pratinjau berhasil: ucapan ditampilkan sementara dan belum disimpan ke undangan publik.'
        : 'Pratinjau berhasil: konfirmasi kehadiran ditampilkan sementara dan belum disimpan ke undangan publik.', form);
      return;
    }
    if (!payload.name || !payload.attendance) { status('Lengkapi nama dan pilihan kehadiran Anda.', form); return; }
    pending.add(form);
    var buttons = all('[type="submit"]', form);
    buttons.forEach(function (button) { button.disabled = true; });
    status('Mengirim konfirmasi…', form);
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 20000);
    try {
      var response = await fetch(data.rsvpUrl, {
        method: 'POST', credentials: 'same-origin', signal: controller.signal,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', 'X-CSRFToken': data.csrfToken || '', 'Accept': 'application/json' },
        body: new URLSearchParams(payload).toString()
      });
      var result = await response.json();
      if (!response.ok || !result.ok) {
        var errors = result.errors && Object.values(result.errors).flat().join(' ');
        throw new Error(errors || result.message || 'Konfirmasi belum tersimpan. Coba kembali.');
      }
      status(result.message || 'Terima kasih. Konfirmasi Anda telah tersimpan.', form);
      // Always refresh the public feed after a successful submission. The server remains
      // the source of truth and only returns wishes for which publication consent was given.
      await loadWishes();
      if (payload.message) {
        var track = query('[data-rw-wishes-track]');
        if (track) track.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch (error) {
      status(error.name === 'AbortError' ? 'Koneksi terputus. Periksa jaringan dan coba kembali.' : error.message || 'Konfirmasi belum terkirim. Coba kembali.', form);
    } finally {
      clearTimeout(timer); pending.delete(form);
      buttons.forEach(function (button) { button.disabled = false; });
    }
  }, true);

  function findRSVPForm() {
    var form = query('#rsvpForm, #rsvp-form, form[data-rsvp-form], form[name="rsvp"]');
    if (form) return form;
    var section = query('section#rsvp, section#ucapan, section#wishes, section.rsvp, section.rsvp-section, [data-rsvp-section]');
    if (section && query('form', section)) return query('form', section);
    return all('form').find(function (candidate) { return /rsvp|wish|ucapan/i.test((candidate.id || '') + ' ' + (candidate.className || '')); }) || null;
  }
  function setupRSVP() {
    var form = findRSVPForm();
    if (!form) return;
    form.method = 'post'; form.action = data.rsvpUrl || '';
    all('[type="submit"]', form).forEach(function (button) { button.disabled = false; });
    setText('#wishSubmitLabel', 'Kirim doa & konfirmasi');
    all('.form-note', form).forEach(function (note) {
      if (/perangkat|browser|mode lokal|mode demo|versi demo|pratinjau formulir|ucapan ditampilkan di undangan hanya jika/i.test(note.textContent)) {
        note.textContent = 'Konfirmasi dan ucapan akan tersimpan pada undangan ini.';
      }
    });
    // Guest messages are public on this invitation by design; no extra consent checkbox is shown.
    all('#clearWishes, #clearLocal, #downloadRsvp, #savedRsvp, #wishPaginationWrap').forEach(function (el) { el.hidden = true; });
    var message = query('textarea', form);
    if (message) message.addEventListener('input', function () { setText('#wishCharacters', message.value.length + ' / ' + message.maxLength); });
    var count = query('#guestCount, #rsvp-guests', form);
    function updateCount() { if (count) count.disabled = attendanceValue(form) === 'no'; }
    form.addEventListener('change', updateCount); updateCount();
    var refresh = query('#wishRefresh'); if (refresh) refresh.addEventListener('click', loadWishes);
    loadWishes();
  }

  var wishesCache = [], wishesTimer = 0;
  function wishCard(wish, full) {
    var card = document.createElement(full ? 'article' : 'button'); card.className = 'rw-wish-card';
    if (!full) { card.type = 'button'; card.setAttribute('aria-label', 'Baca ucapan dari ' + String(wish.name || 'Tamu')); }
    var name = document.createElement('strong'); name.textContent = String(wish.name || 'Tamu');
    var message = document.createElement('p'); message.textContent = String(wish.message || '');
    var date = new Date(wish.created_at || wish.createdAt), small = document.createElement('small');
    small.textContent = Number.isFinite(date.getTime()) ? date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    card.append(name, message, small); if (!full) card.addEventListener('click', openWishesModal); return card;
  }
  function scrollWishSlider(direction) {
    var track = query('[data-rw-wishes-track]');
    if (!track) return;
    var card = query('.rw-wish-card', track);
    var step = card ? card.getBoundingClientRect().width + 16 : track.clientWidth * .8;
    var max = Math.max(0, track.scrollWidth - track.clientWidth);
    if (direction > 0 && track.scrollLeft >= max - 8) track.scrollTo({ left: 0, behavior: 'smooth' });
    else if (direction < 0 && track.scrollLeft <= 8) track.scrollTo({ left: max, behavior: 'smooth' });
    else track.scrollBy({ left: step * direction, behavior: 'smooth' });
  }
  function renderWishes() {
    var track = query('[data-rw-wishes-track]'), list = query('[data-rw-wishes-list]'), count = query('[data-rw-wishes-count]');
    if (count) count.textContent = wishesCache.length + (wishesCache.length === 1 ? ' ucapan' : ' ucapan');
    if (track) {
      track.replaceChildren();
      var latest = wishesCache.slice(0, 4);
      if (!latest.length) { var empty = document.createElement('p'); empty.className = 'rw-wishes-empty'; empty.textContent = 'Belum ada ucapan yang dibagikan.'; track.append(empty); }
      latest.forEach(function (wish) { track.append(wishCard(wish, false)); });
      track.scrollLeft = 0;
    }
    if (list) { list.replaceChildren(); wishesCache.forEach(function (wish) { list.append(wishCard(wish, true)); }); }
    window.clearInterval(wishesTimer);
    if (track && wishesCache.length > 1 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      wishesTimer = window.setInterval(function () {
        var trackNow = query('[data-rw-wishes-track]');
        if (!trackNow || query('[data-rw-wishes-modal]:not([hidden])') || document.visibilityState === 'hidden') return;
        if (trackNow.scrollWidth > trackNow.clientWidth + 8) scrollWishSlider(1);
      }, 4500);
    }
  }
  document.addEventListener('click', function (event) {
    if (event.target.closest('[data-rw-wishes-prev]')) { scrollWishSlider(-1); return; }
    if (event.target.closest('[data-rw-wishes-next]')) { scrollWishSlider(1); return; }
  });
  function openWishesModal() {
    var modal = query('[data-rw-wishes-modal]'); if (!modal) return;
    modal.hidden = false; document.body.style.overflow = 'hidden';
    var close = query('[data-rw-wishes-close]', modal); if (close) close.focus();
  }
  function closeWishesModal() { var modal = query('[data-rw-wishes-modal]'); if (modal) { modal.hidden = true; document.body.style.overflow = ''; } }
  document.addEventListener('click', function (event) {
    if (event.target.closest('[data-rw-wishes-all]')) openWishesModal();
    if (event.target.closest('[data-rw-wishes-close]') || event.target.matches('[data-rw-wishes-modal]')) closeWishesModal();
  });
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeWishesModal(); });
  async function loadWishes() {
    if (data.preview) { renderWishes(); return; }
    if (!data.wishesUrl) return;
    try {
      var response = await fetch(data.wishesUrl, { credentials: 'same-origin', headers: { 'Accept': 'application/json' }, cache: 'no-store' });
      if (!response.ok) throw new Error('Tidak dapat memuat ucapan.');
      var body = await response.json();
      // Preserve temporary preview-only entries; never mix them into a published invitation.
      var previewItems = data.preview ? wishesCache.filter(function (wish) { return wish.preview; }) : [];
      wishesCache = previewItems.concat(Array.isArray(body.wishes) ? body.wishes : []);
      renderWishes();
      setText('#wishTotal, #wish-count', String(wishesCache.length));
      var legacy = query('#wishesList, #wishes-list'); if (legacy) { legacy.replaceChildren(); legacy.hidden = true; }
      setText('#wishLoadStatus', '');
    } catch (_) { setText('#wishLoadStatus', 'Ucapan belum dapat dimuat. Coba perbarui halaman.'); }
  }

  function init() { setupBranding(); setupGuest(); setupCountdown(); setupRSVP(); all('img[src]').forEach(function (img) { if (img.complete && !img.naturalWidth) imageFallback(img); }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
  window.RewamoreRuntime.calendarText = calendarText;
})();
