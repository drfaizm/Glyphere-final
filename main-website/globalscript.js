/* =====================================================
   GLYPHERE — GLOBAL JAVASCRIPT
   Shared across all pages.
   ===================================================== */



/* ─────────────────────────────────────────
   2. PRELOADER
   Fades out the preloader after page load
   and reveals the main content.
───────────────────────────────────────── */
window.addEventListener('load', function () {
  const preloader = document.getElementById('preloader');
  const content = document.getElementById('content');

  setTimeout(function () {
    preloader.classList.add('hide');
    if (content) content.classList.add('show');

    setTimeout(function () {
      preloader.style.display = 'none';
    }, 800); // matches CSS fade duration
  }, 1200);    // initial delay before hiding
});
/* ─────────────────────────────────────────
   1. NAV SCROLL SHADOW
   Adds .scrolled class to #header when
   user scrolls past 300px.
───────────────────────────────────────── */
window.addEventListener('scroll', function () {
  const header = document.querySelector('.header-nav');
  if (!header) return;
  header.classList.toggle('scrolled', window.scrollY > 300);
});

/* ─────────────────────────────────────────
   3. SCROLL-AWARE NAV THEME
   Switches nav between dark and light
   styles depending on which section is
   currently behind the header.

   USAGE: Define dark section selectors
   before loading this script:

     window.DARK_SECTIONS = [
       '.specimens-section',
       '.process-section'
     ];

   If not defined, no theme switching occurs.
───────────────────────────────────────── */
(function () {
  'use strict';

  var header = document.querySelector('.header-nav');
  var navInner = document.querySelector('.nav-inner');
  if (!header || !navInner) return;

  var darkSectionSelectors = window.DARK_SECTIONS || [];
  if (darkSectionSelectors.length === 0) return;

  var sectionMap = [];

  var OBSERVED_SECTIONS = [
    '.content-section',
    '.font-tester-section',
    '.specimens-section',
    '.about-section',
    '.testimonials-section',
    '.process-section',
    '.cta-section',
    '.site-footer'
  ].join(',');

  function buildSectionMap() {
    sectionMap = [];
    document.querySelectorAll(OBSERVED_SECTIONS).forEach(function (el) {
      var isDark = darkSectionSelectors.some(function (sel) {
        return el.matches(sel);
      });
      sectionMap.push({ el: el, isDark: isDark });
    });
  }

  function getSectionAtHeaderBottom() {
    var headerBottom = header.getBoundingClientRect().bottom + window.scrollY;
    for (var i = 0; i < sectionMap.length; i++) {
      var item = sectionMap[i];
      var rect = item.el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      var top = rect.top + window.scrollY;
      var bottom = rect.bottom + window.scrollY;
      if (headerBottom >= top && headerBottom < bottom) return item;
    }
    return null;
  }

  var currentlyLight = false;
  var currentlyShrunk = false;
  var ticking = false;

  function updateHeader() {
    var shouldShrink = window.scrollY > 80;
    if (shouldShrink !== currentlyShrunk) {
      header.classList.toggle('nav--shrink', shouldShrink);
      currentlyShrunk = shouldShrink;
    }

    var section = getSectionAtHeaderBottom();
    var shouldBeLight = section ? section.isDark : false;
    if (shouldBeLight !== currentlyLight) {
      navInner.classList.toggle('nav--light', shouldBeLight);
      currentlyLight = shouldBeLight;
    }
  }

  buildSectionMap();
  window.addEventListener('resize', buildSectionMap, { passive: true });

  window.addEventListener('scroll', function () {
    if (!ticking) {
      requestAnimationFrame(function () {
        updateHeader();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  updateHeader();
})();

/* ─────────────────────────────────────────
   4. HAMBURGER MENU TOGGLE
───────────────────────────────────────── */
(function () {
  'use strict';

  var hamburger = document.querySelector('.nav-hamburger');
  var mobileMenu = document.querySelector('.nav-mobile-menu');
  var previewBar = document.querySelector('.mp-preview-bar');
  var body = document.body;

  if (!hamburger || !mobileMenu) return;

  function openMenu() {
    hamburger.classList.add('is-open');
    mobileMenu.classList.add('is-open');
    body.style.overflow = 'hidden'; // scroll band
    hamburger.setAttribute('aria-expanded', 'true');
    if (previewBar) previewBar.style.visibility = 'hidden';
  }

  function closeMenu() {
    hamburger.classList.remove('is-open');
    mobileMenu.classList.remove('is-open');
    body.style.overflow = '';
    hamburger.setAttribute('aria-expanded', 'false');
    if (previewBar) previewBar.style.visibility = 'visible';
  }

  function toggleMenu() {
    if (hamburger.classList.contains('is-open')) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  hamburger.addEventListener('click', toggleMenu);

  // Mobile menu links click pe band ho jaye
  mobileMenu.querySelectorAll('.nav-mobile-menu__link, .nav-mobile-menu__login, .nav-mobile-menu__signup')
    .forEach(function (el) {
      el.addEventListener('click', closeMenu);
    });

  // ESC key se band karo
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenu();
  });

  // Resize pe agar desktop ho gaya toh band karo
  window.addEventListener('resize', function () {
    if (window.innerWidth >= 1024) closeMenu();
  });
})();

