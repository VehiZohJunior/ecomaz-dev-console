/* =========================================================================
   EcoMaZ — Utilitaires de mouvement (spécification § 3.7)
   L'application n'utilise pas de modules JavaScript : les fonctions sont
   exposées sous window.EmMotion (countUp, revealOnScroll, burst, replay,
   prefersReducedMotion). Valeurs identiques à la spécification.
   ========================================================================= */
(function(){
  // Préférence de réduction des animations
  const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Compteur animé (KPI) — easeOutCubic, chiffres tabulaires côté CSS
  function countUp(el, to, { duration = 900, from = 0, format = (n) => n.toLocaleString('fr-FR') } = {}) {
    if (prefersReducedMotion() || !Number.isFinite(to)) { el.textContent = format(to); return; }
    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      el.textContent = format(Math.round(from + (to - from) * ease(t)));
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // Apparition au défilement — repli pour les navigateurs sans animation-timeline
  function revealOnScroll(root = document) {
    if (CSS.supports('animation-timeline: view()') || prefersReducedMotion()) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('em-rise'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    root.querySelectorAll('.em-reveal').forEach((el) => io.observe(el));
  }

  // Confettis : 12 particules aux couleurs de la marque
  function burst(container, { count = 12 } = {}) {
    if (prefersReducedMotion()) return;
    const palette = ['#e8b04b', '#b5492f', '#2e7d62', '#1f5c46'];
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count;
      const r = 54 + (i % 3) * 14;
      const p = document.createElement('span');
      p.className = 'em-burst';
      p.setAttribute('aria-hidden', 'true');
      p.style.background = palette[i % palette.length];
      p.style.setProperty('--dx', `${Math.round(Math.cos(a) * r)}px`);
      p.style.setProperty('--dy', `${Math.round(Math.sin(a) * r)}px`);
      p.style.animationDelay = `${(i % 3) * 30}ms`;
      container.appendChild(p);
      p.addEventListener('animationend', () => p.remove(), { once: true });
    }
  }

  // Rejouer une animation CSS sur un élément (ex. em-bump sur un compteur)
  function replay(el, className) {
    el.classList.remove(className);
    void el.offsetWidth; // force le reflow
    el.classList.add(className);
  }

  window.EmMotion = { prefersReducedMotion, countUp, revealOnScroll, burst, replay };
})();
