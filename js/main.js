/**
 * Luke Young Portfolio — vanilla JS
 * Replaces jQuery + Slick carousel dependency.
 *
 * Handles three things:
 *   1. Section navigation (Resume / Sears / Calumet / Illustration tabs)
 *   2. A lightbox for the project image galleries
 *   3. Live résumé sync from a Google Doc (via a Google Apps Script Web App)
 */

document.addEventListener('DOMContentLoaded', () => {
  const sections = document.querySelectorAll('main > section.main');
  const header = document.querySelector('header');

  /* ---------- 1. Section navigation (real, bookmarkable #hash routes) ---------- */

  const sectionIds = new Set(Array.from(sections).map((sec) => sec.id));

  function idFromHash() {
    const id = location.hash.slice(1);
    return sectionIds.has(id) ? id : 'start';
  }

  // Shows/hides sections and updates header color. Does not touch history or scroll —
  // used for both the initial render and history navigation (popstate).
  function applySection(id) {
    sections.forEach((sec) => {
      sec.classList.toggle('hide', sec.id !== id);
    });
    if (header) header.className = id;
  }

  // Used for user-initiated navigation (nav clicks): updates the URL hash so the
  // section is bookmarkable/shareable and back/forward works, then scrolls up.
  function goToSection(id) {
    applySection(id);
    // The default section ("start") uses the clean URL with no hash.
    const url = id === 'start' ? location.pathname + location.search : '#' + id;
    if (idFromHash() !== id || (id !== 'start' && location.hash !== '#' + id)) {
      history.pushState({ section: id }, '', url);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Render whichever section the URL points to (defaulting to "start") without
  // touching the address bar, so a first visit keeps the clean URL (and the
  // browser never jumps down to a #start anchor).
  applySection(idFromHash());

  window.addEventListener('popstate', () => {
    applySection(idFromHash());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Every nav link switches sections.
  document.querySelectorAll('[data-link]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      goToSection(link.dataset.link);
    });
  });

  /* ---------- 2. Gallery lightbox ---------- */
  // Each .gallery is a collage of cropped thumbnails (see css/main.css). Clicking
  // one opens the full-size image in a lightbox that can step through that
  // gallery with the arrow buttons / keys, and closes with Escape, the X, or a
  // click on the dark backdrop.

  const lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-label', 'Image viewer');
  lightbox.innerHTML = `
    <button type="button" class="lightbox-close" aria-label="Close image viewer">&times;</button>
    <button type="button" class="lightbox-prev" aria-label="Previous image">&#10094;</button>
    <div class="lightbox-stage"><img alt=""></div>
    <button type="button" class="lightbox-next" aria-label="Next image">&#10095;</button>
    <p class="lightbox-caption"></p>`;
  document.body.appendChild(lightbox);

  const stage = lightbox.querySelector('.lightbox-stage');
  const stageImg = stage.querySelector('img');
  const caption = lightbox.querySelector('.lightbox-caption');
  const prevBtn = lightbox.querySelector('.lightbox-prev');
  const nextBtn = lightbox.querySelector('.lightbox-next');

  let items = [];
  let index = 0;
  let lastTrigger = null;

  function show(i) {
    index = (i + items.length) % items.length;
    const thumb = items[index].querySelector('img');
    stageImg.src = thumb.currentSrc || thumb.src;
    stageImg.alt = thumb.alt;
    caption.textContent = items[index].dataset.caption || thumb.alt;
    stage.scrollTop = 0;
    const single = items.length < 2;
    prevBtn.hidden = single;
    nextBtn.hidden = single;
  }

  function openLightbox(trigger) {
    // A standalone .lightbox-trigger (not inside a .gallery) shows just its own image.
    const group = trigger.closest('.gallery');
    items = group ? Array.from(group.querySelectorAll('.gallery-item')) : [trigger];
    lastTrigger = trigger;
    show(items.indexOf(trigger));
    lightbox.classList.add('open');
    document.body.classList.add('modal-open');
    lightbox.querySelector('.lightbox-close').focus();
  }

  function closeLightbox() {
    if (!lightbox.classList.contains('open')) return;
    lightbox.classList.remove('open');
    document.body.classList.remove('modal-open');
    stageImg.removeAttribute('src');
    if (lastTrigger) lastTrigger.focus();
  }

  document.querySelectorAll('.gallery-item, .lightbox-trigger').forEach((item) => {
    item.addEventListener('click', () => openLightbox(item));
  });

  lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
  prevBtn.addEventListener('click', () => show(index - 1));
  nextBtn.addEventListener('click', () => show(index + 1));

  // Click on the dark area (not the image or a button) closes the viewer.
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox || e.target === stage) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') show(index - 1);
    else if (e.key === 'ArrowRight') show(index + 1);
  });

  // Basic touch swipe support for mobile
  let startX = 0;
  lightbox.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
  lightbox.addEventListener('touchend', (e) => {
    const diff = e.changedTouches[0].clientX - startX;
    if (diff > 60) show(index - 1);
    else if (diff < -60) show(index + 1);
  }, { passive: true });

  /* ---------- 3. Live résumé sync ---------- */
  // The résumé section already has the current résumé hard-coded as HTML (so the
  // page works perfectly with zero JS/network calls). If RESUME_API_URL is set to a
  // deployed Google Apps Script Web App (see apps-script/README.md), this loads
  // the live Google Doc on load and swaps in fresh content. Any failure — no URL
  // set, network error, bad JSON — just leaves the static résumé in place.
  //
  // This uses JSONP (a <script src="..."> tag) instead of fetch(). Apps Script
  // Web Apps don't reliably send an Access-Control-Allow-Origin header, so a
  // cross-origin fetch()/XHR gets blocked by CORS even on a public "Anyone can
  // access" deployment — a <script> load isn't subject to CORS at all.
  const RESUME_API_URL = 'https://script.google.com/macros/s/AKfycbyc6HGtHyHmYvodmV0I_E8inJd_3KyuGnUpTM5Ax_z95_p2j5yOlR-z4HibKs4PnbIL/exec';

  function loadResumeViaJsonp(url) {
    return new Promise((resolve, reject) => {
      const callbackName = '__resumeCallback_' + Date.now();
      const script = document.createElement('script');

      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Résumé request timed out'));
      }, 10000);

      function cleanup() {
        clearTimeout(timeoutId);
        delete window[callbackName];
        script.remove();
      }

      window[callbackName] = (data) => {
        cleanup();
        resolve(data);
      };

      script.src = url + (url.indexOf('?') === -1 ? '?' : '&') + 'callback=' + callbackName;
      script.onerror = () => {
        cleanup();
        reject(new Error('Résumé script failed to load'));
      };
      document.head.appendChild(script);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  // Known employers/schools to link out to, keyed by exact org name as it
  // appears in the résumé data.
  const RESUME_ORG_LINKS = {
    'The American Academy of Art': 'https://www.aaart.edu/',
  };

  function renderResumeOrg(org) {
    const url = RESUME_ORG_LINKS[org];
    return url
      ? `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(org)}</a>`
      : escapeHtml(org);
  }

  // Renders the Skills list, inserting a small group heading whenever a
  // skill's `group` (e.g. "Front-End Development") differs from the group
  // above it. Skills with no group render as plain lines, same as before.
  function renderSkills(skills) {
    let html = '';
    let lastGroup = '';
    (skills || []).forEach((s) => {
      const group = s.group || '';
      if (group && group !== lastGroup) {
        html += `<p class="resume-skill-group">${escapeHtml(group)}</p>`;
      }
      lastGroup = group;
      html += `<p><strong>${escapeHtml(s.label)}:</strong> ${escapeHtml(s.value)}</p>`;
    });
    return html;
  }

  function renderResumeEntry(item) {
    return `
      <div class="resume-entry">
        <p class="resume-entry-title"><strong>${escapeHtml(item.title)}</strong> — ${renderResumeOrg(item.org)}</p>
        <p class="resume-dates">${escapeHtml(item.dates)}</p>
        <p>${escapeHtml(item.description)}</p>
      </div>`;
  }

  function renderResume(data) {
    const el = document.getElementById('resume-content');
    if (!el || !data) return;

    const skillsHtml = renderSkills(data.skills);

    const contact = data.contact || {};
    const websiteHref = contact.website ? 'https://' + contact.website.replace(/^https?:\/\//, '') : '';
    const contactHtml = [
      contact.email ? `<p><a href="mailto:${escapeHtml(contact.email)}">${escapeHtml(contact.email)}</a></p>` : '',
      contact.phone ? `<p>${escapeHtml(contact.phone)}</p>` : '',
      contact.website ? `<p><a href="${escapeHtml(websiteHref)}">${escapeHtml(contact.website)}</a></p>` : '',
      contact.linkedin ? `<p><a href="${escapeHtml(contact.linkedin)}" target="_blank" rel="noreferrer">LinkedIn</a></p>` : '',
    ].filter(Boolean).join('');

    // Two columns, mirroring the main/sidebar layout of the source Google Doc:
    // main = Summary/Experience/Education, sidebar = Contact/Skills.
    el.innerHTML = `
      <div class="resume-heading">
        <h3>Luke Young</h3>
        <p class="resume-subtitle">WordPress Web Designer &amp; Digital Marketing Specialist</p>
        <p class="resume-note">This résumé is synced live from Google Docs via the Google Apps Script API.</p>
        <a class="resume-link" href="https://docs.google.com/document/d/1LvTQ4WgiWH1Xbu-ibSoj_SDjpI465uLUam5TP9wan9k/edit?usp=sharing" title="Open Printable Source Document on Google Docs" target="_blank" rel="noreferrer">
          Open Printable Source Document on Google Docs
        </a>
      </div>
      <div class="resume-columns">
        <div class="resume-main">
          <div class="resume-block">
            <h4>Summary</h4>
            <p>${escapeHtml(data.summary)}</p>
          </div>
          <div class="resume-block">
            <h4>Experience</h4>
            ${(data.experience || []).map(renderResumeEntry).join('')}
          </div>
          <div class="resume-block">
            <h4>Education</h4>
            ${(data.education || []).map(renderResumeEntry).join('')}
          </div>
        </div>
        <div class="resume-sidebar">
          <div class="resume-block">
            <h4>Contact</h4>
            ${contactHtml}
          </div>
          <div class="resume-block">
            <h4>Skills</h4>
            ${skillsHtml}
          </div>
        </div>
      </div>
      ${data.updated ? `<p class="resume-updated">Synced from Google Docs · ${escapeHtml(new Date(data.updated).toLocaleDateString())}</p>` : ''}
    `;
  }

  if (RESUME_API_URL) {
    loadResumeViaJsonp(RESUME_API_URL)
      .then(renderResume)
      .catch((err) => {
        // Static fallback résumé already rendered in the page — nothing more to do.
        console.warn('Live résumé sync unavailable, showing the static résumé instead.', err);
      });
  }
});