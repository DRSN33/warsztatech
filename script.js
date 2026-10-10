/* ===== WARSZTAtech — script.js ===== */
(() => {
  'use strict';

  // ---------- KONFIGURACJA (podmień na swoje dane) ----------
  const WHATSAPP_NUMBER = '48664491844'; // numer w formacie międzynarodowym, bez + i spacji
  const MIN_FILL_SECONDS = 4;            // antyspam: minimalny czas wypełniania formularza
  const COOLDOWN_SECONDS = 60;           // antyspam: odstęp między wysyłkami z jednej przeglądarki

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // ---------- Ikony Lucide ----------
  const icons = () => window.lucide && window.lucide.createIcons();
  icons();

  // ---------- Rok w stopce ----------
  $('#year').textContent = new Date().getFullYear();

  // ---------- Nawigacja: tło po scrollu + menu mobilne ----------
  const nav = $('#nav');
  const onScroll = () => {
    nav.classList.toggle('nav-scrolled', window.scrollY > 24);
    $('#toTop').classList.toggle('show', window.scrollY > 600);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const menuBtn = $('#menuBtn'), mobileMenu = $('#mobileMenu');
  menuBtn.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('hidden') === false;
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  $$('#mobileMenu a').forEach(a => a.addEventListener('click', () => {
    mobileMenu.classList.add('hidden');
    menuBtn.setAttribute('aria-expanded', 'false');
  }));

  // ---------- Back to top ----------
  $('#toTop').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // ---------- Animacje przy scrollowaniu ----------
  const revealEls = $$('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  // ---------- Aktywny link w menu ----------
  const sections = $$('main section[id]');
  const links = $$('header .nav-link');
  const spy = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + e.target.id));
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(s => spy.observe(s));

  // ---------- Cennik: zakładki ----------
  const tabs = $$('.price-tab');
  tabs.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(t => t.setAttribute('aria-selected', String(t === tab)));
    $$('.price-table').forEach(t => t.classList.toggle('hidden', t.id !== tab.dataset.tab));
  }));

  // ---------- Slider opinii ----------
  const track = $('#sliderTrack');
  const slides = $$('.slide', track);
  const dotsWrap = $('#sliderDots');
  let idx = 0, timer = null;
  const perView = () => (window.innerWidth >= 900 ? 2 : 1);
  const maxIdx = () => Math.max(0, slides.length - perView());

  const buildDots = () => {
    dotsWrap.innerHTML = '';
    for (let i = 0; i <= maxIdx(); i++) {
      const d = document.createElement('span');
      d.className = 'dot' + (i === idx ? ' active' : '');
      dotsWrap.appendChild(d);
    }
  };
  const go = (n) => {
    idx = n > maxIdx() ? 0 : n < 0 ? maxIdx() : n;
    track.style.transform = `translateX(-${idx * (100 / perView())}%)`;
    buildDots();
  };
  const restart = () => { clearInterval(timer); timer = setInterval(() => go(idx + 1), 6000); };
  $('#nextSlide').addEventListener('click', () => { go(idx + 1); restart(); });
  $('#prevSlide').addEventListener('click', () => { go(idx - 1); restart(); });
  window.addEventListener('resize', () => go(Math.min(idx, maxIdx())));

  // swipe (dotyk)
  let startX = null;
  track.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) { go(idx + (dx < 0 ? 1 : -1)); restart(); }
    startX = null;
  });
  go(0); restart();

  // ---------- Formularz rezerwacji ----------
  const form = $('#bookingForm');
  const msg = $('#formMsg');
  const dateInput = $('#f-date');
  const loadedAt = Date.now();

  // minimalna data = dziś
  const today = new Date();
  dateInput.min = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  const validators = {
    'f-name':    v => v.trim().length >= 2,
    'f-phone':   v => /^\+?[0-9\s\-()]{9,16}$/.test(v.trim()),
    'f-service': v => v !== '',
    'f-date':    v => v !== '' && v >= dateInput.min,
    'f-time':    v => v !== ''
  };
  const check = (el) => {
    const ok = validators[el.id](el.value);
    el.classList.toggle('invalid', !ok);
    el.setAttribute('aria-invalid', String(!ok));
    return ok;
  };
  Object.keys(validators).forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('blur', () => check(el));
    el.addEventListener('input', () => { if (el.classList.contains('invalid')) check(el); });
  });

  const L = () => document.documentElement.lang === 'en';

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    msg.textContent = ''; msg.style.color = '';

    // antyspam 1: honeypot
    if (form.website.value) return;
    // antyspam 2: zbyt szybkie wysłanie (bot)
    if ((Date.now() - loadedAt) / 1000 < MIN_FILL_SECONDS) {
      msg.style.color = '#ff8a8a';
      msg.textContent = L() ? 'Please take a moment to fill in the form.' : 'Poświęć chwilę na wypełnienie formularza.';
      return;
    }
    // antyspam 3: cooldown
    try {
      const last = Number(localStorage.getItem('ng_last_submit') || 0);
      if (Date.now() - last < COOLDOWN_SECONDS * 1000) {
        msg.style.color = '#ff8a8a';
        msg.textContent = L() ? 'You have just sent a request. Please wait a moment.' : 'Przed chwilą wysłano zgłoszenie. Odczekaj chwilę.';
        return;
      }
    } catch (_) {}

    let valid = true;
    Object.keys(validators).forEach(id => { if (!check(document.getElementById(id))) valid = false; });
    const rodo = $('#f-rodo');
    const rodoErr = $('#rodoErr');
    rodoErr.style.display = rodo.checked ? 'none' : 'block';
    if (!rodo.checked) valid = false;

    if (!valid) {
      msg.style.color = '#ff8a8a';
      msg.textContent = L() ? 'Please correct the highlighted fields.' : 'Popraw zaznaczone pola.';
      const firstBad = $('.field.invalid', form);
      if (firstBad) firstBad.focus();
      return;
    }

    // składamy wiadomość WhatsApp
    const f = new FormData(form);
    const clean = (s) => String(s || '').replace(/[\r\n]+/g, ' ').trim();
    const lines = L() ? [
      'Hello WARSZTAtech! I would like to book a visit.',
      `Name: ${clean(f.get('name'))}`,
      `Phone: ${clean(f.get('phone'))}`,
      `Service: ${clean(f.get('service'))}`,
      `Place: ${clean(f.get('place'))}`,
      `Date: ${clean(f.get('date'))} at ${clean(f.get('time'))}`,
      f.get('message') ? `Message: ${clean(f.get('message'))}` : ''
    ] : [
      'Dzień dobry WARSZTAtech! Chcę umówić wizytę.',
      `Imię: ${clean(f.get('name'))}`,
      `Telefon: ${clean(f.get('phone'))}`,
      `Usługa: ${clean(f.get('service'))}`,
      `Miejsce: ${clean(f.get('place'))}`,
      `Termin: ${clean(f.get('date'))}, godz. ${clean(f.get('time'))}`,
      f.get('message') ? `Wiadomość: ${clean(f.get('message'))}` : ''
    ];
    const text = lines.filter(Boolean).join('\n');
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

    try { localStorage.setItem('ng_last_submit', String(Date.now())); } catch (_) {}
    msg.style.color = 'var(--gold-2)';
    msg.textContent = L() ? 'Opening WhatsApp… confirm the message to send it.' : 'Otwieram WhatsApp… potwierdź wiadomość, aby ją wysłać.';
    window.open(url, '_blank', 'noopener');
    form.reset();
  });

  /* ---------- Wielojęzyczność PL / EN ---------- */
  const EN = {
    nav_about: 'About', nav_services: 'Services', nav_how: 'How it works', nav_pricing: 'Pricing',
    nav_reviews: 'Reviews', nav_contact: 'Contact', nav_book: 'Book a visit',
    hero_badge: 'Garage + technology',
    hero_h1_a: 'Mobile repairs.', hero_h1_b: 'We come to you.',
    hero_sub: 'We drive to you, repair on the spot or in our garage. We combine a mechanic’s experience with AI-assisted diagnostics, so you pay for an accurate diagnosis, not guesswork.',
    hero_cta1: 'Book online', hero_cta2: 'Call now',
    hero_stat1: 'travel up to 15 km', hero_stat2: 'AI-assisted diagnostics', hero_stat3: 'on-site or in the garage',
    about_kicker: 'About us',
    about_h2: 'A Real Garage.<br>Modern Technology.<br>Peace of Mind.',
    about_p1: 'We are changing how cars get repaired: from reactive to predictive. With electronics, data and artificial intelligence we predict, analyse and learn before the customer feels the problem.',
    about_p2: 'WARSZTAtech is a garage with technology: the mechanic comes to you or welcomes you in Zawiercie. Every repair is backed by years of practice, and every diagnosis by data and tests, not hunches.',
    about_q1: '“We don’t sell part replacements.', about_q2: 'We sell certainty that the diagnosis is right.”',
    about_c1_t: 'AI diagnostics', about_c1_p: 'Vehicle data analysis supported by algorithms.',
    about_c2_t: 'A real mechanic', about_c2_p: 'Experience no software can replace.',
    about_c3_t: 'We come to you', about_c3_p: 'Home, work, car park – up to 50 km.',
    about_c4_t: 'Clear prices', about_c4_p: 'A quote before the repair, no surprises.',
    svc_kicker: 'Services', svc_h2: 'What we can fix for you',
    svc1_t: 'Engine repairs & drivetrain', svc1_p: 'Timing, clutch, oil and filters. The engine runs quietly and you forget about breakdowns on the road.',
    svc2_t: 'Brakes & suspension', svc2_p: 'Pads, discs, shock absorbers, springs, bushings. Shorter stopping distance and a car that holds the road.',
    svc3_t: 'Computer & AI diagnostics', svc3_p: 'Fault codes, tests and data analysis. You know what is really wrong before spending on parts.',
    svc4_t: 'Mobile services', svc4_p: 'The mechanic comes to where the car is: home, office, car park. You save time and towing. Travel up to 15 km is free.',
    svc4_cta: 'Order a visit',
    how_kicker: 'How it works', how_h2: 'From a phone call to peace of mind in 4 steps',
    step1_t: 'Booking', step1_p: 'Call us or send the form via WhatsApp. Choose the time and place: at your location or in the garage.',
    step2_t: 'Consultation', step2_p: 'A short chat about the symptoms. From the start we tell you what we will check and the approximate cost.',
    step3_t: 'Diagnosis & repair', step3_p: 'AI-assisted diagnostics, then repair on site or in the garage. Always after you approve the quote.',
    step4_t: 'Follow-up', step4_p: 'After the repair we check how the car performs. We get in touch before you need to.',
    how_cta1: 'Book by phone', how_cta2: 'Send the form on WhatsApp',
    price_kicker: 'Pricing', price_h2: 'Transparent, indicative prices',
    price_note: 'Gross, indicative prices. An exact quote is given after diagnosis, before any repair starts. Where marked “labour only”, parts are charged separately.',
    pk1_t: 'Computer diagnostics', pk1_p: 'Reading and clearing fault codes. A quick answer to what is going on.',
    pk_pop: 'Most popular',
    pk2_t: 'Extended diagnostics', pk2_p: 'Tests and deeper analysis when a simple read is not enough.',
    pk3_t: 'Mobile service', pk3_p: 'Base service with travel. Travel up to 15 km is free.',
    tab1: 'Engine & drivetrain', tab2: 'Brakes & suspension', tab3: 'Diagnostics & service', tab4: 'Travel (mobile)',
    rev_kicker: 'Customer reviews', rev_h2: 'Drivers trust us',
    faq_h2: 'Frequently asked questions',
    gal_kicker: 'Gallery', gal_h2: 'From our garage',
    blog_h2: 'News & tips',
    book_kicker: 'Online booking', book_h2: 'Book a visit in a minute',
    book_p: 'Fill in the form and WhatsApp will open with a ready message. We will confirm the time by message or SMS.',
    book_submit: 'Send via WhatsApp',
    contact_kicker: 'Contact', contact_h2: 'Find us here'
  };

  const nodes = $$('[data-i18n]');
  const PL = {};
  nodes.forEach(n => { PL[n.dataset.i18n] = n.innerHTML; });

  const setLang = (lang) => {
    document.documentElement.lang = lang;
    nodes.forEach(n => {
      const k = n.dataset.i18n;
      n.innerHTML = lang === 'en' ? (EN[k] ?? PL[k]) : PL[k];
    });
    $('#langBtn').innerHTML = lang === 'en'
      ? '<span class="text-gold">EN</span> | PL' : 'PL | <span class="text-slate-400">EN</span>';
    try { localStorage.setItem('ng_lang', lang); } catch (_) {}
  };
  $('#langBtn').addEventListener('click', () => setLang(L() ? 'pl' : 'en'));
  try { if (localStorage.getItem('ng_lang') === 'en') setLang('en'); else setLang('pl'); } catch (_) { setLang('pl'); }
})();
