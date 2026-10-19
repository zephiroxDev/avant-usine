#include "player.h"
#include "pcm.h"
#include <orbis/AudioOut.h>
#include <orbis/UserService.h>
#include <orbis/Net.h>
#include <orbis/Ssl.h>
#include <orbis/Http.h>
#include <orbis/Sysmodule.h>
#include <orbis/libkernel.h>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <atomic>
#include <algorithm>
#include <cstdio>
#include <cctype>
#define DR_MP3_IMPLEMENTATION
#include "dr_mp3.h"
namespace player {
static std::mutex lock;
static std::condition_variable wake;
static std::thread loader,audio;
static std::atomic<bool> exiting(false);
static std::atomic<unsigned> generation(0);
static std::vector<int16_t> samples;
static std::string pending,message="Choisir un morceau";
static size_t cursor=0;static bool playing=false,busy=false;
static int port=-1;
static constexpr size_t maxBytes=64*1024*1024;
static bool archiveURL(const std::string& u) {
    if(u.compare(0,8,"https://")!=0)return false;
    size_t slash=u.find('/',8);if(slash==std::string::npos)return false;
    std::string host=u.substr(8,slash-8);
    return host=="archive.org"||(host.size()>12&&host.compare(host.size()-12,12,".archive.org")==0);
}
static std::string location(const char* text,size_t bytes) {
    std::string headers(text,bytes);size_t p=0;
    while(p<headers.size()) {size_t end=headers.find('\n',p);if(end==std::string::npos)end=headers.size();
        std::string line=headers.substr(p,end-p);auto colon=line.find(':');
        if(colon!=std::string::npos){std::string key=line.substr(0,colon);
            for(auto&c:key)c=char(std::tolower(static_cast<unsigned char>(c)));
            if(key=="location"){size_t a=line.find_first_not_of(" \t",colon+1),b=line.find_last_not_of("\r \t\0",std::string::npos);
                if(a!=std::string::npos)return line.substr(a,b-a+1);}}
        p=end+1;
    }return {};
}
struct Network {
    int pool=-1,ssl=-1,http=-1;
    bool init() {
        sceSysmoduleLoadModuleInternal(ORBIS_SYSMODULE_INTERNAL_NET);
        sceSysmoduleLoadModuleInternal(ORBIS_SYSMODULE_INTERNAL_SSL);
        sceSysmoduleLoadModuleInternal(ORBIS_SYSMODULE_INTERNAL_HTTP);
        sceNetInit();pool=sceNetPoolCreate("AvantUsine",2*1024*1024,0);
        if(pool<0)return false;ssl=sceSslInit(2*1024*1024);if(ssl<0)return false;
        http=sceHttpInit(pool,ssl,2*1024*1024);return http>=0;
    }
    ~Network(){if(http>=0)sceHttpTerm(http);if(ssl>=0)reinterpret_cast<void(*)(int)>(&sceSslTerm)(ssl);if(pool>=0)sceNetPoolDestroy(pool);}
    bool fetch(std::string url,std::vector<uint8_t>& bytes,unsigned id,std::string& error) {
        if(http<0){error="Reseau indisponible";return false;}
        for(int redirect=0;redirect<6&&!exiting&&id==generation;++redirect) {
            if(!archiveURL(url)){error="Adresse HTTPS Archive.org attendue";return false;}
            int tpl=sceHttpCreateTemplate(http,"AvantUsinePS4/0.1",ORBIS_HTTP_VERSION_1_1,1);
            if(tpl<0){error="Creation HTTPS impossible";return false;}
            // Keep the platform TLS verification. Never accept every certificate.
            sceHttpSetConnectTimeOut(tpl,15000000);sceHttpSetResolveTimeOut(tpl,10000000);
            sceHttpSetSendTimeOut(tpl,15000000);
            reinterpret_cast<int(*)(int,uint32_t)>(&sceHttpSetRecvTimeOut)(tpl,15000000);
            reinterpret_cast<int(*)(int,int)>(&sceHttpSetAutoRedirect)(tpl,0);
            int conn=sceHttpCreateConnectionWithURL(tpl,url.c_str(),false);
            int req=conn>=0?sceHttpCreateRequestWithURL(conn,ORBIS_METHOD_GET,url.c_str(),0):-1;
            auto cleanup=[&]{if(req>=0)sceHttpDeleteRequest(req);if(conn>=0)sceHttpDeleteConnection(conn);sceHttpDeleteTemplate(tpl);};
            if(req<0||sceHttpSendRequest(req,nullptr,0)<0){cleanup();error="Echec HTTPS / connexion Archive.org";return false;}
            int32_t status=0;sceHttpGetStatusCode(req,&status);
            if(status>=300&&status<400){char* h=nullptr;size_t n=0;
                std::string next;if(sceHttpGetAllResponseHeaders(req,&h,&n)>=0&&h)next=location(h,n);
                cleanup();if(next.empty()){error="Redirection sans adresse";return false;}
                if(next[0]=='/')next=url.substr(0,url.find('/',8))+next;url=next;continue;}
            if(status!=200){cleanup();error="Archive.org HTTP "+std::to_string(status);return false;}
            int32_t kind=0;size_t length=0;
            bool known=sceHttpGetResponseContentLength(req,&kind,&length)>=0&&length>0;
            if(known&&length>maxBytes){cleanup();error="Fichier trop volumineux pour ce prototype";return false;}
            uint8_t buffer[65536];bool ok=true;
            while(!exiting&&id==generation){int n=sceHttpReadData(req,buffer,sizeof(buffer));
                if(n<0){ok=false;break;}if(n==0)break;
                if(bytes.size()+size_t(n)>maxBytes){ok=false;break;}
                bytes.insert(bytes.end(),buffer,buffer+n);
                std::lock_guard<std::mutex> guard(lock);
                if(id==generation)message="Chargement : "+std::to_string(bytes.size()/1024)+" Ko";
            }
            cleanup();if(id!=generation||exiting)return false;
            if(!ok||bytes.empty()||(known&&bytes.size()!=length)){error="Telechargement incomplet";return false;}
            return true;
        }
        error="Trop de redirections";return false;
    }
};
static bool readFile(const std::string& path,std::vector<uint8_t>& bytes) {
    FILE*f=fopen(path.c_str(),"rb");if(!f)return false;uint8_t chunk[65536];bool ok=true;
    for(;;){size_t n=fread(chunk,1,sizeof(chunk),f);if(bytes.size()+n>maxBytes){ok=false;break;}
        bytes.insert(bytes.end(),chunk,chunk+n);if(n<sizeof(chunk)){ok=!ferror(f);break;}}
    fclose(f);return ok&&!bytes.empty();
}
static void loadLoop() {
    Network network;network.init();
    while(!exiting) {
        std::string src;unsigned id;
        {std::unique_lock<std::mutex> guard(lock);wake.wait(guard,[]{return exiting||!pending.empty();});
            if(exiting)break;src=pending;pending.clear();id=generation;}
        std::vector<uint8_t> bytes;std::string error;
        bool ok=src.compare(0,8,"https://")==0?network.fetch(src,bytes,id,error):readFile(src,bytes);
        std::vector<int16_t> decoded;
        if(ok&&id==generation&&!exiting) {
            drmp3 mp3{};
            if(drmp3_init_memory(&mp3,bytes.data(),bytes.size(),nullptr)) {
                // Bounded incremental decoding avoids allocating from an untrusted MP3 duration.
                std::vector<int16_t> source;int16_t block[4096*2];
                unsigned rate=mp3.sampleRate,channels=mp3.channels;
                if(channels>=1&&channels<=2&&rate>=8000&&rate<=192000){
                    for(;;){auto n=drmp3_read_pcm_frames_s16(&mp3,4096,block);if(!n)break;
                        if(exiting||id!=generation||source.size()+n*channels>uint64_t(rate)*channels*720||
                           (source.size()+n*channels)*sizeof(int16_t)>144*1024*1024){ok=false;break;}
                        source.insert(source.end(),block,block+n*channels);}
                    if(ok)decoded=toStereo48(source.data(),source.size()/channels,channels,rate);
                }
                drmp3_uninit(&mp3);
            }
            if(decoded.empty()){ok=false;error="MP3 invalide ou duree superieure a 12 minutes";}
        }
        {std::lock_guard<std::mutex> guard(lock);if(id!=generation)continue;
            busy=false;if(ok&&!decoded.empty()){samples=std::move(decoded);cursor=0;playing=true;message="Lecture";}
            else {message=error.empty()?"Fichier local inaccessible":error;playing=false;}}
    }
}
static void audioLoop() {
    while(!exiting) {
        int16_t block[512]={0};
        {std::lock_guard<std::mutex> guard(lock);
            if(playing){size_t n=std::min(size_t(512),samples.size()-cursor);
                std::copy_n(samples.data()+cursor,n,block);cursor+=n;
                if(cursor>=samples.size()){playing=false;message="Termine";}}}
        if(sceAudioOutOutput(port,block)<0){std::lock_guard<std::mutex> guard(lock);message="Erreur sortie audio";playing=false;sceKernelUsleep(20000);}
    }
    sceAudioOutOutput(port,nullptr);
}
bool init() {
    sceAudioOutInit();port=sceAudioOutOpen(ORBIS_USER_SERVICE_USER_ID_SYSTEM,ORBIS_AUDIO_OUT_PORT_TYPE_MAIN,0,256,48000,ORBIS_AUDIO_OUT_PARAM_FORMAT_S16_STEREO);
    if(port<0)return false;loader=std::thread(loadLoop);audio=std::thread(audioLoop);return true;
}
void open(const std::string& src){std::lock_guard<std::mutex> guard(lock);++generation;pending=src;busy=true;playing=false;cursor=0;samples.clear();message="Chargement";wake.notify_one();}
void toggle(){std::lock_guard<std::mutex> guard(lock);if(!samples.empty()&&!busy){if(cursor>=samples.size())cursor=0;playing=!playing;message=playing?"Lecture":"Pause";}}
void stop(){std::lock_guard<std::mutex> guard(lock);++generation;pending.clear();playing=false;busy=false;cursor=0;samples.clear();message="Arrete";}
void seek(int seconds){std::lock_guard<std::mutex> guard(lock);int64_t p=int64_t(cursor)+int64_t(seconds)*48000*2;cursor=size_t(std::max(int64_t(0),std::min(p,int64_t(samples.size()))));}
State state(){std::lock_guard<std::mutex> guard(lock);return {message,float(cursor)/96000,float(samples.size())/96000,playing,busy};}
void shutdown(){exiting=true;++generation;wake.notify_all();if(loader.joinable())loader.join();if(audio.joinable())audio.join();if(port>=0)sceAudioOutClose(port);}
}
