// Diagnostic entry point: no C++ globals, streams, threads, audio or network.
#include <orbis/libkernel.h>
#include <orbis/VideoOut.h>
#include <orbis/UserService.h>
#include <orbis/Pad.h>
#include <fcntl.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include "stb_easy_font.h"
extern "C" { uint64_t sceLibcHeapSize=16*1024*1024; }
static int video=-1,buffer=0,frame=0;
static uint32_t* pixels[2];
static OrbisKernelEqueue queue;
static void checkpoint(const char* label,int rc,bool notify=false) {
    sceKernelMkdir("/data/avant-usine-ps4",0700);
    int file=sceKernelOpen("/data/avant-usine-ps4/startup-diagnostic.log",O_WRONLY|O_CREAT|O_APPEND,0600);
    char line[160];int length=snprintf(line,sizeof(line),"%s : 0x%08x\n",label,(unsigned)rc);
    if(file>=0){sceKernelWrite(file,line,length);sceKernelFsync(file);sceKernelClose(file);}
    printf("%s",line);
    if(notify){OrbisNotificationRequest request={};
        request.type=OrbisNotificationRequestType::NotificationRequest;
        request.targetId=-1;snprintf(request.message,sizeof(request.message),"Avant l'usine diagnostic : %s",label);
        sceKernelSendNotificationRequest(0,&request,sizeof(request),0);}
}
static void rect(int x,int y,int w,int h,uint32_t color) {
    for(int yy=y;yy<y+h&&yy<720;++yy)for(int xx=x;xx<x+w&&xx<1280;++xx)
        if(xx>=0&&yy>=0)pixels[buffer][yy*1280+xx]=color;
}
static void text(int x,int y,const char* value,uint32_t color,int scale=3) {
    struct Vertex{float x,y,z;unsigned char color[4];};Vertex glyphs[4096];
    int n=stb_easy_font_print(0,0,const_cast<char*>(value),nullptr,glyphs,sizeof(glyphs));
    for(int i=0;i<n;++i){Vertex*v=glyphs+i*4;float x0=v[0].x,x1=v[0].x,y0=v[0].y,y1=v[0].y;
        for(int j=1;j<4;++j){if(v[j].x<x0)x0=v[j].x;if(v[j].x>x1)x1=v[j].x;if(v[j].y<y0)y0=v[j].y;if(v[j].y>y1)y1=v[j].y;}
        rect(x+int(x0*scale),y+int(y0*scale),int((x1-x0)*scale),int((y1-y0)*scale),color);}
}
static void draw(const char* step,int result,bool complete=false) {
    for(int i=0;i<1280*720;++i)pixels[buffer][i]=0xff17111f;
    text(80,75,"avant l'usine - diagnostic",0xfff0c5e5,4);
    text(80,180,"TEST 4 - DEMARRAGE UNIQUEMENT",0xffba9cc9);
    text(80,270,step,0xffeeeeee);
    char code[80];snprintf(code,sizeof(code),"Resultat : 0x%08x",(unsigned)result);text(80,330,code,0xffcfc4d3);
    text(80,435,complete?"IMAGE ET MANETTE OK":"Verification des services de la console...",0xffdf87bc);
    text(80,510,"Audio et reseau non initialises dans ce diagnostic.",0xffa89eaf,2);
    text(80,560,"Photographie cet ecran si une etape reste bloquee.",0xffa89eaf,2);
    if(complete)text(80,620,"Croix : changer la couleur. Rond : quitter.",0xffcfc4d3,2);
    int rc=sceVideoOutSubmitFlip(video,buffer,ORBIS_VIDEO_OUT_FLIP_VSYNC,frame);
    if(rc>=0){for(int tries=0;tries<100;++tries){OrbisVideoOutFlipStatus status={};sceVideoOutGetFlipStatus(video,&status);
        if(status.flipArg==frame)break;OrbisKernelEvent event;int count=0;OrbisKernelTimespec timeout={0,100000000};
        // Small polling delay avoids depending on event-queue timeout ABI.
        (void)event;(void)count;(void)timeout;sceKernelUsleep(1000);}}
    buffer=1-buffer;++frame;
}
static void show(const char* step,int result) {checkpoint(step,result);for(int i=0;i<120;++i)draw(step,result);}
int main() {
    checkpoint("D0 entree dans main",0,true);
    checkpoint("D1 ouverture video",0);
    video=sceVideoOutOpen(ORBIS_VIDEO_USER_MAIN,ORBIS_VIDEO_OUT_BUS_MAIN,0,nullptr);
    checkpoint("D1 resultat video",video,true);if(video<0){for(;;)sceKernelUsleep(100000);}
    off_t allocation=0;void* memory=nullptr;size_t bytes=16*1024*1024;
    int rc=sceKernelAllocateDirectMemory(0,sceKernelGetDirectMemorySize(),bytes,0x200000,3,&allocation);
    checkpoint("D2 allocation image",rc,true);if(rc<0){for(;;)sceKernelUsleep(100000);}
    rc=sceKernelMapDirectMemory(&memory,bytes,0x33,0,allocation,0x200000);
    checkpoint("D3 memoire image",rc,true);if(rc<0){for(;;)sceKernelUsleep(100000);}
    pixels[0]=(uint32_t*)memory;pixels[1]=pixels[0]+1280*720;
    OrbisVideoOutBufferAttribute attr={};sceVideoOutSetBufferAttribute(&attr,0x80000000,1,0,1280,720,1280);
    rc=sceVideoOutRegisterBuffers(video,0,(void**)pixels,2,&attr);
    checkpoint("D4 buffers image",rc,true);if(rc<0){for(;;)sceKernelUsleep(100000);}
    sceVideoOutSetFlipRate(video,0);show("D4 image initialisee",rc);
    show("D5 avant service utilisateur",0);
    OrbisUserServiceInitializeParams params={};params.priority=ORBIS_KERNEL_PRIO_FIFO_LOWEST;
    rc=sceUserServiceInitialize(&params);show("D5 service utilisateur",rc);
    show("D6 avant initialisation manette",0);
    rc=scePadInit();show("D6 initialisation manette",rc);
    if(rc<0){for(;;)draw("D6 echec manette",rc);}
    int user=-1;rc=sceUserServiceGetInitialUser(&user);show("D7 utilisateur initial",rc);
    if(rc<0){for(;;)draw("D7 echec utilisateur",rc);}
    int pad=scePadOpen(user,0,0,nullptr);show("D8 ouverture manette",pad);
    if(pad<0){for(;;)draw("D8 echec ouverture manette",pad);}
    checkpoint("D9 image et manette OK",0,true);
    uint32_t previous=0;bool active=true;
    while(active){OrbisPadData data={};rc=scePadReadState(pad,&data);uint32_t pressed=data.buttons&~previous;previous=data.buttons;
        if(pressed&ORBIS_PAD_BUTTON_CROSS)buffer=1-buffer;
        if(pressed&ORBIS_PAD_BUTTON_CIRCLE)active=false;
        draw("D9 diagnostic termine",rc,true);}
    scePadClose(pad);checkpoint("D10 sortie normale",0);return 0;
}
