/* =========================================================================
   EcoMaZ — Console Développeur : connexion à Supabase
   ---------------------------------------------------------------------
   Version volontairement allégée, propre aux besoins réels de la
   console : elle ne touche jamais aux données opérationnelles d'une
   école (élèves, notes, comptabilité...), seulement à la table "ecoles"
   et aux fonctions Edge dédiées (creer-ecole-cliente, supprimer-ecole-
   cliente) — pas besoin de toute la couche CRUD générique du site
   client, ni du mode hors ligne (cet outil de pilotage à distance a de
   toute façon besoin d'internet pour gérer les écoles du cloud).
   ========================================================================= */

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function snakeToCamel(s){ return s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase()); }
function rowToCamel(row){
  if(!row) return row;
  const out = {};
  for(const k in row) out[snakeToCamel(k)] = row[k];
  return out;
}
function rowsToCamel(rows){ return (rows||[]).map(rowToCamel); }

/* ---------------------------------------------------------------------
   Session courante (compte développeur connecté)
   --------------------------------------------------------------------- */
const session = { userId:null, ecoleId:null, role:null, nomComplet:'' };

// "getSession()" lit la session déjà en mémoire/localStorage, sans appel
// réseau (sauf si le jeton doit être rafraîchi) — plus robuste face à un
// réseau instable que "getUser()", qui revalide toujours côté serveur.
async function chargerProfilCourant(){
  const { data: { session: authSession } } = await sb.auth.getSession();
  const user = authSession?.user;
  if(!user) return null;
  const { data, error } = await sb.from('profiles').select('*').eq('id', user.id).single();
  if(error || !data) return null;
  session.userId = user.id;
  session.ecoleId = data.ecole_id;
  session.role = data.role;
  session.nomComplet = data.nom_complet || '';
  return data;
}

async function connexion(email, motDePasse){
  const { data, error } = await sb.auth.signInWithPassword({ email, password: motDePasse });
  if(error) return { ok:false, message: traduireErreurAuth(error) };
  const profil = await chargerProfilCourant();
  if(!profil) return { ok:false, message: "Ce compte n'est associé à aucun profil. Contactez l'administrateur." };
  return { ok:true, profil };
}
async function deconnexion(){
  await sb.auth.signOut();
  session.userId = null; session.ecoleId = null; session.role = null; session.nomComplet = '';
}
function traduireErreurAuth(error){
  if(error.message && error.message.includes('Invalid login credentials')) return 'Email ou mot de passe incorrect.';
  if(error.message && error.message.includes('rate limit')) return 'Trop de tentatives. Réessayez dans quelques minutes.';
  return error.message || 'Erreur de connexion.';
}
