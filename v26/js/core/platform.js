// Où tourne le site ? Les applis s'annoncent par <html data-au-app="desktop|ios|android">
// (ajouté par leurs scripts de préparation). Sur iPhone/iPad et Android, l'appli ne montre que
// les musiques importées, le Blind Test et l'Atelier (décision d'Iloan, 16 novembre 2026).
// ?au-app=ios|android|desktop dans l'adresse : simulation pour les essais dans un navigateur.
const flag = document.documentElement.dataset.auApp || new URLSearchParams(location.search).get('au-app') || '';
export const app = ['desktop', 'ios', 'android'].includes(flag) ? flag : (window.Capacitor?.getPlatform?.() === 'ios' ? 'ios' : window.Capacitor?.getPlatform?.() === 'android' ? 'android' : '');
export const inApp = !!app;
/** Appli téléphone : uniquement les musiques importées. */
export const localOnly = app === 'ios' || app === 'android';
/** Site ajouté à l'écran d'accueil (iPhone/Android) : les données y sont mieux protégées. */
export const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const ua = navigator.userAgent;
export const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
export const isAndroid = /Android/.test(ua);
export const isPhone = isIOS || isAndroid;
if (localOnly) document.documentElement.dataset.localOnly = 'on';
