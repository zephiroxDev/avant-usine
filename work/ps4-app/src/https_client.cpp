#include "https_client.h"
#include <orbis/Net.h>
#include <orbis/Ssl.h>
#include <orbis/Http.h>
#include <orbis/Sysmodule.h>
#include <atomic>
#include <mutex>
#include <cctype>
namespace https {
struct Client::State {
    int pool=-1,ssl=-1,http=-1,active=-1;
    std::mutex mutex;
    std::atomic<bool> cancelled{false};
    bool attempted=false;
    bool init() {
        if(http>=0)return true;
        if(attempted)return false;attempted=true;
        sceSysmoduleLoadModuleInternal(ORBIS_SYSMODULE_INTERNAL_NET);
        sceSysmoduleLoadModuleInternal(ORBIS_SYSMODULE_INTERNAL_SSL);
        sceSysmoduleLoadModuleInternal(ORBIS_SYSMODULE_INTERNAL_HTTP);
        sceNetInit();pool=sceNetPoolCreate("AvantUsineServices",2*1024*1024,0);if(pool<0)return false;
        ssl=sceSslInit(2*1024*1024);if(ssl<0)return false;
        http=sceHttpInit(pool,ssl,2*1024*1024);return http>=0;
    }
    ~State(){if(http>=0)sceHttpTerm(http);if(ssl>=0)reinterpret_cast<void(*)(int)>(&sceSslTerm)(ssl);if(pool>=0)sceNetPoolDestroy(pool);}
};
static std::string location(const char* data,size_t size) {
    std::string headers(data,size);size_t pos=0;
    while(pos<headers.size()) {
        auto end=headers.find('\n',pos);if(end==std::string::npos)end=headers.size();
        auto line=headers.substr(pos,end-pos);auto colon=line.find(':');
        if(colon!=std::string::npos) {
            auto key=line.substr(0,colon);for(char& c:key)c=char(std::tolower(static_cast<unsigned char>(c)));
            if(key=="location") {
                auto begin=line.find_first_not_of(" \t",colon+1),last=line.find_last_not_of(" \t\r");
                if(begin!=std::string::npos&&last>=begin)return line.substr(begin,last-begin+1);
            }
        }
        pos=end+1;
    }
    return {};
}
Client::Client():state(new State){}
Client::~Client()=default;
void Client::cancel(){auto& s=*state;s.cancelled=true;std::lock_guard<std::mutex> guard(s.mutex);if(s.active>=0)sceHttpAbortRequest(s.active);}
bool Client::fetch(const std::string& initial,Purpose purpose,const Headers& headers,const std::string& body,
                   bool post,uint64_t limit,const Sink& sink,Result& result) {
    result={};auto& s=*state;
    if(!trusted(initial,purpose)||!limit||limit>512ULL*1024*1024||body.size()>1024*1024||!sink){result.error="Requête HTTPS invalide";return false;}
    for(const auto& h:headers)if(!validHeader(h.first,h.second)){result.error="En-tête HTTPS invalide";return false;}
    if(s.cancelled){result.error="Opération annulée";return false;}
    if(!s.init()){result.error="Service HTTPS indisponible";return false;}
    std::string url=initial;Headers outgoing=headers;
    for(int hop=0;hop<6&&!s.cancelled;++hop) {
        int tpl=sceHttpCreateTemplate(s.http,"AvantUsinePS4-native/1.0",ORBIS_HTTP_VERSION_1_1,1);
        if(tpl<0){result.error="Création HTTPS impossible";return false;}
        sceHttpSetConnectTimeOut(tpl,15000000);sceHttpSetResolveTimeOut(tpl,10000000);sceHttpSetSendTimeOut(tpl,15000000);
        reinterpret_cast<int(*)(int,uint32_t)>(&sceHttpSetRecvTimeOut)(tpl,15000000);
        reinterpret_cast<int(*)(int,int)>(&sceHttpSetAutoRedirect)(tpl,0);
        // Preserve the platform's TLS certificate and hostname verification.
        int connection=sceHttpCreateConnectionWithURL(tpl,url.c_str(),false);
        int request=connection>=0?sceHttpCreateRequestWithURL(connection,post?ORBIS_METHOD_POST:ORBIS_METHOD_GET,url.c_str(),post?body.size():0):-1;
        {std::lock_guard<std::mutex> guard(s.mutex);s.active=request;}
        auto cleanup=[&](){
            {std::lock_guard<std::mutex> guard(s.mutex);s.active=-1;if(request>=0)sceHttpDeleteRequest(request);}
            if(connection>=0)sceHttpDeleteConnection(connection);sceHttpDeleteTemplate(tpl);
        };
        if(s.cancelled){cleanup();break;}
        bool ok=request>=0;
        for(const auto& h:outgoing)if(ok)ok=sceHttpAddRequestHeader(request,h.first.c_str(),h.second.c_str(),0)>=0;
        if(!ok||sceHttpSendRequest(request,post?body.data():nullptr,post?body.size():0)<0){cleanup();result.error="Connexion HTTPS interrompue";return false;}
        int32_t status=0;if(sceHttpGetStatusCode(request,&status)<0){cleanup();result.error="Réponse HTTPS illisible";return false;}
        result.status=status;
        if(status>=300&&status<400) {
            char* raw=nullptr;size_t count=0;std::string next;
            if(!post&&sceHttpGetAllResponseHeaders(request,&raw,&count)>=0&&raw&&count<=65536)next=redirect(url,location(raw,count),purpose);
            cleanup();if(next.empty()){result.error="Redirection HTTPS refusée";return false;}
            if(host(url)!=host(next))outgoing.clear();url=next;continue;
        }
        if((!post&&status!=200)||(post&&(status<200||status>=300))){cleanup();result.error="Service HTTP "+std::to_string(status);return false;}
        int32_t kind=0;size_t length=0;bool known=sceHttpGetResponseContentLength(request,&kind,&length)>=0&&length>0;
        if(known&&length>limit){cleanup();result.error="Réponse trop volumineuse";return false;}
        uint8_t chunk[8192];
        while(ok&&!s.cancelled) {
            int n=sceHttpReadData(request,chunk,sizeof(chunk));if(n==0)break;
            if(n<0||uint64_t(n)>limit-result.bytes){ok=false;break;}
            if(!sink(chunk,size_t(n))){ok=false;break;}
            result.bytes+=uint64_t(n);
        }
        cleanup();
        if(s.cancelled){result.error="Opération annulée";return false;}
        if(!ok||(known&&result.bytes!=length)){result.error="Réponse incomplète ou écriture refusée";return false;}
        return true;
    }
    result.error=s.cancelled?"Opération annulée":"Trop de redirections HTTPS";return false;
}
}
