from pathlib import Path
import zipfile,hashlib,json,stat
archive=Path("C:/Users/User/Documents/sauvegarde avant l'usine/Avant-usine-transfert-19V02-2026-10-12.zip")
destination=Path('C:/Users/User/Desktop/Avant-l-usine/projet')
expected='68cfc596d4b862fc26527d2ca333adf1c67973e762a27fcb30c0dae6eaf29ec7'
with archive.open('rb') as f:actual=hashlib.file_digest(f,'sha256').hexdigest()
assert actual==expected,'Empreinte differente : restauration interrompue'
print('Empreinte du ZIP valide',flush=True)
assert destination.resolve().is_relative_to(Path('C:/Users/User/Desktop/Avant-l-usine').resolve())
with zipfile.ZipFile(archive) as z:
    for name in ['AGENTS.md','REPRISE.md','GUIDE-TRANSFERT-COMPLET.txt','HABITUDES-UTILISATEUR.txt','work/github-sync-import/index.html']:
        assert name in z.namelist(),name
    for entry in z.infolist():
        path=destination/entry.filename
        assert path.resolve().is_relative_to(destination.resolve()),'Chemin ZIP non autorise'
        assert not stat.S_ISLNK(entry.external_attr>>16),'Lien symbolique non autorise'
    destination.mkdir(parents=True,exist_ok=True)
    for i,entry in enumerate(z.infolist()):
        # Les chemins etendus evitent les limites Windows sur les anciens paquets.
        z.extract(entry,'\\\\?\\'+str(destination))
        if i%500==0:print(f'Restauration : {i}/{len(z.infolist())}',flush=True)
    for name in ['AGENTS.md','REPRISE.md','GUIDE-TRANSFERT-COMPLET.txt','HABITUDES-UTILISATEUR.txt']:
        assert (destination/name).read_bytes()==z.read(name)
print(json.dumps({'restored':True,'root':str(destination),'files':len(z.infolist()),'archivePreserved':archive.exists()}),flush=True)
