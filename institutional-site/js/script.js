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
  initDynamicContent();
  initCountUp();
});

// Domínio estável do backend (deploy de produção na Vercel) — precisa ser
// absoluto porque este site e o backend são origens diferentes; o
// vercel.json deste projeto só faz rewrite pro app React, não pro backend.
const API_BASE_URL = 'https://ar-gram-tech-o4ef-mu.vercel.app/api';

// Busca o conteúdo editável (textos-chave + logo) que o dono da
// plataforma configura em /plataforma/site e sobrescreve o HTML estático
// com ele. Em qualquer falha (rede, CORS, endpoint fora do ar), mantém o
// conteúdo padrão que já está no HTML — por isso todo passo aqui é
// silenciosamente tolerante a erro.
async function initDynamicContent() {
  try {
    const response = await fetch(`${API_BASE_URL}/platform/site-content`);
    if (!response.ok) return;
    const content = await response.json();

    setText('.status-strip__label', content.heroEyebrow);
    setText('.hero__text', content.heroText);
    setText('.hero__actions .btn--primary', content.heroCtaPrimaryLabel);
    setText('.hero__actions .btn--ghost', content.heroCtaSecondaryLabel);
    setText('.footer__tagline', content.footerTagline);

    if (content.logoUrl) {
      document.querySelectorAll('.brand__mark').forEach((img) => {
        img.src = content.logoUrl;
      });
    }
  } catch {
    // Site continua com o conteúdo estático padrão.
  }
}

function setText(selector, value) {
  if (!value) return;
  const el = document.querySelector(selector);
  if (el) el.textContent = value;
}

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

// Números do painel do hero contam de 0 até o valor real quando entram na
// tela — reforça a sensação de "painel ao vivo". Respeita
// prefers-reduced-motion (só mostra o valor final, sem animação).
function initCountUp() {
  const items = document.querySelectorAll('[data-count-to]');
  if (items.length === 0) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    items.forEach((item) => {
      item.textContent = item.getAttribute('data-count-to');
    });
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCount(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.4 },
  );

  items.forEach((item) => observer.observe(item));
}

function animateCount(el) {
  const target = Number(el.getAttribute('data-count-to'));
  const duration = 900;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = String(Math.round(target * eased));
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}
