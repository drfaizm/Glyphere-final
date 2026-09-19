/**
 * loginModal.js — Glyphere Login / Register Modal
 * ─────────────────────────────────────────────────
 * Drop this file in public_html/javascript/
 * Then add to index.html  (before </body>):
 *
 *   <link rel="stylesheet" href="../javascript/loginModal.css">
 *   <script src="../javascript/loginModal.js" defer></script>
 *
 * The script intercepts .nav-login / .nav-signup clicks
 * (and their mobile counterparts) and opens a modal instead
 * of navigating to localhost:5173.
 */

(function () {
  'use strict';

  /* ── Backend base URL (change if needed) ── */
  var API_BASE = 'http://localhost:5000';

  /* ─────────────────────────────────────────
     1. INJECT MODAL HTML
  ───────────────────────────────────────── */
  var MODAL_HTML = '\
<div class="glm-backdrop" id="glmBackdrop" role="dialog" aria-modal="true" aria-label="Login / Register">\
  <div class="glm-card" id="glmCard">\
\
    <!-- Close button -->\
    <button class="glm-close" id="glmClose" aria-label="Close">&times;</button>\
\
    <!-- ── Login Form ── -->\
    <div class="glm-form-container glm-sign-in">\
      <form class="glm-form" id="glmLoginForm" novalidate>\
        <h2 class="glm-heading">Login</h2>\
\
        <div class="glm-input-group">\
          <input type="email" id="glmLoginEmail" placeholder="Email" autocomplete="email" required />\
          <i class="fa-solid fa-envelope"></i>\
        </div>\
\
        <div class="glm-input-group">\
          <input type="password" id="glmLoginPass" placeholder="Password" autocomplete="current-password" required />\
          <i class="fa-solid fa-lock"></i>\
        </div>\
\
        <p class="glm-error" id="glmLoginError"></p>\
\
        <button type="submit" class="glm-btn">Login</button>\
\
        <p class="glm-toggle">\
          Don\'t have an account?\
          <span id="glmGoRegister">Sign Up</span>\
        </p>\
      </form>\
    </div>\
\
    <!-- ── Register Form ── -->\
    <div class="glm-form-container glm-sign-up">\
      <form class="glm-form" id="glmRegisterForm" novalidate>\
        <h2 class="glm-heading">Register</h2>\
\
        <div class="glm-input-group">\
          <input type="text" id="glmRegName" placeholder="Username" autocomplete="username" required />\
          <i class="fa-solid fa-user"></i>\
        </div>\
\
        <div class="glm-input-group">\
          <input type="email" id="glmRegEmail" placeholder="Email" autocomplete="email" required />\
          <i class="fa-solid fa-envelope"></i>\
        </div>\
\
        <div class="glm-input-group">\
          <input type="password" id="glmRegPass" placeholder="Password" autocomplete="new-password" required />\
          <i class="fa-solid fa-lock"></i>\
        </div>\
\
        <div class="glm-input-group">\
          <input type="password" id="glmRegConfirm" placeholder="Confirm Password" autocomplete="new-password" required />\
          <i class="fa-solid fa-lock"></i>\
        </div>\
\
        <p class="glm-error" id="glmRegError"></p>\
\
        <button type="submit" class="glm-btn">Register</button>\
\
        <p class="glm-toggle">\
          Already have an account?\
          <span id="glmGoLogin">Sign In</span>\
        </p>\
      </form>\
    </div>\
\
    <!-- ── Diagonal Overlay Panel ── -->\
    <div class="glm-overlay">\
      <div class="glm-overlay-panel glm-overlay-left">\
        <h2>WELCOME!</h2>\
        <p>We are happy to have you with us again. If you need anything, we are here to help.</p>\
      </div>\
      <div class="glm-overlay-panel glm-overlay-right">\
        <h2>WELCOME BACK!</h2>\
        <p>We\'re delighted to have you here. If you need any assistance, feel free to reach out.</p>\
      </div>\
    </div>\
\
  </div>\
</div>';

  /* Inject into body */
  var wrapper = document.createElement('div');
  wrapper.innerHTML = MODAL_HTML;
  document.body.appendChild(wrapper.firstChild);

  /* ─────────────────────────────────────────
     2. ELEMENT REFERENCES
  ───────────────────────────────────────── */
  var backdrop = document.getElementById('glmBackdrop');
  var card = document.getElementById('glmCard');
  var closeBtn = document.getElementById('glmClose');
  var loginForm = document.getElementById('glmLoginForm');
  var registerForm = document.getElementById('glmRegisterForm');
  var loginError = document.getElementById('glmLoginError');
  var regError = document.getElementById('glmRegError');
  var goRegister = document.getElementById('glmGoRegister');
  var goLogin = document.getElementById('glmGoLogin');

  /* ─────────────────────────────────────────
     3. STATE
  ───────────────────────────────────────── */
  var isLoginMode = true;   /* true = login panel visible */

  /* ─────────────────────────────────────────
     4. OPEN / CLOSE
  ───────────────────────────────────────── */
  function openModal(mode) {
    isLoginMode = (mode !== 'register');
    syncMode();
    clearErrors();
    clearInputs();
    backdrop.classList.add('glm-open');
    document.body.style.overflow = 'hidden';   /* prevent page scroll behind modal */

    /* Focus first input after animation */
    setTimeout(function () {
      var firstInput = card.querySelector('.glm-sign-in input, .glm-sign-up input');
      if (firstInput) firstInput.focus();
    }, 350);
  }

  function closeModal() {
    backdrop.classList.remove('glm-open');
    document.body.style.overflow = '';
  }

  /* ─────────────────────────────────────────
     5. MODE TOGGLE (login ↔ register)
  ───────────────────────────────────────── */
  function syncMode() {
    if (isLoginMode) {
      card.classList.add('glm-login-active');
    } else {
      card.classList.remove('glm-login-active');
    }
  }

  function toggleMode() {
    isLoginMode = !isLoginMode;
    clearErrors();
    clearInputs();
    syncMode();
  }

  /* ─────────────────────────────────────────
     6. HELPERS
  ───────────────────────────────────────── */
  function clearErrors() {
    loginError.textContent = '';
    regError.textContent = '';
  }

  function clearInputs() {
    loginForm.reset();
    registerForm.reset();
  }

  function setError(el, msg) {
    el.textContent = msg;
  }

  /* ─────────────────────────────────────────
     7. FORM SUBMISSIONS
  ───────────────────────────────────────── */
  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    clearErrors();

    var email = document.getElementById('glmLoginEmail').value.trim();
    var password = document.getElementById('glmLoginPass').value;

    if (!email || !password) {
      setError(loginError, 'Please fill in all fields.');
      return;
    }

    submitToApi('/api/auth/login', { email: email, password: password }, loginError, function (data) {
      localStorage.setItem('token', data.token);
      showSuccess('Welcome back!', 'You have successfully logged in.');
    });
  });

  registerForm.addEventListener('submit', function (e) {
    e.preventDefault();
    clearErrors();

    var name = document.getElementById('glmRegName').value.trim();
    var email = document.getElementById('glmRegEmail').value.trim();
    var password = document.getElementById('glmRegPass').value;
    var confirm = document.getElementById('glmRegConfirm').value;

    if (!name || !email || !password || !confirm) {
      setError(regError, 'Please fill in all fields.');
      return;
    }
    if (password !== confirm) {
      setError(regError, 'Passwords do not match.');
      return;
    }

    submitToApi('/api/auth/register', { name: name, email: email, password: password }, regError, function (data) {
      localStorage.setItem('token', data.token);
      showSuccess('You\'re in!', 'Your account has been created successfully.');
    });
  });

  /* ─────────────────────────────────────────
     8. API CALL
  ───────────────────────────────────────── */
  function submitToApi(endpoint, body, errorEl, onSuccess) {
    fetch(API_BASE + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (result.ok) {
          onSuccess(result.data);
        } else {
          setError(errorEl, result.data.msg || 'Something went wrong. Try again.');
        }
      })
      .catch(function () {
        setError(errorEl, 'Could not connect to server. Make sure the backend is running.');
      });
  }

  /* ─────────────────────────────────────────
     9. SUCCESS SCREEN
  ───────────────────────────────────────── */
  function showSuccess(title, msg) {
    /* Replace card content temporarily */
    var right = card.querySelector('.glm-sign-up');
    var left = card.querySelector('.glm-sign-in');
    var overlay = card.querySelector('.glm-overlay');

    if (right) right.style.display = 'none';
    if (left) left.style.display = 'none';
    if (overlay) overlay.style.display = 'none';

    var successDiv = document.createElement('div');
    successDiv.className = 'glm-success';
    successDiv.innerHTML =
      '<div class="glm-success__icon">✓</div>' +
      '<div class="glm-success__title">' + title + '</div>' +
      '<div class="glm-success__msg">' + msg + '</div>';
    card.appendChild(successDiv);

    /* Auto-close after 2 s */
    setTimeout(function () {
      closeModal();

      /* Restore after close animation */
      setTimeout(function () {
        successDiv.remove();
        if (right) right.style.display = '';
        if (left) left.style.display = '';
        if (overlay) overlay.style.display = '';
      }, 350);
    }, 2000);
  }

  /* ─────────────────────────────────────────
     10. EVENT LISTENERS
  ───────────────────────────────────────── */

  /* Close button */
  closeBtn.addEventListener('click', closeModal);

  /* Click outside card → close */
  backdrop.addEventListener('click', function (e) {
    if (e.target === backdrop) closeModal();
  });

  /* ESC key → close */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });

  /* Toggle inside modal */
  goRegister.addEventListener('click', toggleMode);
  goLogin.addEventListener('click', toggleMode);

  /* ─────────────────────────────────────────
     11. INTERCEPT NAV BUTTONS
     Disabled to allow standard navigation directly
     to the new, premium signup-login.html page.
   ───────────────────────────────────────── */
  function interceptNavButtons() {
      // Standard link navigation to signup-login.html is active.
  }

  /* Run after DOM is ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', interceptNavButtons);
  } else {
    interceptNavButtons();
  }

})();