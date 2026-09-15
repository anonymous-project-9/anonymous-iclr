'use strict';
(() => {
  document.documentElement.classList.replace('no-js', 'js');
  const data = JSON.parse(document.getElementById('research-data').textContent);
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const videos = $$('main video');
  const heroVideos = videos.filter(video => video.hasAttribute('data-hero'));
  const visibleVideos = new Set();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const globalButton = $('#playback-toggle');
  const dialog = $('#media-dialog');
  const pauseIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>';
  const playIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 5 11 7-11 7V5Z"/></svg>';
  let globallyPaused = reducedMotion.matches || Boolean(navigator.connection?.saveData);
  let dialogTrigger = null;
  let heroStarted = false;

  function canPlay(video) {
    return (!globallyPaused || video.hasAttribute('data-user-playing')) && !document.hidden && !dialog.open &&
      (!video.hasAttribute('data-hero') || heroStarted) &&
      !video.hasAttribute('data-user-paused') && visibleVideos.has(video) && video.getClientRects().length > 0;
  }
  function updateLocalControl(video) {
    const shell = video.closest('.video-shell');
    if (!shell) return;
    const button = $('.local-play', shell);
    if (!button) return;
    shell.classList.toggle('is-paused', video.paused);
    button.innerHTML = video.paused ? playIcon : pauseIcon;
    button.setAttribute('aria-label', `${video.paused ? 'Play' : 'Pause'} ${video.getAttribute('aria-label')}`);
  }
  function loadVideo(video) {
    if (video.getAttribute('src') === video.dataset.src) return;
    video.src = video.dataset.src;
    video.load();
  }
  function playVideo(video) {
    loadVideo(video);
    const promise = video.play();
    if (promise) promise.catch(() => updateLocalControl(video));
  }
  function syncPlayback() {
    videos.forEach(video => {
      if (canPlay(video)) playVideo(video);
      else video.pause();
      updateLocalControl(video);
    });
  }
  function updateGlobalControl() {
    globalButton.innerHTML = (globallyPaused ? playIcon : pauseIcon) + `<span>${globallyPaused ? 'Play videos' : 'Pause videos'}</span>`;
    globalButton.setAttribute('aria-label', globallyPaused ? 'Play all videos' : 'Pause all videos');
    globalButton.setAttribute('aria-pressed', String(globallyPaused));
  }
  function setGlobalPause(paused) {
    globallyPaused = paused;
    if (!paused && heroVideos.some(video => visibleVideos.has(video))) heroVideos.forEach(loadVideo);
    videos.forEach(video => video.removeAttribute('data-user-playing'));
    updateGlobalControl();
    syncPlayback();
  }
  globalButton.addEventListener('click', () => {
    if (globallyPaused) videos.forEach(video => video.removeAttribute('data-user-paused'));
    setGlobalPause(!globallyPaused);
  });
  updateGlobalControl();
  reducedMotion.addEventListener('change', event => setGlobalPause(event.matches));
  document.addEventListener('visibilitychange', syncPlayback);

  videos.forEach(video => {
    video.muted = true;
    if (video.hasAttribute('data-hero')) video.addEventListener('canplay', () => {
      if (!heroStarted && heroVideos.every(item => item.readyState >= 2)) {
        heroStarted = true;
        syncPlayback();
      }
    });
    video.addEventListener('play', () => updateLocalControl(video));
    video.addEventListener('pause', () => updateLocalControl(video));
    video.addEventListener('error', () => {
      const shell = video.closest('.video-shell');
      if (!shell || $('.media-error', shell)) return;
      const message = document.createElement('div');
      message.className = 'media-error';
      const label = document.createElement('span');
      label.textContent = 'This video could not be loaded.';
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'button';
      retry.textContent = 'Try again';
      retry.addEventListener('click', () => {
        message.remove();
        video.load();
        if (canPlay(video)) playVideo(video);
      });
      const link = document.createElement('a');
      link.href = video.dataset.src;
      link.textContent = 'Open the original video';
      message.append(label, retry, link);
      shell.append(message);
    });
    updateLocalControl(video);
  });

  if ('IntersectionObserver' in window) {
    const mediaObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const video = entry.target;
        if (entry.isIntersecting) {
          visibleVideos.add(video);
          if (!globallyPaused) {
            if (video.hasAttribute('data-hero')) heroVideos.forEach(loadVideo);
            else loadVideo(video);
          }
        } else {
          visibleVideos.delete(video);
        }
      });
      syncPlayback();
    }, { threshold: 0.08 });
    videos.forEach(video => mediaObserver.observe(video));
  } else {
    // With no observer, controls remain usable without downloading every video.
    videos.forEach(video => {
      video.controls = true;
      video.addEventListener('pointerdown', () => loadVideo(video), { once: true });
      visibleVideos.add(video);
    });
    setGlobalPause(true);
  }
  // Keep the four hero crops aligned to the same camera frame.
  heroVideos[0].addEventListener('timeupdate', () => {
    if (!heroStarted || heroVideos[0].paused) return;
    const time = heroVideos[0].currentTime;
    heroVideos.slice(1).forEach(video => {
      if (video.readyState >= 2 && Math.abs(video.currentTime - time) > 0.10) video.currentTime = time;
    });
  });
  $$('.local-play').forEach(button => button.addEventListener('click', () => {
    const video = $('video', button.closest('.video-shell'));
    if (video.paused) {
      // An individual play action does not restart other paused videos.
      video.removeAttribute('data-user-paused');
      video.setAttribute('data-user-playing', '');
      visibleVideos.add(video);
      playVideo(video);
    } else {
      video.setAttribute('data-user-paused', '');
      video.removeAttribute('data-user-playing');
      video.pause();
    }
  }));

  function changeVideo(video, src, poster, label) {
    video.pause();
    video.removeAttribute('src');
    video.load();
    video.dataset.src = src;
    video.poster = poster;
    video.setAttribute('aria-label', label);
    const shell = video.closest('.video-shell');
    $('.media-error', shell)?.remove();
    $('.expand-video', shell)?.setAttribute('aria-label', `Enlarge ${label}`);
    if (canPlay(video)) playVideo(video);
    updateLocalControl(video);
  }

  $$('.scene-option').forEach(button => button.addEventListener('click', () => {
    const scene = data.seasons[Number(button.dataset.scene)];
    $$('.scene-option').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    $('#season-title').textContent = scene.landmark;
    $('#season-trajectory').textContent = scene.trajectory;
    const references = $('#season-references');
    references.src = `media/refs_${scene.id}.jpg`;
    references.alt = `${scene.landmark} appearance references in spring, summer, autumn, and winter`;
    changeVideo($('#season-video'), `media/${scene.file}.mp4`, `assets/${scene.file}.jpg`, `${scene.landmark}, ${scene.trajectory}, four synchronized seasons`);
  }));

  let selectedLandmark = 'colosseum';
  let selectedEdit = 'style_cyberpunk';
  function refreshEdit() {
    const edit = data.edits[selectedLandmark].edits.find(item => item.edit === selectedEdit);
    const landmark = data.landmarks.find(item => item[0] === selectedLandmark)[1];
    $('#edit-select').value = selectedEdit;
    $('#edit-title').textContent = data.editNames[selectedEdit];
    $('#edit-category').textContent = edit.category;
    $('#edit-prompt').textContent = edit.prompt;
    $$('.chip[data-edit]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.edit === selectedEdit)));
    changeVideo($('#edit-video'), `media/edits/${selectedLandmark}__${selectedEdit}.mp4`, `media/edits/${selectedLandmark}__${selectedEdit}.jpg`, `${landmark}: ${data.editNames[selectedEdit]}, edited image and generated orbit`);
    $('#edit-announcement').textContent = `${landmark}: ${data.editNames[selectedEdit]}. ${edit.prompt}`;
  }
  $('#edit-select').addEventListener('change', event => {
    selectedEdit = event.target.value;
    refreshEdit();
  });
  $$('.chip[data-edit]').forEach(button => button.addEventListener('click', () => {
    selectedEdit = button.dataset.edit;
    refreshEdit();
  }));
  $('#edit-landmark').addEventListener('change', event => {
    selectedLandmark = event.target.value;
    const editSelect = $('#edit-select');
    editSelect.replaceChildren();
    for (const category of ['add', 'remove', 'replace', 'modify']) {
      const group = document.createElement('optgroup');
      group.label = category[0].toUpperCase() + category.slice(1);
      data.edits[selectedLandmark].edits.filter(edit => edit.category === category).forEach(edit => {
        const option = document.createElement('option');
        option.value = edit.edit;
        option.textContent = data.editNames[edit.edit];
        group.append(option);
      });
      editSelect.append(group);
    }
    if (!data.edits[selectedLandmark].edits.some(edit => edit.edit === selectedEdit)) selectedEdit = data.edits[selectedLandmark].edits[0].edit;
    const landmark = data.landmarks.find(item => item[0] === selectedLandmark)[1];
    $('#edit-pairs').src = `media/edits/pairs_${selectedLandmark}.jpg`;
    $('#edit-pairs').alt = `${landmark} source photograph and eight edited appearance anchors`;
    changeVideo($('#edit-grid-video'), `media/edits/grid_${selectedLandmark}.mp4`, `media/edits/grid_${selectedLandmark}.jpg`, `${landmark}, nine synchronized edits`);
    refreshEdit();
  });

  function openDialog(trigger, title, media) {
    dialogTrigger = trigger;
    $('#dialog-title').textContent = title;
    const zoom = $('#dialog-zoom');
    zoom.hidden = media.tagName !== 'IMG';
    zoom.textContent = 'Zoom to full size';
    zoom.setAttribute('aria-pressed', 'false');
    $('.dialog-body', dialog).classList.remove('is-zoomed');
    $('.dialog-body', dialog).replaceChildren(media);
    dialog.showModal();
    document.body.classList.add('dialog-open');
    syncPlayback();
    if (media.tagName === 'VIDEO' && !globallyPaused) media.play().catch(() => {});
  }
  $$('[data-enlarge-image]').forEach(button => button.addEventListener('click', () => {
    const img = document.createElement('img');
    img.src = button.dataset.enlargeImage;
    img.alt = button.dataset.title;
    openDialog(button, button.dataset.title, img);
  }));
  $$('.expand-video').forEach(button => button.addEventListener('click', () => {
    const original = $('video', button.closest('.video-shell'));
    const expanded = document.createElement('video');
    expanded.src = original.dataset.src;
    expanded.poster = original.poster;
    expanded.controls = true;
    expanded.loop = true;
    expanded.muted = true;
    expanded.playsInline = true;
    const time = original.currentTime;
    expanded.addEventListener('loadedmetadata', () => { expanded.currentTime = time; }, { once: true });
    openDialog(button, original.getAttribute('aria-label'), expanded);
  }));
  $('#dialog-zoom').addEventListener('click', event => {
    const zoomed = $('.dialog-body', dialog).classList.toggle('is-zoomed');
    event.currentTarget.textContent = zoomed ? 'Fit to screen' : 'Zoom to full size';
    event.currentTarget.setAttribute('aria-pressed', String(zoomed));
  });
  $('.dialog-close', dialog).addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => {
    const expanded = $('video', dialog);
    if (expanded) { expanded.pause(); expanded.removeAttribute('src'); expanded.load(); }
    $('.dialog-body', dialog).replaceChildren();
    document.body.classList.remove('dialog-open');
    syncPlayback();
    dialogTrigger?.focus({ preventScroll: true });
  });
  $$('details').forEach(details => details.addEventListener('toggle', () => {
    if (!details.open) $$('video', details).forEach(video => { visibleVideos.delete(video); video.pause(); });
    syncPlayback();
  }));

  const navLinks = $$('.nav-links a');
  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const id = ['orbits', 'gaussian'].includes(entry.target.id) ? 'results' : entry.target.id;
        navLinks.forEach(link => {
          if (link.hash === `#${id}`) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-12% 0px -65% 0px' });
    $$('main > header[id], main > section[id]').forEach(section => sectionObserver.observe(section));
  }
})();
