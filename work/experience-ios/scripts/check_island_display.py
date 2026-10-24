"""Check real simulator captures; count classic and highlighted lyric glyphs."""
from PIL import Image
import json,sys

def pink(rgb):
 red,green,blue=rgb
 return red>160 and blue>65 and red>green+45 and blue>green+10

def check_display(path):
 image=Image.open(path).convert('RGB');width,height=image.size
 crop=image.crop((int(width*.08),0,int(width*.92),int(height*.075)))
 visible=sum(pink(rgb) for rgb in crop.getdata())
 band=image.crop((int(width*.25),0,int(width*.75),int(height*.075)))
 dark=[y for y in range(band.height) if sum(max(band.getpixel((x,y)))<45 for x in range(band.width))>band.width*.6]
 assert dark and max(dark)-min(dark)>16, 'No Dynamic Island capsule visible'
 inner=band.crop((0,min(dark)+8,band.width,max(dark)-8))
 letters=sum(min(rgb)>170 or pink(rgb) for rgb in inner.getdata())
 assert visible>=5, 'Dynamic Island has no visible native widget pixels: '+str(visible)
 assert letters>=10, 'Dynamic Island capsule contains no visible text: '+str(letters)
 return {'pinkPixels':visible,'textPixels':letters,'width':width,'height':height}

if __name__=='__main__':
 for path in sys.argv[1:]:print(json.dumps({'file':path,**check_display(path)}))
