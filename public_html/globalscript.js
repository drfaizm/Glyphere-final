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

  if (preloader) {
    setTimeout(function () {
      preloader.classList.add('hide');
      if (content) content.classList.add('show');

      setTimeout(function () {
        preloader.style.display = 'none';
      }, 800);
    }, 1200);
  } else if (content) {
    content.classList.add('show');
  }
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


/* ─────────────────────────────────────────
   5. CART BADGE — GLOBAL SYNC
   Reads glyphereCart from localStorage on
   every page load and listens for updates.
───────────────────────────────────────── */
(function () {
  'use strict';

  function syncCartBadge() {
    var badge = document.getElementById('navCartBadge');
    if (!badge) return;
    var cart = [];
    try { cart = JSON.parse(localStorage.getItem('glyphereCart') || '[]'); } catch (e) {}
    var count = cart.reduce(function (s, i) { return s + (i.qty || 1); }, 0);
    badge.textContent = count;
    badge.setAttribute('data-count', count);
    badge.style.transform = count > 0 ? 'scale(1)' : 'scale(0)';
  }

  document.addEventListener('DOMContentLoaded', syncCartBadge);
  window.addEventListener('storage', function (e) {
    if (e.key === 'glyphereCart') syncCartBadge();
  });
  window.addEventListener('cartUpdated', syncCartBadge);
})();

/* ─────────────────────────────────────────
   6. USER SESSION — GLOBAL NAVIGATION SYNC
   Checks for active sessions and renders
   premium profile avatars dynamically.
───────────────────────────────────────── */
(function () {
  'use strict';

  function syncUserNavigation() {
    var currentUser = null;
    try {
      currentUser = JSON.parse(localStorage.getItem('glyphere_current_user') || 'null');
    } catch (e) {
      console.error('Error parsing user session:', e);
    }

    if (!currentUser) return;

    // ── Desktop Navigation Replacement ──
    var navSignups = document.querySelectorAll('.nav-signup');
    navSignups.forEach(function (btn) {
      // Check if already replaced
      if (btn.parentNode && btn.parentNode.classList.contains('nav-user-avatar-container')) return;

      var container = document.createElement('div');
      container.className = 'nav-user-avatar-container';
      container.innerHTML = '\
        <div class="nav-user-avatar" title="' + currentUser.name + '">\
          <svg viewBox="0 0 24 24">\
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>\
            <circle cx="12" cy="7" r="4"></circle>\
          </svg>\
        </div>\
        <div class="nav-user-dropdown">\
          <div class="nav-user-dropdown__header">\
            <span class="nav-user-dropdown__name">' + currentUser.name + '</span>\
            <span class="nav-user-dropdown__email">' + currentUser.email + '</span>\
          </div>\
          <div class="nav-user-dropdown__divider"></div>\
          <a class="nav-user-dropdown__item" href="/marketplace.html">\
            <svg viewBox="0 0 24 24">\
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>\
              <polyline points="2 17 12 22 22 17"></polyline>\
              <polyline points="2 12 12 17 22 12"></polyline>\
            </svg>\
            Explore Marketplace\
          </a>\
          <div class="nav-user-dropdown__divider"></div>\
          <a class="nav-user-dropdown__item nav-user-dropdown__item--logout" id="navLogoutBtn">\
            <svg viewBox="0 0 24 24">\
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>\
              <polyline points="16 17 21 12 16 7"></polyline>\
              <line x1="21" y1="12" x2="9" y2="12"></line>\
            </svg>\
            Log Out\
          </a>\
        </div>\
      ';

      if (btn.parentNode) {
        btn.parentNode.replaceChild(container, btn);
      }
    });

    // ── Mobile Dropdown Navigation Replacement ──
    var mobileSignups = document.querySelectorAll('.nav-mobile-menu__signup');
    mobileSignups.forEach(function (btn) {
      // Check if already replaced
      if (btn.parentNode && btn.parentNode.classList.contains('mobile-user-card')) return;

      var card = document.createElement('div');
      card.className = 'mobile-user-card';
      card.innerHTML = '\
        <div class="mobile-user-card__avatar">\
          <svg viewBox="0 0 24 24">\
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>\
            <circle cx="12" cy="7" r="4"></circle>\
          </svg>\
        </div>\
        <span class="mobile-user-card__name">' + currentUser.name + '</span>\
        <span class="mobile-user-card__email">' + currentUser.email + '</span>\
        <a class="mobile-user-card__logout" href="/marketplace.html" style="background: rgba(201, 171, 129, 0.12); border: 1px solid rgba(201, 171, 129, 0.25); color: var(--gold); margin-bottom: 0.5rem; text-decoration: none;">\
          <svg viewBox="0 0 24 24" style="stroke: currentColor;"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>\
          Marketplace\
        </a>\
        <button class="mobile-user-card__logout" id="mobileLogoutBtn">\
          <svg viewBox="0 0 24 24">\
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>\
            <polyline points="16 17 21 12 16 7"></polyline>\
            <line x1="21" y1="12" x2="9" y2="12"></line>\
          </svg>\
          Log Out\
        </button>\
      ';

      if (btn.parentNode) {
        var parent = btn.parentNode;
        
        // Hide mobile login link if present
        var mobileLogin = parent.querySelector('.nav-mobile-menu__login');
        if (mobileLogin) {
          mobileLogin.style.display = 'none';
        }

        parent.replaceChild(card, btn);
      }
    });
  }

  // Bind interactions globally
  document.addEventListener('DOMContentLoaded', syncUserNavigation);
  
  // Watch for storage changes (allows instant synchronization across multiple tabs)
  window.addEventListener('storage', function (e) {
    if (e.key === 'glyphere_current_user') {
      syncUserNavigation();
    }
  });

  // Event delegation to capture logouts seamlessly
  document.addEventListener('click', function (e) {
    var logoutBtn = e.target.closest('#navLogoutBtn, #mobileLogoutBtn');
    if (logoutBtn) {
      e.preventDefault();
      localStorage.removeItem('glyphere_current_user');
      window.dispatchEvent(new Event('storage'));
      window.location.reload();
    }
  });

})();

