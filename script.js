/* ============================================================
   To my Paatu 🤍 — birthday letter
   script.js — vanilla JavaScript, no dependencies
   ------------------------------------------------------------
   A. Helpers
   B. Ambient floating hearts / particles
   C. Scene state machine — the envelope opening timeline
   D. Scene 4 — ending reveal + confetti
   E. Replay
   F. Background music — the original MP3, started by the envelope tap
   G. Photo slideshow — 22 pictures crossfaded behind the letter
   H. Init
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- A. Helpers ---------------- */

  var body           = document.body;
  var stage          = document.getElementById('stage');
  var openBtn        = document.getElementById('openBtn');
  var letterScene    = document.getElementById('letterScene');
  var letterHeading  = document.getElementById('letterHeading');
  var ending         = document.getElementById('ending');
  var replayBtn      = document.getElementById('replayBtn');
  var ambient        = document.getElementById('ambient');
  var confettiCanvas = document.getElementById('confetti');
  var bgMusic        = document.getElementById('bgMusic');
  var slideA         = document.getElementById('slideA');
  var slideB         = document.getElementById('slideB');

  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  function reducedMotion() { return motionQuery.matches; }

  var timers = [];
  function after(ms, fn) { timers.push(window.setTimeout(fn, ms)); }
  function clearTimers() { timers.forEach(window.clearTimeout); timers.length = 0; }

  function rand(min, max) { return min + Math.random() * (max - min); }

  /* ---------------- B. Ambient floating hearts ---------------- */

  function createAmbient() {
    if (!ambient || reducedMotion()) return;   // decorative — skipped when reduced motion is requested

    var frag = document.createDocumentFragment();
    for (var i = 0; i < 18; i++) {
      var s = document.createElement('span');
      var isHeart = Math.random() < 0.45;

      s.className = 'particle ' + (isHeart ? 'particle--heart' : 'particle--dot');
      s.style.setProperty('--x', rand(2, 98).toFixed(2) + '%');
      s.style.setProperty('--size', (isHeart ? rand(11, 19) : rand(5, 9)).toFixed(1) + 'px');
      s.style.setProperty('--dur', rand(14, 26).toFixed(1) + 's');
      s.style.setProperty('--delay', (-rand(0, 24)).toFixed(1) + 's');
      s.style.setProperty('--sway', rand(-60, 60).toFixed(0) + 'px');
      s.style.setProperty('--alpha', rand(0.28, 0.6).toFixed(2));

      if (isHeart) s.textContent = '♥';
      frag.appendChild(s);
    }
    ambient.appendChild(frag);
  }

  /* ---------------- C. Scene state machine ----------------
     sealed → opening (wax seal → flap → letter slides out) → reading
     The `state` variable is the guard that makes repeated clicks safe. */

  var state = 'sealed';

  function openEnvelope() {
    if (state !== 'sealed') return;            // ignore extra clicks / taps mid-animation
    state = 'opening';

    startMusic();                              // still inside the user gesture → autoplay allowed

    body.classList.remove('is-sealed');
    body.classList.add('is-opening');          // stage 1: the wax seal breaks (CSS animation)

    var fast = reducedMotion();

    /* timeline stages (ms) — shortened when the user prefers reduced motion */
    var tSeal   = fast ? 150 : 480;   // wax seal breaks
    var tFlap   = fast ? 120 : 430;   // flap rotates open in 3D
    var tLetter = fast ? 160 : 900;   // letter card slides out of the pocket

    after(tSeal, function () {                 // stage 2
      body.classList.add('is-flap-open');
    });

    after(tSeal + tFlap, function () {         // stage 3
      body.classList.add('is-letter-out');
    });

    after(tSeal + tFlap + tLetter, showLetter); // stage 4: cross-fade to the reading view
  }

  /* hand the screen over to the letter itself */
  function showLetter() {
    state = 'reading';

    letterScene.scrollTop = 0;                 // always start at the very top of the letter
    body.classList.add('is-reading');          // fades the envelope out, the paper in (CSS)

    /* accessibility: the hidden scene becomes visible, the old one is switched off.
       Focus is moved into the letter FIRST, so no focused element ever gets
       hidden behind aria-hidden / inert. */
    letterScene.removeAttribute('aria-hidden');
    letterScene.inert = false;

    if (letterHeading && letterHeading.focus) {
      letterHeading.focus({ preventScroll: true });
    }

    stage.setAttribute('aria-hidden', 'true');
    stage.inert = true;

    startSlideshow();                          // photo backdrop begins with the reading view
    observeEnding();                           // arm the Scene 4 reveal
  }

  /* ---------------- D. Scene 4 — ending reveal + confetti ---------------- */

  var endingObserver = null;

  function observeEnding() {
    if (!('IntersectionObserver' in window)) { revealEnding(); return; }

    if (!endingObserver) {
      endingObserver = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) { revealEnding(); return; }
        }
      }, { root: letterScene, threshold: 0.25 });
    }
    endingObserver.observe(ending);             // (re-)armed on every read-through
  }

  function revealEnding() {
    if (ending.classList.contains('is-revealed')) return;
    ending.classList.add('is-revealed');        // elegant greeting + signature fade in
    if (endingObserver) endingObserver.disconnect();
    startConfetti();
  }

  /* ---- lightweight confetti / floating hearts ---- */

  var confetti = { raf: 0, onResize: null };

  function stopConfetti() {
    if (confetti.raf) window.cancelAnimationFrame(confetti.raf);
    confetti.raf = 0;
    if (confetti.onResize) {
      window.removeEventListener('resize', confetti.onResize);
      confetti.onResize = null;
    }
    if (confettiCanvas && confettiCanvas.getContext) {
      var c = confettiCanvas.getContext('2d');
      if (c) c.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }

  function drawBit(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;

    if (p.heart) {
      var s = p.size / 1.7;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.95);
      ctx.bezierCurveTo(s * 1.45, -s * 0.4, s * 0.45, -s * 1.25, 0, -s * 0.35);
      ctx.bezierCurveTo(-s * 0.45, -s * 1.25, -s * 1.45, -s * 0.4, 0, s * 0.95);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    }
    ctx.restore();
  }

  function startConfetti() {
    if (reducedMotion()) return;                                   // respect reduced motion
    if (!confettiCanvas || !confettiCanvas.getContext) return;

    var ctx = confettiCanvas.getContext('2d');
    if (!ctx) return;

    stopConfetti();

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = window.innerWidth;
    var H = window.innerHeight;

    function size() {
      W = window.innerWidth;
      H = window.innerHeight;
      confettiCanvas.width = Math.round(W * dpr);
      confettiCanvas.height = Math.round(H * dpr);
      confettiCanvas.style.width = W + 'px';
      confettiCanvas.style.height = H + 'px';
    }
    size();

    var colors = ['#6d1526', '#8a1c30', '#d9a3a3', '#e9c9c6', '#c2a05c', '#fffdf6'];
    var count = Math.round(Math.min(110, Math.max(55, W / 8)));
    var bits = [];

    for (var i = 0; i < count; i++) {
      bits.push({
        x: rand(0, W),
        y: rand(-H * 0.5, -10),
        vx: rand(-26, 26),
        vy: rand(70, 200),
        size: rand(6, 12),
        rot: rand(0, Math.PI * 2),
        vr: rand(-3, 3),
        color: colors[(Math.random() * colors.length) | 0],
        heart: Math.random() < 0.3,
        sway: rand(0.6, 1.9),
        phase: rand(0, Math.PI * 2)
      });
    }

    var start = performance.now();
    var last = start;

    function frame(now) {
      var dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      var age = (now - start) / 1000;
      var fade = age > 5.4 ? Math.max(0, 1 - (age - 5.4) / 0.9) : 1;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = fade;

      for (var i = 0; i < bits.length; i++) {
        var p = bits[i];
        p.vy += 46 * dt;                                          // gentle gravity
        p.x += (p.vx + Math.sin((now / 900) * p.sway + p.phase) * 26) * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;

        if (p.y > H + 40) {                                       // recycle from the top
          p.y = -30;
          p.x = rand(0, W);
          p.vy = rand(70, 200);
        }
        drawBit(ctx, p);
      }

      ctx.globalAlpha = 1;

      if (age < 6.3) {
        confetti.raf = window.requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, W, H);
        confetti.raf = 0;
        if (confetti.onResize) {
          window.removeEventListener('resize', confetti.onResize);
          confetti.onResize = null;
        }
      }
    }

    confetti.onResize = size;
    window.addEventListener('resize', confetti.onResize);
    confetti.raf = window.requestAnimationFrame(frame);
  }

  /* ---------------- E. Replay ---------------- */

  function replay() {
    clearTimers();
    state = 'sealed';

    body.classList.remove('is-opening', 'is-flap-open', 'is-letter-out', 'is-reading');
    body.classList.add('is-sealed');

    stopConfetti();
    ending.classList.remove('is-revealed');    // the ending hides itself again
    observeEnding();                           // re-arm the reveal for the next read-through

    letterScene.scrollTop = 0;
    stage.scrollTop = 0;

    /* bring the envelope back first, move focus onto it, and only then
       hide the letter from assistive technology */
    stage.removeAttribute('aria-hidden');
    stage.inert = false;
    openBtn.focus({ preventScroll: true });

    letterScene.setAttribute('aria-hidden', 'true');
    letterScene.inert = true;
  }

  /* ---------------- F. Background music ----------------
     The exact MP3 supplied for this letter
     (assets/music/ORU-KAATHILOLA-NJAN-SnapYT.App.mp3) loops quietly
     underneath everything. There are NO controls by design: playback
     begins on the first tap of the envelope — inside a real user
     gesture, which is what the browser autoplay rules require — and
     keeps running for the rest of the visit.                       */

  var MUSIC_VOLUME = 0.55;                    // gentle background level
  var musicStarted = false;

  function startMusic() {
    if (musicStarted || !bgMusic) return;
    musicStarted = true;

    var played;
    try {
      bgMusic.volume = MUSIC_VOLUME;          // browsers without promise support play at this level
      played = bgMusic.play();
    } catch (err) {
      reportMusicIssue(err && err.message ? err.message : String(err));
      return;
    }

    if (played && typeof played.then === 'function') {
      played.then(fadeMusicIn, function (err) {
        reportMusicIssue(err && err.message ? err.message : String(err));
      });
    }
  }

  /* ease the track in over ~1.5s so it never starts with a jolt */
  function fadeMusicIn() {
    if (!bgMusic) return;
    var steps = 15;
    var i = 0;
    bgMusic.volume = 0;
    var fadeTimer = window.setInterval(function () {
      i += 1;
      bgMusic.volume = Math.min(MUSIC_VOLUME, (MUSIC_VOLUME * i) / steps);
      if (i >= steps) window.clearInterval(fadeTimer);
    }, 100);
  }

  function reportMusicIssue(reason) {
    musicStarted = false;                     // a later tap (replay) may still succeed
    if (window.console && console.warn) {
      console.warn('[music] background music could not start: ' + reason +
                   ' — file: assets/music/ORU-KAATHILOLA-NJAN-SnapYT.App.mp3');
    }
  }

  /* a missing or undecodable file is reported precisely instead of failing silently */
  if (bgMusic) {
    bgMusic.addEventListener('error', function () {
      musicStarted = false;
      if (window.console && console.error) {
        console.error('[music] audio could not be loaded: ' +
                      (bgMusic.getAttribute('src') || '(no src)'));
      }
    });
  }

  /* ---------------- G. Photo slideshow ----------------
     26 photographs, one at a time, crossfaded behind the reading view.
     Two layers take turns, so a picture is fetched only moments before it
     appears — the page stays light even on mobile data. Each layer holds a
     photo (shown whole, never cropped) plus a blurred copy of the same
     photo that fills the rest of the screen.                           */

  var PHOTOS = [
    'assets/photos/1792251138791.jpg',
    'assets/photos/1792251138825.jpg',
    'assets/photos/1792251138854.jpg',
    'assets/photos/1792251138880.jpg',
    'assets/photos/1792251138904.jpg',
    'assets/photos/1792251138932.jpg',
    'assets/photos/1792251138987.jpg',
    'assets/photos/1792251139016.jpg',
    'assets/photos/1792251139042.jpg',
    'assets/photos/1792251139071.jpg',
    'assets/photos/1792251139099.jpg',
    'assets/photos/1792251139131.jpg',
    'assets/photos/1792251139161.jpg',
    'assets/photos/1792251139188.jpg',
    'assets/photos/1792251139219.jpg',
    'assets/photos/1792251139248.jpg',
    'assets/photos/1792251139278.jpg',
    'assets/photos/1792251139309.jpg',
    'assets/photos/1792251139337.jpg',
    'assets/photos/1792251139367.jpg',
    'assets/photos/1792251139395.jpg',
    'assets/photos/1792251139435.jpg',
    'assets/photos/1792255275591.jpg',
    'assets/photos/1792255275613.jpg',
    'assets/photos/1792255275636.jpg',
    'assets/photos/1792255275693.jpg'
  ];

  var SLIDE_MS = 5500;                        // one photo every 5.5s — slow and continuous

  var slideshow = {
    started: false,
    next: 1,                                  // PHOTOS[0] is the opening frame
    active: 0,                                // which of the two layers is showing
    timer: null,
    layers: [slideA, slideB]
  };

  /* each layer is a wrapper div; the <img> inside carries the actual photo */
  function slidePhoto(layer) {
    return layer ? layer.querySelector('.slideshow__photo') : null;
  }

  function setLayerPhoto(layer, url) {
    if (!layer) return;
    layer.style.setProperty('--photo', 'url("' + url + '")');   // blurred screen fill
  }

  function scheduleNextSlide(ms) {
    if (slideshow.timer) window.clearTimeout(slideshow.timer);
    slideshow.timer = window.setTimeout(nextSlide, ms);
  }

  function nextSlide() {
    var incomingIdx = 1 - slideshow.active;
    var incoming = slideshow.layers[incomingIdx];
    var outgoing = slideshow.layers[slideshow.active];
    var url = PHOTOS[slideshow.next];
    var photo = slidePhoto(incoming);
    var settled = false;

    if (!photo) { scheduleNextSlide(SLIDE_MS); return; }

    /* fires on load or error; either way the loop carries on */
    function done() {
      if (settled) return;
      settled = true;
      photo.removeEventListener('load', done);
      photo.removeEventListener('error', done);

      if (photo.naturalWidth > 0) {          // the picture really decoded
        incoming.classList.add('is-active');
        outgoing.classList.remove('is-active');
        slideshow.active = incomingIdx;
      } else if (window.console && console.warn) {
        console.warn('[slideshow] could not load: ' + url);
      }

      slideshow.next = (slideshow.next + 1) % PHOTOS.length;
      scheduleNextSlide(SLIDE_MS);
    }

    setLayerPhoto(incoming, url);
    photo.addEventListener('load', done);
    photo.addEventListener('error', done);
    photo.src = url;
    if (photo.complete && photo.naturalWidth > 0) done();   // already cached
  }

  function startSlideshow() {
    if (slideshow.started || !slideA || !slideB) return;
    var first = slidePhoto(slideA);
    if (!first) return;
    slideshow.started = true;

    first.addEventListener('error', function firstPhotoFailed() {
      first.removeEventListener('error', firstPhotoFailed);
      if (window.console && console.warn) {
        console.warn('[slideshow] could not load: ' + PHOTOS[0]);
      }
    });
    setLayerPhoto(slideA, PHOTOS[0]);
    first.src = PHOTOS[0];                    // layer A already carries .is-active

    if (reducedMotion()) return;              // reduced motion → one still photo, no cycling

    scheduleNextSlide(SLIDE_MS);              // first crossfade after the opening frame
  }

  /* ---------------- H. Init ---------------- */

  openBtn.addEventListener('click', openEnvelope);   // fires for mouse, keyboard and touch
  replayBtn.addEventListener('click', replay);

  createAmbient();

  /* if the reader switches on reduced motion mid-visit, stop the confetti */
  if (motionQuery.addEventListener) {
    motionQuery.addEventListener('change', function () {
      if (reducedMotion()) stopConfetti();
    });
  }
})();
