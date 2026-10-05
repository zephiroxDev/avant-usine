// Adaptations réservées au paquet Windows ; les sources Web ne sont jamais modifiées.
const phrases=[
 ['Le site est encore en développement','L’appli est encore en développement'],
 ['le site est encore loin d’être terminé','l’appli est encore loin d’être terminée'],
 ['Le site public reste accessible','L’appli reste accessible'],
 ['Le site est déjà ouvert comme une application.','L’appli est déjà installée sur ton ordinateur.'],
 ['sur le site','dans l’appli'],['Sur le site','Dans l’appli'],
 ['du site','de l’appli'],['ce site','cette appli'],['un site','une appli'],
 ['le site','l’appli'],['Le site','L’appli'],['site Web','appli'],
 ['Installer l’appli ↗','À propos de l’appli ↗'],
 ['Le mode immersion nécessite le plein écran. Autorise-le dans ton navigateur puis réessaie. Si ton appareil ne le permet pas, ouvre l’appli dans un navigateur compatible.','Le mode immersion nécessite le plein écran. Réessaie après avoir fermé les fenêtres qui pourraient le bloquer.'],
];
exports.adaptCopy=text=>phrases.reduce((result,[from,to])=>result.replaceAll(from,to),text);
