État actuel : micro-patch iPhone 19V06.2 / 1.1.10 build 23 publié et vérifié. Site 19V06, Windows 0.5.9, Android 0.2.8 inchangés. Voir ETAT-19V06.2.md. Le nom débordant est supprimé et la reprise renforcée ; le blocage des paroles en arrière-plan reste à confirmer sur iPhone réel avec le diagnostic dans Mon compte. Ne pas déclarer ce bug complètement résolu. Dernier commit 797cfe091a4331deefff49d3f5f2f206244ea266.

Historique :

État actuel : 19V06 publiée et vérifiée sur les quatre plateformes. Site 19V06 ; Windows 0.5.9 ; Android 0.2.8 code 19 ; iPhone 1.1.9 build 22. Voir ETAT-19V06.md et outputs/19v06/delivery-complete.json. Dernier commit f7c6b172b9f765a4596573950fea6f4d14b91fbf. Affiche cumulative 19V03.2–19V06 dans Gestion promo. iOS testé en simulateur, pas sur appareil physique ; Highlight Dynamic Island expérimental.

Historique :

État actuel : 19V05 publiée et vérifiée partout. Site 19V05 ; Windows 0.5.8 ; Android 0.2.7 code 18 ; iOS 1.1.8 build 21. Voir ETAT-19V05.md et outputs/19v05/delivery-complete.json. Dernier commit e0365f72bff4be09e0f7c66a98e4e3a620eaf590. Demandes futures dans PROCHAIN-PATCH.md.

Historique :

Préparation locale : 19V05, non publiée. Voir ETAT-19V05.md. Sources, historiques et médias prêts ; tests locaux validés. Versions natives prévues : Windows 0.5.8, Android 0.2.7 (18), iOS 1.1.8 (21), pas encore compilées. Dernière livraison publique confirmée : 19V04.

État actuel : 19V04 terminée et publiée. Site 19V04 ; Windows 0.5.7 ; Android 0.2.6 code 17 ; iOS 1.1.7 build 20. Voir ETAT-19V04.md et outputs/19v04/delivery-complete.json. Trois réglages : visibilité 0–100 par 10 (défaut 0), sensibilité Highlight 1–10 (défaut 5), pause automatique après phrase (défaut désactivé). Préférences mémorisées et dans les sauvegardes. Atelier toujours réservé au Créateur ; notes publiques et affiche ne présentent que l’affichage public. Source 96f4ea111fd5c44f780d402a927174e2f7c0fb4b, dernier commit 2f5a0a4024a299db267981630daa4e2023bb7ca8. Tous les fichiers locaux restent dans le dossier du Bureau.

Transfert Android : fragmenter les lectures de fichiers base64 à 350000 caractères, attendre toute session exec_command, vérifier la longueur et le SHA Git de chaque blob avant publication. Ne jamais publier un bloc lu partiellement. Clés dans ../cles-android, identité conservée.

Historique :

État actuel : 19V03.2 terminée et publiée sur site, Windows 0.5.6, Android 0.2.5 code 16, iOS 1.1.6 build 19. Voir ETAT-19V03.2.md et outputs/19v03-2/delivery-complete.json. Correctif : fin Highlight maintenue 180 ms pour révéler entièrement les dernières lettres ; fins explicites ne tronquent pas les courbes. Minutages préservés. Dernier commit a9063a0a2195936a3016bdf08b6e656f69a4d85b. Atelier toujours réservé au Créateur. Tout reste dans le dossier du Bureau.

Historique :

État actuel : 19V03 publiée sur toutes les plateformes. Site 19V03 ; Windows 0.5.5 ; Android 0.2.4 code 15 ; iOS 1.1.5 build 18. Voir ETAT-19V03.md. Projet actif : C:/Users/User/Desktop/Avant-l-usine/projet. Clés Android : ../cles-android ; outils : ../outils-android. Les chemins ci-dessous sont historiques. Atelier toujours réservé au Créateur. Livraison terminée.

---
Historique :


# Reprise — Avant l’usine — 12 octobre 2026

Lire AGENTS.md avant toute modification. Le ZIP contient le projet local et ses sorties conservées, pas l’historique complet du chat ni les données distantes Supabase. INVENTAIRE-TRANSFERT.json liste les exclusions : caches, dépendances réinstallables, clés privées et profils de test.

Dernière livraison terminée : site 19V02, Windows 0.5.3, Android 0.2.2 (versionCode 13), iOS 1.1.3 (build 16), publiés sur zephiroxDev/avant-usine. Voir outputs/19v02/delivery-complete.json et rapports par plateforme. Dernier commit publié : 109953fd7f36c8ed89efc167510c48dc16bb2f1a.

La livraison ajoute la DA Néon industriel, espace les commandes et rend les annonces fermables et réaffichables. Atelier « Paroles à toucher » simplifié mais réservé au Créateur pendant réparation : voix/backs, chevauchements, suppression avec annulation, vitesses et outils avancés conservés. Maintenir sa fermeture publique.

Gestion promo : une affiche 19V02, lumières renforcées, texte avec léger mouvement et variation douce de couleur. Fichiers finaux promo-19v02-texte.png et promo-19v02-texte.mp4 ; original promo-19v02.png préservé. Un seul élément 19v02-all. Les applications chargent le catalogue distant sans recompilation pour modifier une affiche.

Sources : work/github-sync-import (Web de référence), work/desktop-app (Windows), work/android-app (Android), work/ios-app (iOS), work/mine-sync (scripts, tests et médias), outputs (résultats et paquets).

Réinstaller node_modules depuis les package-lock.json et les versions de gestionnaire définies dans les projets. Les clés Android restent sur le PC original sous .codex/signing/avant-usine-android : ne pas générer une nouvelle identité pour les mises à jour d’installations existantes. Leur transfert sécurisé, si nécessaire, est distinct du ZIP. Le dernier APK est issu d’un artifact CI signé localement ; les parties base64 sous work/android-app/releases sont reconstituées et vérifiées par android-release avant publication. Les utilisateurs reçoivent un APK normal.

Vérifications : dispositions locales 320/393/768/1024/1440 px, Atelier, contrôles natifs, empreintes, signature Android et service de mise à jour iOS dans simulateur validés. Pages déployé. Le contrôle des textes Android normalise CRLF/LF.

Limite : aucune inspection visuelle du site public confirmée. Le navigateur intégré répond désormais à cua.getState() mais renvoie tabs: [] alors que l’interface annonce http://127.0.0.1:8796/. Avant : expirations et refus de permissions. TikTok https://www.tiktok.com/@avant.l.usine reste bloqué par préférence enregistrée. Ne pas contourner un refus via accès brut ou autre navigateur.

Consignes : mises à jour fréquentes à l’utilisateur ; répondre aux précisions puis reprendre dans le même tour. Publier chaque plateforme dès qu’elle est prête, autorisation autonome donnée, annoncer avant livraison. Notes publiques et affiches excluent les outils Créateur privés. Affiches dans Gestion promo, jamais montrées dans le chat, téléchargements « ??V?? image » et « ??V?? video ». Animation clairement visible et texte lisible. Préserver l’Easter egg initial ; nouveautés Infos dans Lire le reste. Immersion et Local réservés aux applications selon décisions précédentes : consulter les sources avant tout changement.

Prochaine action : transfert de conversation à cause des problèmes navigateur. Aucune publication ou nouvelle fonctionnalité en cours. Reprendre les tests selon les permissions actualisées puis attendre le prochain patch de l’utilisateur.
