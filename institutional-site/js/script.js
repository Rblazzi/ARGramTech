// ArgramTech — site institucional
// Sem dependências externas de propósito (spec pede HTML/CSS/JS puro,
// preparado pra uma futura migração pra React/Next.js — cada função
// aqui mapeia num comportamento que viraria um hook/componente lá).

document.addEventListener('DOMContentLoaded', () => {
  initHeaderScroll();
  initMobileNav();
  initScrollReveal();
  initBackToTop();
  initFooterYear();
});

// Header ganha fundo/blur depois de rolar um pouco a página.
function initHeaderScroll() {
  const header = document.getElementById('header');
  if (!header) return;

  const toggle = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 12);
  };

  toggle();
  window.addEventListener('scroll', toggle, { passive: true });
}

// Menu mobile: abre/fecha em tela cheia e fecha sozinho ao clicar num link
// ou ao redimensionar pra um layout de desktop.
function initMobileNav() {
  const toggleBtn = document.getElementById('navToggle');
  const mobileNav = document.getElementById('mobileNav');
  if (!toggleBtn || !mobileNav) return;

  function setOpen(isOpen) {
    toggleBtn.setAttribute('aria-expanded', String(isOpen));
    mobileNav.classList.toggle('is-open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }

  toggleBtn.addEventListener('click', () => {
    const isOpen = toggleBtn.getAttribute('aria-expanded') === 'true';
    setOpen(!isOpen);
  });

  mobileNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setOpen(false));
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 860) setOpen(false);
  });
}

// Anima os elementos com a classe .reveal quando entram na tela.
function initScrollReveal() {
  const items = document.querySelectorAll('.reveal');
  if (items.length === 0) return;

  if (!('IntersectionObserver' in window)) {
    items.forEach((item) => item.classList.add('is-visible'));
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
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
  );

  items.forEach((item) => observer.observe(item));
}

// Botão flutuante "voltar ao topo", só some/aparece conforme o scroll.
function initBackToTop() {
  const button = document.getElementById('backToTop');
  if (!button) return;

  const toggle = () => {
    button.classList.toggle('is-visible', window.scrollY > 500);
  };

  toggle();
  window.addEventListener('scroll', toggle, { passive: true });
  button.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// Ano corrente no rodapé, sem precisar atualizar à mão todo ano.
function initFooterYear() {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
}
