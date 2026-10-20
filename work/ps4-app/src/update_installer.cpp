#include "update_installer.h"
#include <orbis/Bgft.h>
#include <orbis/UserService.h>
#include <orbis/libkernel.h>
#include <cstdio>
#include <cstdlib>
#include <cstring>
namespace updates {
struct Installer::State {
    int task=-1;
    bool initialized=false,appInitialized=false,started=false;
    void* heap=nullptr;
    std::string path,name;
    int(*appInit)()=nullptr;int(*appTerm)()=nullptr;
    int(*getTitle)(const char*,char*,int32_t*)=nullptr;
    int(*bgftInit)(OrbisBgftInitParams*)=nullptr;int(*bgftTerm)()=nullptr;
    int(*registerTask)(OrbisBgftDownloadParamEx*,int*)=nullptr;
    int(*startTask)(int)=nullptr;int(*unregisterTask)(int)=nullptr;
    ~State(){cancel();if(initialized&&bgftTerm)bgftTerm();if(appInitialized&&appTerm)appTerm();if(heap)std::free(heap);}
    void cancel(){if(task>=0&&!started&&unregisterTask)unregisterTask(task);task=-1;}
};
static int load(const char* name) {
    char path[256];snprintf(path,sizeof(path),"/system/common/lib/%s",name);
    int handle=sceKernelLoadStartModule(path,0,nullptr,0,nullptr,nullptr);
    if(handle<0){const char* sandbox=sceKernelGetFsSandboxRandomWord();if(sandbox&&sandbox[0]){
        snprintf(path,sizeof(path),"/%s/common/lib/%s",sandbox,name);handle=sceKernelLoadStartModule(path,0,nullptr,0,nullptr,nullptr);}}
    return handle;
}
template<class T> static bool symbol(int module,const char* name,T& target) {
    void* address=nullptr;if(sceKernelDlsym(module,name,&address)<0||!address)return false;
    target=reinterpret_cast<T>(address);return true;
}
static std::string failure(const char* operation,int code) {
    char message[160];snprintf(message,sizeof(message),"%s : code PS4 0x%08x. L’application reste ouverte.",operation,unsigned(code));return message;
}
Installer::Installer():state(new State){}
Installer::~Installer()=default;
void Installer::cancelPrepared(){state->cancel();}
bool Installer::prepare(const std::string& path,const std::string& version,std::string& error) {
    auto& s=*state;error.clear();s.cancel();
    if(s.started){error="Installation déjà transmise à la console";return false;}
    if(!s.initialized) {
        // Lazy loading avoids adding privileged dependencies to application startup.
        int system=load("libSceSystemService.sprx"),app=system>=0?load("libSceAppInstUtil.sprx"):-1;
        int utility=app>=0?load("libSceSysUtil.sprx"):-1,bgft=utility>=0?load("libSceBgft.sprx"):-1;
        if(bgft<0||!symbol(app,"sceAppInstUtilInitialize",s.appInit)||!symbol(app,"sceAppInstUtilTerminate",s.appTerm)||
           !symbol(app,"sceAppInstUtilGetTitleIdFromPkg",s.getTitle)||!symbol(bgft,"sceBgftServiceIntInit",s.bgftInit)||
           !symbol(bgft,"sceBgftServiceIntTerm",s.bgftTerm)||!symbol(bgft,"sceBgftServiceIntDownloadRegisterTaskByStorageEx",s.registerTask)||
           !symbol(bgft,"sceBgftServiceIntDownloadStartTask",s.startTask)||!symbol(bgft,"sceBgftServiceIntDownloadUnregisterTask",s.unregisterTask)){
            error="Installateur PS4 indisponible. Aucune fermeture effectuée.";return false;
        }
        int rc=0;if(!s.appInitialized){rc=s.appInit();if(rc!=0){error=failure("Initialisation installateur",rc);return false;}s.appInitialized=true;}
        if(!s.heap)s.heap=std::calloc(1,1024*1024);
        if(!s.heap){error="Mémoire insuffisante pour préparer l’installation";return false;}
        OrbisBgftInitParams init{};init.heap=s.heap;init.heapSize=1024*1024;
        rc=s.bgftInit(&init);if(rc!=0){error=failure("Préparation de l’installation",rc);return false;}s.initialized=true;
    }
    char title[16]={0};int32_t isApp=0;int rc=s.getTitle(path.c_str(),title,&isApp);
    if(rc!=0||isApp==0||std::strcmp(title,"ALUS00001")!=0){error="Le paquet ne correspond pas à Avant l’usine PS4";return false;}
    s.path=path;s.name="Avant l’usine "+version;
    int user=0;sceUserServiceGetInitialUser(&user);
    OrbisBgftDownloadParamEx params{};
    params.params.userId=user;params.params.entitlementType=5;params.params.id="";
    params.params.contentUrl=s.path.c_str();params.params.contentExUrl="";params.params.contentName=s.name.c_str();
    params.params.iconPath="/app0/sce_sys/icon0.png";params.params.skuId="";
    params.params.option=ORBIS_BGFT_TASK_OPT_NONE; // Keep system UI/confirmations; never force overwrite.
    params.params.playgoScenarioId="0";params.params.releaseDate="";params.params.packageType="";params.params.packageSubType="";
    rc=s.registerTask(&params,&s.task);
    if(rc!=0){s.task=-1;error=failure("Enregistrement de la mise à jour",rc);return false;}
    return true;
}
bool Installer::start(std::string& error) {
    auto& s=*state;if(s.task<0||s.started){error="Aucune installation préparée";return false;}
    int rc=s.startTask(s.task);
    if(rc!=0){error=failure("Installation refusée",rc);s.cancel();return false;}
    s.started=true;return true;
}
}
