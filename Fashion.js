/* ==========================================================================
   VOLNA — Interaction Layer
   Vanilla JS. Без библиотек, без зависимостей.
   ========================================================================== */

(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none)').matches;

  /* ------------------------------------------------------------------
     1. PRELOADER
     Trigger: window load event (или таймаут-фолбэк 1.8s)
     Duration: 1.4s progress fill + 0.9s fade-out
     Purpose: задаёт первое впечатление "музейной паузы" перед контентом,
     не даёт увидеть FOUC/резкое появление скульптурного hero
  ------------------------------------------------------------------ */
  function initPreloader() {
    const preloader = document.getElementById('preloader');
    const progress = document.getElementById('preloaderProgress');
    if (!preloader || !progress) return;

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      requestAnimationFrame(() => { progress.style.width = '100%'; });
      window.setTimeout(() => {
        preloader.classList.add('is-hidden');
        document.body.style.overflow = '';
        document.querySelector('.hero')?.classList.add('is-loaded');
      }, 1400);
    };

    document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(() => { progress.style.width = '72%'; });

    if (document.readyState === 'complete') {
      finish();
    } else {
      window.addEventListener('load', finish, { once: true });
    }
    // Фолбэк на случай медленной загрузки внешних изображений
    window.setTimeout(finish, 2200);
  }

  /* ------------------------------------------------------------------
     2. SCULPTURAL REVEAL (Museum Fade)
     Trigger: элемент с [data-reveal] пересекает 14% высоты вьюпорта снизу
     Duration: 1.4s (задано в CSS через --dur-slow)
     Delay: индивидуальная, задана в CSS per-section для каскадного эффекта
     Easing: ease-museum cubic-bezier(0.22, 1, 0.36, 1) — мягкое торможение,
     имитирует то, как глаз фокусируется на экспонате в галерее
     Purpose: последовательное появление контента усиливает ощущение
     "прогулки по выставке", а не мгновенной загрузки страницы
  ------------------------------------------------------------------ */
  function initScrollReveal() {
    const items = document.querySelectorAll('[data-reveal]');
    if (!items.length) return;

    if (reducedMotion || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -14% 0px' }
    );

    items.forEach((el) => observer.observe(el));
  }

  /* ------------------------------------------------------------------
     3. HEADER STATE + BACK TO TOP
     Trigger: scroll position > 60px
     Duration: 0.8s background fade (CSS)
     Purpose: хедер остаётся невидимым архитектурным элементом на hero,
     материализуется только когда пользователь начинает изучать контент
  ------------------------------------------------------------------ */
  function initHeaderScrollState() {
    const header = document.getElementById('siteHeader');
    const backToTop = document.getElementById('backToTop');
    if (!header) return;

    let ticking = false;
    const update = () => {
      const y = window.scrollY;
      header.classList.toggle('is-scrolled', y > 60);
      if (backToTop) backToTop.classList.toggle('is-visible', y > window.innerHeight * 0.8);
      ticking = false;
    };

    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          window.requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );
    update();
  }

  /* ------------------------------------------------------------------
     4. MOBILE MENU
     Trigger: click на burger-кнопку
     Duration: 0.7s slide (CSS var --ease-sculptural)
     Purpose: полноэкранное меню держит тот же монументальный масштаб
     типографики, что и hero, а не съезжает в мелкий дропдаун
  ------------------------------------------------------------------ */
  function initMobileMenu() {
    const burger = document.getElementById('burgerBtn');
    const menu = document.getElementById('mobileMenu');
    if (!burger || !menu) return;

    const closeMenu = () => {
      burger.setAttribute('aria-expanded', 'false');
      menu.classList.remove('is-open');
      menu.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };
    const openMenu = () => {
      burger.setAttribute('aria-expanded', 'true');
      menu.classList.add('is-open');
      menu.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    };

    burger.addEventListener('click', () => {
      const isOpen = menu.classList.contains('is-open');
      isOpen ? closeMenu() : openMenu();
    });

    menu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeMenu);
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
  }

  /* ------------------------------------------------------------------
     5. AMBIENT GLOW (Ambient Light)
     Trigger: mousemove по документу (desktop only, hover:hover)
     Duration: постоянное следование с CSS-transition 0.6s на opacity
     Easing: линейное позиционирование (transform без transition —
     чтобы свет ощущался физически привязанным к курсору, без лага),
     но rAF-throttled для производительности
     Purpose: мягкий тёплый блик, будто источник музейного света
     движется вместе со зрителем по залу
  ------------------------------------------------------------------ */
  function initAmbientLight() {
    if (isTouch || reducedMotion) return;
    const light = document.getElementById('ambientLight');
    if (!light) return;

    let raf = null;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;

    const render = () => {
      light.style.transform = `translate(${targetX}px, ${targetY}px) translate(-50%, -50%)`;
      raf = null;
    };

    window.addEventListener(
      'mousemove',
      (e) => {
        targetX = e.clientX;
        targetY = e.clientY;
        light.classList.add('is-active');
        if (!raf) raf = window.requestAnimationFrame(render);
      },
      { passive: true }
    );

    window.addEventListener('mouseleave', () => light.classList.remove('is-active'));
  }

  /* ------------------------------------------------------------------
     6. MAGNETIC CURSOR
     Trigger: mousemove внутри .btn / .campaign__play
     Duration: transform continuous, возврат в исходное положение 0.5s
     Easing: ease-magnetic cubic-bezier(0.34, 1.56, 0.64, 1) — лёгкий
     перелёт при возврате, как настоящий магнит отпускает объект
     Purpose: интерактивные элементы физически "притягиваются" к курсору,
     создавая ощущение точной, дорогой механики взаимодействия
  ------------------------------------------------------------------ */
  function initMagneticElements() {
    if (isTouch || reducedMotion) return;
    const targets = document.querySelectorAll('.btn, .campaign__play, .back-to-top');

    targets.forEach((el) => {
      let raf = null;
      const strength = el.classList.contains('campaign__play') ? 0.4 : 0.28;

      const onMove = (e) => {
        const rect = el.getBoundingClientRect();
        const relX = e.clientX - (rect.left + rect.width / 2);
        const relY = e.clientY - (rect.top + rect.height / 2);
        if (raf) window.cancelAnimationFrame(raf);
        raf = window.requestAnimationFrame(() => {
          el.style.transform = `translate(${relX * strength}px, ${relY * strength}px)`;
        });
      };

      const onLeave = () => {
        if (raf) window.cancelAnimationFrame(raf);
        el.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
        el.style.transform = 'translate(0, 0)';
        window.setTimeout(() => { el.style.transition = ''; }, 500);
      };

      el.addEventListener('mouseenter', () => { el.style.transition = ''; });
      el.addEventListener('mousemove', onMove);
      el.addEventListener('mouseleave', onLeave);
    });
  }

  /* ------------------------------------------------------------------
     7. LAYER PARALLAX (Depth Shift)
     Trigger: scroll, элементы [data-parallax-slow] в пределах вьюпорта
     Duration: непрерывно синхронизировано со скроллом (без transition —
     напрямую следует за scrollY через rAF)
     Purpose: крупные изображения (new-collection, tailoring, atelier)
     двигаются медленнее фона — создаёт многослойную глубину, будто
     объекты в витрине находятся на разном расстоянии от стекла
  ------------------------------------------------------------------ */
  function initParallax() {
    if (reducedMotion) return;
    const layers = Array.from(document.querySelectorAll('[data-parallax-slow]'));
    if (!layers.length) return;

    let ticking = false;
    const update = () => {
      const viewportH = window.innerHeight;
      layers.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > viewportH) return;
        const progress = (rect.top + rect.height / 2 - viewportH / 2) / viewportH;
        const offset = progress * -24; // px смещения, лёгкий сдвиг
        el.style.transform = `translateY(${offset}px)`;
      });
      ticking = false;
    };

    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          window.requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );
    update();
  }

  /* ------------------------------------------------------------------
     8. HERO MONOLITH SCROLL RESPONSE (Sculptural Reveal continuation)
     Trigger: scroll внутри первого экрана (hero)
     Duration: continuous, без transition — прямое следование скроллу
     Purpose: монолит слегка "оседает" и теряет яркость при скролле вниз,
     как если бы зритель отходил от экспоната вглубь галереи
  ------------------------------------------------------------------ */
  function initHeroMonolithScroll() {
    if (reducedMotion) return;
    const monolith = document.getElementById('heroMonolith');
    const hero = document.getElementById('hero');
    if (!monolith || !hero) return;

    let ticking = false;
    const update = () => {
      const heroHeight = hero.offsetHeight;
      const progress = Math.min(Math.max(window.scrollY / heroHeight, 0), 1);
      monolith.style.transform = `translateY(${progress * 60}px) scale(${1 - progress * 0.04})`;
      monolith.style.opacity = String(1 - progress * 0.5);
      ticking = false;
    };

    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          window.requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );
    update();
  }

  /* ------------------------------------------------------------------
     8b. PRODUCT CARDS — второе фото по касанию + избранное
     Trigger: tap на карточке (touch) переключает на второе фото товара,
     повторный tap вне карточки — снимает; клик на сердце — toggle wishlist
     Duration: 0.7s crossfade (CSS), 0.45s pulse при добавлении
     Purpose: на touch-устройствах нет :hover, поэтому просмотр "второго
     ракурса" реализован через явный tap с явным визуальным состоянием
  ------------------------------------------------------------------ */
  function initProductCards() {
    const cards = document.querySelectorAll('.product-exhibit');
    if (!cards.length) return;

    if (isTouch) {
      cards.forEach((card) => {
        const stage = card.querySelector('.product-exhibit__stage');
        if (!stage) return;
        stage.addEventListener('click', (e) => {
          // Клик по кнопке избранного не должен переключать фото
          if (e.target.closest('.product-exhibit__wishlist')) return;
          const alreadyTouched = card.classList.contains('is-touched');
          cards.forEach((c) => c.classList.remove('is-touched'));
          if (!alreadyTouched) card.classList.add('is-touched');
        });
      });

      // Тап вне любой карточки — сбрасывает открытый превью
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.product-exhibit')) {
          cards.forEach((c) => c.classList.remove('is-touched'));
        }
      });
    }

    cards.forEach((card) => {
      const btn = card.querySelector('.product-exhibit__wishlist');
      if (!btn) return;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isPressed = btn.getAttribute('aria-pressed') === 'true';
        btn.setAttribute('aria-pressed', String(!isPressed));
        if (!isPressed) {
          btn.classList.remove('is-pulsing');
          // reflow, чтобы анимация могла повториться при повторном добавлении
          void btn.offsetWidth;
          btn.classList.add('is-pulsing');
        }
      });
    });
  }

  /* ------------------------------------------------------------------
     9. NEWSLETTER FORM
     Trigger: submit формы подписки в футере
     Duration: мгновенная валидация, статус-сообщение остаётся видимым
     Purpose: подтверждение действия без перезагрузки страницы —
     демонстрационная обработка (реальная интеграция подключается на бэкенде)
  ------------------------------------------------------------------ */
  function initNewsletterForm() {
    const form = document.getElementById('newsletterForm');
    const msg = document.getElementById('newsletterMsg');
    if (!form || !msg) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      if (input && input.checkValidity()) {
        msg.textContent = 'Благодарим. Вы подписаны на новости дома VOLNA.';
        form.reset();
      } else {
        msg.textContent = 'Пожалуйста, укажите корректный email.';
      }
    });
  }

  /* ------------------------------------------------------------------
     9b. PAGE TRANSITIONS — see "@view-transition" rule in Fashion.css.
     Cross-document navigation to another page on this same site cross-
     fades automatically in supporting browsers (Chrome/Edge) via that
     single CSS rule — no JS required, and it degrades to a normal
     instant navigation everywhere else.
  ------------------------------------------------------------------ */

  /* ------------------------------------------------------------------
     10. SMOOTH ANCHOR SCROLL (учёт фиксированного хедера)
  ------------------------------------------------------------------ */
  function initAnchorScroll() {
    const header = document.getElementById('siteHeader');
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        const id = link.getAttribute('href');
        if (!id || id === '#') return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        const offset = (header?.offsetHeight || 0) + 12;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: reducedMotion ? 'auto' : 'smooth' });
      });
    });
  }

  /* ------------------------------------------------------------------
     INIT
  ------------------------------------------------------------------ */
  function init() {
    initPreloader();
    initScrollReveal();
    initHeaderScrollState();
    initMobileMenu();
    initAmbientLight();
    initMagneticElements();
    initParallax();
    initHeroMonolithScroll();
    initProductCards();
    initNewsletterForm();
    initAnchorScroll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