/* ─────────────────────────────────────────
   7. ACTIVE NAVIGATION LINK AUTO-HIGHLIGHT
   Automatically highlights the active top-level
   and mobile navigation links based on URL.
───────────────────────────────────────── */
(function () {
  'use strict';

  function syncActiveNavigation() {
    var path = (window.location.pathname || '').toLowerCase();
    var allLinks = document.querySelectorAll('.nav-link, .nav-mobile-menu__link');
    if (!allLinks.length) return;

    var currentSection = null;
    if (path.indexOf('marketplace') !== -1 || path.indexOf('font-detail') !== -1 || path.indexOf('/fonts/') !== -1) {
      currentSection = 'marketplace';
    } else if (path.indexOf('custom_font_services') !== -1 || path.indexOf('services') !== -1) {
      currentSection = 'services';
    } else if (path.indexOf('/blog') !== -1 || path.indexOf('journal') !== -1) {
      currentSection = 'journal';
    } else if (path.indexOf('about') !== -1) {
      currentSection = 'about';
    }

    allLinks.forEach(function (link) {
      var href = (link.getAttribute('href') || '').toLowerCase();
      var isMatch = false;

      if (currentSection === 'marketplace' && (href.indexOf('marketplace') !== -1 || href.indexOf('font-detail') !== -1)) {
        isMatch = true;
      } else if (currentSection === 'services' && (href.indexOf('custom_font_services') !== -1 || href.indexOf('services') !== -1)) {
        isMatch = true;
      } else if (currentSection === 'journal' && (href.indexOf('/blog') !== -1 || href.indexOf('journal') !== -1)) {
        isMatch = true;
      } else if (currentSection === 'about' && href.indexOf('about') !== -1) {
        isMatch = true;
      }

      if (isMatch) {
        link.classList.add('active', 'nav-link--active');
        link.setAttribute('aria-current', 'page');
      } else if (currentSection !== null) {
        link.classList.remove('active', 'nav-link--active');
        link.removeAttribute('aria-current');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncActiveNavigation);
  } else {
    syncActiveNavigation();
  }
})();

/* ─────────────────────────────────────────
   8. GLYPHERE TYPOGRAPHY SHIELD
   Disables right-click inspection & DevTools
   shortcuts to protect proprietary typography.
   Allows normal typing in text inputs/areas.
───────────────────────────────────────── */
(function () {
  'use strict';

  var toastTimer = null;

  function showShieldToast(message) {
    var toast = document.getElementById('glyphereShieldToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'glyphereShieldToast';
      toast.style.cssText = [
        'position: fixed',
        'bottom: 28px',
        'left: 50%',
        'transform: translateX(-50%) translateY(20px)',
        'background: rgba(22, 19, 16, 0.95)',
        'color: #e5c992',
        'border: 1px solid rgba(201, 152, 70, 0.45)',
        'box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7), 0 0 24px rgba(201, 152, 70, 0.25)',
        'padding: 12px 22px',
        'border-radius: 100px',
        'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        'font-size: 0.8125rem',
        'font-weight: 500',
        'letter-spacing: 0.02em',
        'display: flex',
        'align-items: center',
        'gap: 10px',
        'z-index: 999999999',
        'opacity: 0',
        'pointer-events: none',
        'transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'backdrop-filter: blur(14px)',
        '-webkit-backdrop-filter: blur(14px)',
        'max-width: 90vw',
        'white-space: nowrap'
      ].join(';');

      toast.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#d4a853" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg><span id="glyphereShieldText"></span>';
      document.body.appendChild(toast);
    }

    var textEl = document.getElementById('glyphereShieldText');
    if (textEl) textEl.textContent = message || 'Protected by Glyphere Typography Shield';

    requestAnimationFrame(function () {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
    }, 2600);
  }

  // 1. Disable Right-Click (Context Menu) except on inputs/textareas
  document.addEventListener('contextmenu', function (e) {
    var tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
    var isEditable = e.target && (e.target.isContentEditable || tag === 'input' || tag === 'textarea');
    if (isEditable) return; // Allow normal right-click paste/copy in text inputs

    e.preventDefault();
    e.stopPropagation();
    showShieldToast('Protected by Glyphere Typography Shield • Right-click disabled');
    return false;
  }, { capture: true });

  // 2. Block DevTools and Source View Keyboard Shortcuts (Chrome, Safari, Firefox, Edge)
  document.addEventListener('keydown', function (e) {
    var key = (e.key || '').toLowerCase();
    var code = e.code || '';
    var keyCode = e.keyCode || 0;
    var isCtrlOrCmd = e.ctrlKey || e.metaKey;
    var isShift = e.shiftKey;
    var isAlt = e.altKey;

    // F12
    if (key === 'f12' || code === 'F12' || keyCode === 123) {
      e.preventDefault();
      e.stopPropagation();
      showShieldToast('Developer tools are disabled to protect proprietary typography');
      return false;
    }

    // Ctrl+Shift+I / Cmd+Option+I (Inspect Element) - Handles Mac Safari dead-key (Option+I produces ˆ)
    if (isCtrlOrCmd && (isShift || isAlt) && (key === 'i' || key === 'ˆ' || code === 'KeyI' || keyCode === 73)) {
      e.preventDefault();
      e.stopPropagation();
      showShieldToast('Developer inspection is disabled to protect proprietary typography');
      return false;
    }

    // Ctrl+Shift+J / Cmd+Option+J (Console) - Handles Mac Safari Option+J (produces ∆)
    if (isCtrlOrCmd && (isShift || isAlt) && (key === 'j' || key === '∆' || code === 'KeyJ' || keyCode === 74)) {
      e.preventDefault();
      e.stopPropagation();
      showShieldToast('Developer console is disabled');
      return false;
    }

    // Ctrl+Shift+C / Cmd+Option+C (Inspect Element cursor) - Handles Mac Safari Option+C (produces ç)
    if (isCtrlOrCmd && (isShift || isAlt) && (key === 'c' || key === 'ç' || code === 'KeyC' || keyCode === 67)) {
      e.preventDefault();
      e.stopPropagation();
      showShieldToast('Element inspection is disabled');
      return false;
    }

    // Ctrl+U / Cmd+Option+U (View Source) - Handles Mac Safari Option+U (produces ¨)
    if (isCtrlOrCmd && (key === 'u' || key === '¨' || code === 'KeyU' || keyCode === 85)) {
      e.preventDefault();
      e.stopPropagation();
      showShieldToast('Source viewing is disabled');
      return false;
    }

    // Ctrl+S / Cmd+S (Save Page)
    if (isCtrlOrCmd && (key === 's' || code === 'KeyS' || keyCode === 83)) {
      e.preventDefault();
      e.stopPropagation();
      showShieldToast('Page saving is disabled');
      return false;
    }
  }, { capture: true });

  // 3. Prevent dragging font specimen elements / cards
  document.addEventListener('dragstart', function (e) {
    var tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
    if (tag === 'img' || tag === 'svg' || (e.target && e.target.classList && e.target.classList.contains('font-card'))) {
      e.preventDefault();
    }
  }, { passive: false });

})();


