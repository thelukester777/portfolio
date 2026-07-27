/**
 * Luke Young Portfolio — vanilla JS
 * Replaces jQuery + Slick carousel dependency.
 *
 * Handles three things the old jQuery/Slick setup did:
 *   1. Section navigation (Resume / Sears / Calumet / Illustration tabs)
 *   2. Modal open/close for project galleries
 *   3. A lightweight image carousel inside each modal
 */

document.addEventListener('DOMContentLoaded', () => {
  const sections = document.querySelectorAll('main > section.main');
  const screen = document.querySelector('.screen');
  const header = document.querySelector('header');

  /* ---------- 1. Section navigation ---------- */

  function showSection(id) {
    sections.forEach((sec) => {
      sec.classList.toggle('hide', sec.id !== id);
    });
    if (header) header.className = id;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (header) header.className = 'start';

  // Every nav link EXCEPT the gallery triggers and modal close buttons
  // switches sections. (Gallery triggers open modals instead — handled below.)
  document.querySelectorAll('[data-link]').forEach((link) => {
    if (link.classList.contains('show-carousel') || link.classList.contains('close-button')) {
      return;
    }
    link.addEventListener('click', (e) => {
      e.preventDefault();
      showSection(link.dataset.link);
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
});