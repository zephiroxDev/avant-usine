# Pause des plateformes

Demande du21octobre2026 : conserver les sites et iOS ; fermer Windows, Android et PS4.

Fait : message et liens de téléchargement révisés, commit63bd5b1411c4c87fb8b39846ce92ce6cea650bee. Pages39612473513 à vérifier pour la mise en ligne. Fermeture distributions39612474269 réussie :73releases en brouillon,5workflows désactivés ; aucun fichier supprimé.

Blocage DataAPI effectivement testé : Windows/Android/PS4 reçoivent503 ; maintenance all.closed=true ; site+iOS restent200 et non fermés. Source SQL work/mine-sync/pause-platforms-20.sql ; preuve outputs/platform-pause/backend-verified.json.

Limites : en-têtes identifient les clients standards ; les anciennes applications restent exécutables hors ligne ou avec leurs fichiers et flux externes. Le contrôle DataAPI ne couvre pas automatiquement Realtime, Storage ou Auth. Supabase commun conservé, aucun compte ni fichier utilisateur supprimé.

Ne pas activer l’affiche20.0.4 globale préparée avant ce changement de consigne : elle annonce encore Windows/Android. Refaire les supports publics autour des sites et de l’iPhone uniquement.

Pages39612473513 réussie ; message vérifié sur le site en ligne et liens Windows/Android absents. Preuve outputs/platform-pause/site-verified.json.

