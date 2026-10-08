from pathlib import Path
import json
p=Path(__file__).resolve().parents[1]
f=p/'web/android.js';s=f.read_text(encoding='utf-8');s=s.replace("heading.textContent='Mise à jour Android '","modal.className='au-android-update';heading.textContent='Mise à jour Android '",1);f.write_bytes(s.encode())
f=p/'web/android.css';s=f.read_text(encoding='utf-8').replace('dialog{','.au-android-update{').replace('dialog>button{','.au-android-update>button{').replace('dialog::backdrop{','.au-android-update::backdrop{').replace('var(--paper,#171717)','var(--bg,#171717)');f.write_bytes(s.encode())
f=p/'patch-notes.json';notes=json.loads(f.read_text(encoding='utf-8'));notes[0][3].insert(3,'Bouton Retour Android : fermer le panneau ouvert ou revenir à l’écran précédent avant de quitter.');notes[0][3].insert(4,'Mises à jour depuis l’application : numéro de version, Plus tard, saut de la version ou Installer ; téléchargement vérifié avant la confirmation système Android.');f.write_bytes((json.dumps(notes,ensure_ascii=False,indent=2)+'\n').encode())
