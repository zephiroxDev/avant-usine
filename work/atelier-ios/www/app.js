/* Atelier Avant l’usine — préparation des volumes.
   Fonctionne en deux modes :
   - sur le PC (lancé par « Atelier Avant l'usine.exe ») : fichiers et export via ffmpeg ;
   - sur téléphone (fichier HTML seul) : tout se passe dans le navigateur, export MP3 en ZIP. */
'use strict';
(() => {
  const $ = (id) => document.getElementById(id);
  const parametres = new URLSearchParams(location.search);
  const JETON = parametres.get('t');
  const PC = !!JETON;

  // ====================================================================
  // Outils divers
  // ====================================================================
  const echapper = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const idNouveau = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const borne = (v, a, b) => Math.min(b, Math.max(a, v));
  const dbVersGain = (db) => Math.pow(10, db / 20);
  const gainVersDb = (g) => (g <= 0 ? -Infinity : 20 * Math.log10(g));

  function formatTemps(s, precis = true) {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const r = s - m * 60;
    if (!precis) return `${m}:${String(Math.floor(r)).padStart(2, '0')}`;
    const sec = Math.floor(r);
    const cent = Math.min(99, Math.round((r - sec) * 100));
    return `${m}:${String(sec).padStart(2, '0')}.${String(cent).padStart(2, '0')}`;
  }
  function lireTemps(texte) {
    const t = String(texte).trim().replace(',', '.');
    if (!t) return NaN;
    const morceaux = t.split(':');
    if (morceaux.length === 1) return parseFloat(morceaux[0]);
    const m = parseFloat(morceaux[0]);
    const s = parseFloat(morceaux[1]);
    return m * 60 + s;
  }
  function dureeLongue(s) {
    if (s < 59.5) return `${Math.round(s)} s`;
    const min = Math.round(s / 60);
    if (min < 60) return `${min} min`;
    return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
  }

  // Petite fenêtre de confirmation (remplace confirm(), bloqué dans certains navigateurs)
  function demander(titre, texte, oui) {
    return new Promise((ok) => {
      const voile = document.createElement('div');
      voile.className = 'voile';
      voile.innerHTML = `<div class="fenetre petite" role="alertdialog" aria-modal="true"><h2></h2><p></p><div class="fenetre-pied"><button class="bouton discret" data-r="0">Annuler</button><button class="bouton plein" data-r="1"></button></div></div>`;
      voile.querySelector('h2').textContent = titre;
      voile.querySelector('p').textContent = texte;
      voile.querySelector('[data-r="1"]').textContent = oui;
      const fin = (r) => { voile.remove(); document.removeEventListener('keydown', touche, true); ok(r); };
      const touche = (e) => { if (e.key === 'Escape') { e.stopPropagation(); fin(false); } };
      voile.addEventListener('click', (e) => { const b = e.target.closest('[data-r]'); if (b) fin(b.dataset.r === '1'); else if (e.target === voile) fin(false); });
      document.addEventListener('keydown', touche, true);
      document.body.appendChild(voile);
      voile.querySelector('[data-r="1"]').focus();
    });
  }

  let minuteurBulle;
  function bulle(texte, duree = 2600) {
    const b = $('bulle');
    b.textContent = texte;
    b.classList.add('visible');
    clearTimeout(minuteurBulle);
    minuteurBulle = setTimeout(() => b.classList.remove('visible'), duree);
  }

  function listeInvites(texte) {
    return String(texte || '')
      .split(/\s*(?:,|&|\+|\/|;|\bet\b|\bx\b)\s*/i)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  function joindreInvites(liste) {
    if (liste.length <= 1) return liste.join('');
    return liste.slice(0, -1).join(', ') + ' & ' + liste[liste.length - 1];
  }
  // « Titre (feat. X) » → { titre: 'Titre', feat: 'X' }
  function separerFeat(texte) {
    const m = String(texte || '').match(/^(.*?)[\s\-–]*[([]?\s*(?:feat\.?|ft\.?|featuring)\s+([^)\]]+)[)\]]?\s*$/i);
    if (!m || !m[1].trim()) return { titre: String(texte || '').trim(), feat: '' };
    return { titre: m[1].trim(), feat: m[2].trim() };
  }
  function titreDepuisNomFichier(nom) {
    let t = nom.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
    t = t.replace(/^\d{1,3}\s*[-.–)]\s*/, '');
    return t || nom;
  }

  // ====================================================================
  // Plateforme : PC (serveur local) ou téléphone (navigateur seul)
  // ====================================================================
  let mediabunny = null;
  async function chargerMediabunny(avecMp3) {
    if (!mediabunny) {
      const integre = document.getElementById('lib-mediabunny');
      if (integre) {
        const url = URL.createObjectURL(new Blob([integre.textContent], { type: 'text/javascript' }));
        mediabunny = { mod: await import(url), url };
      } else {
        mediabunny = { mod: await import('./lib/mediabunny-1.62.1.mjs'), url: null };
      }
    }
    if (avecMp3 && !mediabunny.mp3) {
      const { canEncodeAudio } = mediabunny.mod;
      if (!(await canEncodeAudio('mp3'))) {
        const integre = document.getElementById('lib-mp3');
        let mod;
        if (integre) {
          const source = integre.textContent.split('"./mediabunny-1.62.1.mjs"').join(JSON.stringify(mediabunny.url));
          mod = await import(URL.createObjectURL(new Blob([source], { type: 'text/javascript' })));
        } else {
          mod = await import('./lib/mediabunny-mp3-encoder-1.63.0.mjs');
        }
        mod.registerMp3Encoder();
      }
      mediabunny.mp3 = true;
    }
    return mediabunny.mod;
  }

  function creerPC() {
    async function api(chemin, options = {}) {
      const rep = await fetch('/api/' + chemin, {
        method: options.method || (options.body !== undefined || options.json !== undefined ? 'POST' : 'GET'),
        headers: { 'X-Jeton': JETON, ...(options.json ? { 'Content-Type': 'application/json' } : {}) },
        body: options.json ? JSON.stringify(options.json) : options.body,
        keepalive: !!options.keepalive,
      });
      const texte = await rep.text();
      let donnees;
      try { donnees = JSON.parse(texte); } catch { throw new Error(texte || 'Réponse illisible'); }
      if (!rep.ok || (donnees && donnees.erreur)) throw new Error((donnees && donnees.erreur) || 'Erreur ' + rep.status);
      return donnees;
    }
    const urlMedia = (f) => `/media/${encodeURIComponent(f)}?t=${JETON}`;
    setInterval(() => api('signal').catch(() => {}), 5000);
    api('signal').catch(() => {});
    window.addEventListener('pagehide', () => { api('au-revoir', { method: 'POST', keepalive: true }).catch(() => {}); });
    return {
      nom: 'pc',
      api,
      async chargerEtat() { return api('etat'); },
      async sauverEtat(e) { await api('etat', { json: e }); },
      async ajouterFichier(fichier, analyser) {
        const r = await api(`media?nom=${encodeURIComponent(fichier.name)}&analyser=${analyser ? 1 : 0}`, { body: fichier });
        return { fichier: r.fichier, tags: r.tags || {}, pochette: r.pochette || null };
      },
      async urlImage(f) { return urlMedia(f); },
      async lireOctets(f) {
        const rep = await fetch(urlMedia(f));
        if (!rep.ok) throw new Error('Fichier introuvable : ' + f);
        return rep.arrayBuffer();
      },
      async secours(f) {
        const r = await api('convertir?fichier=' + encodeURIComponent(f));
        return this.lireOctets(r.fichier);
      },
      async supprimerFichier() { /* les originaux restent dans donnees\medias */ },
    };
  }

  function creerWeb() {
    let base;
    function ouvrir() {
      if (base) return base;
      base = new Promise((ok, ko) => {
        const r = indexedDB.open('atelier-avant-usine', 1);
        r.onupgradeneeded = () => { r.result.createObjectStore('fichiers'); r.result.createObjectStore('etat'); };
        r.onsuccess = () => ok(r.result);
        r.onerror = () => ko(r.error);
      });
      return base;
    }
    async function tx(magasin, mode, action) {
      const db = await ouvrir();
      return new Promise((ok, ko) => {
        const t = db.transaction(magasin, mode);
        const req = action(t.objectStore(magasin));
        t.oncomplete = () => ok(req && req.result);
        t.onerror = () => ko(t.error);
        t.onabort = () => ko(t.error || new Error('Espace de stockage plein ?'));
      });
    }
    const urls = new Map();
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    return {
      nom: 'web',
      async chargerEtat() { return (await tx('etat', 'readonly', (s) => s.get('etat'))) || {}; },
      async sauverEtat(e) { await tx('etat', 'readwrite', (s) => s.put(e, 'etat')); },
      async ajouterFichier(fichier, analyser) {
        const id = idNouveau() + (fichier.name.match(/\.[a-z0-9]{2,5}$/i) || [''])[0].toLowerCase();
        await tx('fichiers', 'readwrite', (s) => s.put(fichier, id));
        const res = { fichier: id, tags: {}, pochette: null };
        if (!analyser) return res;
        try {
          const mb = await chargerMediabunny(false);
          const entree = new mb.Input({ source: new mb.BlobSource(fichier), formats: mb.ALL_FORMATS });
          const t = await entree.getMetadataTags();
          if (t.title) res.tags.title = t.title;
          if (t.artist) res.tags.artist = t.artist;
          if (t.genre) res.tags.genre = t.genre;
          if (t.date instanceof Date && !isNaN(t.date)) res.tags.date = String(t.date.getUTCFullYear());
          const image = (t.images || []).find((i) => i.kind === 'coverFront') || (t.images || [])[0];
          if (image && image.data && image.data.byteLength > 500) {
            const pid = id + '-pochette';
            await tx('fichiers', 'readwrite', (s) => s.put(new Blob([image.data], { type: image.mimeType || 'image/jpeg' }), pid));
            res.pochette = pid;
          }
          if (entree.dispose) entree.dispose();
        } catch (e) { /* pas de tags lisibles : pas grave */ }
        return res;
      },
      async blob(f) {
        const b = await tx('fichiers', 'readonly', (s) => s.get(f));
        if (!b) throw new Error('Fichier introuvable sur cet appareil.');
        return b;
      },
      async urlImage(f) {
        if (!urls.has(f)) urls.set(f, URL.createObjectURL(await this.blob(f)));
        return urls.get(f);
      },
      async lireOctets(f) { return (await this.blob(f)).arrayBuffer(); },
      async secours() { throw new Error('Ce format ne peut pas être lu sur cet appareil. Essaie en MP3, M4A ou WAV.'); },
      async supprimerFichier(f) { await tx('fichiers', 'readwrite', (s) => s.delete(f)); },
    };
  }

  const plateforme = PC ? creerPC() : creerWeb();

  // ====================================================================
  // État
  // ====================================================================
  const REGLAGES_DEFAUT = () => ({ ops: [], fonduEntree: 0, fonduSortie: 0, gain: 0, basses: 0, aigus: 0, normaliser: false, compresseur: false, protection: true, mono: false });
  let etat = { version: 1, sons: {}, volumes: [], volumeActif: null, sonActif: null, export: {} };

  let minuteurSauvegarde;
  function sauver() {
    clearTimeout(minuteurSauvegarde);
    minuteurSauvegarde = setTimeout(async () => {
      try { await plateforme.sauverEtat(etat); } catch (e) { bulle('Sauvegarde impossible : ' + e.message, 5000); }
    }, 350);
  }

  const volumeActif = () => etat.volumes.find((v) => v.id === etat.volumeActif) || null;
  const sonActif = () => etat.sons[etat.sonActif] || null;

  function nouveauVolume() {
    const n = etat.volumes.reduce((m, v) => Math.max(m, Number((String(v.titre).match(/Vol\.\s*(\d+)/i) || [0, 0])[1])), 0) + 1;
    const annee = String(new Date().getFullYear());
    const v = { id: idNouveau(), titre: `Avant l’usine — Vol. ${n}`, artiste: 'JuL', annee, genre: 'Rap', pochette: null, pistes: [] };
    etat.volumes.push(v);
    etat.volumeActif = v.id;
    sauver();
    return v;
  }

  // ====================================================================
  // Moteur audio
  // ====================================================================
  let contexte;
  function audio() {
    if (!contexte) {
      const C = window.AudioContext || window.webkitAudioContext;
      try { contexte = new C({ sampleRate: 44100 }); } catch { contexte = new C(); }
    }
    return contexte;
  }

  const cacheSources = new Map(); // fichier → Promise<AudioBuffer>
  function decoder(son) {
    const cle = son.fichier;
    if (cacheSources.has(cle)) {
      const p = cacheSources.get(cle);
      cacheSources.delete(cle); cacheSources.set(cle, p);
      return p;
    }
    const p = (async () => {
      const octets = await plateforme.lireOctets(cle);
      try {
        return await audio().decodeAudioData(octets);
      } catch (e) {
        const autre = await plateforme.secours(cle);
        return await audio().decodeAudioData(autre);
      }
    })();
    cacheSources.set(cle, p);
    p.catch(() => cacheSources.delete(cle));
    while (cacheSources.size > 5) cacheSources.delete(cacheSources.keys().next().value);
    return p;
  }

  const courbe = (x) => 0.5 - 0.5 * Math.cos(Math.PI * borne(x, 0, 1));

  function appliquerOp(canaux, op, sr) {
    const L = canaux[0].length;
    const a = borne(Math.round(op.a * sr), 0, L);
    const b = borne(Math.round((op.b ?? op.a) * sr), a, L);
    switch (op.t) {
      case 'couper':
        return canaux.map((c) => { const n = new Float32Array(L - (b - a)); n.set(c.subarray(0, a)); n.set(c.subarray(b), a); return n; });
      case 'garder':
        return canaux.map((c) => c.slice(a, b));
      case 'dupliquer':
        return canaux.map((c) => { const n = new Float32Array(L + (b - a)); n.set(c.subarray(0, b)); n.set(c.subarray(a, b), b); n.set(c.subarray(b), b + (b - a)); return n; });
      case 'silence':
        canaux.forEach((c) => c.fill(0, a, b));
        return canaux;
      case 'blanc': {
        const d = Math.round(op.d * sr);
        return canaux.map((c) => { const n = new Float32Array(L + d); n.set(c.subarray(0, a)); n.set(c.subarray(a), a + d); return n; });
      }
      case 'fondu': {
        const n = Math.max(1, b - a);
        canaux.forEach((c) => { for (let i = a; i < b; i++) { const x = (i - a) / n; c[i] *= op.sens === 'entree' ? courbe(x) : courbe(1 - x); } });
        if (op.sens === 'entree' && a > 0 && op.couperAvant) canaux.forEach((c) => c.fill(0, 0, a));
        return canaux;
      }
      case 'gain': {
        const g = dbVersGain(op.db);
        canaux.forEach((c) => { for (let i = a; i < b; i++) c[i] *= g; });
        return canaux;
      }
      default:
        return canaux;
    }
  }

  async function filtrer(canaux, sr, r) {
    const L = canaux[0].length;
    if (!L) return canaux;
    const hors = new OfflineAudioContext(canaux.length, L, sr);
    const tampon = hors.createBuffer(canaux.length, L, sr);
    canaux.forEach((c, i) => tampon.copyToChannel(c, i));
    const src = hors.createBufferSource();
    src.buffer = tampon;
    let noeud = src;
    if (r.basses) { const f = hors.createBiquadFilter(); f.type = 'lowshelf'; f.frequency.value = 120; f.gain.value = r.basses; noeud.connect(f); noeud = f; }
    if (r.aigus) { const f = hors.createBiquadFilter(); f.type = 'highshelf'; f.frequency.value = 5000; f.gain.value = r.aigus; noeud.connect(f); noeud = f; }
    if (r.compresseur) {
      const c = hors.createDynamicsCompressor();
      c.threshold.value = -20; c.knee.value = 10; c.ratio.value = 3.5; c.attack.value = 0.006; c.release.value = 0.22;
      const g = hors.createGain(); g.gain.value = dbVersGain(5);
      noeud.connect(c); c.connect(g); noeud = g;
    }
    noeud.connect(hors.destination);
    src.start();
    const rendu = await hors.startRendering();
    return canaux.map((_, i) => rendu.getChannelData(i));
  }

  function crete(canaux) {
    let p = 0;
    for (const c of canaux) for (let i = 0; i < c.length; i++) { const v = c[i] < 0 ? -c[i] : c[i]; if (v > p) p = v; }
    return p;
  }

  async function rendre(source, r) {
    const sr = source.sampleRate;
    let canaux = [];
    for (let c = 0; c < Math.min(2, source.numberOfChannels); c++) canaux.push(new Float32Array(source.getChannelData(c)));
    if (r.mono && canaux.length === 2) {
      const m = new Float32Array(canaux[0].length);
      for (let i = 0; i < m.length; i++) m[i] = (canaux[0][i] + canaux[1][i]) * 0.5;
      canaux = [m];
    }
    for (const op of r.ops) canaux = appliquerOp(canaux, op, sr);
    if (!canaux[0].length) canaux = canaux.map(() => new Float32Array(1));
    if (r.basses || r.aigus || r.compresseur) canaux = await filtrer(canaux, sr, r);
    if (r.normaliser) {
      const p = crete(canaux);
      if (p > 0.0001) { const g = 0.891 / p; canaux.forEach((c) => { for (let i = 0; i < c.length; i++) c[i] *= g; }); }
    }
    if (r.gain) { const g = dbVersGain(r.gain); canaux.forEach((c) => { for (let i = 0; i < c.length; i++) c[i] *= g; }); }
    const L = canaux[0].length;
    const fe = Math.min(L, Math.round(r.fonduEntree * sr));
    const fs = Math.min(L, Math.round(r.fonduSortie * sr));
    if (fe > 0) canaux.forEach((c) => { for (let i = 0; i < fe; i++) c[i] *= courbe(i / fe); });
    if (fs > 0) canaux.forEach((c) => { for (let i = 0; i < fs; i++) c[L - 1 - i] *= courbe(i / fs); });
    const avant = crete(canaux);
    let rms = 0;
    for (const c of canaux) { let s = 0; for (let i = 0; i < c.length; i += 4) s += c[i] * c[i]; rms += s / Math.max(1, c.length / 4); }
    rms = Math.sqrt(rms / canaux.length);
    if (r.protection && avant > 0.97) {
      const seuil = 0.85, reste = 1 - seuil - 0.02;
      canaux.forEach((c) => {
        for (let i = 0; i < c.length; i++) {
          const v = c[i], a = v < 0 ? -v : v;
          if (a > seuil) c[i] = Math.sign(v) * (seuil + reste * Math.tanh((a - seuil) / reste));
        }
      });
    }
    const tampon = audio().createBuffer(canaux.length, L, sr);
    canaux.forEach((c, i) => tampon.copyToChannel(c, i));
    return { tampon, crete: avant, rms, satureFinal: !r.protection && avant > 1 };
  }

  // Résumé min/max pour dessiner vite.
  function enveloppe(tampon) {
    const bloc = 256;
    const n = Math.ceil(tampon.length / bloc);
    const mins = new Float32Array(n), maxs = new Float32Array(n);
    const canaux = [];
    for (let c = 0; c < tampon.numberOfChannels; c++) canaux.push(tampon.getChannelData(c));
    for (let k = 0; k < n; k++) {
      let mi = 0, ma = 0;
      const fin = Math.min(tampon.length, (k + 1) * bloc);
      for (const d of canaux) for (let i = k * bloc; i < fin; i++) { const v = d[i]; if (v < mi) mi = v; else if (v > ma) ma = v; }
      mins[k] = mi; maxs[k] = ma;
    }
    return { bloc, mins, maxs, canaux };
  }

  // ====================================================================
  // Éditeur : état de travail
  // ====================================================================
  const ed = {
    son: null,          // son affiché
    rendu: null,        // { tampon, crete, rms }
    env: null,
    cleRendu: '',
    vue: { debut: 0, fin: 1 },
    sel: { a: 0, b: 0 },
    curseur: 0,
    lecture: null,      // { source, t0, offset }
    historique: {},     // sonId → { avant: [], apres: [] }
    jeton: 0,
  };
  const duree = () => (ed.rendu ? ed.rendu.tampon.duration : 0);
  const aSelection = () => ed.sel.b - ed.sel.a > 0.01;

  function hist(son) {
    if (!ed.historique[son.id]) ed.historique[son.id] = { avant: [], apres: [] };
    return ed.historique[son.id];
  }
  function memoriser(son) {
    const h = hist(son);
    h.avant.push(JSON.stringify(son.reglages));
    if (h.avant.length > 80) h.avant.shift();
    h.apres = [];
    majAnnuler();
  }
  function annuler() {
    const son = sonActif(); if (!son) return;
    const h = hist(son); if (!h.avant.length) return;
    h.apres.push(JSON.stringify(son.reglages));
    son.reglages = JSON.parse(h.avant.pop());
    apresModification(true);
    bulle('Annulé');
  }
  function refaire() {
    const son = sonActif(); if (!son) return;
    const h = hist(son); if (!h.apres.length) return;
    h.avant.push(JSON.stringify(son.reglages));
    son.reglages = JSON.parse(h.apres.pop());
    apresModification(true);
    bulle('Rétabli');
  }
  function majAnnuler() {
    const son = sonActif();
    const h = son ? hist(son) : { avant: [], apres: [] };
    $('btn-annuler').disabled = !h.avant.length;
    $('btn-refaire').disabled = !h.apres.length;
  }

  function apresModification(majCurseurs) {
    const son = sonActif();
    if (majCurseurs) remplirReglages(son);
    sauver();
    planifierRendu();
    majAnnuler();
    rendrePistes();
  }

  let minuteurRendu;
  function planifierRendu(immediat) {
    clearTimeout(minuteurRendu);
    minuteurRendu = setTimeout(rafraichirRendu, immediat ? 0 : 90);
  }

  async function rafraichirRendu() {
    const son = sonActif();
    if (!son) return;
    const cle = son.id + '|' + JSON.stringify(son.reglages);
    if (cle === ed.cleRendu && ed.rendu) return;
    const jeton = ++ed.jeton;
    const changeSon = ed.son !== son.id;
    if (changeSon) $('onde-chargement').hidden = false;
    try {
      const source = await decoder(son);
      if (jeton !== ed.jeton) return;
      if (!son.duree) { son.duree = source.duration; sauver(); }
      const r = await rendre(source, son.reglages);
      if (jeton !== ed.jeton) return;
      const ancienneDuree = duree();
      const enLecture = !!ed.lecture;
      const pos = position();
      ed.rendu = r;
      ed.env = enveloppe(r.tampon);
      ed.cleRendu = cle;
      son.dureeRendue = r.tampon.duration;
      if (changeSon) {
        ed.son = son.id;
        ed.vue = { debut: 0, fin: Math.max(0.5, r.tampon.duration) };
        ed.sel = { a: 0, b: 0 };
        ed.curseur = 0;
      } else {
        const d = r.tampon.duration;
        if (ed.vue.fin > d || ed.vue.debut === 0 && Math.abs(ed.vue.fin - ancienneDuree) < 0.01) {
          const largeur = Math.min(d, ed.vue.fin - ed.vue.debut);
          ed.vue.fin = Math.max(Math.min(d, ed.vue.debut + largeur), 0.5);
          ed.vue.debut = Math.max(0, ed.vue.fin - largeur);
          if (Math.abs(largeur - ancienneDuree) < 0.01) ed.vue = { debut: 0, fin: Math.max(0.5, d) };
        }
        ed.sel.a = Math.min(ed.sel.a, d); ed.sel.b = Math.min(ed.sel.b, d);
        ed.curseur = Math.min(ed.curseur, d);
      }
      $('onde-chargement').hidden = true;
      if (enLecture && !changeSon) jouer(Math.min(pos, duree()));
      majNiveau();
      majSelectionChamps();
      dessiner();
      rendrePistes();
      rendreSons();
      $('t-duree').textContent = formatTemps(duree());
    } catch (e) {
      if (jeton !== ed.jeton) return;
      $('onde-chargement').hidden = false;
      $('onde-chargement').textContent = 'Impossible de lire ce son : ' + e.message;
    }
  }

  function majNiveau() {
    const r = ed.rendu; if (!r) return;
    const c = gainVersDb(r.crete), m = gainVersDb(r.rms);
    let html = `Crête <b>${isFinite(c) ? c.toFixed(1) : '−∞'} dB</b> · niveau moyen <b>${isFinite(m) ? m.toFixed(1) : '−∞'} dB</b>`;
    if (r.crete > 1 && sonActif().reglages.protection) html += ' · <span>l’anti-saturation adoucit les pics</span>';
    if (r.satureFinal) html += ' · <span class="alerte">ça sature : baisse le volume ou active l’anti-saturation</span>';
    $('niveau').innerHTML = html;
  }

  // ====================================================================
  // Lecture
  // ====================================================================
  function position() {
    if (!ed.lecture) return ed.curseur;
    const l = ed.lecture;
    let p = l.offset + (audio().currentTime - l.t0);
    if (l.boucle) {
      const lg = l.boucle.b - l.boucle.a;
      if (p > l.boucle.b) p = l.boucle.a + ((p - l.boucle.a) % lg);
    }
    return Math.min(p, duree());
  }
  function arreter(garderPosition = true) {
    if (!ed.lecture) return;
    if (garderPosition) ed.curseur = position();
    const s = ed.lecture.source;
    ed.lecture = null;
    try { s.onended = null; s.stop(); } catch {}
    $('icone-lecture').textContent = '▶';
    dessiner();
  }
  function jouer(depuis) {
    if (!ed.rendu) return;
    const ctx = audio();
    if (ctx.state === 'suspended') ctx.resume();
    if (ed.lecture) arreter(false);
    let debut = depuis ?? ed.curseur;
    const boucle = $('c-boucle').checked && aSelection() ? { a: ed.sel.a, b: ed.sel.b } : null;
    if (boucle && (debut < boucle.a || debut >= boucle.b)) debut = boucle.a;
    if (debut >= duree() - 0.01) debut = 0;
    const src = ctx.createBufferSource();
    src.buffer = ed.rendu.tampon;
    src.connect(ctx.destination);
    if (boucle) { src.loop = true; src.loopStart = boucle.a; src.loopEnd = boucle.b; }
    src.start(0, debut);
    ed.lecture = { source: src, t0: ctx.currentTime, offset: debut, boucle };
    src.onended = () => {
      if (ed.lecture && ed.lecture.source === src) {
        ed.lecture = null; ed.curseur = 0;
        $('icone-lecture').textContent = '▶';
        dessiner();
      }
    };
    $('icone-lecture').textContent = '❚❚';
    boucleAnimation();
  }
  function basculerLecture() { if (ed.lecture) arreter(); else jouer(); }

  function boucleAnimation() {
    if (!ed.lecture) return;
    const p = position();
    const largeur = ed.vue.fin - ed.vue.debut;
    if (largeur < duree() - 0.01 && (p > ed.vue.fin || p < ed.vue.debut)) {
      ed.vue.debut = borne(p - largeur * 0.1, 0, duree() - largeur);
      ed.vue.fin = ed.vue.debut + largeur;
    }
    dessiner();
    requestAnimationFrame(boucleAnimation);
  }

  // ====================================================================
  // Dessin de la forme d’onde
  // ====================================================================
  const toile = $('onde');
  function dessiner() {
    const W = toile.clientWidth, H = toile.clientHeight;
    if (!W) return;
    const dpr = window.devicePixelRatio || 1;
    if (toile.width !== Math.round(W * dpr) || toile.height !== Math.round(H * dpr)) { toile.width = Math.round(W * dpr); toile.height = Math.round(H * dpr); }
    const g = toile.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const pos = position();
    $('t-pos').textContent = formatTemps(pos);
    if (!ed.rendu) return;
    const { debut, fin } = ed.vue;
    const sr = ed.rendu.tampon.sampleRate;
    const tx = (t) => ((t - debut) / (fin - debut)) * W;
    const milieu = H / 2;

    // Sélection
    if (aSelection()) {
      const x1 = tx(ed.sel.a), x2 = tx(ed.sel.b);
      g.fillStyle = 'rgba(229,72,59,0.16)';
      g.fillRect(x1, 0, x2 - x1, H);
    }
    // Ligne zéro
    g.fillStyle = 'rgba(255,255,255,0.06)';
    g.fillRect(0, milieu, W, 1);

    // Onde
    const env = ed.env;
    const echParPx = ((fin - debut) * sr) / W;
    const xLecture = tx(pos);
    for (let x = 0; x < W; x++) {
      const s0 = Math.floor((debut * sr) + x * echParPx);
      const s1 = Math.max(s0 + 1, Math.floor((debut * sr) + (x + 1) * echParPx));
      let mi = 0, ma = 0;
      if (echParPx > env.bloc * 2) {
        const k0 = Math.floor(s0 / env.bloc), k1 = Math.min(env.mins.length, Math.ceil(s1 / env.bloc));
        for (let k = k0; k < k1; k++) { if (env.mins[k] < mi) mi = env.mins[k]; if (env.maxs[k] > ma) ma = env.maxs[k]; }
      } else {
        for (const d of env.canaux) { const f = Math.min(d.length, s1); for (let i = s0; i < f; i++) { const v = d[i]; if (v < mi) mi = v; if (v > ma) ma = v; } }
      }
      const t = debut + (x / W) * (fin - debut);
      const dansSel = aSelection() && t >= ed.sel.a && t <= ed.sel.b;
      g.fillStyle = dansSel ? '#ff6a5c' : (x < xLecture ? '#f3ece6' : '#8a7e76');
      const y1 = milieu - Math.min(1, ma) * (milieu - 4);
      const y2 = milieu - Math.max(-1, mi) * (milieu - 4);
      g.fillRect(x, y1, 1, Math.max(1, y2 - y1));
    }

    // Fondus globaux
    const r = sonActif().reglages;
    const d = duree();
    g.strokeStyle = 'rgba(232,180,92,0.9)';
    g.lineWidth = 1.5;
    if (r.fonduEntree > 0) {
      g.fillStyle = 'rgba(232,180,92,0.08)';
      g.fillRect(tx(0), 0, tx(r.fonduEntree) - tx(0), H);
      g.beginPath();
      for (let i = 0; i <= 40; i++) { const t = (i / 40) * r.fonduEntree; const y = H - 3 - courbe(i / 40) * (H - 6); i ? g.lineTo(tx(t), y) : g.moveTo(tx(t), y); }
      g.stroke();
    }
    if (r.fonduSortie > 0) {
      const a = d - r.fonduSortie;
      g.fillStyle = 'rgba(232,180,92,0.08)';
      g.fillRect(tx(a), 0, tx(d) - tx(a), H);
      g.beginPath();
      for (let i = 0; i <= 40; i++) { const t = a + (i / 40) * r.fonduSortie; const y = H - 3 - courbe(1 - i / 40) * (H - 6); i ? g.lineTo(tx(t), y) : g.moveTo(tx(t), y); }
      g.stroke();
    }

    // Bords de sélection
    if (aSelection()) {
      g.fillStyle = '#e5483b';
      for (const t of [ed.sel.a, ed.sel.b]) { const x = tx(t); g.fillRect(x - 1, 0, 2, H); g.fillRect(x - 5, 0, 10, 6); }
    }
    // Curseur de lecture
    g.fillStyle = '#ffffff';
    g.fillRect(Math.round(xLecture) - 1, 0, 2, H);

    dessinerRegle();
    majDefilement();
  }

  function dessinerRegle() {
    const regle = $('onde-regle');
    const W = regle.clientWidth;
    const { debut, fin } = ed.vue;
    const largeur = fin - debut;
    const pas = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300].find((p) => (p / largeur) * W >= 70) || 600;
    let html = '';
    for (let t = Math.ceil(debut / pas) * pas; t <= fin; t += pas) {
      const x = ((t - debut) / largeur) * W;
      if (x > W - 40) break;
      html += `<span style="left:${x.toFixed(1)}px">${pas < 1 ? formatTemps(t) : formatTemps(t, false)}</span>`;
    }
    regle.innerHTML = html;
  }

  function majDefilement() {
    const d = duree();
    const largeur = ed.vue.fin - ed.vue.debut;
    const barre = $('defilement');
    const zoome = d > 0 && largeur < d - 0.01;
    barre.style.visibility = zoome ? 'visible' : 'hidden';
    if (zoome) barre.value = String(Math.round((ed.vue.debut / (d - largeur)) * 1000));
  }

  function zoomer(facteur, centre) {
    const d = duree(); if (!d) return;
    const largeur = ed.vue.fin - ed.vue.debut;
    const nouvelle = borne(largeur * facteur, Math.min(0.25, d), d);
    const c = centre ?? (ed.lecture ? position() : aSelection() ? (ed.sel.a + ed.sel.b) / 2 : ed.curseur);
    const rapport = largeur ? (c - ed.vue.debut) / largeur : 0.5;
    let debut = c - nouvelle * borne(rapport, 0, 1);
    debut = borne(debut, 0, d - nouvelle);
    ed.vue = { debut, fin: debut + nouvelle };
    dessiner();
  }

  // Souris / doigt sur l’onde
  let geste = null;
  const tempsDepuisX = (clientX) => {
    const r = toile.getBoundingClientRect();
    return borne(ed.vue.debut + ((clientX - r.left) / r.width) * (ed.vue.fin - ed.vue.debut), 0, duree());
  };
  const xDepuisTemps = (t) => ((t - ed.vue.debut) / (ed.vue.fin - ed.vue.debut)) * toile.clientWidth;
  toile.addEventListener('pointerdown', (e) => {
    if (!ed.rendu) return;
    toile.setPointerCapture(e.pointerId);
    const t = tempsDepuisX(e.clientX);
    const x = e.clientX - toile.getBoundingClientRect().left;
    const tol = e.pointerType === 'touch' ? 16 : 8;
    if (aSelection() && Math.abs(x - xDepuisTemps(ed.sel.a)) <= tol) geste = { type: 'bord', fixe: ed.sel.b, x0: e.clientX, bouge: true };
    else if (aSelection() && Math.abs(x - xDepuisTemps(ed.sel.b)) <= tol) geste = { type: 'bord', fixe: ed.sel.a, x0: e.clientX, bouge: true };
    else if (e.shiftKey) geste = { type: 'bord', fixe: Math.abs(t - ed.sel.a) < Math.abs(t - ed.sel.b) ? ed.sel.b : ed.sel.a, x0: e.clientX, bouge: true };
    else geste = { type: 'nouvelle', fixe: t, x0: e.clientX, bouge: false };
    if (geste.bouge) majGeste(e);
  });
  function majGeste(e) {
    const t = tempsDepuisX(e.clientX);
    ed.sel = { a: Math.min(geste.fixe, t), b: Math.max(geste.fixe, t) };
    majSelectionChamps();
    dessiner();
  }
  toile.addEventListener('pointermove', (e) => {
    if (!geste) {
      if (!ed.rendu || !aSelection()) { toile.style.cursor = 'text'; return; }
      const x = e.clientX - toile.getBoundingClientRect().left;
      toile.style.cursor = Math.abs(x - xDepuisTemps(ed.sel.a)) <= 8 || Math.abs(x - xDepuisTemps(ed.sel.b)) <= 8 ? 'ew-resize' : 'text';
      return;
    }
    if (!geste.bouge && Math.abs(e.clientX - geste.x0) < 4) return;
    geste.bouge = true;
    majGeste(e);
  });
  toile.addEventListener('pointerup', (e) => {
    if (!geste) return;
    if (!geste.bouge) {
      const t = tempsDepuisX(e.clientX);
      ed.sel = { a: t, b: t };
      ed.curseur = t;
      if (ed.lecture) jouer(t);
      majSelectionChamps();
      dessiner();
    } else if (ed.lecture && $('c-boucle').checked) jouer(ed.sel.a);
    geste = null;
    majOutils();
  });
  toile.addEventListener('wheel', (e) => {
    if (!ed.rendu) return;
    e.preventDefault();
    if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > Math.abs(e.deltaX) && !e.shiftKey) {
      zoomer(e.deltaY > 0 ? 1.25 : 0.8, tempsDepuisX(e.clientX));
    } else {
      const largeur = ed.vue.fin - ed.vue.debut;
      const dt = ((e.deltaX || e.deltaY) / toile.clientWidth) * largeur;
      const debut = borne(ed.vue.debut + dt, 0, duree() - largeur);
      ed.vue = { debut, fin: debut + largeur };
      dessiner();
    }
  }, { passive: false });
  $('defilement').addEventListener('input', (e) => {
    const d = duree();
    const largeur = ed.vue.fin - ed.vue.debut;
    const debut = (Number(e.target.value) / 1000) * (d - largeur);
    ed.vue = { debut, fin: debut + largeur };
    dessiner();
  });
  new ResizeObserver(() => dessiner()).observe(toile);

  function majSelectionChamps() {
    const actif = document.activeElement;
    if (actif !== $('s-debut')) $('s-debut').value = formatTemps(aSelection() ? ed.sel.a : ed.curseur);
    if (actif !== $('s-fin')) $('s-fin').value = formatTemps(aSelection() ? ed.sel.b : ed.curseur);
    $('s-duree').textContent = aSelection() ? `durée ${formatTemps(ed.sel.b - ed.sel.a)}` : 'aucune sélection : glisse sur l’onde';
    majOutils();
  }
  function lireChampSelection() {
    const a = lireTemps($('s-debut').value), b = lireTemps($('s-fin').value);
    if (isFinite(a) && isFinite(b)) {
      ed.sel = { a: borne(Math.min(a, b), 0, duree()), b: borne(Math.max(a, b), 0, duree()) };
      ed.curseur = ed.sel.a;
      dessiner();
    }
    majSelectionChamps();
  }
  for (const id of ['s-debut', 's-fin']) {
    $(id).addEventListener('change', lireChampSelection);
    $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.target.blur(); } });
  }
  function majOutils() {
    const sel = aSelection();
    document.querySelectorAll('.outil').forEach((b) => {
      const o = b.dataset.outil;
      b.disabled = !ed.rendu || (!sel && !['blanc', 'nettoyer'].includes(o));
    });
  }

  // ====================================================================
  // Outils d’édition
  // ====================================================================
  function ajouterOp(op, message) {
    const son = sonActif(); if (!son || !ed.rendu) return;
    memoriser(son);
    son.reglages.ops.push(op);
    apresModification(false);
    bulle(message);
  }
  function outil(nom) {
    if (!ed.rendu) return;
    const { a, b } = ed.sel;
    const lg = b - a;
    switch (nom) {
      case 'couper':
        if (!aSelection()) return;
        ajouterOp({ t: 'couper', a, b }, `Passage de ${formatTemps(lg)} retiré`);
        ed.sel = { a, b: a }; ed.curseur = a;
        break;
      case 'garder':
        if (!aSelection()) return;
        ajouterOp({ t: 'garder', a, b }, 'Seule la sélection est gardée');
        ed.sel = { a: 0, b: 0 }; ed.curseur = 0; ed.vue = { debut: 0, fin: Math.max(0.5, lg) };
        break;
      case 'dupliquer':
        if (!aSelection()) return;
        ajouterOp({ t: 'dupliquer', a, b }, 'Passage dupliqué juste après');
        ed.sel = { a: b, b: b + lg };
        break;
      case 'silence':
        if (!aSelection()) return;
        ajouterOp({ t: 'silence', a, b }, 'Passage rendu muet');
        break;
      case 'fondu-entree':
        if (!aSelection()) return;
        ajouterOp({ t: 'fondu', a, b, sens: 'entree' }, 'Fondu d’entrée sur la sélection');
        break;
      case 'fondu-sortie':
        if (!aSelection()) return;
        ajouterOp({ t: 'fondu', a, b, sens: 'sortie' }, 'Fondu de sortie sur la sélection');
        break;
      case 'plus-fort':
        if (!aSelection()) return;
        ajouterOp({ t: 'gain', a, b, db: 3 }, 'Sélection +3 dB');
        break;
      case 'moins-fort':
        if (!aSelection()) return;
        ajouterOp({ t: 'gain', a, b, db: -3 }, 'Sélection −3 dB');
        break;
      case 'blanc': {
        const t = aSelection() ? a : ed.curseur;
        ajouterOp({ t: 'blanc', a: t, d: 1 }, `1 seconde de blanc ajoutée à ${formatTemps(t)}`);
        break;
      }
      case 'nettoyer': {
        const c = ed.env.canaux, sr = ed.rendu.tampon.sampleRate, L = c[0].length;
        const seuil = 0.004;
        let i0 = 0, i1 = L - 1;
        const fort = (i) => c.some((d) => Math.abs(d[i]) > seuil);
        while (i0 < L && !fort(i0)) i0++;
        while (i1 > i0 && !fort(i1)) i1--;
        if (i0 >= L) { bulle('Le son est entièrement silencieux'); return; }
        const marge = Math.round(0.08 * sr);
        const da = Math.max(0, i0 - marge) / sr, db = Math.min(L, i1 + marge) / sr;
        if (da < 0.05 && duree() - db < 0.05) { bulle('Pas de blanc à retirer au début ni à la fin'); return; }
        ajouterOp({ t: 'garder', a: da, b: db }, `Blancs retirés (${(da + duree() - db).toFixed(1)} s)`);
        ed.sel = { a: 0, b: 0 }; ed.curseur = 0; ed.vue = { debut: 0, fin: db - da };
        break;
      }
    }
    majSelectionChamps();
  }
  document.querySelectorAll('.outil').forEach((b) => b.addEventListener('click', () => outil(b.dataset.outil)));

  // Réglages (curseurs et cases)
  const CURSEURS = [
    ['r-fondu-entree', 'fonduEntree', 'o-fondu-entree', (v) => (v ? v.toFixed(1).replace('.', ',') + ' s' : '0 s')],
    ['r-fondu-sortie', 'fonduSortie', 'o-fondu-sortie', (v) => (v ? v.toFixed(1).replace('.', ',') + ' s' : '0 s')],
    ['r-gain', 'gain', 'o-gain', (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1).replace('.', ',').replace(',0', '') + ' dB'],
    ['r-basses', 'basses', 'o-basses', (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1).replace('.', ',').replace(',0', '') + ' dB'],
    ['r-aigus', 'aigus', 'o-aigus', (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1).replace('.', ',').replace(',0', '') + ' dB'],
  ];
  const CASES = [['c-normaliser', 'normaliser'], ['c-compresseur', 'compresseur'], ['c-protection', 'protection'], ['c-mono', 'mono']];
  function remplissage(input) {
    const min = Number(input.min), max = Number(input.max), v = Number(input.value);
    const zero = min < 0 ? (0 - min) / (max - min) : 0;
    const p = (v - min) / (max - min);
    if (min < 0) {
      const a = Math.min(zero, p) * 100, b = Math.max(zero, p) * 100;
      input.style.setProperty('--rempli', '0%');
      input.style.background = '';
      input.style.setProperty('--piste', `linear-gradient(to right, var(--ligne-forte) ${a}%, var(--accent) ${a}%, var(--accent) ${b}%, var(--ligne-forte) ${b}%)`);
    } else {
      input.style.setProperty('--piste', `linear-gradient(to right, var(--accent) ${p * 100}%, var(--ligne-forte) ${p * 100}%)`);
    }
  }
  function remplirReglages(son) {
    if (!son) return;
    const r = son.reglages;
    for (const [id, cle, sortie, fmt] of CURSEURS) {
      const el = $(id);
      el.value = r[cle];
      $(sortie).textContent = fmt(Number(r[cle]));
      remplissage(el);
    }
    for (const [id, cle] of CASES) $(id).checked = !!r[cle];
  }
  for (const [id, cle, sortie, fmt] of CURSEURS) {
    const el = $(id);
    let enCours = false;
    el.addEventListener('input', () => {
      const son = sonActif(); if (!son) return;
      if (!enCours) { memoriser(son); enCours = true; }
      son.reglages[cle] = Number(el.value);
      $(sortie).textContent = fmt(Number(el.value));
      remplissage(el);
      planifierRendu();
    });
    el.addEventListener('change', () => { enCours = false; sauver(); rendrePistes(); });
    el.addEventListener('dblclick', () => {
      const son = sonActif(); if (!son) return;
      memoriser(son); son.reglages[cle] = 0; apresModification(true);
    });
  }
  for (const [id, cle] of CASES) {
    $(id).addEventListener('change', (e) => {
      const son = sonActif(); if (!son) return;
      memoriser(son);
      son.reglages[cle] = e.target.checked;
      apresModification(false);
    });
  }

  // ====================================================================
  // Affichage : colonne de gauche
  // ====================================================================
  const imagesEnAttente = new WeakMap();
  async function poserImage(img, fichier) {
    imagesEnAttente.set(img, fichier);
    if (!fichier) { img.removeAttribute('src'); return; }
    try {
      const url = await plateforme.urlImage(fichier);
      if (imagesEnAttente.get(img) === fichier) img.src = url;
    } catch { img.removeAttribute('src'); }
  }

  function dureeSon(son) { return son.dureeRendue || son.duree || 0; }
  function modifie(son) {
    const r = son.reglages, d = REGLAGES_DEFAUT();
    return r.ops.length || r.fonduEntree || r.fonduSortie || r.gain || r.basses || r.aigus || r.normaliser || r.compresseur || r.mono || r.protection !== d.protection;
  }
  function featTexte(son) { return joindreInvites(listeInvites(son.feat)); }

  function rendreVolumes() {
    const nav = $('liste-volumes');
    nav.innerHTML = '';
    for (const v of etat.volumes) {
      const b = document.createElement('button');
      b.className = 'volume-lien' + (v.id === etat.volumeActif ? ' actif' : '');
      const d = v.pistes.reduce((s, id) => s + (etat.sons[id] ? dureeSon(etat.sons[id]) : 0), 0);
      b.innerHTML = `${v.pochette ? '<img alt="">' : '<span class="mini-vide">♪</span>'}<span class="txt"><span class="nom" title="${echapper(v.titre)}">${echapper(v.titre || 'Sans titre')}</span><span class="info">${v.pistes.length} piste${v.pistes.length > 1 ? 's' : ''}${d ? ' · ' + dureeLongue(d) : ''}</span></span>`;
      if (v.pochette) poserImage(b.querySelector('img'), v.pochette);
      b.addEventListener('click', () => { etat.volumeActif = v.id; sauver(); toutRendre(); allerOnglet('volumes'); });
      nav.appendChild(b);
    }
  }

  function rendreSons() {
    const liste = $('liste-sons');
    const sons = Object.values(etat.sons).sort((a, b) => (b.cree || 0) - (a.cree || 0));
    $('compte-sons').textContent = sons.length;
    const vol = volumeActif();
    liste.innerHTML = '';
    for (const son of sons) {
      const div = document.createElement('div');
      div.className = 'son' + (son.id === etat.sonActif ? ' actif' : '');
      const dans = etat.volumes.filter((v) => v.pistes.includes(son.id));
      const ici = vol && vol.pistes.includes(son.id);
      const infos = [dureeSon(son) ? formatTemps(dureeSon(son), false) : '…'];
      if (son.feat) infos.push('feat. ' + featTexte(son));
      div.innerHTML = `<div class="txt" title="${echapper(son.nomOrigine)}"><span class="nom">${echapper(son.titre)}</span><span class="info">${echapper(infos.join(' · '))}${dans.length ? ` · <span class="dans">${dans.length > 1 ? dans.length + ' volumes' : 'dans « ' + echapper(dans[0].titre) + ' »'}</span>` : ''}</span></div>
        <div class="son-actions">
          ${vol && !ici ? '<button class="bouton-icone petit" data-a="ajouter" title="Ajouter au volume ouvert">+</button>' : ''}
          <button class="bouton-icone petit" data-a="menu" title="Plus d’actions">⋯</button>
        </div>`;
      div.querySelector('.txt').addEventListener('click', () => choisirSon(son.id));
      const ajouter = div.querySelector('[data-a="ajouter"]');
      if (ajouter) ajouter.addEventListener('click', () => { ajouterAuVolume(vol, [son.id]); bulle(`« ${son.titre} » ajouté au volume`); });
      div.querySelector('[data-a="menu"]').addEventListener('click', (e) => menuSon(son, e.currentTarget));
      liste.appendChild(div);
    }
    if (!sons.length) liste.innerHTML = '<p class="aide-mini" style="padding:14px 4px">Aucun son pour l’instant.</p>';
  }

  function ouvrirMenu(ancre, elements) {
    const m = $('menu');
    m.innerHTML = '';
    for (const el of elements) {
      if (el === '-') { m.appendChild(document.createElement('hr')); continue; }
      if (el.titre) { const d = document.createElement('div'); d.className = 'titre-menu'; d.textContent = el.titre; m.appendChild(d); continue; }
      const b = document.createElement('button');
      b.textContent = el.texte; b.title = el.texte;
      if (el.danger) b.className = 'danger';
      b.addEventListener('click', () => { fermerMenu(); el.action(); });
      m.appendChild(b);
    }
    m.hidden = false;
    const r = ancre.getBoundingClientRect();
    const lm = m.offsetWidth, hm = m.offsetHeight;
    m.style.left = borne(r.right - lm, 8, innerWidth - lm - 8) + 'px';
    m.style.top = (r.bottom + hm + 8 > innerHeight ? Math.max(8, r.top - hm - 6) : r.bottom + 6) + 'px';
    setTimeout(() => document.addEventListener('pointerdown', fermerSiDehors), 0);
  }
  function fermerSiDehors(e) { if (!$('menu').contains(e.target)) fermerMenu(); }
  function fermerMenu() { $('menu').hidden = true; document.removeEventListener('pointerdown', fermerSiDehors); }

  function menuSon(son, ancre) {
    const elements = [{ titre: son.titre }];
    for (const v of etat.volumes) {
      if (v.pistes.includes(son.id)) elements.push({ texte: `Retirer de « ${v.titre} »`, action: () => { v.pistes = v.pistes.filter((x) => x !== son.id); sauver(); toutRendre(); } });
      else elements.push({ texte: `Ajouter à « ${v.titre} »`, action: () => { ajouterAuVolume(v, [son.id]); bulle('Ajouté'); } });
    }
    elements.push({ texte: 'Ajouter à un nouveau volume', action: () => { const v = nouveauVolume(); ajouterAuVolume(v, [son.id]); } });
    elements.push('-');
    elements.push({ texte: 'Copier comme nouveau son (pour une 2ᵉ version)', action: () => dupliquerSon(son) });
    elements.push({ texte: 'Supprimer ce son de l’atelier', danger: true, action: () => supprimerSon(son) });
    ouvrirMenu(ancre, elements);
  }

  function dupliquerSon(son) {
    const copie = JSON.parse(JSON.stringify(son));
    copie.id = idNouveau(); copie.titre = son.titre + ' (version 2)'; copie.cree = Date.now();
    etat.sons[copie.id] = copie;
    sauver(); rendreSons();
    bulle('Copie créée');
  }
  async function supprimerSon(son) {
    if (!(await demander(`Supprimer « ${son.titre} » de l’atelier ?`, 'Il sera retiré de tous les volumes. Ton fichier d’origine n’est pas touché.', 'Supprimer'))) return;
    for (const v of etat.volumes) v.pistes = v.pistes.filter((x) => x !== son.id);
    delete etat.sons[son.id];
    const encore = Object.values(etat.sons).some((s) => s.fichier === son.fichier);
    if (!encore) { cacheSources.delete(son.fichier); try { await plateforme.supprimerFichier(son.fichier); } catch {} }
    if (etat.sonActif === son.id) { etat.sonActif = null; arreter(false); ed.son = null; ed.rendu = null; ed.cleRendu = ''; }
    sauver(); toutRendre();
  }

  function ajouterAuVolume(v, ids) {
    for (const id of ids) if (!v.pistes.includes(id)) v.pistes.push(id);
    sauver(); toutRendre();
  }

  // ====================================================================
  // Affichage : volume et pistes
  // ====================================================================
  function rendreVolume() {
    const v = volumeActif();
    $('volume-vide').hidden = !!v;
    $('volume-contenu').hidden = !v;
    if (!v) return;
    for (const [id, cle] of [['v-titre', 'titre'], ['v-artiste', 'artiste'], ['v-annee', 'annee'], ['v-genre', 'genre']]) {
      if (document.activeElement !== $(id)) $(id).value = v[cle] || '';
    }
    poserImage($('img-pochette'), v.pochette);
    $('pochette-vide').hidden = !!v.pochette;
    $('btn-pochette').classList.toggle('remplie', !!v.pochette);
    majResume();
    rendrePistes();
  }
  function majResume() {
    const v = volumeActif(); if (!v) return;
    const d = v.pistes.reduce((s, id) => s + (etat.sons[id] ? dureeSon(etat.sons[id]) : 0), 0);
    $('v-resume').textContent = `${v.pistes.length} piste${v.pistes.length > 1 ? 's' : ''}${d ? ' · ' + dureeLongue(d) : ''}`;
  }
  for (const [id, cle] of [['v-titre', 'titre'], ['v-artiste', 'artiste'], ['v-annee', 'annee'], ['v-genre', 'genre']]) {
    $(id).addEventListener('input', () => {
      const v = volumeActif(); if (!v) return;
      v[cle] = $(id).value;
      sauver(); rendreVolumes(); majApercu();
      if (cle === 'artiste' || cle === 'annee' || cle === 'genre') rendrePistes();
    });
  }

  function rendrePistes() {
    const v = volumeActif();
    const ol = $('liste-pistes');
    if (!v) return;
    v.pistes = v.pistes.filter((id) => etat.sons[id]);
    ol.innerHTML = '';
    $('pistes-vide').hidden = v.pistes.length > 0;
    v.pistes.forEach((id, i) => {
      const son = etat.sons[id];
      const li = document.createElement('li');
      li.className = 'piste' + (id === etat.sonActif ? ' actif' : '');
      li.dataset.id = id;
      const infos = [son.artiste || v.artiste || ''];
      if (son.feat) infos[0] = (infos[0] ? infos[0] + ' · ' : '') + 'feat. ' + featTexte(son);
      li.innerHTML = `<span class="poignee" title="Glisser pour changer l’ordre">⋮⋮</span>
        <span class="num">${i + 1}</span>
        <span class="txt"><span class="nom" title="${echapper(son.titre)}">${echapper(son.titre)}</span><span class="info">${echapper(infos.filter(Boolean).join(''))}${modifie(son) ? ' <span class="modif">· retouché</span>' : ''}</span></span>
        <span class="duree">${dureeSon(son) ? formatTemps(dureeSon(son), false) : '…'}</span>`;
      li.addEventListener('click', (e) => { if (!e.target.closest('.poignee')) choisirSon(id); });
      li.querySelector('.poignee').addEventListener('pointerdown', (e) => commencerGlisser(e, li));
      ol.appendChild(li);
    });
    majResume();
    const son = sonActif();
    if (son) majNumero(son);
  }

  // Réordonner en glissant (souris ou doigt)
  function commencerGlisser(e, li) {
    e.preventDefault();
    const ol = $('liste-pistes');
    const v = volumeActif();
    const lignes = [...ol.children];
    const depart = lignes.indexOf(li);
    const hauteur = li.offsetHeight + 6;
    const y0 = e.clientY;
    let cible = depart;
    li.classList.add('glisse');
    li.setPointerCapture(e.pointerId);
    const bouger = (ev) => {
      const dy = ev.clientY - y0;
      li.style.transform = `translateY(${dy}px)`;
      cible = borne(depart + Math.round(dy / hauteur), 0, lignes.length - 1);
      lignes.forEach((l, i) => {
        if (l === li) return;
        let decal = 0;
        if (depart < cible && i > depart && i <= cible) decal = -hauteur;
        if (depart > cible && i < depart && i >= cible) decal = hauteur;
        l.style.transition = 'transform .12s';
        l.style.transform = decal ? `translateY(${decal}px)` : '';
      });
    };
    const finir = () => {
      li.removeEventListener('pointermove', bouger);
      li.removeEventListener('pointerup', finir);
      li.removeEventListener('pointercancel', finir);
      if (cible !== depart) {
        const [id] = v.pistes.splice(depart, 1);
        v.pistes.splice(cible, 0, id);
        sauver();
      }
      rendrePistes();
    };
    li.addEventListener('pointermove', bouger);
    li.addEventListener('pointerup', finir);
    li.addEventListener('pointercancel', finir);
  }

  // ====================================================================
  // Affichage : éditeur
  // ====================================================================
  function choisirSon(id) {
    if (etat.sonActif !== id) { arreter(false); }
    etat.sonActif = id;
    sauver();
    rendreEditeur();
    rendreSons();
    rendrePistes();
    allerOnglet('edition');
  }

  function rendreEditeur() {
    const son = sonActif();
    $('editeur-vide').hidden = !!son;
    $('editeur-contenu').hidden = !son;
    if (!son) return;
    if (!son.reglages) son.reglages = REGLAGES_DEFAUT();
    if (ed.son !== son.id) {
      ed.rendu = null; ed.env = null; ed.cleRendu = '';
      $('onde-chargement').textContent = 'Lecture du son…';
      $('onde-chargement').hidden = false;
      dessiner();
    }
    $('e-titre').textContent = son.titre;
    $('e-titre').title = son.titre;
    $('e-fichier').textContent = son.nomOrigine || '';
    $('e-fichier').title = son.nomOrigine || '';
    for (const [id, cle] of [['m-titre', 'titre'], ['m-artiste', 'artiste'], ['m-feat', 'feat'], ['m-annee', 'annee'], ['m-genre', 'genre'], ['m-commentaire', 'commentaire']]) {
      if (document.activeElement !== $(id)) $(id).value = son[cle] || '';
    }
    const v = volumeActif();
    $('m-artiste').placeholder = v ? v.artiste || '' : '';
    $('m-annee').placeholder = v && v.annee ? v.annee : 'album';
    $('m-genre').placeholder = v && v.genre ? v.genre : 'album';
    $('btn-pochette-son').hidden = !(son.pochette && v);
    majNumero(son);
    remplirReglages(son);
    majAnnuler();
    majOutils();
    majApercu();
    planifierRendu(true);
  }

  function majNumero(son) {
    const v = volumeActif();
    const i = v ? v.pistes.indexOf(son.id) : -1;
    $('e-numero').textContent = i >= 0 ? `Piste ${i + 1} / ${v.pistes.length}` : 'Hors volume';
    $('m-numero').disabled = i < 0;
    if (document.activeElement !== $('m-numero')) $('m-numero').value = i >= 0 ? i + 1 : '';
    $('m-numero').max = v ? v.pistes.length : 1;
    $('btn-retirer-piste').hidden = i < 0;
    if (i < 0 && v) { $('btn-retirer-piste').hidden = false; $('btn-retirer-piste').textContent = 'Ajouter au volume'; }
    else $('btn-retirer-piste').textContent = 'Retirer du volume';
  }

  function nomsExport(son, v, n, total, featDans) {
    const feat = featTexte(son);
    let titre = son.titre || 'Sans titre';
    let artiste = son.artiste || v.artiste || '';
    if (feat && featDans === 'titre') titre = `${titre} (feat. ${feat})`;
    if (feat && featDans === 'artiste') artiste = artiste ? `${artiste} feat. ${feat}` : feat;
    return {
      titre, artiste,
      fichier: `${String(n).padStart(2, '0')} - ${titre}`,
      tags: {
        title: titre,
        artist: artiste,
        album_artist: v.artiste || artiste,
        album: v.titre || '',
        track: `${n}/${total}`,
        date: son.annee || v.annee || '',
        genre: son.genre || v.genre || '',
        comment: son.commentaire || '',
      },
    };
  }

  function majApercu() {
    const son = sonActif(), v = volumeActif();
    if (!son || !v) { $('e-apercu').textContent = ''; return; }
    const i = v.pistes.indexOf(son.id);
    const featDans = (etat.export && etat.export.featDans) || 'titre';
    const n = nomsExport(son, v, i >= 0 ? i + 1 : v.pistes.length + 1, Math.max(1, v.pistes.length), featDans);
    $('e-apercu').innerHTML = `À l’export : <b>${echapper(n.titre)}</b> — ${echapper(n.artiste)} · album « ${echapper(v.titre)} »${n.tags.date ? ' · ' + echapper(n.tags.date) : ''}${i < 0 ? ' · <i>pas encore dans ce volume</i>' : ''}`;
  }

  for (const [id, cle] of [['m-titre', 'titre'], ['m-artiste', 'artiste'], ['m-feat', 'feat'], ['m-annee', 'annee'], ['m-genre', 'genre'], ['m-commentaire', 'commentaire']]) {
    $(id).addEventListener('input', () => {
      const son = sonActif(); if (!son) return;
      son[cle] = $(id).value;
      if (cle === 'titre') { $('e-titre').textContent = son.titre; $('e-titre').title = son.titre; }
      sauver(); majApercu(); rendrePistes(); rendreSons();
    });
  }
  $('m-numero').addEventListener('change', () => {
    const son = sonActif(), v = volumeActif(); if (!son || !v) return;
    const i = v.pistes.indexOf(son.id); if (i < 0) return;
    const n = borne(Math.round(Number($('m-numero').value) || 1), 1, v.pistes.length) - 1;
    v.pistes.splice(i, 1); v.pistes.splice(n, 0, son.id);
    sauver(); rendrePistes(); majApercu();
  });
  $('btn-retirer-piste').addEventListener('click', () => {
    const son = sonActif(), v = volumeActif(); if (!son || !v) return;
    if (v.pistes.includes(son.id)) { v.pistes = v.pistes.filter((x) => x !== son.id); bulle('Retiré du volume (le son reste dans « Sons importés »)'); }
    else { v.pistes.push(son.id); bulle('Ajouté au volume'); }
    sauver(); toutRendre();
  });
  $('btn-pochette-son').addEventListener('click', () => {
    const son = sonActif(), v = volumeActif(); if (!son || !v || !son.pochette) return;
    v.pochette = son.pochette; sauver(); rendreVolume(); rendreVolumes();
    bulle('Pochette du volume mise à jour');
  });

  // ====================================================================
  // Import
  // ====================================================================
  async function importer(fichiers, versVolume) {
    const audios = [...fichiers].filter((f) => /^audio\//.test(f.type) || /\.(mp3|m4a|aac|wav|flac|ogg|oga|opus|aif|aiff|wma|webm|mp4)$/i.test(f.name));
    if (!audios.length) { bulle('Aucun fichier audio reconnu'); return; }
    let v = versVolume === undefined ? volumeActif() : versVolume;
    if (!v && versVolume === undefined) v = nouveauVolume();
    const ajoutes = [];
    let n = 0;
    for (const f of audios) {
      n++;
      bulle(`Import ${n} / ${audios.length} : ${f.name}`, 60000);
      try {
        const r = await plateforme.ajouterFichier(f, true);
        const t = r.tags || {};
        let titre = t.title ? String(t.title).trim() : titreDepuisNomFichier(f.name);
        let feat = '';
        const st = separerFeat(titre); titre = st.titre; feat = st.feat;
        let artiste = t.artist ? String(t.artist).trim() : '';
        if (artiste) { const sa = separerFeat(artiste); artiste = sa.titre; if (sa.feat && !feat) feat = sa.feat; }
        const annee = String(t.date || t.year || '').match(/\d{4}/);
        const son = {
          id: idNouveau(), fichier: r.fichier, nomOrigine: f.name, cree: Date.now() + n,
          titre, artiste: artiste && v && artiste === v.artiste ? '' : artiste, feat,
          annee: annee ? annee[0] : '', genre: '', commentaire: '',
          pochette: r.pochette, duree: 0, reglages: REGLAGES_DEFAUT(),
        };
        etat.sons[son.id] = son;
        ajoutes.push(son.id);
        if (v && !v.pochette && son.pochette) v.pochette = son.pochette;
      } catch (e) {
        bulle(`« ${f.name} » n’a pas pu être importé : ${e.message}`, 6000);
        await new Promise((ok) => setTimeout(ok, 1500));
      }
    }
    if (v) for (const id of ajoutes) if (!v.pistes.includes(id)) v.pistes.push(id);
    sauver();
    toutRendre();
    if (ajoutes.length) {
      bulle(`${ajoutes.length} son${ajoutes.length > 1 ? 's' : ''} importé${ajoutes.length > 1 ? 's' : ''}${v ? ' dans « ' + v.titre + ' »' : ''}`);
      if (!etat.sonActif) choisirSon(ajoutes[0]);
      mesurerDurees(ajoutes);
    }
  }

  async function mesurerDurees(ids) {
    for (const id of ids) {
      const son = etat.sons[id];
      if (!son || son.duree) continue;
      try {
        const b = await decoder(son);
        son.duree = b.duration;
        rendrePistes(); rendreSons(); rendreVolumes();
      } catch {}
    }
    sauver();
  }

  $('btn-importer').addEventListener('click', () => { $('f-sons').dataset.cible = 'actif'; $('f-sons').click(); });
  $('btn-ajouter-pistes').addEventListener('click', () => { $('f-sons').dataset.cible = 'actif'; $('f-sons').click(); });
  $('f-sons').addEventListener('change', (e) => { const f = [...e.target.files]; e.target.value = ''; importer(f); });

  let compteurDepot = 0;
  window.addEventListener('dragenter', (e) => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { compteurDepot++; document.body.classList.add('depot-actif'); } });
  window.addEventListener('dragleave', () => { compteurDepot = Math.max(0, compteurDepot - 1); if (!compteurDepot) document.body.classList.remove('depot-actif'); });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    compteurDepot = 0;
    document.body.classList.remove('depot-actif');
    const f = [...(e.dataTransfer?.files || [])];
    const images = f.filter((x) => /^image\//.test(x.type));
    if (images.length && !f.some((x) => /^audio\//.test(x.type)) && volumeActif()) { poserPochette(images[0]); return; }
    if (f.length) importer(f);
  });

  // Pochette
  $('btn-pochette').addEventListener('click', () => $('f-pochette').click());
  $('f-pochette').addEventListener('change', (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) poserPochette(f); });
  async function poserPochette(f) {
    const v = volumeActif(); if (!v) return;
    try {
      const r = await plateforme.ajouterFichier(f, false);
      v.pochette = r.fichier;
      sauver(); rendreVolume(); rendreVolumes();
      bulle('Pochette ajoutée (elle sera recadrée en carré à l’export)');
    } catch (e) { bulle('Pochette impossible : ' + e.message, 5000); }
  }

  // ====================================================================
  // Volumes
  // ====================================================================
  $('btn-nouveau-volume').addEventListener('click', () => { nouveauVolume(); toutRendre(); allerOnglet('volumes'); $('v-titre').focus(); $('v-titre').select(); });
  $('btn-premier-volume').addEventListener('click', () => { nouveauVolume(); toutRendre(); $('v-titre').focus(); $('v-titre').select(); });
  $('btn-supprimer-volume').addEventListener('click', async () => {
    const v = volumeActif(); if (!v) return;
    if (!(await demander(`Supprimer le volume « ${v.titre} » ?`, 'Les sons restent dans « Sons importés ».', 'Supprimer'))) return;
    etat.volumes = etat.volumes.filter((x) => x !== v);
    etat.volumeActif = etat.volumes.length ? etat.volumes[etat.volumes.length - 1].id : null;
    sauver(); toutRendre();
  });

  // ====================================================================
  // Export
  // ====================================================================
  const FORMATS_PC = [
    { id: 'mp3', nom: 'MP3', aide: 'Le plus compatible (téléphones, voitures, YouTube…). Pochette et infos incluses.' },
    { id: 'flac', nom: 'FLAC', aide: 'Sans perte de qualité, fichiers plus lourds. Pochette et infos incluses.' },
    { id: 'm4a', nom: 'M4A (AAC)', aide: 'Idéal pour iPhone / Apple Musique. AAC 256 kb/s, pochette et infos incluses.' },
    { id: 'alac', nom: 'ALAC', aide: 'Sans perte, version Apple. Pochette et infos incluses.' },
    { id: 'wav', nom: 'WAV', aide: 'Brut, sans perte. Le WAV ne garde ni pochette ni la plupart des infos (cover.jpg est mis à côté).' },
  ];
  const FORMATS_WEB = [
    { id: 'mp3', nom: 'MP3', aide: 'Le plus compatible. Pochette et infos incluses. Tout est rangé dans un fichier ZIP.' },
    { id: 'wav', nom: 'WAV', aide: 'Brut, sans perte, sans pochette ni infos (cover.jpg est mis à côté). Tout est rangé dans un ZIP.' },
  ];
  const QUALITES = [{ id: '320', nom: '320 kb/s' }, { id: 'v0', nom: 'V0 (variable)' }, { id: '256', nom: '256 kb/s' }, { id: '192', nom: '192 kb/s' }];
  const FEATS = [{ id: 'titre', nom: 'dans le titre' }, { id: 'artiste', nom: 'avec l’artiste' }];
  if (!PC) QUALITES.splice(1, 1);

  let exportEnCours = false;
  let annulerExport = false;
  let dossierExportFinal = '';
  function reglagesExport() {
    etat.export = Object.assign({ format: 'mp3', qualite: '320', featDans: 'titre', dossier: '' }, etat.export || {});
    if (!PC && !FORMATS_WEB.some((f) => f.id === etat.export.format)) etat.export.format = 'mp3';
    if (!QUALITES.some((q) => q.id === etat.export.qualite)) etat.export.qualite = '320';
    return etat.export;
  }
  function boutonsChoix(conteneur, options, valeur, quandChoisi) {
    conteneur.innerHTML = '';
    for (const o of options) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = o.nom;
      b.className = o.id === valeur ? 'actif' : '';
      b.addEventListener('click', () => quandChoisi(o.id));
      conteneur.appendChild(b);
    }
  }
  let dossierParDefaut = '';
  async function ouvrirExport() {
    const v = volumeActif(); if (!v) return;
    if (!v.pistes.length) { bulle('Ajoute d’abord des pistes au volume'); return; }
    arreter();
    $('fenetre-export').hidden = false;
    $('export-reglages').hidden = false;
    $('export-progres').hidden = true;
    $('btn-export-lancer').hidden = false;
    $('btn-export-lancer').disabled = false;
    $('btn-export-annuler').textContent = 'Annuler';
    $('btn-ouvrir-dossier').hidden = true;
    $('btn-ouvrir-dossier').classList.remove('plein');
    zipPret = null;
    $('bloc-dossier').hidden = !PC;
    if (PC && !dossierParDefaut) { try { dossierParDefaut = (await plateforme.api('infos')).exports; } catch {} }
    majFenetreExport();
  }
  function majFenetreExport() {
    const r = reglagesExport();
    const formats = PC ? FORMATS_PC : FORMATS_WEB;
    boutonsChoix($('choix-format'), formats, r.format, (id) => { r.format = id; sauver(); majFenetreExport(); });
    $('aide-format').textContent = formats.find((f) => f.id === r.format).aide;
    $('bloc-qualite').hidden = r.format !== 'mp3';
    boutonsChoix($('choix-qualite'), QUALITES, r.qualite, (id) => { r.qualite = id; sauver(); majFenetreExport(); });
    boutonsChoix($('choix-feat'), FEATS, r.featDans, (id) => { r.featDans = id; sauver(); majFenetreExport(); majApercu(); });
    $('export-dossier').textContent = (r.dossier || dossierParDefaut || '…') + '\\' + nomDossierAlbum(volumeActif());
    const v = volumeActif();
    const ext = { mp3: 'mp3', flac: 'flac', m4a: 'm4a', alac: 'm4a', wav: 'wav' }[r.format];
    $('export-apercu').innerHTML = v.pistes.map((id, i) => {
      const n = nomsExport(etat.sons[id], v, i + 1, v.pistes.length, r.featDans);
      return `<div id="ligne-export-${i}" title="${echapper(n.fichier)}.${ext}">${echapper(n.fichier)}.${ext}</div>`;
    }).join('') + (v.pochette ? '<div>cover.jpg</div>' : '<div class="ko">Pas de pochette : ajoute-la sur le volume avant d’exporter</div>');
  }
  function nomDossierAlbum(v) {
    return [v.artiste, v.titre].filter(Boolean).join(' - ').replace(/[<>:"/\\|?*]/g, '-').trim() || 'Album';
  }
  $('btn-exporter').addEventListener('click', ouvrirExport);
  $('btn-export-annuler').addEventListener('click', () => {
    if (exportEnCours) { annulerExport = true; $('export-etape').textContent = 'Arrêt après la piste en cours…'; return; }
    $('fenetre-export').hidden = true;
  });
  $('btn-choisir-dossier').addEventListener('click', async () => {
    const r = reglagesExport();
    try {
      const res = await plateforme.api('choisir-dossier?depart=' + encodeURIComponent(r.dossier || dossierParDefaut), { method: 'POST' });
      if (res.dossier) { r.dossier = res.dossier; sauver(); majFenetreExport(); }
    } catch (e) { bulle('Choix du dossier impossible : ' + e.message, 5000); }
  });
  $('btn-ouvrir-dossier').addEventListener('click', () => {
    if (!PC) { enregistrerZip(); return; }
    if (PC && dossierExportFinal) plateforme.api('ouvrir-dossier?chemin=' + encodeURIComponent(dossierExportFinal), { method: 'POST' }).catch(() => {});
  });
  $('btn-export-lancer').addEventListener('click', lancerExport);

  function versWav16(tampon) {
    const nc = tampon.numberOfChannels, L = tampon.length, sr = tampon.sampleRate;
    const octets = new ArrayBuffer(44 + L * nc * 2);
    const d = new DataView(octets);
    const ecr = (o, s) => { for (let i = 0; i < s.length; i++) d.setUint8(o + i, s.charCodeAt(i)); };
    ecr(0, 'RIFF'); d.setUint32(4, 36 + L * nc * 2, true); ecr(8, 'WAVE'); ecr(12, 'fmt ');
    d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, nc, true); d.setUint32(24, sr, true);
    d.setUint32(28, sr * nc * 2, true); d.setUint16(32, nc * 2, true); d.setUint16(34, 16, true);
    ecr(36, 'data'); d.setUint32(40, L * nc * 2, true);
    const canaux = []; for (let c = 0; c < nc; c++) canaux.push(tampon.getChannelData(c));
    const pcm = new Int16Array(octets, 44);
    for (let i = 0, k = 0; i < L; i++) for (let c = 0; c < nc; c++, k++) {
      const v = borne(canaux[c][i], -1, 1);
      pcm[k] = v < 0 ? Math.round(v * 32768) : Math.round(v * 32767);
    }
    return new Blob([octets], { type: 'audio/wav' });
  }

  async function lancerExport() {
    const v = volumeActif(); if (!v) return;
    const r = reglagesExport();
    exportEnCours = true; annulerExport = false;
    $('export-reglages').hidden = false;
    $('export-progres').hidden = false;
    $('btn-export-lancer').disabled = true;
    $('btn-export-annuler').textContent = 'Arrêter';
    document.querySelectorAll('#choix-format button, #choix-qualite button, #choix-feat button, #btn-choisir-dossier').forEach((b) => (b.disabled = true));
    const total = v.pistes.length;
    const etape = (t, p) => { $('export-etape').textContent = t; $('barre-plein').style.width = Math.round(p * 100) + '%'; };
    const ligne = (i, ok, msg) => { const l = $('ligne-export-' + i); if (l) { l.className = ok ? 'ok' : 'ko'; if (msg) l.textContent = (ok ? '✓ ' : '✗ ') + l.title + (ok ? '' : ' — ' + msg); else l.textContent = '✓ ' + l.title; } };
    let reussis = 0;
    try {
      if (PC) {
        const debut = await plateforme.api('export/debut', { json: { dossier: r.dossier || '', nom: nomDossierAlbum(v), pochette: v.pochette || '' } });
        dossierExportFinal = debut.dossier;
        const fichiers = [];
        for (let i = 0; i < total; i++) {
          if (annulerExport) break;
          const son = etat.sons[v.pistes[i]];
          const n = nomsExport(son, v, i + 1, total, r.featDans);
          etape(`Piste ${i + 1} / ${total} : préparation de « ${son.titre} »…`, i / total);
          try {
            const rendu = await rendre(await decoder(son), son.reglages);
            etape(`Piste ${i + 1} / ${total} : encodage de « ${son.titre} »…`, (i + 0.4) / total);
            await plateforme.api(`export/piste?job=${debut.job}&n=${i + 1}`, { body: versWav16(rendu.tampon) });
            const tags = { ...n.tags };
            if (r.format === 'flac') { tags.albumartist = tags.album_artist; tags.tracktotal = String(total); tags.track = String(i + 1); }
            const res = await plateforme.api('export/encoder', { json: { job: debut.job, n: i + 1, dossier: debut.dossier, format: r.format, qualite: r.qualite, nomFichier: n.fichier, tags } });
            fichiers.push(res.fichier);
            reussis++;
            ligne(i, true);
          } catch (e) { ligne(i, false, e.message); }
        }
        await plateforme.api('export/fin', { json: { job: debut.job, dossier: debut.dossier, nom: nomDossierAlbum(v), fichiers } });
        etape(annulerExport ? `Export arrêté : ${reussis} piste(s) prête(s) dans ${debut.dossier}` : `C’est prêt ! ${reussis} / ${total} pistes dans ${debut.dossier}`, 1);
        $('btn-ouvrir-dossier').hidden = false;
      } else {
        await exporterWeb(v, r, etape, ligne, (k) => (reussis = k));
      }
    } catch (e) {
      etape('L’export a échoué : ' + e.message, 0);
    } finally {
      exportEnCours = false;
      $('btn-export-annuler').textContent = 'Fermer';
      $('btn-export-lancer').hidden = true;
      document.querySelectorAll('#choix-format button, #choix-qualite button, #choix-feat button, #btn-choisir-dossier').forEach((b) => (b.disabled = false));
    }
  }

  // ----- Export sur téléphone : MP3 tagué + ZIP -----
  async function pochetteCarree(fichier) {
    const url = await plateforme.urlImage(fichier);
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = Math.min(img.naturalWidth, img.naturalHeight);
    const taille = Math.min(1400, c);
    const toileP = document.createElement('canvas');
    toileP.width = taille; toileP.height = taille;
    const g = toileP.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, (img.naturalWidth - c) / 2, (img.naturalHeight - c) / 2, c, c, 0, 0, taille, taille);
    const blob = await new Promise((ok) => toileP.toBlob(ok, 'image/jpeg', 0.92));
    return new Uint8Array(await blob.arrayBuffer());
  }

  async function encoderMp3(tampon, tags, pochette, debit) {
    const mb = await chargerMediabunny(true);
    const cible = new mb.BufferTarget();
    const sortie = new mb.Output({ format: new mb.Mp3OutputFormat(), target: cible });
    const source = new mb.AudioBufferSource({ codec: 'mp3', bitrate: debit });
    sortie.addAudioTrack(source);
    sortie.setMetadataTags(tags);
    await sortie.start();
    const sr = tampon.sampleRate, nc = tampon.numberOfChannels;
    for (let at = 0; at < tampon.length; at += sr) {
      const lg = Math.min(sr, tampon.length - at);
      const morceau = new AudioBuffer({ length: lg, numberOfChannels: nc, sampleRate: sr });
      for (let c = 0; c < nc; c++) morceau.copyToChannel(tampon.getChannelData(c).subarray(at, at + lg), c);
      await source.add(morceau);
    }
    source.close();
    await sortie.finalize();
    return new Uint8Array(cible.buffer);
  }

  async function exporterWeb(v, r, etape, ligne, compter) {
    const total = v.pistes.length;
    const fichiersZip = [];
    const dossier = nomDossierAlbum(v);
    let pochette = null;
    if (v.pochette) { try { pochette = await pochetteCarree(v.pochette); fichiersZip.push({ nom: dossier + '/cover.jpg', donnees: pochette }); } catch {} }
    const debit = { '320': 320000, '256': 256000, '192': 192000 }[r.qualite] || 320000;
    const listeM3u = [];
    let reussis = 0;
    for (let i = 0; i < total; i++) {
      if (annulerExport) break;
      const son = etat.sons[v.pistes[i]];
      const n = nomsExport(son, v, i + 1, total, r.featDans);
      etape(`Piste ${i + 1} / ${total} : « ${son.titre} »…`, i / total);
      try {
        const rendu = await rendre(await decoder(son), son.reglages);
        let donnees, ext;
        if (r.format === 'wav') { donnees = new Uint8Array(await versWav16(rendu.tampon).arrayBuffer()); ext = 'wav'; }
        else {
          const tags = { title: n.tags.title, artist: n.tags.artist, album: n.tags.album, albumArtist: n.tags.album_artist, trackNumber: i + 1, tracksTotal: total };
          if (n.tags.genre) tags.genre = n.tags.genre;
          if (n.tags.comment) tags.comment = n.tags.comment;
          if (/^\d{4}$/.test(n.tags.date)) tags.date = new Date(n.tags.date + '-01-01T00:00:00Z');
          if (pochette) tags.images = [{ data: pochette, mimeType: 'image/jpeg', kind: 'coverFront' }];
          donnees = await encoderMp3(rendu.tampon, tags, pochette, debit);
          ext = 'mp3';
        }
        const nomFichier = n.fichier.replace(/[<>:"/\\|?*]/g, '-').replace(/[. ]+$/, '') + '.' + ext;
        fichiersZip.push({ nom: dossier + '/' + nomFichier, donnees });
        listeM3u.push(nomFichier);
        reussis++; compter(reussis);
        ligne(i, true);
      } catch (e) { ligne(i, false, e.message); }
    }
    if (!reussis) { etape('Aucune piste n’a pu être exportée.', 0); return; }
    fichiersZip.push({ nom: `${dossier}/${dossier}.m3u8`, donnees: new TextEncoder().encode('#EXTM3U\r\n' + listeM3u.join('\r\n') + '\r\n') });
    etape('Création du fichier ZIP…', 0.98);
    zipPret = { blob: creerZip(fichiersZip), nom: dossier + '.zip' };
    $('btn-ouvrir-dossier').textContent = 'Enregistrer le ZIP';
    $('btn-ouvrir-dossier').hidden = false;
    $('btn-ouvrir-dossier').classList.add('plein');
    etape(`C’est prêt ! ${reussis} / ${total} pistes dans « ${dossier}.zip ». Touche « Enregistrer le ZIP ».`, 1);
  }
  let zipPret = null;
  const NATIF = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  function blobEnBase64(blob) {
    return new Promise((ok, ko) => {
      const r = new FileReader();
      r.onload = () => ok(String(r.result).slice(String(r.result).indexOf(',') + 1));
      r.onerror = () => ko(r.error);
      r.readAsDataURL(blob);
    });
  }
  // iPhone (appli) : le ZIP est rangé dans « Fichiers > Sur mon iPhone > Atelier », puis proposé au partage.
  async function enregistrerZipNatif() {
    const { Filesystem, Share } = window.Capacitor.Plugins;
    const chemin = zipPret.nom.replace(/[\\/:*?"<>|]/g, '-');
    const taille = 3 * 1024 * 1024;
    for (let i = 0; i < zipPret.blob.size; i += taille) {
      const data = await blobEnBase64(zipPret.blob.slice(i, i + taille));
      if (i === 0) await Filesystem.writeFile({ path: chemin, data, directory: 'DOCUMENTS', recursive: true });
      else await Filesystem.appendFile({ path: chemin, data, directory: 'DOCUMENTS' });
      $('export-etape').textContent = `Enregistrement du ZIP… ${Math.min(100, Math.round(((i + taille) / zipPret.blob.size) * 100))} %`;
    }
    $('export-etape').textContent = `ZIP rangé dans Fichiers › Sur mon iPhone › Atelier › ${chemin}`;
    try {
      const { uri } = await Filesystem.getUri({ path: chemin, directory: 'DOCUMENTS' });
      await Share.share({ title: zipPret.nom, files: [uri] });
    } catch (e) { /* partage fermé : le fichier reste dans Fichiers */ }
  }
  async function enregistrerZip() {
    if (!zipPret) return;
    if (NATIF) {
      try { await enregistrerZipNatif(); } catch (e) { bulle('Enregistrement impossible : ' + (e.message || e), 6000); }
      return;
    }
    const capacite = window.claude && window.claude.use ? await window.claude.use('downloads').catch(() => null) : null;
    if (capacite) {
      try {
        await capacite.save({ filename: zipPret.nom, data: zipPret.blob });
        bulle('ZIP enregistré');
      } catch (e) {
        if (e && e.code === 'declined') bulle('Enregistrement annulé');
        else if (e && e.code === 'host_unavailable') bulle('Cette appli ne peut pas enregistrer de fichiers : ouvre la page dans ton navigateur.', 6000);
        else bulle('Enregistrement impossible : ' + ((e && e.message) || 'erreur'), 6000);
      }
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(zipPret.blob);
    a.download = zipPret.nom;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 120000);
  }

  // ZIP simple (sans compression : l’audio est déjà compressé)
  const TABLE_CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(d) { let c = 0xffffffff; for (let i = 0; i < d.length; i++) c = TABLE_CRC[(c ^ d[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
  function creerZip(fichiers) {
    const morceaux = [], centrale = [];
    let decalage = 0;
    const maintenant = new Date();
    const heure = (maintenant.getHours() << 11) | (maintenant.getMinutes() << 5) | (maintenant.getSeconds() >> 1);
    const date = ((maintenant.getFullYear() - 1980) << 9) | ((maintenant.getMonth() + 1) << 5) | maintenant.getDate();
    for (const f of fichiers) {
      const nom = new TextEncoder().encode(f.nom);
      const crc = crc32(f.donnees);
      const tete = new DataView(new ArrayBuffer(30));
      tete.setUint32(0, 0x04034b50, true); tete.setUint16(4, 20, true); tete.setUint16(6, 0x0800, true); tete.setUint16(8, 0, true);
      tete.setUint16(10, heure, true); tete.setUint16(12, date, true); tete.setUint32(14, crc, true);
      tete.setUint32(18, f.donnees.length, true); tete.setUint32(22, f.donnees.length, true); tete.setUint16(26, nom.length, true); tete.setUint16(28, 0, true);
      morceaux.push(tete.buffer, nom, f.donnees);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
      c.setUint16(12, heure, true); c.setUint16(14, date, true); c.setUint32(16, crc, true); c.setUint32(20, f.donnees.length, true); c.setUint32(24, f.donnees.length, true);
      c.setUint16(28, nom.length, true); c.setUint32(42, decalage, true);
      centrale.push(c.buffer, nom);
      decalage += 30 + nom.length + f.donnees.length;
    }
    const tailleCentrale = centrale.reduce((s, x) => s + x.byteLength, 0);
    const fin = new DataView(new ArrayBuffer(22));
    fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, fichiers.length, true); fin.setUint16(10, fichiers.length, true);
    fin.setUint32(12, tailleCentrale, true); fin.setUint32(16, decalage, true);
    return new Blob([...morceaux, ...centrale, fin.buffer], { type: 'application/zip' });
  }

  // ====================================================================
  // Commandes générales
  // ====================================================================
  $('btn-lecture').addEventListener('click', basculerLecture);
  $('btn-debut').addEventListener('click', () => { const l = !!ed.lecture; arreter(false); ed.curseur = aSelection() ? ed.sel.a : 0; ed.vue.debut > ed.curseur && zoomer(1, ed.curseur); if (l) jouer(); else dessiner(); });
  $('btn-zoom-plus').addEventListener('click', () => zoomer(0.5));
  $('btn-zoom-moins').addEventListener('click', () => zoomer(2));
  $('btn-zoom-tout').addEventListener('click', () => { ed.vue = { debut: 0, fin: Math.max(0.5, duree()) }; dessiner(); });
  $('btn-tout-selectionner').addEventListener('click', () => { ed.sel = { a: 0, b: duree() }; majSelectionChamps(); dessiner(); });
  $('btn-annuler').addEventListener('click', annuler);
  $('btn-refaire').addEventListener('click', refaire);
  $('c-boucle').addEventListener('change', () => { if (ed.lecture) jouer(position()); });

  document.addEventListener('keydown', (e) => {
    const champ = e.target.closest && e.target.closest('input, textarea, select');
    if (!$('fenetre-export').hidden) { if (e.key === 'Escape' && !exportEnCours) $('fenetre-export').hidden = true; return; }
    if (e.key === 'Escape') { fermerMenu(); }
    if (champ && e.target.type !== 'range' && e.target.type !== 'checkbox') return;
    if (!sonActif()) return;
    const ctrl = e.ctrlKey || e.metaKey;
    if (e.code === 'Space') { e.preventDefault(); basculerLecture(); }
    else if (ctrl && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); annuler(); }
    else if (ctrl && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); refaire(); }
    else if (ctrl && e.key.toLowerCase() === 'd') { e.preventDefault(); outil('dupliquer'); }
    else if (ctrl && e.key.toLowerCase() === 'a') { e.preventDefault(); ed.sel = { a: 0, b: duree() }; majSelectionChamps(); dessiner(); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { if (aSelection()) { e.preventDefault(); outil('couper'); } }
    else if (e.key === 'Home') { ed.curseur = 0; if (ed.lecture) jouer(0); dessiner(); }
  });

  // Onglets du téléphone
  function allerOnglet(nom) {
    if (window.matchMedia('(max-width: 760px)').matches) {
      document.body.dataset.onglet = nom;
      window.scrollTo(0, 0);
      if (nom === 'edition') requestAnimationFrame(dessiner);
    }
  }
  document.querySelectorAll('.onglets button').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.onglet === 'edition' && !sonActif()) { bulle('Choisis d’abord une piste'); return; }
    document.body.dataset.onglet = b.dataset.onglet; window.scrollTo(0, 0);
    if (b.dataset.onglet === 'edition') requestAnimationFrame(dessiner);
  }));

  function toutRendre() {
    rendreVolumes();
    rendreSons();
    rendreVolume();
    rendreEditeur();
  }

  // ====================================================================
  // Démarrage
  // ====================================================================
  (async () => {
    if (!document.body.dataset.onglet) document.body.dataset.onglet = 'volumes';
    // iPhone : jouer le son même quand le bouton silencieux est activé.
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
    $('cote-pied').textContent = PC ? 'Sur ce PC · tout est enregistré automatiquement.' : NATIF ? 'Sur cet iPhone · tout est enregistré automatiquement.' : 'Sur cet appareil · tout est enregistré dans le navigateur.';
    try {
      const charge = await plateforme.chargerEtat();
      if (charge && charge.sons) etat = Object.assign(etat, charge);
    } catch (e) {
      bulle('Impossible de relire la bibliothèque : ' + e.message, 6000);
    }
    for (const s of Object.values(etat.sons)) s.reglages = Object.assign(REGLAGES_DEFAUT(), s.reglages || {});
    if (etat.volumeActif && !volumeActif()) etat.volumeActif = etat.volumes[0] ? etat.volumes[0].id : null;
    if (!etat.volumeActif && etat.volumes[0]) etat.volumeActif = etat.volumes[0].id;
    if (etat.sonActif && !sonActif()) etat.sonActif = null;
    toutRendre();
    mesurerDurees(Object.keys(etat.sons));
    window.__atelier = { etat: () => etat, ed, rendre, decoder, nomsExport, versWav16, creerZip, plateforme };
  })();
})();
