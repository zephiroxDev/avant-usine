from pathlib import Path
p=Path(__file__).resolve().parents[2]/'work/beta-builds/index.ts'
s=p.read_text(encoding='utf-8').replace('hex(sha256(bytes))!==part.sha256',"hex(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)))!==part.sha256")
p.write_text(s,encoding='utf-8')
print('Per-part validation uses native SHA-256; whole-file verification remains incremental.')
