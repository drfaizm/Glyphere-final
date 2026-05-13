window.addEventListener("load", () => {
  const preloader = document.getElementById("preloader");
  const content = document.getElementById("content");

  // keep loader for extra time (e.g. 2 seconds)
  setTimeout(() => {
    preloader.classList.add("hide");
    content.classList.add("show");

    setTimeout(() => {
      preloader.style.display = "none";
    }, 800); // matches fade duration
  },
    1500); // 👈 delay time
});

window.addEventListener("scroll", function () {
  const header = document.getElementById("header");

  if (window.scrollY > 300) {   // after 300px scroll
    header.classList.add("scrolled");
  } else {
    header.classList.remove("scrolled");
  }
});
const testimonialSwiper = new Swiper(".mySwiper", {
  effect: "coverflow",
  centeredSlides: true,
  loop: true,
  grabCursor: true,
  slidesPerView: "3",
  coverflowEffect: {
    rotate: 0,
    stretch: -120,
    depth: 250,
    modifier: 1,
    slideShadows: false,
  },
  autoplay: {
    delay: 4000,
    disableOnInteraction: false,
  },
  pagination: {
    el: ".swiper-pagination",
    clickable: true,
  },
});

const testimonialCards = document.querySelectorAll(".tilt-card");
testimonialCards.forEach(card => {
  card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
  });
  card.addEventListener("mouseleave", () => {
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)`;
  });
});

const input = document.getElementById('testerInput');
const fontFamily = document.getElementById('fontFamily');
const fontSize = document.getElementById('fontSize');
const lineHeight = document.getElementById('lineHeight');
const letterSpacing = document.getElementById('letterSpacing');
const fontWeight = document.getElementById('fontWeight');
const italicToggle = document.getElementById('italicToggle');
const summaryText = document.getElementById('summaryText');
const fontSizeVal = document.getElementById('fontSizeVal');
const lineHeightVal = document.getElementById('lineHeightVal');
const letterSpacingVal = document.getElementById('letterSpacingVal');
const fontWeightVal = document.getElementById('fontWeightVal');

function updateStyles() {
  if (!input) return;
  input.style.fontSize = fontSize.value + 'px';
  input.style.lineHeight = lineHeight.value;
  input.style.letterSpacing = letterSpacing.value + 'px';
  input.style.fontWeight = fontWeight.value;
  input.style.fontStyle = italicToggle.checked ? 'italic' : 'normal';
  input.classList.remove('font-headline', 'font-body', 'font-serif', 'font-mono');
  input.classList.add(fontFamily.value);

  fontSizeVal.textContent = fontSize.value + 'px';
  lineHeightVal.textContent = lineHeight.value;
  letterSpacingVal.textContent = letterSpacing.value + 'px';
  fontWeightVal.textContent = fontWeight.value;

  const fontName = fontFamily.options[fontFamily.selectedIndex].text.split(' ')[0];
  summaryText.textContent = `${fontName}, ${fontSize.value}px, ${lineHeight.value}LH, ${letterSpacing.value}LS, ${fontWeight.value}W`;

  // Toggle visual update
  const dot = document.querySelector('#italicToggle ~ .dot');
  const bg = document.querySelector('#italicToggle ~ .toggle-track');
  if (italicToggle.checked) {
    if (dot) dot.style.transform = 'translateX(1.25rem)';
    if (bg) { bg.style.backgroundColor = 'var(--color-primary)'; }
  } else {
    if (dot) dot.style.transform = 'translateX(0)';
    if (bg) { bg.style.backgroundColor = '#e2e8f0'; }
  }
}

if (fontFamily) {
  [fontFamily, fontSize, lineHeight, letterSpacing, fontWeight, italicToggle].forEach(el => {
    el.addEventListener('input', updateStyles);
  });
}

const bgBtns = {
  'bgWhite': { bg: '#ffffff', textColor: '#2a2a2a', outline: '2px solid var(--color-primary)' },
  'bgBlack': { bg: '#2a2a2a', textColor: '#ffffff', outline: '2px solid #ffffff' },
  'bgGrey': { bg: '#e2e8f0', textColor: '#2a2a2a', outline: '2px solid #94a3b8' }
};

Object.keys(bgBtns).forEach(id => {
  const btn = document.getElementById(id);
  if (btn) {
    btn.addEventListener('click', function () {
      Object.keys(bgBtns).forEach(key => {
        const b = document.getElementById(key);
        if (b) b.style.outline = 'none';
      });
      this.style.outline = bgBtns[id].outline;
      this.style.outlineOffset = '2px';
      const previewArea = input.parentElement;
      previewArea.style.backgroundColor = bgBtns[id].bg;
      input.style.color = bgBtns[id].textColor;
    });
  }
});

const resetBtn = document.getElementById('resetBtn');
if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    fontFamily.value = 'font-headline';
    fontSize.value = 48;
    lineHeight.value = 1.2;
    letterSpacing.value = 0;
    fontWeight.value = 700;
    italicToggle.checked = false;
    updateStyles();
  });
}



var statEl = document.getElementById('bbStat');
var start = null;
(function step(ts) {
  if (!start) start = ts;
  var p = Math.min((ts - start) / 1800, 1);
  var e = 1 - Math.pow(1 - p, 3);
  statEl.textContent = Math.round(e * 240);
  if (p < 1) requestAnimationFrame(step);
})(performance.now());

var visEl = document.getElementById('bbVisitors');
var vis = 24;
setInterval(function () {
  var d = Math.random() > 0.5 ? 1 : -1;
  if (Math.random() > 0.7) d *= 2;
  vis = Math.max(18, Math.min(41, vis + d));
  visEl.textContent = vis;
}, 2400);

// guard against missing elements
var statEl = document.getElementById('bbStat');
if (statEl) {
  var start = null;
  (function step(ts) {
    if (!start) start = ts;
    var p = Math.min((ts - start) / 1800, 1);
    var e = 1 - Math.pow(1 - p, 3);
    statEl.textContent = Math.round(e * 240);
    if (p < 1) requestAnimationFrame(step);
  })(performance.now());
}

var visEl = document.getElementById('bbVisitors');
if (visEl) {
  var vis = 24;
  setInterval(function () {
    var d = Math.random() > 0.5 ? 1 : -1;
    if (Math.random() > 0.7) d *= 2;
    vis = Math.max(18, Math.min(41, vis + d));
    visEl.textContent = vis;
  }, 2400);
}

var typingDone = false;

var observer = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting && !typingDone) {
      typingDone = true;
      observer.disconnect();

      var word = 'Hall of Specimens';
      var typedEl = document.getElementById('twTyped');
      var cursorEl = document.getElementById('twCursor');

      if (!typedEl || !cursorEl) return;

      var charIndex = 0;

      function type() {
        if (charIndex <= word.length) {
          typedEl.textContent = word.substring(0, charIndex);
          charIndex++;
          setTimeout(type, 65 + Math.random() * 25);
        } else {
          setTimeout(function () {
            cursorEl.classList.add('hidden');
          }, 800);
        }
      }

      type();
    }
  });
}, { threshold: 0.3 });

var specimensSection = document.querySelector('.specimens-section');
if (specimensSection) {
  observer.observe(specimensSection);
}

(function () {
  var steps = document.querySelectorAll('.process-step');
  var bottom = document.getElementById('processBottom');

  if (!('IntersectionObserver' in window)) {
    steps.forEach(function (s) { s.classList.add('ps-visible'); });
    if (bottom) bottom.classList.add('ps-visible');
    return;
  }

  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('ps-visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  steps.forEach(function (s) { obs.observe(s); });
  if (bottom) obs.observe(bottom);
})();
