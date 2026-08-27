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
  var WIDE = '(min-width: 901px)';

  function showEverything() {
    document.documentElement.classList.remove('js-motion');
    // Снять класс мало: ScrollTrigger при создании твина сразу пишет
    // стартовое opacity:0 ИНЛАЙНОМ. Без killTweensOf + clearProps
    // тридцать с лишним блоков остаются невидимыми.
    try {
      if (!window.gsap) return;
      var sel = ['[data-reveal]', '[data-hero-line]',
                 '[data-hero-cutout]', '[data-hero-cutout] img'];
      sel.forEach(function (q) { window.gsap.killTweensOf(q); });
      window.gsap.set(sel, { clearProps: 'all' });
    } catch (e) {}
  }

  /* Вход hero. Порядок задан тем, что человеку нужно раньше:
     надпись → строки заголовка выезжают из-под маски → вырез животного
     встаёт поверх букв (единственный слом сетки) → лид и телефоны.
     Позиции на таймлайне проставлены абсолютно, а не через '-=': так видно,
     что кнопка звонка появляется примерно на 1.0s, а не «когда-то в конце». */
  function heroEntrance(gsap) {
    var eyebrow = document.querySelector('.hero__eyebrow');
    var lines   = gsap.utils.toArray('[data-hero-line]');
    var cutout  = document.querySelector('[data-hero-cutout]');
    var tail    = gsap.utils.toArray('.hero__lead[data-reveal], .hero__actions[data-reveal]');

    gsap.set([eyebrow].concat(tail), { y: 18 });

    var tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

    tl.to(eyebrow, { opacity: 1, y: 0, duration: 0.4 }, 0);
    tl.from(lines, { yPercent: 112, duration: 0.7, stagger: 0.06 }, 0.06);

    // Вырез приходит СНИЗУ и чуть подрастает, центр трансформации — в лапах:
    // так он встаёт на землю, а не проявляется из воздуха. scale стартует
    // с 0.97, не с нуля — из ничего в природе ничего не появляется.
    if (cutout) {
      gsap.set(cutout, { yPercent: 8, scale: 0.97, transformOrigin: '50% 100%' });
      tl.to(cutout, { opacity: 1, yPercent: 0, scale: 1, duration: 0.75, ease: 'power3.out' }, 0.45);
    }

    tl.to(tail, { opacity: 1, y: 0, duration: 0.45, stagger: 0.07 }, 0.52);

    return tl;
  }

  /* Глубина слома сетки: вырез отстаёт от страницы при прокрутке.
     Едет ВНУТРЕННЯЯ картинка, а не <figure> — у фигуры свой твин входа,
     и два твина на одном свойстве одного элемента дрались бы.
     Ширину спрашивает только этот блок и только через gsap.matchMedia:
     она пересчитывается при ресайзе и повороте, а разовое
     matchMedia().matches на загрузке рассыпалось бы при первом же повороте
     телефона. На узком экране слома сетки нет — нет и параллакса. */
  function heroDepth(gsap) {
    var img = document.querySelector('[data-hero-cutout] img');
    if (!img || !window.ScrollTrigger) return;

    gsap.matchMedia().add(WIDE, function () {
      gsap.to(img, {
        yPercent: 6,
        ease: 'none',
        scrollTrigger: {
          trigger: '.hero',
          start: 'top top',
          end: 'bottom top',
          scrub: 0.5
        }
      });
    });
  }

  /* Появление секций. ScrollTrigger.batch не уменьшает число триггеров —
     он группирует ВЫЗОВЫ: соседи, пересёкшие край в один момент, всплывают
     одной волной со сдвигом 60ms, а не вразнобой каждый сам по себе.
     batchMax держит волну короткой — иначе плитка из девяти карточек
     разъезжается на полторы секунды. */
  function sectionReveals(gsap) {
    var items = gsap.utils.toArray('[data-reveal]').filter(function (el) {
      return !el.closest('.hero');
    });
    if (!items.length) return;

    if (!window.ScrollTrigger) { gsap.to(items, { opacity: 1, duration: 0.4 }); return; }

    gsap.set(items, { y: 22 });
    window.ScrollTrigger.batch(items, {
      start: 'top 88%',
      once: true,
      interval: 0.12,
      batchMax: 6,
      onEnter: function (batch) {
        gsap.to(batch, {
          opacity: 1, y: 0,
          duration: 0.55, ease: 'power3.out', stagger: 0.06,
          overwrite: true
        });
      }
    });
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
      tl = heroEntrance(gsap);
      sectionReveals(gsap);
      heroDepth(gsap);
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

  /* ---------- оценка срочности: объявление вердикта ---------- */
  /* Показ результата целиком на CSS (`:checked ~ .triage__results`), и это
     смена display, а не изменение DOM — live-регион на самом контейнере
     мог промолчать. Здесь мы кладём текст вердикта в отдельный скрытый
     status-регион: это настоящая мутация DOM, её скринридер объявит.
     Без JS виджет по-прежнему работает — просто без объявления. */
  function initTriage() {
    var out = document.querySelector('.triage__announce');
    var radios = [].slice.call(document.querySelectorAll('.triage__radio'));
    if (!out || !radios.length) return;

    var kind = function (r) {
      if (r.classList.contains('triage__radio--now')) return 'now';
      if (r.classList.contains('triage__radio--today')) return 'today';
      return 'plan';
    };

    radios.forEach(function (r) {
      r.addEventListener('change', function () {
        if (!r.checked) return;
        var box = document.querySelector('.triage__result--' + kind(r));
        out.textContent = box ? (box.getAttribute('data-verdict') || '') : '';
      });
    });
  }

  /* ---------- нав: прячем при скролле вниз ---------- */
  /* Читаем scrollY в обработчике, а пишем — в кадре анимации: без этого
     стиль переписывался на каждое событие скролла. Состояние ставим классом,
     переход живёт в CSS (.nav / .nav--hidden), инлайновых стилей нет.
     Порог в 8px — чтобы пилюля не дёргалась на дрожании пальца и трекпада. */
  function initNav() {
    var nav = document.getElementById('nav');
    if (!nav || reduced) return;

    var last = window.scrollY;
    var hidden = false;
    var queued = false;

    function apply() {
      queued = false;
      var y = window.scrollY;
      if (Math.abs(y - last) < 8) return;

      var next = y > 240 && y > last;
      last = y;
      if (next === hidden) return;

      hidden = next;
      nav.classList.toggle('nav--hidden', hidden);
    }

    window.addEventListener('scroll', function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(apply);
    }, { passive: true });
  }

  /* ---------- липкая полоса: появляется, когда hero ушёл ---------- */
  /* На первом экране в hero уже есть «Записаться» и телефон. Полоса
     добавляла к ним ещё две кнопки и накрывала вырез животного. Прячем её,
     пока hero занимает экран. Если IntersectionObserver недоступен —
     ничего не делаем, и полоса ведёт себя как раньше: видна всегда. */
  function initStickybar() {
    var bar = document.querySelector('[data-stickybar]');
    var hero = document.querySelector('.hero');
    if (!bar || !hero || !('IntersectionObserver' in window)) return;

    bar.classList.add('stickybar--off');
    new IntersectionObserver(function (entries) {
      bar.classList.toggle('stickybar--off', entries[0].isIntersecting);
    }, { rootMargin: '-60% 0px 0px 0px' }).observe(hero);
  }

  /* ---------- горизонтальные ленты ---------- */
  /* Прокручиваемую область обязан достать и тот, кто ходит по странице
     клавиатурой: внутри карточек врачей и шагов визита нет ни одной ссылки,
     поэтому без tabindex вторая и третья карточки были бы недостижимы
     (WCAG 2.1.1). Поэтому tabindex стоит прямо в разметке — он работает
     и без JS. Здесь мы только СНИМАЕМ его там, где лента не прокручивается
     (десктоп): иначе на широком экране появляется остановка табуляции,
     которая ничего не делает. */
  function initHScroll() {
    var rails = [].slice.call(document.querySelectorAll('.hscroll'));
    if (!rails.length) return;

    function sync() {
      rails.forEach(function (rail) {
        var scrolls = rail.scrollWidth > rail.clientWidth + 1;
        if (scrolls) {
          rail.setAttribute('tabindex', '0');
        } else {
          rail.removeAttribute('tabindex');
        }
      });
    }

    sync();
    var queued = false;
    window.addEventListener('resize', function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; sync(); });
    }, { passive: true });
  }

  /* ---------- заявка на приём ---------- */
  /* ⚠️ ДЕМО. Заявка НИКУДА НЕ УХОДИТ: бэкенда у сайта нет, обработчик
     перехватывает submit и показывает экран «принято» локально. Это
     витрина, она живёт под noindex вместе с остальными демо-данными.
     Чтобы подключить приём по-настоящему, менять надо ровно одно место —
     блок ОТПРАВКА ниже. Валидация, ошибки, экран успеха и фокус уже
     настоящие и переезжают как есть.
     Экран успеха намеренно повторяет телефон: если человек попал сюда
     с больным животным, у него всегда должен остаться живой путь. */
  function initBooking() {
    var form  = document.querySelector('[data-booking]');
    var done  = document.querySelector('[data-booking-done]');
    var echo  = document.querySelector('[data-booking-echo]');
    var again = document.querySelector('[data-booking-again]');
    if (!form || !done) return;

    var nameEl = form.querySelector('#b-name');
    var telEl  = form.querySelector('#b-tel');
    var whenEl = form.querySelector('#b-when');

    function mark(input, bad) {
      var row = input.closest('.bform__row');
      var err = row ? row.querySelector('.bform__err') : null;
      if (row) row.classList.toggle('bform__row--bad', bad);
      if (err) err.hidden = !bad;
      input.setAttribute('aria-invalid', bad ? 'true' : 'false');
    }

    /* Считаем цифры, а не сверяем формат: «+7 987…», «8987…» и «987…» —
       это один и тот же номер, и придираться к скобкам здесь не за что. */
    function telOk(v) { return (String(v).match(/\d/g) || []).length >= 10; }

    [nameEl, telEl].forEach(function (el) {
      el.addEventListener('input', function () { mark(el, false); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var badName = !nameEl.value.trim();
      var badTel  = !telOk(telEl.value);
      mark(nameEl, badName);
      mark(telEl, badTel);

      if (badName || badTel) {
        (badName ? nameEl : telEl).focus();
        return;
      }

      /* ===== ОТПРАВКА ===== здесь появится fetch на приёмник заявок ===== */

      if (echo) {
        echo.textContent = nameEl.value.trim() + ', перезвоним на ' +
          telEl.value.trim() + ' в рабочие часы — вариант «' +
          whenEl.value.toLowerCase() + '». Если станет хуже раньше, ' +
          'звоните сами: +7 987 215-22-77.';
      }
      form.hidden = true;
      done.hidden = false;
      done.focus();
    });

    if (again) {
      again.addEventListener('click', function () {
        form.reset();
        mark(nameEl, false);
        mark(telEl, false);
        done.hidden = true;
        form.hidden = false;
        nameEl.focus();
      });
    }
  }

  function init() {
    renderStatus();
    setInterval(renderStatus, 60000);
    initMotion();
    initNav();
    initChecklist();
    initTriage();
    initStickybar();
    initHScroll();
    initBooking();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
