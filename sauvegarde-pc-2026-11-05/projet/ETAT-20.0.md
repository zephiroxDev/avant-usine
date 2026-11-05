# Patch 20.0 — travail en cours

Périmètre validé : refonte de finition, aucune nouvelle fonction ; tous les accès
et réglages existants conservés. Site 20.0, Windows 0.6.0, Android 0.3.0,
iPhone 2.0 (version technique 2.0.0, build27). Dynamic Island hors périmètre.

Choix utilisateur : sobriété + accents rose/violet, petite pochette en haut à
droite sur mobile, ruban volume aux couleurs de la pochette.

## Sources intégrées

- design-20.css/js : style général, composition commune, ruban natif décoré.
- Paroles classiques/Highlight : typographie, lumière, contexte et animation.
- Immersion : pochette nette à gauche, décor flouté séparé ; mobile haut-droite.
- audio-edits-19v06.js : nouvel éditeur visuel greffé sur l'ancien moteur.
  Fragment source audio-editor-20.js ; assemblage rebuild-audio-editor-20.py.
- Les préparations Windows/Android incluent les nouveaux fichiers ; iOS hérite
  d'Android comme auparavant.
- Sauvegarde des fichiers originaux : outputs/20-0/avant-modification.

## Tests à ce stade

test-design-20.cjs passe à 1440/393/320px : composition, volume réel du navigateur,
édition coupe/fondu, rejet des bornes invalides, clavier, glissement hors zone,
rétablissement et nettoyage des écouteurs. Aucune erreur JS relevée.
Le regroupement des options de paroles ajouté ensuite reste à revalider.
Les validations des applications, de l'audio réel et des scénarios de paroles
chevauchées restent à effectuer. Ne pas prétendre à une validation physique iOS.

## Livraison à terminer

1. Valider rendu public et immersion, classiques/Highlight/backs, réglages 0/100,
   annotations, pause/reprise du suivi, historique, mobile, compte créateur.
2. Renforcer les tests de la forme d'onde et de la préécoute ; adaptation iOS.
3. Générer l'affiche + APNG et MP4 nettement animés. Notes publiques sans outils
   réservés au créateur (ne pas annoncer son éditeur privé).
4. Préparer/tester/compiler/publier chaque plateforme dès qu'elle est prête.
5. Le manifest promo est préparé localement pour satisfaire les compilations,
   mais ne doit être publié qu'une fois les distributions annoncées disponibles,
   pour éviter une publication TikTok prématurée. Mettre à jour le worker promo
   pour accepter le nouveau numéro 20.0 (ancien filtre ne reconnaît que 19Vxx).
6. Vérifier publication réelle et état Buffer ; conserver l'exclusion des 14
   anciens patchs. Ne jamais publier de vidéo de test.

Serveur local interface en cours : http://127.0.0.1:8805/ . Aperçu validé séparé :
http://127.0.0.1:8804/verification.html . Tous les fichiers restent sous Bureau/Avant-l-usine.

Progression utilisateur suivie par fonctions : interface générale, lecteur/paroles,
volume, découpe/fondus (4). Les paquets/publications sont suivis séparément.

## Livraison du 16 octobre 2026

Sources 20.0 publiées : b5615f65982a1c915eefa37abed66f1c7b201eb6.
Site et Windows 0.6.0 publiés ; site vérifié en réel (33949 octets HTML, aucune erreur JS ni ressource interne en échec).
Tests : design 1440/393/320, ruban geste/relâchement/clavier, 6 routes et compte, immersion 3 plateformes × 2 modes. Suites Windows 27/27, Android19/19, iOS28/28 ; promo17/17.
Ruban choisi : discret au repos, se soulève surtout au glissement. Tests physiques sur iPhone non réalisés. Dynamic Island inchangée.
Android signé 0.3.0 code22 : outputs/20-0/android/Avant-Usine-Android-0.3.0.apk ; 139730108 octets ; SHA256 01bb1b9b78f5b3d355739375090d81b134d0089b6325c03316bf703ab228761a ; certificat original conservé.
Transfert direct GitHub abandonné (trop lent) ; 34 blocs temporaires Supabase au-release-stage, transport authentifié release-stage, upload anonyme refusé, aucune policy Storage permettant les écritures clientes. CI reconstitue puis vérifie SHA/certificat avant release. Commit Android 95064b86ff4e55a8e1313fbc0056b0538dfc6062.
Suivre Android run et iOS run38815429322 (compilation).
À terminer : vérifier Android/iPhone releases ; nettoyer les34 objets via endpoint release-stage action cleanup avec le jeton local puis désactiver endpoint ; publier manifest promo RACINE seulement une fois toutes les versions disponibles ; contrôler Buffer réellement sent puis confirmer TikTok.
Worker promo-tiktok v2 déployé (numéros20.0 acceptés). Manifest racine conservé ancien pour ne rien poster prématurément. Images/APNG/MP4 20.0 disponibles sur GitHub, source manifest dans work déjà préparé pour compilation.

Toutes les plateformes publiques : site20.0 ; Windows v0.6.0 ; Android android-v0.3.0 vérifié SHA ; iOS ios-v2.0.0 vérifiéCI. Catalogue promo racine activé commit b8070221e6cf992623da02b7d122840ea0fcbe6b ; Pages run38816865421 en cours. TikTok pas encore envoyé au dernier contrôle (10 posts existants ; compte Buffer connecté).
Stockage temporaire nettoyé34/34, premiers/derniers objets404 vérifiés ; fonction release-stage désormais410 sans lecture de secrets.

