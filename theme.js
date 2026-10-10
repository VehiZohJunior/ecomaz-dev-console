/* =========================================================================
   EcoMaZ — Améliorations d'interface (présentation uniquement)
   - thème clair/sombre mémorisé (appliqué avant l'affichage : pas de flash)
   - bouton de bascule
   - accessibilité des fenêtres modales (rôle, Échap, focus piégé)
   - tableaux : libellés de colonnes pour l'affichage en cartes sur téléphone
   Aucune logique métier ici : ce fichier ne lit ni n'écrit aucune donnée.
   ========================================================================= */
(function(){
  const KEY = 'ecomaz_theme';
  const root = document.documentElement;
  const sombreSysteme = () => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  function themeEffectif(){
    const t = root.getAttribute('data-theme');
    return t || (sombreSysteme() ? 'dark' : 'light');
  }
  try{
    const sauve = localStorage.getItem(KEY);
    if(sauve === 'dark' || sauve === 'light') root.setAttribute('data-theme', sauve);
  }catch(_e){}

  function majBoutons(){
    const sombre = themeEffectif() === 'dark';
    document.querySelectorAll('.theme-toggle').forEach(b => {
      b.textContent = sombre ? '☀️' : '🌙';
      b.setAttribute('aria-label', sombre ? 'Passer au thème clair' : 'Passer au thème sombre');
      b.title = b.getAttribute('aria-label');
    });
    const meta = document.querySelector('meta[name="theme-color"]');
    if(meta) meta.setAttribute('content', sombre ? '#0f1713' : '#245840');
  }
  function basculer(){
    const suivant = themeEffectif() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', suivant);
    try{ localStorage.setItem(KEY, suivant); }catch(_e){}
    majBoutons();
  }
  function creerBouton(classes){
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'theme-toggle ' + (classes || '');
    b.addEventListener('click', basculer);
    return b;
  }

  /* ---- Modales : rôle, Échap, focus piégé ---- */
  function installerModales(){
    [['modalBackdrop','modalTitle','modalClose'], ['smartFillBackdrop','smartFillTitle','smartFillClose']].forEach(([bd, titre, fermer]) => {
      const fond = document.getElementById(bd);
      if(!fond) return;
      const boite = fond.querySelector('.modal');
      if(boite){
        boite.setAttribute('role', 'dialog');
        boite.setAttribute('aria-modal', 'true');
        boite.setAttribute('aria-labelledby', titre);
      }
      const btn = document.getElementById(fermer);
      if(btn) btn.setAttribute('aria-label', 'Fermer');
      let precedent = null;
      new MutationObserver(() => {
        if(fond.classList.contains('open')){
          precedent = document.activeElement;
          const cible = fond.querySelector('input, select, textarea, button:not(.modal-close)') || btn;
          if(cible) setTimeout(() => cible.focus({ preventScroll:true }), 30);
        } else if(precedent && precedent.focus){
          try{ precedent.focus({ preventScroll:true }); }catch(_e){}
          precedent = null;
        }
      }).observe(fond, { attributes:true, attributeFilter:['class'] });
    });
    document.addEventListener('keydown', e => {
      const ouvert = [...document.querySelectorAll('.modal-backdrop.open')].pop();
      if(!ouvert) return;
      if(e.key === 'Escape'){
        const x = ouvert.querySelector('.modal-close');
        if(x){ e.preventDefault(); x.click(); }
        return;
      }
      if(e.key !== 'Tab') return;
      const focusables = [...ouvert.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter(el => el.offsetParent !== null);
      if(!focusables.length) return;
      const premier = focusables[0], dernier = focusables[focusables.length - 1];
      if(e.shiftKey && document.activeElement === premier){ e.preventDefault(); dernier.focus(); }
      else if(!e.shiftKey && document.activeElement === dernier){ e.preventDefault(); premier.focus(); }
    });
  }

  /* ---- Tableaux -> cartes sur téléphone : on recopie l'en-tête de chaque
        colonne dans un attribut data-label de chaque cellule ---- */
  function etiqueterTableaux(racine){
    (racine || document).querySelectorAll('.table-wrap table:not(.timetable):not(.is-cards)').forEach(t => {
      const ths = [...t.querySelectorAll('thead th')];
      if(!ths.length || t.querySelector('td[colspan]')) return;
      const libelles = ths.map(th => th.textContent.trim());
      t.querySelectorAll('tbody tr').forEach(tr => {
        [...tr.children].forEach((td, i) => { if(td.tagName === 'TD') td.setAttribute('data-label', libelles[i] || ''); });
      });
      t.classList.add('is-cards');
    });
  }

  function demarrer(){
    // Bouton dans la barre du haut (application) et sur l'écran de connexion
    const barre = document.querySelector('.topbar-right');
    if(barre) barre.insertBefore(creerBouton(), barre.firstChild);
    document.body.appendChild(creerBouton('theme-toggle-gate'));
    majBoutons();

    const toast = document.getElementById('toast');
    if(toast){ toast.setAttribute('role', 'status'); toast.setAttribute('aria-live', 'polite'); }
    const burger = document.getElementById('burger');
    if(burger) burger.setAttribute('aria-label', 'Ouvrir le menu');
    const main = document.getElementById('viewContainer');
    if(main){ main.setAttribute('role', 'main'); }

    installerModales();

    const zone = document.getElementById('viewContainer');
    if(zone){
      let planifie = false;
      new MutationObserver(() => {
        if(planifie) return;
        planifie = true;
        requestAnimationFrame(() => { planifie = false; etiqueterTableaux(zone); });
      }).observe(zone, { childList:true, subtree:true });
      etiqueterTableaux(zone);
    }
    if(window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', majBoutons);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})();
