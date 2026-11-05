# Correctif 20.0.4 — en cours de livraison

PS4 exclue sur demande le 21 octobre 2026 : aucun nouveau paquet console.

## Paroles après clic

Code commun corrigé : clic/Entrée appelle le seek à data.times[i], réactive le suivi automatique, annule la cible de défilement précédente et empêche de rejouer le fondu d’une phrase antérieure au saut. Les backs/chevauchements réellement actifs restent affichés. Aucun horodatage source modifié.

Tests : classique et Highlight, backs chevauchants, saut arrière, absence de fondu fantôme, lecture WAV réelle depuis la phrase choisie. 74 tests de plateformes passent, 0 échec ; interfaces 1440/393/320 et contrôles de lecture/découpe/fondus passent.

Identités publiques prévues : site20.0.4, Windows0.6.4, Android0.3.4 code26, iPhone2.0.4 build33. Ne pas annoncer leur publication avant vérification des releases.

## Dynamic Island privée

Branche ios/creator-background-20-0-3, commit9c703883b6db575d205e1f12ea6be659a73c3803. CI39602784577 réussie : bascule réelle en arrière-plan ; AVPlayer propriétaire, horloge et changements de phrases vérifiés sur 50 secondes pour chacun des modes classique et Highlight ; captures système visibles.

Une tentative précédente échouait avec nativeAudio=false ; la reprise à didEnterBackground corrige ce cas dans le simulateur. La validation physique reste nécessaire.

Bêta privée déjà disponible dans Mon compte → Versions de test : betatesting20.0.3 build31 / test2. Taille139221908 ; SHA2561a01a48aa8e13c871b5e077f98c01278bb5a7481666d5743b2a41958041259b1. Ligne994a2e13-778a-4587-9498-fea169305dc1 prête après vérification intégrale. SideStore : Keep App Extensions. Cette bêta ne contient pas le correctif public20.0.4 du clic. Ne pas promouvoir sa correction native publiquement sans retour iPhone.

Fichiers de preuve : outputs/ios-beta-20-0-3/display, verified-package/livraison.json, private-delivery.json.

## Livraison et incident de téléchargement privé

Commit public commun2daff408e443617226b5a65545bbb2ae841867f2. Site vérifié en production : nouveau seek présent, aucune erreur JavaScript ou réponse interne4xx. Windowsv0.6.4 publique, CI39606109581 réussie et manifest de mise à jour présent.

Android0.3.4 compilation39606109461 réussie, APK140361443 octets, SHA2560ac5514f53480c30106b41c4c7370e66871d10a3bcd2c6119fb9d6a934090c56, certificat d’originec56f1a5c2043a653b57729f8ad8cb7346c95fae2917c79307c4c699398a751b3. Livraison signée soumise par commita11e4bb9154fc3a58353d53c606b23e22f660d0e. Vérifier la release avant nettoyage du staging.

L’iPhone2.0.3 public contient un contrôle de nom limité aux bêta20-0-2. Refus réel « Informations du paquet invalides » avant le téléchargement. Correction native générique ajoutée et testée ; iPhone2.0.4 build33 supersède build32 annulée. Commit2b81a10d438d88c604bce77e3a8f046a610e9e2e, CI39606811951 en attente au dernier contrôle.

Compatibilité immédiate : même IPA privé renommé betatesting-20-0-2-test-31.ipa, contenu et SHA identiques. Métadonnées affichées20.0.3/version2.0.3/build31. Backendbeta-builds v4 autorise explicitement cet alias et conserve les contrôles d’identité/hash/créateur. Nouvelle ligneb0d6519b-77a4-4eaa-b813-d4ac550b0ff0 prête. Ancienne ligne994a2e13-778a-4587-9498-fea169305dc1 masquée ready=false. L’utilisateur dit que cela bloque encore ; question en attente : refus de métadonnées, téléchargement bloqué, ou paroles figées après installation ? Ne pas conclure sans cette précision.

## Retour réel de la bêta31 et nouvel essai

Transfert reçu : extension présente, application2.0.3(31),78.4 secondes en arrière-plan, relais utilisé NON,354 passages,36 mises à jour, interruption0.3 seconde, position164.3→75.6 ; le compte rendu indique que les paroles se figent. Le renommage a permis l’installation ; il ne corrige pas la Dynamic Island.

Nouvelle bêta de travailtest3/build34, commit9e7d5a2ed425cb9683c780c7c3afe8a112526549, CI39609681732. Non livrée. Intention de lecture bornée à5secondes capturée avant inactivité ; relais retenté après setClock/setSource ; vrai lecteur HTML et préparation de production utilisés par le test, durée120secondes par mode. Exiger la réussite de ce test et un nouvel essai physique avant toute conclusion.

Android0.3.4 désormais publique, CI39607909531 réussie, digest GitHub égal à l’APK signé local.34 objets de transfert supprimés et transportrelease-stage désactivé v11 (410vérifié). Windows0.6.4 : les103 fichiers de mise à jour publiés correspondent exactement au manifest (taille+empreinte).

Prochaine version demandée : diagnostics techniques centralisés + dépôt privé Créateur pour fichiers à transmettre à l’agent ; voir outputs/PROCHAIN-PATCH.md. Ces fonctions ne sont pas annoncées comme réalisées.
