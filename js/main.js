/**
 * Luke Young Portfolio — vanilla JS
 * Replaces jQuery + Slick carousel dependency.
 *
 * Handles four things:
 *   1. Section navigation (Resume / Sears / Calumet / Illustration tabs)
 *   2. Modal open/close for project galleries
 *   3. A lightweight image carousel inside each modal
 *   4. Live résumé sync from a Google Doc (via a Google Apps Script Web App)
 */

document.addEventListener('DOMContentLoaded', () => {
  const sections = document.querySelectorAll('main > section.main');
  const screen = document.querySelector('.screen');
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
    const hash = '#' + id;
    if (location.hash !== hash) history.pushState({ section: id }, '', hash);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Normalize on load: render whichever section the URL points to (defaulting to
  // "start"), and replace history so the address bar always reflects a real section.
  const initialId = idFromHash();
  applySection(initialId);
  if (location.hash !== '#' + initialId) {
    history.replaceState({ section: initialId }, '', '#' + initialId);
  }

  window.addEventListener('popstate', () => {
    applySection(idFromHash());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Every nav link EXCEPT the gallery triggers and modal close buttons
  // switches sections. (Gallery triggers open modals instead — handled below.)
  document.querySelectorAll('[data-link]').forEach((link) => {
    if (link.classList.contains('show-carousel') || link.classList.contains('close-button')) {
      return;
    }
    link.addEventListener('click', (e) => {
      e.preventDefault();
      goToSection(link.dataset.link);
    });
  });

  /* ---------- 2. Modal open/close ---------- */

  function openModal(modal) {
    modal.classList.add('open');
    screen && screen.classList.add('active');
    document.body.classList.add('modal-open');
    initCarousel(modal.querySelector(':scope > [class*="carousel-"]'));
  }

  function closeModal() {
    document.querySelectorAll('.close-modal.open').forEach((m) => m.classList.remove('open'));
    document.querySelectorAll('.carousel-contain.zoomed').forEach((c) => c.classList.remove('zoomed'));
    screen && screen.classList.remove('active');
    document.body.classList.remove('modal-open');
  }

  // Each gallery trigger's `title` attribute matches its modal's class,
  // e.g. title="sears-content" opens .modal-sears-content
  document.querySelectorAll('.show-carousel').forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const modal = document.querySelector(`.modal-${trigger.getAttribute('title')}`);
      if (modal) openModal(modal);
    });
  });

  document.querySelectorAll('.close-button').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      closeModal();
    });
  });

  if (screen) screen.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  /* ---------- 3. Lightweight carousel ---------- */

  function initCarousel(carousel) {
    if (!carousel || carousel.dataset.initialized) return;
    carousel.dataset.initialized = 'true';
    carousel.classList.add('vanilla-carousel');

    const slides = Array.from(carousel.children);
    let index = 0;

    slides.forEach((slide, i) => {
      slide.classList.add('carousel-slide');
      slide.style.display = i === 0 ? '' : 'none';
    });

    // Click an image to zoom to full size (scrollable); click again to fit.
    carousel.querySelectorAll('.carousel-contain img').forEach((img) => {
      img.addEventListener('click', () => {
        img.closest('.carousel-contain').classList.toggle('zoomed');
      });
    });

    if (slides.length <= 1) return; // no controls needed for a single slide

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'carousel-btn carousel-prev';
    prevBtn.setAttribute('aria-label', 'Previous slide');
    prevBtn.innerHTML = '&#10094;';

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'carousel-btn carousel-next';
    nextBtn.setAttribute('aria-label', 'Next slide');
    nextBtn.innerHTML = '&#10095;';

    const dotsWrap = document.createElement('div');
    dotsWrap.className = 'carousel-dots';
    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(dot);
    });

    function goTo(next) {
      slides[index].style.display = 'none';
      slides[index].querySelectorAll('.carousel-contain.zoomed').forEach((c) => c.classList.remove('zoomed'));
      dotsWrap.children[index].classList.remove('active');
      index = (next + slides.length) % slides.length;
      slides[index].style.display = '';
      dotsWrap.children[index].classList.add('active');
    }

    prevBtn.addEventListener('click', () => goTo(index - 1));
    nextBtn.addEventListener('click', () => goTo(index + 1));

    carousel.appendChild(prevBtn);
    carousel.appendChild(nextBtn);
    carousel.appendChild(dotsWrap);

    // Basic touch swipe support for mobile
    let startX = 0;
    carousel.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    carousel.addEventListener('touchend', (e) => {
      const diff = e.changedTouches[0].clientX - startX;
      if (diff > 50) goTo(index - 1);
      else if (diff < -50) goTo(index + 1);
    }, { passive: true });
  }

  /* ---------- 4. Live résumé sync ---------- */
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