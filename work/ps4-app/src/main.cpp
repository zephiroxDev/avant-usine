#include "graphics.h"
#include "stb_easy_font.h"
#include "catalog.h"
#include "settings.h"
#include "local_store.h"
#include "player.h"
#include <orbis/Pad.h>
#include <orbis/UserService.h>
#include <orbis/libkernel.h>
#include <algorithm>
#include <sstream>
#include <cstring>
#include <cstdio>
std::stringstream debugLogStream;
extern "C" { uint64_t sceLibcHeapSize=512*1024*1024; }
static Scene2D* screen;
static const Color white={239,236,246},muted={150,143,168},pink={232,93,178};
static void box(int x,int y,int w,int h,Color c) {
    int right=std::min(1280,x+w),bottom=std::min(720,y+h);x=std::max(0,x);y=std::max(0,y);
    if(right>x&&bottom>y)screen->DrawRectangle(x,y,right-x,bottom-y,c);
}
static std::string display(std::string s) {
    // The prototype font is ASCII; stored names and catalog metadata stay UTF-8.
    const char* accented[]={"é","è","ê","ë","à","â","ä","î","ï","ô","ö","ù","û","ü","ç","É","À","’","œ"};
    const char* plain[]={"e","e","e","e","a","a","a","i","i","o","o","u","u","u","c","E","A","'","oe"};
    for(size_t n=0;n<sizeof(accented)/sizeof(*accented);++n){size_t p=0;while((p=s.find(accented[n],p))!=std::string::npos){s.replace(p,strlen(accented[n]),plain[n]);p+=strlen(plain[n]);}}
    for(char&c:s)if(static_cast<unsigned char>(c)>=128)c='?';return s;
}
static void text(int x,int y,std::string value,Color c=white,int scale=2) {
    value=display(value);if(value.size()>90)value=value.substr(0,87)+"...";
    struct Vertex{float x,y,z;unsigned char color[4];};Vertex buffer[65536/sizeof(Vertex)];
    int quads=stb_easy_font_print(0,0,const_cast<char*>(value.c_str()),nullptr,buffer,sizeof(buffer));
    for(int q=0;q<quads;++q){Vertex*v=buffer+q*4;float minX=v[0].x,maxX=v[0].x,minY=v[0].y,maxY=v[0].y;
        for(int j=1;j<4;++j){minX=std::min(minX,v[j].x);maxX=std::max(maxX,v[j].x);minY=std::min(minY,v[j].y);maxY=std::max(maxY,v[j].y);}
        box(x+int(minX*scale),y+int(minY*scale),int((maxX-minX)*scale),int((maxY-minY)*scale),c);}
}
static bool mp3(std::string s){if(s.size()<4)return false;for(char&c:s)if(c>='A'&&c<='Z')c+=32;return s.substr(s.size()-4)==".mp3";}
int main() {
    sceUserServiceInitialize(nullptr);scePadInit();int user=0;sceUserServiceGetInitialUser(&user);
    int pad=scePadOpen(user,0,0,nullptr);if(pad<0)return 1;
    screen=new Scene2D(1280,720,4);if(!screen->Init(32*1024*1024,2))return 2;
    screen->SetActiveFrameBuffer(0);
    std::string root="/data/avant-usine-ps4",library=root+"/local",settings=root+"/settings.ini";
    bool storage=local::directory(root)&&local::directory(library);
    bool hints=readHints(settings),options=false,localMode=false,browse=false;
    bool audioReady=player::init();
    int volume=0,selected=0,localSelected=0,frame=0;uint32_t previous=0;
    std::string current,notice=storage?"":"Stockage inaccessible : import indisponible",path=library;
    auto files=local::list(path);
    bool running=true;
    while(running) {
        OrbisPadData data{};uint32_t pressed=0;
        if(scePadReadState(pad,&data)>=0){pressed=data.buttons&~previous;previous=data.buttons;}
        if(pressed&ORBIS_PAD_BUTTON_OPTIONS)options=!options;
        if(options) {
            if(pressed&ORBIS_PAD_BUTTON_CROSS){hints=!hints;if(!writeHints(settings,hints))notice="Reglage non enregistre : stockage inaccessible";}
            if(pressed&ORBIS_PAD_BUTTON_CIRCLE)options=false;
        }else {
            if(pressed&ORBIS_PAD_BUTTON_TRIANGLE){localMode=!localMode;localSelected=0;path=library;browse=false;files=local::list(path);}
            if(localMode) {
                if(pressed&ORBIS_PAD_BUTTON_UP)localSelected=std::max(0,localSelected-1);
                if(pressed&ORBIS_PAD_BUTTON_DOWN)localSelected=std::min(std::max(0,int(files.size())-1),localSelected+1);
                if(pressed&ORBIS_PAD_BUTTON_R1){browse=true;path="/mnt/usb0";files=local::list(path);localSelected=0;notice="USB 0 : L1 ouvre USB 1";}
                if(pressed&ORBIS_PAD_BUTTON_L1){browse=true;path="/mnt/usb1";files=local::list(path);localSelected=0;}
                if((pressed&ORBIS_PAD_BUTTON_CROSS)&&!files.empty()) {
                    auto e=files[localSelected];
                    if(e.directory){path=e.path;files=local::list(path);localSelected=0;}
                    else if(mp3(e.name)&&audioReady){if(current==e.path)player::toggle();else{current=e.path;player::open(current);}}
                    else notice="Lecture MP3 uniquement dans ce prototype";
                }
                if((pressed&ORBIS_PAD_BUTTON_SQUARE)&&browse&&!files.empty()) {
                    auto e=files[localSelected];if(!e.directory&&storage){std::string error;
                        if(local::importFile(e.path,library,e.name,error))notice="Copie terminee dans Local : "+e.name;else notice=error;}
                }
                if(pressed&ORBIS_PAD_BUTTON_CIRCLE){
                    if(path!=library&&path!="/mnt/usb0"&&path!="/mnt/usb1"){path=path.substr(0,path.find_last_of('/'));files=local::list(path);localSelected=0;}
                    else if(browse){browse=false;path=library;files=local::list(path);localSelected=0;}
                    else localMode=false;
                }
            }else {
                auto v=volumes[volume];
                if(pressed&ORBIS_PAD_BUTTON_UP)selected=std::max(0,selected-1);
                if(pressed&ORBIS_PAD_BUTTON_DOWN)selected=std::min(v.count-1,selected+1);
                if(pressed&ORBIS_PAD_BUTTON_L1){volume=(volume+int(sizeof(volumes)/sizeof(*volumes))-1)%int(sizeof(volumes)/sizeof(*volumes));selected=0;}
                if(pressed&ORBIS_PAD_BUTTON_R1){volume=(volume+1)%int(sizeof(volumes)/sizeof(*volumes));selected=0;}
                if((pressed&ORBIS_PAD_BUTTON_CROSS)&&v.count>0&&audioReady){std::string src=tracks[v.first+selected].url;
                    if(current==src)player::toggle();else{current=src;player::open(src);}}
                if(pressed&ORBIS_PAD_BUTTON_SQUARE)player::stop();
                if(pressed&ORBIS_PAD_BUTTON_CIRCLE)running=false;
            }
            if(pressed&ORBIS_PAD_BUTTON_LEFT)player::seek(-10);
            if(pressed&ORBIS_PAD_BUTTON_RIGHT)player::seek(10);
        }
        screen->FrameBufferFill({17,14,24});box(44,44,5,54,pink);
        text(65,53,"avant l'usine",white,4);text(930,62,"PS4 - prototype 0.1",muted);
        text(65,132,localMode?(browse?"Importer depuis USB":"Ma musique locale"):volumes[volume].title,pink,3);
        if(localMode)text(65,178,path,muted);
        int count=localMode?int(files.size()):volumes[volume].count;
        int selection=localMode?localSelected:selected,start=std::max(0,selection-4);
        for(int i=start;i<std::min(count,start+8);++i){int y=218+(i-start)*39;
            if(i==selection)box(53,y-8,1160,35,{57,34,67});
            std::string name=localMode?((files[i].directory?"[Dossier] ":"")+files[i].name):tracks[volumes[volume].first+i].title;
            text(67,y,std::to_string(i+1)+"  "+name,i==selection?white:muted);}
        if(!count)text(65,238,"Aucun fichier accessible dans ce dossier",muted);
        auto state=player::state();box(55,551,1160,2,{55,45,65});
        text(65,570,audioReady?state.message:"Sortie audio indisponible",pink);
        if(state.duration>0){box(65,601,1100,5,{55,45,65});box(65,601,int(1100*state.position/state.duration),5,pink);}
        if(!notice.empty())text(65,624,notice,muted);
        if(hints)text(65,673,localMode?"Croix: lire/ouvrir | R1/L1: USB | Carre: copier | Triangle: catalogue | Options":"Croix: lire/pause | L1/R1: volumes | Fleches: selection/avance | Triangle: Local | Options",muted);
        if(options){box(210,210,860,240,{44,29,55});text(245,240,"Reglages",white,3);
            text(245,300,std::string(hints?"[X] ":"[ ] ")+"Afficher les indications de la manette",pink);
            text(245,358,"Croix : modifier. Rond : fermer.",muted);}
        screen->SubmitFlip(frame);screen->FrameWait(frame);screen->FrameBufferSwap();++frame;
    }
    player::shutdown();return 0;
}
