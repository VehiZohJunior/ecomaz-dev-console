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
          const cible = fond.querySelector('input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not(.modal-close):not([disabled])') || btn;
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
    // tableaux posés « nus » dans un bloc : on les enveloppe pour qu'ils défilent au lieu de déborder
    (racine || document).querySelectorAll('table:not(.timetable)').forEach(t => {
      if(t.closest('.table-wrap') || t.closest('.modal')) return;
      const enveloppe = document.createElement('div');
      enveloppe.className = 'table-wrap';
      t.parentNode.insertBefore(enveloppe, t);
      enveloppe.appendChild(t);
    });
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

  /* ---- Boutons-icônes : le texte (un emoji) ne dit rien à un lecteur d'écran ;
        on reprend leur infobulle (title) comme nom accessible ---- */
  function nommerBoutons(racine){
    (racine || document).querySelectorAll('button[title]:not([aria-label]), a[title]:not([aria-label])').forEach(b => b.setAttribute('aria-label', b.getAttribute('title')));
  }

  /* ---- Barre de navigation en bas (téléphone) ----
     Raccourcis vers les pages les plus utiles de chaque profil + « Menu » qui
     ouvre le menu complet. Chaque bouton déclenche le bouton du menu d'origine :
     aucune logique de navigation n'est dupliquée ni modifiée. */
  const FAVORIS = {
    enseignant:  ['dashboard', 'notes', 'presences-eleves', 'emploi-temps'],
    secretariat: ['dashboard', 'eleves', 'presences-eleves', 'comptabilite'],
    direction:   ['dashboard', 'eleves', 'comptabilite', 'parametres'],
    fondation:   ['dashboard', 'eleves', 'comptabilite', 'parametres'],
  };
  const LIBELLES_COURTS = {
    fr: { 'dashboard':'Accueil', 'notes':'Notes', 'presences-eleves':'Appel', 'emploi-temps':'Horaires', 'eleves':'Élèves', 'comptabilite':'Compta', 'parametres':'Réglages', menu:'Menu' },
    en: { 'dashboard':'Home', 'notes':'Grades', 'presences-eleves':'Roll call', 'emploi-temps':'Timetable', 'eleves':'Students', 'comptabilite':'Accounts', 'parametres':'Settings', menu:'Menu' },
  };
  function majBarreBas(){
    const barre = document.getElementById('bottomNav');
    const nav = document.getElementById('nav');
    if(!barre || !nav) return;
    let role = null;
    try{ role = (typeof ui !== 'undefined' && ui) ? ui.role : null; }catch(_e){}
    const visibles = [...nav.querySelectorAll('[data-view]')].filter(b => b.style.display !== 'none');
    const choix = (FAVORIS[role] || []).map(v => visibles.find(b => b.dataset.view === v)).filter(Boolean);
    const racine = document.getElementById('appRoot');
    const appVisible = racine && racine.style.display !== 'none';
    if(!role || !appVisible || !choix.length){ barre.innerHTML = ''; document.body.classList.remove('has-bottom-nav'); return; }
    const langue = (typeof langCourante !== 'undefined' && LIBELLES_COURTS[langCourante]) ? langCourante : 'fr';
    const L = LIBELLES_COURTS[langue];
    const active = visibles.find(b => b.classList.contains('active'));
    barre.innerHTML = '';
    choix.forEach(src => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'bn-item' + (src === active ? ' active' : '');
      b.dataset.view = src.dataset.view;
      if(src === active) b.setAttribute('aria-current', 'page');
      const ic = src.querySelector('.ic');
      b.innerHTML = '<span class="bn-ic" aria-hidden="true"></span><span class="bn-label"></span>';
      // icône : copie de celle du menu (SVG déjà converti par icones.js, ou emoji avant conversion)
      b.querySelector('.bn-ic').innerHTML = ic ? ic.innerHTML : '•';
      b.querySelector('.bn-label').textContent = L[src.dataset.view] || src.textContent.trim();
      b.addEventListener('click', () => src.click());
      barre.appendChild(b);
    });
    const menu = document.createElement('button');
    menu.type = 'button';
    menu.className = 'bn-item';
    menu.innerHTML = '<span class="bn-ic" aria-hidden="true">☰</span><span class="bn-label"></span>';
    menu.querySelector('.bn-label').textContent = L.menu;
    menu.setAttribute('aria-label', L.menu);
    menu.addEventListener('click', () => { const bg = document.getElementById('burger'); if(bg) bg.click(); });
    barre.appendChild(menu);
    document.body.classList.add('has-bottom-nav');
  }
  function installerBarreBas(){
    const nav = document.getElementById('nav');
    if(!nav) return; // console développeur : pas de menu latéral
    const barre = document.createElement('nav');
    barre.id = 'bottomNav';
    barre.className = 'bottom-nav';
    barre.setAttribute('aria-label', 'Navigation principale');
    document.body.appendChild(barre);
    let planifie = false;
    const planifier = () => { if(planifie) return; planifie = true; requestAnimationFrame(() => { planifie = false; majBarreBas(); }); };
    new MutationObserver(planifier).observe(nav, { attributes:true, attributeFilter:['class', 'style'], subtree:true });
    const racine = document.getElementById('appRoot');
    if(racine) new MutationObserver(planifier).observe(racine, { attributes:true, attributeFilter:['style'] });
    const badge = document.getElementById('roleBadge');
    if(badge) new MutationObserver(planifier).observe(badge, { childList:true, characterData:true, subtree:true });
    planifier();
  }

  /* ---- Éléments cliquables qui ne sont pas des boutons (div, span… avec onclick) :
        on leur donne le rôle de bouton et l'accès au clavier (Entrée / Espace) ---- */
  const NON_NATIFS = '[onclick]:not(button):not(a):not(input):not(select):not(textarea):not(label):not(option):not(body)';
  function rendreCliquablesAccessibles(racine){
    (racine || document).querySelectorAll(NON_NATIFS).forEach(el => {
      if(!el.hasAttribute('role')) el.setAttribute('role', 'button');
      if(!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    });
  }
  document.addEventListener('keydown', e => {
    const el = e.target;
    if(!(e.key === 'Enter' || e.key === ' ') || !el || !el.matches || !el.matches(NON_NATIFS)) return;
    e.preventDefault();
    el.click();
  });

  /* ---- Bandeau « nouvelle version disponible » (appelé par l'enregistrement du service worker) ---- */
  window.afficherMiseAJourDisponible = function(){
    if(document.getElementById('bandeauMaj')) return;
    const b = document.createElement('div');
    b.id = 'bandeauMaj'; b.className = 'bandeau-maj'; b.setAttribute('role', 'status');
    b.innerHTML = '<span>Une nouvelle version d’EcoMaZ est disponible.</span><button type="button">Mettre à jour</button>';
    b.querySelector('button').addEventListener('click', () => location.reload());
    document.body.appendChild(b);
  };

  function demarrer(){
    // Bouton dans la barre du haut (application) et sur l'écran de connexion
    const barre = document.querySelector('.topbar-right');
    if(barre) barre.insertBefore(creerBouton(), barre.firstChild);
    // bouton de l'écran de connexion : seulement dans les applications (pas sur les pages simples)
    if(document.getElementById('loginGate')) document.body.appendChild(creerBouton('theme-toggle-gate'));
    majBoutons();

    const toast = document.getElementById('toast');
    if(toast){ toast.setAttribute('role', 'status'); toast.setAttribute('aria-live', 'polite'); }
    const burger = document.getElementById('burger');
    if(burger) burger.setAttribute('aria-label', 'Ouvrir le menu');
    const main = document.getElementById('viewContainer');
    if(main){ main.setAttribute('role', 'main'); }

    installerModales();
    rendreCliquablesAccessibles(document);
    let planifieA11y = false;
    new MutationObserver(() => {
      if(planifieA11y) return; planifieA11y = true;
      requestAnimationFrame(() => { planifieA11y = false; rendreCliquablesAccessibles(document); });
    }).observe(document.body, { childList:true, subtree:true });
    installerBarreBas();

    const zone = document.getElementById('viewContainer');
    if(zone){
      let planifie = false;
      new MutationObserver(() => {
        if(planifie) return;
        planifie = true;
        requestAnimationFrame(() => { planifie = false; etiqueterTableaux(zone); nommerBoutons(zone); });
      }).observe(zone, { childList:true, subtree:true });
      etiqueterTableaux(zone);
      nommerBoutons(zone);
    }
    const haut = document.querySelector('.topbar-right');
    if(haut){ nommerBoutons(haut); new MutationObserver(() => nommerBoutons(haut)).observe(haut, { childList:true, subtree:true }); }
    if(window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', majBoutons);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})();
