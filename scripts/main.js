/* ДоброВет — статус работы + движение.
   Анимируются только transform и opacity. prefers-reduced-motion уважается. */

(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- живой статус «открыто / закрыто» ---------- */
  function toMinutes(hhmm) {
    var p = hhmm.split(':');
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  }

  function clinicNow(tz) {
    // Время в часовом поясе клиники, а не в поясе посетителя.
    var parts = new Intl.DateTimeFormat('ru-RU', {
      timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(new Date());

    var get = function (t) {
      var found = parts.find(function (p) { return p.type === t; });
      return found ? found.value : '';
    };
    var map = { 'вс': 0, 'пн': 1, 'вт': 2, 'ср': 3, 'чт': 4, 'пт': 5, 'сб': 6 };
    var wd = get('weekday').toLowerCase().replace('.', '').slice(0, 2);

    return {
      day: map[wd],
      minutes: parseInt(get('hour'), 10) * 60 + parseInt(get('minute'), 10)
    };
  }

  function renderStatus() {
    var el = document.querySelector('[data-status]');
    var textEl = document.querySelector('[data-status-text]');
    var cfg = window.DOBROVET;
    if (!el || !textEl || !cfg) return;

    // График не подтверждён — не утверждаем то, чего не знаем.
    if (!cfg.CONFIRMED) {
      textEl.textContent = 'Часы работы уточняются — позвоните';
      el.setAttribute('data-open', 'false');
      return;
    }

    var now = clinicNow(cfg.timeZone);
    var today = cfg.hours[now.day];

    if (today && now.minutes >= toMinutes(today.open) && now.minutes < toMinutes(today.close)) {
      textEl.textContent = 'Сегодня принимаем до ' + today.close;
      el.setAttribute('data-open', 'true');
      return;
    }

    // Ищем ближайший рабочий день вперёд.
    for (var i = 1; i <= 7; i++) {
      var d = (now.day + i) % 7;
      if (cfg.hours[d]) {
        var when = (i === 1) ? 'завтра' : ['в воскресенье', 'в понедельник', 'во вторник', 'в среду', 'в четверг', 'в пятницу', 'в субботу'][d];
        textEl.textContent = 'Сейчас закрыто · откроемся ' + when + ' в ' + cfg.hours[d].open;
        el.setAttribute('data-open', 'false');
        return;
      }
    }
  }

  /* ---------- движение ---------- */
  /* Правило: скрытое состояние живёт ТОЛЬКО в CSS (.js-motion [data-reveal]).
     GSAP не выставляет opacity:0 инлайном — поэтому снятие класса в любой
     аварийной ситуации мгновенно возвращает весь контент. */
  function showEverything() {
    document.documentElement.classList.remove('js-motion');
    // Снять класс мало: ScrollTrigger при создании твина сразу пишет
    // стартовое opacity:0 ИНЛАЙНОМ. Без killTweensOf + clearProps
    // тридцать с лишним блоков остаются невидимыми.
    try {
      if (!window.gsap) return;
      var sel = ['[data-reveal]', '[data-hero-line]', '[data-hero-cutout]'];
      sel.forEach(function (q) { window.gsap.killTweensOf(q); });
      window.gsap.set(sel, { clearProps: 'all' });
    } catch (e) {}
  }

  function initMotion() {
    if (reduced || typeof window.gsap === 'undefined') {
      showEverything();
      return;
    }

    var gsap = window.gsap;
    var tl = null;

    try {
      if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);

      var heroReveals = gsap.utils.toArray('.hero [data-reveal]');
      gsap.set(heroReveals, { y: 18 });

      // Вход hero: строки заголовка выезжают из-под маски, затем вырез, затем текст.
      tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.from('[data-hero-line]', { yPercent: 112, duration: 0.72, stagger: 0.07 });
      tl.from('[data-hero-cutout]', { opacity: 0, scale: 0.94, y: 24, duration: 0.7 }, '-=0.35');
      tl.to(heroReveals, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 }, '-=0.4');

      // Появление секций по скроллу.
      gsap.utils.toArray('[data-reveal]').forEach(function (el) {
        if (el.closest('.hero')) return;
        gsap.set(el, { y: 22 });
        gsap.to(el, {
          opacity: 1, y: 0, duration: 0.55, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 92%', once: true }
        });
      });
    } catch (e) {
      showEverything();
      return;
    }

    /* Страховка. Главный случай — вкладка открыта в фоне: requestAnimationFrame
       там заморожен, таймлайн стоит на нуле, и заголовок остаётся спрятанным
       внутри маски. Проверяем именно факт непроигранного таймлайна, а не только
       прозрачность, и доигрываем его до конца — иначе H1 не вернуть. */
    setTimeout(function () {
      var timelineStuck = tl && tl.progress() < 1;
      var revealStuck = gsap.utils.toArray('[data-reveal]').some(function (el) {
        var r = el.getBoundingClientRect();
        return r.top < window.innerHeight && r.bottom > 0 &&
               getComputedStyle(el).opacity === '0';
      });
      if (timelineStuck || revealStuck) showEverything();
    }, 3000);
  }

  /* ---------- чек-лист «что взять с собой» ---------- */
  /* Отметки живут в localStorage этого браузера. Хранилище может быть
     недоступно (приватное окно, запрет на данные сайтов) и тогда БРОСАЕТ
     исключение — поэтому каждое чтение и запись в try/catch, а страница
     обязана работать и без сохранения. */
  var STORE_KEY = 'dobrovet:checklist';

  function readStore() {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function writeStore(state) {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) {
      /* не сохранилось — не беда, отметки просто не переживут перезагрузку */
    }
  }

  function initChecklist() {
    var boxes = [].slice.call(document.querySelectorAll('[data-checklist]'));
    if (!boxes.length) return;

    var state = readStore();

    boxes.forEach(function (box) {
      var key = box.getAttribute('data-checklist');
      if (state[key]) box.checked = true;

      box.addEventListener('change', function () {
        var next = readStore();
        if (box.checked) { next[key] = 1; } else { delete next[key]; }
        writeStore(next);
      });
    });

    var reset = document.querySelector('[data-checklist-reset]');
    if (reset) {
      reset.addEventListener('click', function () {
        boxes.forEach(function (box) { box.checked = false; });
        writeStore({});
        boxes[0].focus();
      });
    }
  }

  /* ---------- нав: прячем при скролле вниз ---------- */
  function initNav() {
    var nav = document.getElementById('nav');
    if (!nav || reduced) return;
    var last = 0;
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      var hidden = y > 240 && y > last;
      nav.style.transform = hidden
        ? 'translateX(-50%) translateY(-140%)'
        : 'translateX(-50%) translateY(0)';
      last = y;
    }, { passive: true });
    nav.style.transition = 'transform 280ms cubic-bezier(0.22,1,0.36,1)';
  }

  function init() {
    renderStatus();
    setInterval(renderStatus, 60000);
    initMotion();
    initNav();
    initChecklist();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
