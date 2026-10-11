/* =========================================================================
   EcoMaZ — Icônes d'interface (spécification motion design § 2.6, Lot 3)
   Icônes : Lucide (lucide-static v1.55.0), licence ISC — https://lucide.dev
   Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as
   part of Feather (MIT). All other copyright (c) for Lucide are held by
   Lucide Contributors 2022.

   L'application génère son HTML dans app.js avec des emojis comme icônes.
   Plutôt que de réécrire chaque gabarit, ce fichier remplace, dans les
   ÉLÉMENTS D'INTERFACE seulement (menu, titres, boutons, onglets, badges,
   bulles…), l'emoji placé EN TÊTE de leur texte par l'icône SVG équivalente.
   Les textes saisis par l'école (actualités, messages) ne sont jamais
   modifiés : ils ne sont pas dans ces éléments, et seul l'emoji de tête est
   concerné. Le remplacement a lieu avant l'affichage (pas de clignotement).
   ========================================================================= */
(function(){
  // Les dessins des icônes sont dans icones.svg (fichier image, mis en cache,
  // non analysé comme du JavaScript) : ici seulement la liste des noms.
  const NOMS = new Set(["alarm-clock", "baby", "backpack", "ban", "banknote", "bell", "book", "book-open", "book-open-check", "brick-wall", "briefcase", "building-2", "calendar", "calendar-days", "calendar-range", "camera", "chart-column", "check", "chevron-down", "circle", "circle-check", "circle-dot", "circle-stop", "circle-x", "clipboard", "clock", "credit-card", "door-open", "download", "eye", "factory", "file-text", "flask-conical", "folder-open", "graduation-cap", "hand", "hourglass", "house", "key-round", "landmark", "lightbulb", "link", "lock", "lock-keyhole", "lock-open", "log-in", "mail", "map-pin", "menu", "mic", "monitor", "moon", "newspaper", "notebook-pen", "palette", "party-popper", "pencil", "plug", "plus", "presentation", "printer", "receipt", "refresh-cw", "save", "school", "scroll-text", "search", "send", "settings", "shield", "shopping-bag", "smartphone", "sparkles", "sun", "tag", "target", "thumbs-up", "timer", "trash-2", "trending-down", "trending-up", "triangle-alert", "trophy", "upload", "user", "users", "wallet", "wrench", "x"]);
  const EMOJIS = {
    "✅": "circle-check",
    "✏️": "pencil",
    "🎓": "graduation-cap",
    "🚪": "door-open",
    "🗑️": "trash-2",
    "👪": "users",
    "⚠️": "triangle-alert",
    "🔒": "lock",
    "👩‍🏫": "presentation",
    "🧾": "receipt",
    "📲": "smartphone",
    "🧒": "backpack",
    "💡": "lightbulb",
    "🔗": "link",
    "✕": "x",
    "🏛️": "landmark",
    "🔍": "search",
    "🎨": "palette",
    "💵": "banknote",
    "🎩": "briefcase",
    "⏳": "hourglass",
    "🔔": "bell",
    "📷": "camera",
    "✨": "sparkles",
    "📨": "mail",
    "⚙️": "settings",
    "🛍️": "shopping-bag",
    "🏠": "house",
    "📜": "scroll-text",
    "📅": "calendar",
    "🗂️": "folder-open",
    "🔄": "refresh-cw",
    "📰": "newspaper",
    "✉️": "mail",
    "🕘": "clock",
    "🖨️": "printer",
    "📝": "notebook-pen",
    "📋": "clipboard",
    "📍": "map-pin",
    "🎉": "party-popper",
    "💰": "wallet",
    "📊": "chart-column",
    "🎯": "target",
    "🏦": "landmark",
    "❌": "circle-x",
    "🔑": "key-round",
    "🚫": "ban",
    "🏆": "trophy",
    "👋": "hand",
    "👁️": "eye",
    "⏹️": "circle-stop",
    "⏰": "alarm-clock",
    "🗓️": "calendar-days",
    "📚": "book-open",
    "✓": "check",
    "➕": "plus",
    "📄": "file-text",
    "☰": "menu",
    "🔌": "plug",
    "🍼": "baby",
    "🎒": "backpack",
    "📘": "book",
    "🛠️": "wrench",
    "🏭": "factory",
    "🏢": "building-2",
    "📗": "book-open-check",
    "📧": "mail",
    "🔵": "log-in",
    "🎤": "mic",
    "⏺️": "circle-dot",
    "🏷️": "tag",
    "🛡️": "shield",
    "🟡": "circle",
    "📥": "download",
    "📤": "upload",
    "📈": "trending-up",
    "📉": "trending-down",
    "👤": "user",
    "📱": "smartphone",
    "📆": "calendar-range",
    "🖥️": "monitor",
    "🏫": "school",
    "🔐": "lock-keyhole",
    "🧱": "brick-wall",
    "⏱️": "timer",
    "💾": "save",
    "🧪": "flask-conical",
    "☀️": "sun",
    "🌙": "moon",
    "⬇️": "download",
    "⬆️": "upload",
    "🔓": "lock-open",
    "💳": "credit-card"
    };

  function svg(nom, classe){
    if(!NOMS.has(nom)) return '';
    return '<svg class="ico' + (classe ? ' ' + classe : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><use href="icones.svg#i-' + nom + '"/></svg>';
  }
  // Emojis connus triés du plus long au plus court (séquences composées d'abord)
  const CLES = Object.keys(EMOJIS).sort((a, b) => b.length - a.length);
  const SANS_VS = (t) => t.replace(/\uFE0F/g, '');

  const CIBLES = [
    '.nav-item .ic', '.bn-ic', '.subtab', '.btn', '.icon-btn', '.bulle-btn', '.theme-toggle', '.modal-close',
    'h1', 'h2', 'h3', 'h4', '.icon-badge', '.em-ic', '.ric', '.rlabel', '.login-logo', '.hn-sous-titre', '.rg-ic',
    '.txn-ic', '.section-note', '.hint', '.badge', '.role-badge', '.pill', '.mask-badge', '.actu-item > .ic',
    '.pin-back', '.btn-install', '.btn-reset', '.burger', 'label', '.offline-banner', '.empty-state', '.empty',
    'th', 'strong', '.num', '.pin-error', '.lh-ph', '.recu-logo-ph', '.logo-preview .ph', 'button', '.bulle-dropdown h4', '.sub', 'summary', 'legend'
  ].join(',');
  const EXCLUS = '.bulle-item, .actu-item > div, .rg-titre, .rg-sous, textarea, input, select, option, [contenteditable], .no-icon';

  function premierTexte(el){
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    let n;
    while((n = w.nextNode())){ if(n.nodeValue.trim()) return n; }
    return null;
  }
  // Cherche un emoji connu au début de "texte" (après les espaces) ; renvoie [indexDébut, longueur, clé]
  function emojiEnTete(texte, depuis){
    let i = depuis || 0;
    while(i < texte.length && /\s/.test(texte[i])) i++;
    const reste = texte.slice(i), plat = SANS_VS(reste);
    const cle = CLES.find(k => plat.startsWith(SANS_VS(k)));
    if(!cle) return null;
    let lg = 0, vu = '';
    while(lg < reste.length && vu.length < SANS_VS(cle).length){ if(reste[lg] !== '\uFE0F') vu += reste[lg]; lg++; }
    while(reste[lg] === '\uFE0F') lg++;
    return [i, lg, cle];
  }
  // Remplace l'emoji trouvé dans le nœud texte t par l'icône (t est découpé)
  function remplacer(t, pos, lg, cle, seul){
    const tmp = document.createElement('span');
    tmp.innerHTML = svg(EMOJIS[cle], seul ? 'ico-seul' : '');
    const icone = tmp.firstChild;
    if(!icone) return null;
    const apres = t.splitText(pos);          // t = avant, apres = emoji + suite
    const suite = apres.splitText(lg);       // apres = emoji seul
    apres.parentNode.replaceChild(icone, apres);
    suite.nodeValue = suite.nodeValue.replace(/^\s+/, '');
    return suite;
  }
  const INLINE = '.section-note, .hint, .num';     // textes d'aide : tous les emojis connus
  function traiterElement(el){
    if(el.closest(EXCLUS)) return;
    // 1) emoji de tête
    const t = premierTexte(el);
    if(t && !(t.parentElement && t.parentElement.closest('svg'))){
      const r = emojiEnTete(t.nodeValue, 0);
      if(r){
        const seul = !t.nodeValue.slice(r[0] + r[1]).trim() && !t.nextSibling && t.parentElement === el && el.children.length === 0;
        remplacer(t, r[0], r[1], r[2], seul);
      }
    }
    // 2) emojis en début de ligne (après <br>) et, dans les textes d'aide, partout
    const toutRemplacer = el.matches(INLINE);
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    const noeuds = []; let n;
    while((n = w.nextNode())) noeuds.push(n);
    noeuds.forEach(nd => {
      if(!nd.parentNode || (nd.parentElement && nd.parentElement.closest(EXCLUS + ', svg'))) return;
      if(toutRemplacer){
        let courant = nd, garde = 0;
        while(courant && garde++ < 20){
          const v = courant.nodeValue, plat = SANS_VS(v);
          let best = -1, cle = null;
          for(const k of CLES){ const i = plat.indexOf(SANS_VS(k)); if(i >= 0 && (best < 0 || i < best)){ best = i; cle = k; } }
          if(!cle) break;
          // position réelle dans v (en tenant compte des sélecteurs de variante retirés)
          let reel = 0, compte = 0;
          while(reel < v.length && compte < best){ if(v[reel] !== '\uFE0F') compte++; reel++; }
          const r = emojiEnTete(v, reel);
          if(!r) break;
          courant = remplacer(courant, r[0], r[1], r[2], false);
        }
      } else {
        const prev = nd.previousSibling;
        // dans un bouton : chaque morceau de texte peut commencer par une icône (ex. « 🚪 Prévenir »)
        if((prev && prev.nodeName === 'BR') || el.matches('button, .btn')){
          const r = emojiEnTete(nd.nodeValue, 0);
          if(r) remplacer(nd, r[0], r[1], r[2], false);
        }
      }
    });
  }
  function traiter(racine){
    if(!racine || racine.nodeType !== 1) return;
    if(racine.matches && racine.matches(CIBLES)) traiterElement(racine);
    racine.querySelectorAll && racine.querySelectorAll(CIBLES).forEach(traiterElement);
  }

  const obs = new MutationObserver(muts => {
    for(const m of muts){
      if(m.type === 'characterData'){ const el = m.target.parentElement; if(el){ const c = el.closest(CIBLES); if(c) traiterElement(c); } continue; }
      m.addedNodes.forEach(n => {
        if(n.nodeType === 1){ traiter(n); const c = n.parentElement && n.parentElement.closest(CIBLES); if(c) traiterElement(c); }
        else if(n.nodeType === 3 && n.parentElement){ const c = n.parentElement.closest(CIBLES); if(c) traiterElement(c); }
      });
    }
  });
  function demarrer(){
    traiter(document.body);
    obs.observe(document.body, { childList:true, subtree:true, characterData:true });
  }
  window.EmIcones = { svg, traiter, noms: Array.from(NOMS) };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer); else demarrer();
})();
