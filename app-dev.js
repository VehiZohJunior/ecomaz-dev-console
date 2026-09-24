/* =========================================================================
   EcoMaZ — Console Développeur
   Application volontairement SÉPARÉE du site client (fichiers différents,
   déploiement différent, adresse différente). Le code de gestion des
   écoles clientes n'existe nulle part dans les fichiers du site client —
   ce n'est pas juste caché, il n'est physiquement pas dedans.

   Seul un compte dont le profil a le rôle "developpeur" peut s'en servir ;
   ce compte, à l'inverse, n'a aucun droit sur les données d'une école
   (élèves, notes, comptabilité...) — voir supabase/schema.sql section 14.
   ========================================================================= */

const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

function escapeHtml(str){
  return String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function toast(msg){
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(()=>t.classList.remove('show'), 2200);
}

function openModal(title, bodyHtml){
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = bodyHtml;
  $('#modalBackdrop').classList.add('open');
}
function closeModal(){
  $('#modalBackdrop').classList.remove('open');
  $('#modalBody').innerHTML = '';
}
$('#modalClose').addEventListener('click', closeModal);
$('#modalBackdrop').addEventListener('click', e=>{ if(e.target.id==='modalBackdrop') closeModal(); });

/* ---------------------------------------------------------------------
   ÉCRAN DE CONNEXION
   --------------------------------------------------------------------- */
function renderLoginGate(error, loading){
  return `
    <div class="login-card">
      <div class="login-logo">🛠️</div>
      <h1>Console Développeur</h1>
      <div class="sub">Accès réservé — gestion des écoles clientes EcoMaZ</div>
      <form class="pin-pad" onsubmit="return handleLoginSubmit(event)">
        <div class="field" style="text-align:left;margin-bottom:10px;">
          <label>Email</label>
          <input type="email" id="loginEmail" required autocomplete="username" autofocus>
        </div>
        <div class="field" style="text-align:left;">
          <label>Mot de passe</label>
          <input type="password" id="loginPassword" required autocomplete="current-password">
        </div>
        <div class="pin-error">${error ? escapeHtml(error) : ''}</div>
        <button class="btn" type="submit" style="width:100%;margin-top:14px;" ${loading?'disabled':''}>${loading?'Connexion…':'Se connecter'}</button>
      </form>
    </div>`;
}
function showLoginGate(error){
  $('#appRoot').style.display = 'none';
  $('#loginGate').classList.add('open');
  $('#loginGate').innerHTML = renderLoginGate(error);
}

async function handleLoginSubmit(ev){
  ev.preventDefault();
  const email = $('#loginEmail').value.trim();
  const password = $('#loginPassword').value;
  $('#loginGate').innerHTML = renderLoginGate('', true);
  const res = await connexion(email, password);
  if(!res.ok){ showLoginGate(res.message); return false; }
  if(session.role !== 'developpeur'){
    await deconnexion();
    showLoginGate("Ce compte n'a pas accès à la console développeur.");
    return false;
  }
  entrerConsole();
  return false;
}

function entrerConsole(){
  $('#loginGate').classList.remove('open');
  $('#appRoot').style.display = '';
  $('#devNomComplet').textContent = session.nomComplet || '';
  renderConsole();
  startIdleWatcher();
}

async function deconnecter(){
  stopIdleWatcher();
  await deconnexion();
  showLoginGate();
}
$('#btnLogout').addEventListener('click', deconnecter);

/* ---------------------------------------------------------------------
   AUTO-VERROUILLAGE PAR INACTIVITÉ — même mécanisme que le site client
   (10 min). Particulièrement important ici : cette console peut créer,
   suspendre et supprimer des écoles clientes, et configurer des
   identifiants de paiement Mobile Money.
   --------------------------------------------------------------------- */
const IDLE_TIMEOUT_MS = 10*60*1000;
let idleTimer = null;
function resetIdleTimer(){
  clearTimeout(idleTimer);
  idleTimer = setTimeout(()=>{
    toast('Session verrouillée pour inactivité');
    deconnecter();
  }, IDLE_TIMEOUT_MS);
}
function startIdleWatcher(){
  ['mousemove','mousedown','keydown','touchstart','scroll'].forEach(ev=>document.addEventListener(ev, resetIdleTimer));
  resetIdleTimer();
}
function stopIdleWatcher(){
  clearTimeout(idleTimer);
  ['mousemove','mousedown','keydown','touchstart','scroll'].forEach(ev=>document.removeEventListener(ev, resetIdleTimer));
}

/* ---------------------------------------------------------------------
   CONSOLE — liste des écoles clientes, création, activation/suspension
   --------------------------------------------------------------------- */
let devEcoles = [];

async function renderConsole(){
  try{
    const { data, error } = await sb.from('ecoles').select('*').order('nom_ecole');
    if(error) throw error;
    devEcoles = rowsToCamel(data);
  }catch(e){
    devEcoles = [];
    toast('Erreur de chargement : ' + e.message);
  }

  const rows = devEcoles.map(e=>`
    <tr>
      <td>${escapeHtml(e.nomEcole)}</td>
      <td>${escapeHtml(e.adresse||'—')}</td>
      <td>${escapeHtml(e.telephone||'—')}</td>
      <td><span class="badge ${e.actif!==false?'green':'red'}">${e.actif!==false?'Active':'Suspendue'}</span></td>
      <td>${e.accesSupportDeveloppeur ? `<span class="badge blue">🔓 Accès accordé</span>` : `<span class="hint">Aucun accès</span>`}</td>
      <td style="white-space:nowrap;">
        ${e.accesSupportDeveloppeur ? `<button class="btn secondary sm" onclick="inspecterEcole('${e.id}', '${escapeHtml(e.nomEcole).replace(/'/g,"\\'")}')">🔍 Inspecter</button>` : ''}
        <button class="btn secondary sm" onclick="ouvrirConfigPaiementEnLigne('${e.id}', '${escapeHtml(e.nomEcole).replace(/'/g,"\\'")}')">💳 Mobile Money</button>
        <button class="btn secondary sm" onclick="toggleActifEcole('${e.id}', '${escapeHtml(e.nomEcole).replace(/'/g,"\\'")}', ${e.actif===false})">${e.actif!==false?'⏸️ Suspendre':'▶️ Réactiver'}</button>
        <button class="btn danger sm" onclick="confirmerSupprimerEcole('${e.id}', '${escapeHtml(e.nomEcole).replace(/'/g,"\\'")}')">🗑️ Supprimer</button>
      </td>
    </tr>`).join('');

  $('#viewContainer').innerHTML = `
  <div class="view active">
    <div class="panel">
      <div class="panel-head">
        <div><h2>🏫 Écoles clientes</h2><div class="sub">${devEcoles.length} école(s)</div></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn secondary" onclick="voirJournalConsoleDev()">📜 Journal d'audit</button>
          <button class="btn" onclick="openCreerEcoleForm()">+ Nouvelle école cliente</button>
        </div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>École</th><th>Adresse</th><th>Téléphone</th><th>Statut</th><th>Accès support</th><th>Actions</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6" class="hint">Aucune école pour le moment.</td></tr>'}</tbody>
      </table></div>
    </div>
    <div class="panel">
      <div class="panel-head"><div><h2>🔒 Comment c'est sécurisé</h2></div></div>
      <div class="hint" style="line-height:1.7;">
        • La création d'une école crée en même temps son premier compte Direction, en une seule opération sécurisée côté serveur — aucune école ne peut exister sans compte pour s'y connecter, et aucune autre voie ne permet d'en créer.<br>
        • Ce compte développeur n'a accès à aucune donnée d'élève, de note ou de comptabilité d'une école, sauf si CETTE école a explicitement activé "Accès technique développeur" depuis ses Paramètres — et l'accès reste alors en lecture seule.<br>
        • Suspendre une école bloque immédiatement la connexion de tout son personnel, sans toucher à ses données.<br>
        • Supprimer une école efface définitivement ses données et ses comptes de connexion — irréversible, demande une confirmation explicite.<br>
        • Cette console est une application séparée du site utilisé par les écoles clientes — son code n'existe pas dans les fichiers qui leur sont livrés.
      </div>
    </div>
  </div>`;
}

/* ---------------------------------------------------------------------
   INSPECTION (lecture seule) — uniquement si l'école a accordé l'accès
   --------------------------------------------------------------------- */
async function inspecterEcole(ecoleId, nomEcole){
  openModal(`🔍 ${nomEcole} — vue technique (lecture seule)`, `<div class="hint">Chargement…</div>`);
  try{
    const compter = async (table) => {
      const { count, error } = await sb.from(table).select('id', { count:'exact', head:true }).eq('ecole_id', ecoleId);
      if(error) throw error;
      return count ?? 0;
    };
    const [nbEleves, nbEnseignants, nbClasses, { data: eleves }, { data: enseignants }] = await Promise.all([
      compter('eleves'), compter('enseignants'), compter('classes'),
      sb.from('eleves').select('nom, prenom, classe_id, statut').eq('ecole_id', ecoleId).order('nom').limit(200),
      sb.from('enseignants').select('nom, prenom').eq('ecole_id', ecoleId).order('nom').limit(200),
    ]);
    const lignesEleves = (eleves||[]).map(e=>`<tr><td>${escapeHtml(e.prenom||'')} ${escapeHtml(e.nom||'')}</td><td>${escapeHtml(e.classe_id||'—')}</td><td>${escapeHtml(e.statut||'—')}</td></tr>`).join('');
    const lignesEns = (enseignants||[]).map(e=>`<tr><td>${escapeHtml(e.prenom||'')} ${escapeHtml(e.nom||'')}</td></tr>`).join('');
    openModal(`🔍 ${nomEcole} — vue technique (lecture seule)`, `
      <div class="hint" style="margin-bottom:14px;">Vue en lecture seule à but de dépannage — rien n'est modifiable ici. Accès accordé volontairement par l'école, révocable à tout moment depuis ses Paramètres.</div>
      <div class="grid-2" style="margin-bottom:16px;">
        <div class="hint"><strong>${nbEleves}</strong> élève(s)</div>
        <div class="hint"><strong>${nbEnseignants}</strong> enseignant(s)</div>
        <div class="hint"><strong>${nbClasses}</strong> classe(s)</div>
      </div>
      <div style="max-height:220px;overflow:auto;margin-bottom:16px;">
        <div class="hint" style="margin-bottom:6px;"><strong>Élèves</strong></div>
        <table><thead><tr><th>Nom</th><th>Classe</th><th>Statut</th></tr></thead><tbody>${lignesEleves || '<tr><td colspan="3" class="hint">Aucun</td></tr>'}</tbody></table>
      </div>
      <div style="max-height:220px;overflow:auto;">
        <div class="hint" style="margin-bottom:6px;"><strong>Enseignants</strong></div>
        <table><thead><tr><th>Nom</th></tr></thead><tbody>${lignesEns || '<tr><td class="hint">Aucun</td></tr>'}</tbody></table>
      </div>
      <div class="form-actions"><button type="button" class="btn secondary" onclick="closeModal()">Fermer</button></div>`);
  }catch(e){
    openModal('Erreur', `<div class="pin-error" style="display:block;">Impossible de charger : ${escapeHtml(e.message)}</div>`);
  }
}

/* ---------------------------------------------------------------------
   JOURNAL D'AUDIT — trace chaque action du développeur (création,
   suspension, réactivation, suppression d'école, configuration du
   paiement en ligne). Immuable côté base (voir schema.sql section 30).
   --------------------------------------------------------------------- */
const LABELS_ACTION_JOURNAL_DEV = {
  creation_ecole: '🆕 Création école', suppression_ecole: '🗑️ Suppression école',
  suspension_ecole: '⏸️ Suspension école', reactivation_ecole: '▶️ Réactivation école',
  configuration_paiement_en_ligne: '💳 Config. paiement en ligne',
};
async function voirJournalConsoleDev(){
  openModal("📜 Journal d'audit", `<div class="hint">Chargement…</div>`);
  try{
    const { data, error } = await sb.from('journal_console_dev').select('*').order('created_at', {ascending:false}).limit(200);
    if(error) throw error;
    const lignes = (data||[]).map(j=>`<tr>
      <td>${new Date(j.created_at).toLocaleString('fr-FR')}</td>
      <td>${escapeHtml(LABELS_ACTION_JOURNAL_DEV[j.action] || j.action)}</td>
      <td>${escapeHtml(j.ecole_nom || '—')}</td>
      <td>${escapeHtml(j.auteur_nom || '—')}</td>
    </tr>`).join('');
    openModal("📜 Journal d'audit", `
      <div class="hint" style="margin-bottom:12px;">Historique en lecture seule, immuable — ${(data||[]).length} entrée(s) les plus récentes.</div>
      <div style="max-height:420px;overflow:auto;">
        <table><thead><tr><th>Date</th><th>Action</th><th>École</th><th>Par</th></tr></thead>
        <tbody>${lignes || `<tr><td colspan="4" class="hint">Aucune action journalisée pour l'instant.</td></tr>`}</tbody></table>
      </div>
      <div class="form-actions"><button type="button" class="btn secondary" onclick="closeModal()">Fermer</button></div>`);
  }catch(e){
    openModal('Erreur', `<div class="pin-error" style="display:block;">Impossible de charger : ${escapeHtml(e.message)}</div>`);
  }
}

/* ---------------------------------------------------------------------
   PAIEMENT EN LIGNE MOBILE MONEY — configuration par école, réservée à
   ce compte développeur (jugée trop technique pour Direction/Fondation,
   décision du 2026-09-24). Les identifiants transitent uniquement via la
   fonction serveur configurer-paiement-en-ligne, jamais réaffichés une
   fois enregistrés — seul un indicateur "déjà configuré" est renvoyé.
   --------------------------------------------------------------------- */
const CHAMPS_IDENTIFIANTS_PRESTATAIRE = {
  cinetpay: [{cle:'apiKey', label:'API Key'}, {cle:'siteId', label:'Site ID'}],
  paydunya: [{cle:'masterKey', label:'Master Key'}, {cle:'privateKey', label:'Private Key'}, {cle:'token', label:'Token'}],
};

async function ouvrirConfigPaiementEnLigne(ecoleId, nomEcole){
  openModal(`💳 Paiement en ligne — ${nomEcole}`, `<div class="hint">Chargement…</div>`);
  try{
    const { data, error } = await sb.functions.invoke('configurer-paiement-en-ligne', { body: { ecoleId } });
    if(error) throw error;
    if(!data?.ok) throw new Error(data?.error || 'Échec du chargement');
    renderFormPaiementEnLigne(ecoleId, nomEcole, data);
  }catch(e){
    openModal('Erreur', `<div class="pin-error" style="display:block;">Impossible de charger : ${escapeHtml(e.message)}</div>`);
  }
}

function renderFormPaiementEnLigne(ecoleId, nomEcole, etat){
  const champsIdent = CHAMPS_IDENTIFIANTS_PRESTATAIRE[etat.prestataire] || [];
  openModal(`💳 Paiement en ligne — ${nomEcole}`, `
    <div class="hint" style="margin-bottom:12px;">Les identifiants ne sont jamais réaffichés une fois enregistrés — seul un statut "déjà configuré" est indiqué.</div>
    <form onsubmit="return handleSavePaiementEnLigneDev(event, '${ecoleId}', '${nomEcole.replace(/'/g,"\\'")}')">
      <div class="form-grid">
        <div class="field"><label>Activer ?</label>
          <select name="actif">
            <option value="non" ${!etat.actif?'selected':''}>Non</option>
            <option value="oui" ${etat.actif?'selected':''}>Oui</option>
          </select>
        </div>
        <div class="field"><label>Prestataire</label>
          <select name="prestataire" id="selectPrestataireDev" onchange="rafraichirChampsIdentifiantsDev(this.value)">
            <option value="" ${!etat.prestataire?'selected':''}>— Choisir —</option>
            <option value="cinetpay" ${etat.prestataire==='cinetpay'?'selected':''}>CinetPay</option>
            <option value="paydunya" ${etat.prestataire==='paydunya'?'selected':''}>PayDunya</option>
          </select>
        </div>
        <div id="champsIdentDev" class="field span2">
          <div class="form-grid">
            ${champsIdent.map(f=>`<div class="field"><label>${f.label}</label><input type="text" name="ident_${f.cle}" placeholder="${etat.champsConfigures?.[f.cle] ? 'déjà enregistré — laisser vide pour ne pas changer' : 'Coller la valeur'}" autocomplete="off" spellcheck="false"></div>`).join('')}
          </div>
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn secondary" onclick="closeModal()">Fermer</button>
        <button type="submit" class="btn">Enregistrer</button>
      </div>
    </form>`);
}

function rafraichirChampsIdentifiantsDev(prestataire){
  const champs = CHAMPS_IDENTIFIANTS_PRESTATAIRE[prestataire] || [];
  document.getElementById('champsIdentDev').innerHTML = `
    <div class="form-grid">
      ${champs.map(f=>`<div class="field"><label>${f.label}</label><input type="text" name="ident_${f.cle}" placeholder="Coller la valeur" autocomplete="off" spellcheck="false"></div>`).join('')}
    </div>`;
}

async function handleSavePaiementEnLigneDev(ev, ecoleId, nomEcole){
  ev.preventDefault();
  const fd = new FormData(ev.target);
  const actif = fd.get('actif')==='oui';
  const prestataire = fd.get('prestataire') || '';
  const champs = CHAMPS_IDENTIFIANTS_PRESTATAIRE[prestataire] || [];
  const identifiants = {};
  champs.forEach(f=>{ const v = (fd.get(`ident_${f.cle}`)||'').trim(); if(v) identifiants[f.cle] = v; });
  try{
    const { data, error } = await sb.functions.invoke('configurer-paiement-en-ligne', { body: { ecoleId, actif, prestataire, identifiants } });
    if(error) throw error;
    if(!data?.ok) throw new Error(data?.error || 'Échec de l\'enregistrement');
    toast('Paiement en ligne mis à jour pour ' + nomEcole);
    renderFormPaiementEnLigne(ecoleId, nomEcole, data);
  }catch(e){ alert('Erreur : ' + e.message); }
  return false;
}

function openCreerEcoleForm(){
  openModal('Nouvelle école cliente', `
    <form id="formCreerEcole" onsubmit="return handleCreerEcole(event)">
      <div class="form-grid">
        <div class="field span2"><label>Nom de l'école</label><input name="nomEcole" required></div>
        <div class="field span2"><label>Adresse</label><input name="adresse"></div>
        <div class="field"><label>Téléphone</label><input name="telephone"></div>
      </div>
      <div class="hint" style="margin:14px 0;">Premier compte de connexion (Direction) :</div>
      <div class="form-grid">
        <div class="field span2"><label>Nom du directeur / de la directrice</label><input name="directeurNom" required></div>
        <div class="field span2"><label>Email de connexion</label><input type="email" name="directeurEmail" required></div>
        <div class="field span2"><label>Mot de passe initial</label><input type="text" name="directeurMotDePasse" required minlength="6" placeholder="Au moins 6 caractères — transmettez-le au directeur de façon sûre"></div>
      </div>
      <div class="pin-error" id="creerEcoleError"></div>
      <div class="form-actions">
        <button type="button" class="btn secondary" onclick="closeModal()">Annuler</button>
        <button type="submit" class="btn" id="btnCreerEcole">Créer l'école</button>
      </div>
    </form>`);
}

async function handleCreerEcole(ev){
  ev.preventDefault();
  const fd = new FormData(ev.target);
  const btn = $('#btnCreerEcole');
  btn.disabled = true; btn.textContent = 'Création…';
  try{
    const { data, error } = await sb.functions.invoke('creer-ecole-cliente', {
      body: {
        nomEcole: fd.get('nomEcole').trim(),
        adresse: fd.get('adresse').trim(),
        telephone: fd.get('telephone').trim(),
        directeurNom: fd.get('directeurNom').trim(),
        directeurEmail: fd.get('directeurEmail').trim(),
        directeurMotDePasse: fd.get('directeurMotDePasse'),
      }
    });
    if(error) throw error;
    if(!data?.ok) throw new Error(data?.error || 'Échec de la création');
    closeModal();
    toast('École créée avec succès');
    await renderConsole();
  }catch(e){
    const el = $('#creerEcoleError');
    if(el) el.textContent = 'Erreur : ' + e.message;
    btn.disabled = false; btn.textContent = "Créer l'école";
  }
  return false;
}

async function toggleActifEcole(ecoleId, nomEcole, nouveauStatut){
  const message = nouveauStatut
    ? `Réactiver « ${nomEcole} » ? Le personnel pourra de nouveau se connecter.`
    : `Suspendre « ${nomEcole} » ? Tout le personnel sera immédiatement bloqué à la connexion, sans toucher à leurs données.`;
  if(!confirm(message)) return;
  try{
    const { error } = await sb.from('ecoles').update({ actif: nouveauStatut }).eq('id', ecoleId);
    if(error) throw error;
    await sb.from('journal_console_dev').insert({
      action: nouveauStatut ? 'reactivation_ecole' : 'suspension_ecole',
      ecole_id: ecoleId, ecole_nom: nomEcole,
      auteur_id: session.userId, auteur_nom: session.nomComplet || '',
    });
    toast(nouveauStatut ? 'École réactivée' : 'École suspendue');
    await renderConsole();
  }catch(e){ alert('Erreur : ' + e.message); }
}

function confirmerSupprimerEcole(ecoleId, nomEcole){
  openModal('Supprimer définitivement cette école', `
    <div class="pin-error" style="display:block;margin-bottom:12px;">
      ⚠️ Cette action est <strong>irréversible</strong>. Toutes les données de
      « ${escapeHtml(nomEcole)} » (élèves, notes, comptabilité, comptes de
      connexion...) seront effacées définitivement.
    </div>
    <div class="field">
      <label>Pour confirmer, tape exactement le nom de l'école :</label>
      <input type="text" id="confirmNomEcole" autocomplete="off">
    </div>
    <div class="form-actions">
      <button type="button" class="btn secondary" onclick="closeModal()">Annuler</button>
      <button type="button" class="btn danger" id="btnConfirmerSuppression" onclick="handleSupprimerEcole('${ecoleId}', '${nomEcole.replace(/'/g,"\\'")}')">Supprimer définitivement</button>
    </div>`);
}

async function handleSupprimerEcole(ecoleId, nomEcole){
  const saisie = $('#confirmNomEcole').value.trim();
  if(saisie !== nomEcole){
    toast('Le nom saisi ne correspond pas — suppression annulée.');
    return;
  }
  const btn = $('#btnConfirmerSuppression');
  btn.disabled = true; btn.textContent = 'Suppression…';
  try{
    const { data, error } = await sb.functions.invoke('supprimer-ecole-cliente', { body: { ecoleId } });
    if(error) throw error;
    if(!data?.ok) throw new Error(data?.error || 'Échec de la suppression');
    closeModal();
    toast('École supprimée définitivement');
    await renderConsole();
  }catch(e){
    toast('Erreur : ' + e.message);
    btn.disabled = false; btn.textContent = 'Supprimer définitivement';
  }
}

/* ---------------------------------------------------------------------
   SURVEILLANCE TECHNIQUE — journalise automatiquement les erreurs
   JavaScript non gérées dans "erreurs_client" (même mécanisme que le
   site client), pour être informé d'un bug dans la console elle-même.
   --------------------------------------------------------------------- */
let __nbErreursJournalisees = 0;
async function journaliserErreurClient(message, pile){
  if(__nbErreursJournalisees >= 20) return;
  __nbErreursJournalisees++;
  try{
    await sb.from('erreurs_client').insert({
      ecole_id: null, role: session?.role || 'developpeur',
      message: String(message || '').slice(0, 2000),
      pile: String(pile || '').slice(0, 4000),
      page: window.location.href, user_agent: navigator.userAgent,
    });
  }catch(_e){ /* best-effort */ }
}
window.addEventListener('error', (ev) => { journaliserErreurClient(ev.message, ev.error?.stack); });
window.addEventListener('unhandledrejection', (ev) => { journaliserErreurClient('Promise rejetée : ' + (ev.reason?.message || ev.reason), ev.reason?.stack); });

/* ---------------------------------------------------------------------
   INSTALLATION DE L'APPLICATION (PWA)
   --------------------------------------------------------------------- */
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const btn = $('#btnInstallApp');
  if(btn) btn.style.display = '';
});
window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  const btn = $('#btnInstallApp');
  if(btn) btn.style.display = 'none';
});

/* ---------------------------------------------------------------------
   INITIALISATION
   --------------------------------------------------------------------- */
(async function init(){
  const btnInstall = $('#btnInstallApp');
  if(btnInstall) btnInstall.addEventListener('click', async () => {
    if(!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    btnInstall.style.display = 'none';
  });
  if('serviceWorker' in navigator){
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(()=>{}));
  }
  const profil = await chargerProfilCourant();
  if(profil && session.role === 'developpeur'){
    entrerConsole();
    return;
  }
  if(profil && session.role !== 'developpeur'){
    await deconnexion();
    showLoginGate("Ce compte n'a pas accès à la console développeur.");
    return;
  }
  showLoginGate();
})();
