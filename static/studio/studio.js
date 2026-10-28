/* Progressive enhancement for Django-rendered studio forms. */
(() => {
  'use strict';
  const fallbackPhoto = '/static/themes/1/assets/IMG_20260822_120640.jpg';
  function fallbackThemeCard(image) {
    if (!image.matches('.theme-art img, .invitation-photo img') || image.dataset.fallbackPhoto) return;
    image.dataset.fallbackPhoto = 'true';
    image.removeAttribute('srcset');
    image.src = fallbackPhoto;
    image.alt = 'Foto contoh lokal; foto tema dapat diganti dengan foto klien.';
  }
  document.addEventListener('error', event => {
    if (event.target instanceof HTMLImageElement) fallbackThemeCard(event.target);
  }, true);
  document.querySelectorAll('.theme-art img, .invitation-photo img').forEach(image => {
    if (image.complete && image.naturalWidth === 0) fallbackThemeCard(image);
  });
  const toast = document.getElementById('copy-toast');
  let toastTimer;
  function announce(message) {
    if (!toast) return;
    toast.textContent = message;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => { toast.textContent = ''; }, 3400);
  }
  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.className = 'sr-only';
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, area.value.length);
    const copied = document.execCommand('copy');
    area.remove();
    if (!copied) throw new Error('Clipboard unavailable');
  }
  document.querySelectorAll('[data-copy]').forEach(button => {
    button.addEventListener('click', async () => {
      try {
        await copyText(button.dataset.copy);
        const previous = button.textContent;
        button.textContent = 'Tersalin';
        announce('Tautan berhasil disalin.');
        window.setTimeout(() => { button.textContent = previous; }, 1900);
      } catch (_) {
        announce('Tautan belum tersalin. Pilih teks tautan dan salin secara manual.');
      }
    });
  });
  const fieldSearch = document.querySelector('[data-field-search]');
  if (fieldSearch) {
    const fields = [...document.querySelectorAll('[data-edit-field]')];
    fieldSearch.addEventListener('input', () => {
      const query = fieldSearch.value.trim().toLocaleLowerCase('id');
      let count = 0;
      fields.forEach(field => {
        const text = (field.dataset.searchText || '').toLocaleLowerCase('id');
        const match = text.includes(query);
        field.hidden = !match;
        if (match) count++;
      });
      const noFields = document.querySelector('[data-no-fields]');
      if (noFields) noFields.classList.toggle('hide', count !== 0);
    });
  }
  let dirty = false;
  document.querySelectorAll('[data-track-changes]').forEach(form => {
    const state = form.querySelector('[data-save-state]');
    const markDirty = event => {
      if (event.target.matches('[data-field-search]')) return;
      dirty = true;
      if (state) state.textContent = 'Ada perubahan yang belum disimpan.';
    };
    form.addEventListener('input', markDirty);
    form.addEventListener('change', markDirty);
    form.addEventListener('submit', () => {
      dirty = false;
      if (state) state.textContent = 'Menyimpan perubahan…';
    });
  });
  window.addEventListener('beforeunload', event => {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });
  const preview = document.getElementById('invitation-preview');
  // A saved section may change text, logo initials, or navigation labels while the iframe URL stays the same.
  // Force a fresh preview document on editor load instead of relying on browser iframe cache behavior.
  if (preview && preview.src) {
    const freshPreview = new URL(preview.src, window.location.origin);
    freshPreview.searchParams.set('refresh', Date.now().toString());
    preview.src = freshPreview.toString();
  }
  document.querySelectorAll('[data-reload-preview]').forEach(button => {
    button.addEventListener('click', () => {
      if (preview) {
        const url = new URL(preview.src, window.location.origin);
        url.searchParams.set('refresh', Date.now().toString());
        preview.src = url.toString();
        announce(dirty ? 'Pratinjau diperbarui. Simpan dahulu untuk melihat perubahan terbaru.' : 'Pratinjau diperbarui.');
      }
    });
  });
  document.querySelectorAll('input[type="file"]').forEach(input => {
    let objectURL = null;
    input.addEventListener('change', () => {
      const field = input.closest('[data-edit-field]');
      const file = input.files && input.files[0];
      if (!field || !file) return;
      if (objectURL) URL.revokeObjectURL(objectURL);
      let media = field.querySelector('[data-upload-preview]');
      const kind = file.type.startsWith('image/') ? 'img' : file.type.startsWith('audio/') ? 'audio' : file.type.startsWith('video/') ? 'video' : null;
      if (!kind) return;
      if (!media || media.tagName.toLowerCase() !== kind) {
        if (media) media.remove();
        media = document.createElement(kind);
        media.className = 'media-preview' + (kind === 'audio' ? ' audio-preview' : kind === 'video' ? ' video-preview' : '');
        media.dataset.uploadPreview = '';
        if (kind === 'img') media.alt = 'Pratinjau berkas pengganti, belum disimpan';
        else { media.controls = true; media.preload = 'metadata'; }
        const label = field.querySelector('label');
        if (label) label.insertAdjacentElement('afterend', media);
      }
      objectURL = URL.createObjectURL(file);
      media.src = objectURL;
    });
  });
  document.querySelectorAll('form[data-confirm]').forEach(form => {
    form.addEventListener('submit', event => {
      if (!window.confirm(form.dataset.confirm)) event.preventDefault();
    });
  });
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', event => {
      if (event.defaultPrevented) return;
      const button = event.submitter;
      if (!button || button.name) return;
      button.setAttribute('aria-busy', 'true');
      /* Leave native successful controls untouched for correct POST semantics. */
    });
  });
})();
