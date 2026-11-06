"""25.0 : bascule la palette violet/rose/cyan vers la lumière sodium (ambre).
Usage : python3 repalette-25.py fichier... (réécrit en place, fins de ligne conservées)."""
import re,sys,colorsys
def remap(r,g,b):
    H,L,S=colorsys.rgb_to_hls(r/255,g/255,b/255);deg=H*360
    if S<.12: return None
    if 220<=deg<=345: nh=33/360
    elif 160<=deg<220: nh=42/360
    else: return None
    if L<.2: S=S*.55;nh=28/360
    elif L>.86: S=S*.7;nh=40/360
    nr,ng,nb=colorsys.hls_to_rgb(nh,L,min(S,1))
    return round(nr*255),round(ng*255),round(nb*255)
def hexsub(m):
    pre,h=m.group(1),m.group(2);n=len(h)
    if n in(3,4): rgb=[int(c*2,16) for c in h[:3]];a=h[3:]
    elif n in(6,8): rgb=[int(h[i:i+2],16) for i in(0,2,4)];a=h[6:]
    else: return m.group(0)
    out=remap(*rgb)
    if not out: return m.group(0)
    s=''.join('%02x'%v for v in out)
    if n in(3,4): a=a*2 if a else ''
    return pre+s+a
def rgbsub(m):
    r,g,b=(int(float(x)) for x in m.group(2,3,4));out=remap(r,g,b)
    if not out: return m.group(0)
    return '%s(%d,%d,%d%s)'%(m.group(1),*out,m.group(5) or '')
HEX=re.compile(r'(#|%23)([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![0-9a-fA-F\w-])')
RGB=re.compile(r'(rgba?)\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*((?:,\s*[\d.]+%?)?)\s*\)')
for p in sys.argv[1:]:
    s=open(p,encoding='utf-8',newline='').read()
    t=HEX.sub(hexsub,s);t=RGB.sub(rgbsub,t)
    if t!=s: open(p,'w',encoding='utf-8',newline='').write(t);print('palette',p)
