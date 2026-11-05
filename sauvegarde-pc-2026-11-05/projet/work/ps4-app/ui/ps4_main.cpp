// Development entry point. The validated test4 entry point remains src/main.cpp.
#include "interface.h"
#include "ps4_video.h"
#include "player.h"
#include "local_store.h"
#include "settings.h"
#include "catalog.h"
#include "update_service.h"
#include "alus_build_version.h"
#include "lyrics_service.h"
#include "public_backend_config.h"
#include "account_service.h"
#include "local_service.h"
#include <algorithm>
#include <cstdio>
#include <orbis/Pad.h>
#include <orbis/UserService.h>
#include <orbis/libkernel.h>
#include <cstdint>
#include <utility>
#include <cstdlib>
extern "C" { uint64_t sceLibcHeapSize=512*1024*1024; }
static int pad=-1,activeTrack=-1,currentVolume=100;
static uint32_t lastButtons=0;
static uint32_t heldDirection=0;
static uint64_t repeatAt=0,volumeAt=0;
static void pollController() {
    OrbisPadData data{};
    if(scePadReadState(pad,&data)<0||!data.connected){lastButtons=0;heldDirection=0;return;}
    uint64_t now=sceKernelGetProcessTime()/1000;
    uint32_t buttons=data.buttons;
    int x=int(data.leftStick.x)-128,y=int(data.leftStick.y)-128;
    if(std::abs(x)>55||std::abs(y)>55) {
        if(std::abs(x)>std::abs(y))buttons|=x<0?ORBIS_PAD_BUTTON_LEFT:ORBIS_PAD_BUTTON_RIGHT;
        else buttons|=y<0?ORBIS_PAD_BUTTON_UP:ORBIS_PAD_BUTTON_DOWN;
    }
    uint32_t pressed=buttons&~lastButtons;lastButtons=buttons;
    uint32_t direction=buttons&(ORBIS_PAD_BUTTON_LEFT|ORBIS_PAD_BUTTON_RIGHT|ORBIS_PAD_BUTTON_UP|ORBIS_PAD_BUTTON_DOWN);
    if(direction&&(direction!=heldDirection||now>=repeatAt)) {
        ui::moveFocus(direction&ORBIS_PAD_BUTTON_LEFT?ui::Direction::Left:direction&ORBIS_PAD_BUTTON_RIGHT?ui::Direction::Right:direction&ORBIS_PAD_BUTTON_UP?ui::Direction::Up:ui::Direction::Down);
        repeatAt=now+(direction==heldDirection?110:350);
    }
    heldDirection=direction;
    if(ui::textEntryActive()) {
        if(pressed&ORBIS_PAD_BUTTON_CIRCLE)ui::back();
        else if(pressed&ORBIS_PAD_BUTTON_OPTIONS)ui::finishTextEntry();
        else if(pressed&ORBIS_PAD_BUTTON_CROSS)ui::activateFocused();
        return;
    }
    if(pressed&ORBIS_PAD_BUTTON_CIRCLE)ui::back();
    else if(pressed&ORBIS_PAD_BUTTON_OPTIONS)ui::showSettings();
    else if(pressed&ORBIS_PAD_BUTTON_TOUCH_PAD)ui::showMenu();
    else if(pressed&ORBIS_PAD_BUTTON_SQUARE)ui::showCollection();
    else if(pressed&ORBIS_PAD_BUTTON_CROSS)ui::activateFocused();
    if(pressed&ORBIS_PAD_BUTTON_TRIANGLE)player::toggle();
    if(pressed&ORBIS_PAD_BUTTON_L1)ui::stepTrack(-1);
    if(pressed&ORBIS_PAD_BUTTON_R1)ui::stepTrack(1);
    if(pressed&ORBIS_PAD_BUTTON_L2)player::seek(-10);
    if(pressed&ORBIS_PAD_BUTTON_R2)player::seek(10);
    int volume=int(data.rightStick.y)-128;
    if(std::abs(volume)>65&&now>=volumeAt){ui::adjustVolume(volume<0?5:-5);volumeAt=now+130;}
}
int main() {
    sceUserServiceInitialize(nullptr);scePadInit();int user=0;sceUserServiceGetInitialUser(&user);
    pad=scePadOpen(user,0,0,nullptr);if(pad<0)return 1;
    lv_init();if(!video::init())return 2;
    if(!local::applicationDirectory("/data/avant-usine-ps4"))fprintf(stderr,"Application data directory is not browsable\n");
    bool audioReady=player::init();
    updates::Service updater("/data/avant-usine-ps4",ALUS_VERSION);
    lyrics::Service lyricService;
    account::Service accounts("/data/avant-usine-ps4/account-refresh");accounts.restore();
    local::Service localFiles("/data/avant-usine-ps4/local");
    local::View localState;unsigned localRevision=0;
    std::string localTitle,localPath;std::vector<local::Entry> localQueue;int localIndex=-1;
    auto mp3=[](std::string name){for(char& c:name)if(c>='A'&&c<='Z')c+=32;return name.size()>4&&name.substr(name.size()-4)==".mp3";};
    ui::Actions actions;
    auto playTrack=[audioReady,&localTitle,&localPath,&localIndex](int index){
        if(audioReady&&index>=0&&index<int(sizeof(tracks)/sizeof(*tracks))) {
            localTitle.clear();localPath.clear();localIndex=-1;
            if(activeTrack==index)player::toggle();else {activeTrack=index;player::open(tracks[index].url);}
        }
    };
    actions.play=playTrack;
    actions.toggle=[audioReady](){if(audioReady)player::toggle();};
    auto step=[&](int direction){
        if(!localTitle.empty()&&!localQueue.empty()&&localIndex>=0){
            int n=int(localQueue.size());localIndex=(localIndex+direction+n)%n;
            const auto& entry=localQueue[size_t(localIndex)];localPath=entry.path;localTitle=local::displayName(entry.name);player::open(localPath);return;
        }
        int n=int(sizeof(tracks)/sizeof(*tracks));playTrack(activeTrack<0?(direction<0?n-1:0):(activeTrack+direction+n)%n);
    };
    auto next=[&](){step(1);};actions.next=next;
    actions.previous=[&](){step(-1);};
    actions.seek=[](int seconds){player::seek(seconds);};
    actions.seekTo=[](double seconds){player::seekTo(seconds);if(!player::state().playing)player::toggle();};
    actions.signIn=[&](std::string email,std::string password){accounts.signIn(std::move(email),std::move(password));};
    actions.signOut=[&](){accounts.signOut();};
    actions.localBrowse=[&](int source){localFiles.browse(source);};
    actions.localParent=[&](){localFiles.parent();};
    actions.localSelect=[&](size_t index,unsigned revision){
        if(localState.revision!=revision||index>=localState.entries.size()||localState.busy)return;
        const auto& entry=localState.entries[index];
        if(entry.directory||!localState.library){localFiles.select(index,revision);return;}
        if(!mp3(entry.name)){ui::setLocalNotice("Ce lecteur prend actuellement en charge les fichiers MP3.");return;}
        if(!audioReady)return;
        if(localPath==entry.path){player::toggle();return;}
        localQueue.clear();for(const auto& item:localState.entries)if(!item.directory&&mp3(item.name))localQueue.push_back(item);
        localIndex=0;for(size_t i=0;i<localQueue.size();++i)if(localQueue[i].path==entry.path)localIndex=int(i);
        activeTrack=-1;localPath=entry.path;localTitle=local::displayName(entry.name);player::open(localPath);
    };
    actions.volume=[](int percent){currentVolume=percent;player::setVolume(float(percent)/100);};
    actions.hintsChanged=[](bool enabled){return writeHints("/data/avant-usine-ps4/settings.ini",enabled);};
    actions.immersionColorChanged=[](uint32_t color){return writeImmersionColor("/data/avant-usine-ps4/immersion-color.ini",color);};
    actions.checkUpdates=[&](){updater.check();};
    actions.updateChoice=[&](int choice){updater.choose(choice,sceKernelGetProcessTime()/1000);};
    actions.readyChoice=[&](int choice){updater.readyChoice(choice,sceKernelGetProcessTime()/1000);};
    if(!ui::create("/app0/ui/assets",std::move(actions),readHints("/data/avant-usine-ps4/settings.ini"))){player::shutdown();video::shutdown();return 3;}
    ui::setApplicationVersion(ALUS_BUILD_VERSION);
    ui::setImmersionColor(readImmersionColor("/data/avant-usine-ps4/immersion-color.ini"));
    int savedTrack=-1;float savedPosition=0;
    if(readUpdateSession("/data/avant-usine-ps4/update-session.ini",savedTrack,savedPosition,currentVolume)){
        player::setVolume(float(currentVolume)/100);ui::setVolumeLevel(currentVolume);
    }
    updater.start();
    uint64_t previous=sceKernelGetProcessTime(),lastPlayback=0;
    updates::Phase displayedPhase=updates::Phase::Idle;
    int requestedLyrics=-1;unsigned lyricRevision=0;
    unsigned accountRevision=0;
    uint64_t metricsStarted=previous,handlerTotal=0,handlerMaximum=0,loopCount=0;
    auto previousMetrics=video::metrics();
    while(video::healthy()) {
        uint64_t now=sceKernelGetProcessTime();uint32_t ms=uint32_t((now-previous)/1000);
        if(ms){lv_tick_inc(ms);previous+=uint64_t(ms)*1000;}
        if(now-lastPlayback>=33000){auto state=player::state();ui::setPlayback(activeTrack,state.position,state.duration,state.playing,audioReady?state.message:"Sortie audio indisponible");
            if(!localTitle.empty())ui::setLocalTitle(localTitle);
            if(state.message=="Termine"&&!state.busy)next();lastPlayback=now;}
        if(activeTrack>=0&&requestedLyrics!=activeTrack){requestedLyrics=activeTrack;lyricService.request(public_backend::trackKeys[activeTrack]);}
        auto lyricState=lyricService.snapshot();
        if(lyricState.revision!=lyricRevision){lyricRevision=lyricState.revision;ui::setLyrics(requestedLyrics,lyricState.document,lyricState.message);}
        local::View changedLocal;if(localFiles.changed(localRevision,changedLocal)){localRevision=changedLocal.revision;localState=changedLocal;ui::setLocal(std::move(changedLocal));}
        auto accountState=accounts.tick(now/1000);
        if(accountState.revision!=accountRevision){accountRevision=accountState.revision;ui::setAccount(accountState);}
        pollController();
        uint64_t handlerStarted=sceKernelGetProcessTime();
        lv_timer_handler();
        uint64_t handlerElapsed=sceKernelGetProcessTime()-handlerStarted;
        handlerTotal+=handlerElapsed;handlerMaximum=std::max(handlerMaximum,handlerElapsed);++loopCount;
        if(now-metricsStarted>=10000000) {
            auto measured=video::metrics();
            FILE* diagnostics=fopen("/data/avant-usine-ps4/performance.json.tmp","wb");
            if(diagnostics){fprintf(diagnostics,"{\"build\":\"%s\",\"windowUs\":%llu,\"inputPolls\":%llu,\"presentedFrames\":%llu,\"handlerTotalUs\":%llu,\"handlerMaxUs\":%llu,\"presentTotalUs\":%llu,\"presentLifetimeMaxUs\":%llu,\"idleFramesAreNotRedrawn\":true}\n",ALUS_BUILD_VERSION,
                (unsigned long long)(now-metricsStarted),(unsigned long long)loopCount,(unsigned long long)(measured.presented-previousMetrics.presented),
                (unsigned long long)handlerTotal,(unsigned long long)handlerMaximum,(unsigned long long)(measured.totalPresentUs-previousMetrics.totalPresentUs),(unsigned long long)measured.maxPresentUs);
                if(fclose(diagnostics)==0)rename("/data/avant-usine-ps4/performance.json.tmp","/data/avant-usine-ps4/performance.json");}
            metricsStarted=now;handlerTotal=handlerMaximum=loopCount=0;previousMetrics=measured;
        }
        auto update=updater.tick(sceKernelGetProcessTime()/1000);
        using updates::Phase;
        if(update.phase==Phase::Offered&&displayedPhase!=Phase::Offered&&!ui::textEntryActive())ui::showUpdate(update.version);
        if(update.phase==Phase::Countdown||update.phase==Phase::HandingOff)ui::showUpdateReady(update.version,update.seconds,update.phase==Phase::HandingOff);
        if(update.phase==Phase::Error&&displayedPhase!=Phase::Error&&update.notify)ui::showUpdateNotice(update.message);
        if(update.phase==Phase::Idle&&displayedPhase==Phase::Checking&&update.notify)ui::showUpdateNotice(update.message);
        int percent=-1;std::string updateMessage=update.message;
        if(update.phase==Phase::Downloading){percent=update.total?int(update.received*100/update.total):0;updateMessage="Téléchargement de la mise à jour : "+std::to_string(percent)+" %";}
        if(update.phase==Phase::Deferred)updateMessage="Décision reportée. Cette version sera proposée de nouveau plus tard.";
        if(update.phase==Phase::Countdown)updateMessage="Mise à jour "+update.version+" prête.";
        ui::setUpdateStatus(updateMessage,percent);
        if(update.needsSave){auto audio=player::state();
            bool saved=writeUpdateSession("/data/avant-usine-ps4/update-session.ini",activeTrack,audio.position,currentVolume);
            updater.authorizeHandoff(saved);
        }
        if(update.phase!=Phase::Offered||!ui::textEntryActive())displayedPhase=update.phase;
        if(update.phase==Phase::CloseApproved)break;
        sceKernelUsleep(5000);
    }
    player::shutdown();video::shutdown();return 0;
}
