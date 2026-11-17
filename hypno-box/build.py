import glob,sys
base=open('base.html',encoding='utf8').read()
mark='<script>\n/* App shell: one view per game.'
assert base.count(mark)==1
games=''.join('<script>\n'+open(f,encoding='utf8').read()+'</script>\n' for f in sorted(glob.glob('g[0-9][0-9]-*.js')))
open('index.html','w',encoding='utf8').write(base.replace(mark,games+mark))
print(len(base), '->', len(games))
