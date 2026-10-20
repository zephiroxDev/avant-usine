// Development entry point. The validated test4 entry point remains src/main.cpp.
#include "interface.h"
#include "ps4_video.h"
#include "player.h"
#include "local_store.h"
#include "settings.h"
#include "catalog.h"
#include "update_service.h"
#include "alus_build_version.h"
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
    if(scePadReadState(pad,&data)<0){lastButtons=0;heldDirection=0;return;}
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
    if(pressed&ORBIS_PAD_BUTTON_CIRCLE)ui::back();
    else if(pressed&ORBIS_PAD_BUTTON_OPTIONS)ui::showSettings();
    else if(pressed&ORBIS_PAD_BUTTON_SQUARE)ui::showCollection();
    else if(pressed&ORBIS_PAD_BUTTON_CROSS)ui::activateFocused();
    if(pressed&ORBIS_PAD_BUTTON_TRIANGLE)player::toggle();
    if(pressed&ORBIS_PAD_BUTTON_L1){int n=int(sizeof(tracks)/sizeof(*tracks));int index=activeTrack<=0?n-1:activeTrack-1;activeTrack=index;player::open(tracks[index].url);}
    if(pressed&ORBIS_PAD_BUTTON_R1){activeTrack=(activeTrack+1)%int(sizeof(tracks)/sizeof(*tracks));player::open(tracks[activeTrack].url);}
    if(pressed&ORBIS_PAD_BUTTON_L2)player::seek(-10);
    if(pressed&ORBIS_PAD_BUTTON_R2)player::seek(10);
    int volume=int(data.rightStick.y)-128;
    if(std::abs(volume)>65&&now>=volumeAt){ui::adjustVolume(volume<0?5:-5);volumeAt=now+130;}
}
int main() {
    sceUserServiceInitialize(nullptr);scePadInit();int user=0;sceUserServiceGetInitialUser(&user);
    pad=scePadOpen(user,0,0,nullptr);if(pad<0)return 1;
    lv_init();if(!video::init())return 2;
    local::directory("/data/avant-usine-ps4");
    bool audioReady=player::init();
    updates::Service updater("/data/avant-usine-ps4",ALUS_VERSION);
    ui::Actions actions;
    auto playTrack=[audioReady](int index){
        if(audioReady&&index>=0&&index<int(sizeof(tracks)/sizeof(*tracks))) {
            if(activeTrack==index)player::toggle();else {activeTrack=index;player::open(tracks[index].url);}
        }
    };
    actions.play=playTrack;
    actions.toggle=[audioReady](){if(audioReady)player::toggle();};
    auto next=[playTrack](){playTrack((activeTrack+1)%int(sizeof(tracks)/sizeof(*tracks)));};
    actions.next=next;
    actions.seek=[](int seconds){player::seek(seconds);};
    actions.previous=[playTrack](){int total=int(sizeof(tracks)/sizeof(*tracks));playTrack(activeTrack<=0?total-1:activeTrack-1);};
    actions.volume=[](int percent){currentVolume=percent;player::setVolume(float(percent)/100);};
    actions.hintsChanged=[](bool enabled){return writeHints("/data/avant-usine-ps4/settings.ini",enabled);};
    actions.checkUpdates=[&](){updater.check();};
    actions.updateChoice=[&](int choice){updater.choose(choice,sceKernelGetProcessTime()/1000);};
    actions.readyChoice=[&](int choice){updater.readyChoice(choice,sceKernelGetProcessTime()/1000);};
    if(!ui::create("/app0/ui/assets",std::move(actions),readHints("/data/avant-usine-ps4/settings.ini"))){player::shutdown();video::shutdown();return 3;}
    ui::setApplicationVersion(ALUS_BUILD_VERSION);
    int savedTrack=-1;float savedPosition=0;
    if(readUpdateSession("/data/avant-usine-ps4/update-session.ini",savedTrack,savedPosition,currentVolume)){
        player::setVolume(float(currentVolume)/100);ui::setVolumeLevel(currentVolume);
    }
    updater.start();
    uint64_t previous=sceKernelGetProcessTime(),lastPlayback=0;
    updates::Phase displayedPhase=updates::Phase::Idle;
    while(video::healthy()) {
        uint64_t now=sceKernelGetProcessTime();uint32_t ms=uint32_t((now-previous)/1000);
        if(ms){lv_tick_inc(ms);previous+=uint64_t(ms)*1000;}
        if(now-lastPlayback>=100000){auto state=player::state();ui::setPlayback(activeTrack,state.position,state.duration,state.playing,audioReady?state.message:"Sortie audio indisponible");
            if(state.message=="Termine"&&!state.busy)next();lastPlayback=now;}
        pollController();
        lv_timer_handler();
        auto update=updater.tick(sceKernelGetProcessTime()/1000);
        using updates::Phase;
        if(update.phase==Phase::Offered&&displayedPhase!=Phase::Offered)ui::showUpdate(update.version);
        if(update.phase==Phase::Countdown||update.phase==Phase::HandingOff)ui::showUpdateReady(update.version,update.seconds,update.phase==Phase::HandingOff);
        if(update.phase==Phase::Error&&displayedPhase!=Phase::Error&&update.notify)ui::showUpdateNotice(update.message);
        if(update.phase==Phase::Idle&&displayedPhase==Phase::Checking&&update.notify)ui::showUpdateNotice(update.message);
        int percent=-1;std::string updateMessage=update.message;
        if(update.phase==Phase::Downloading){percent=update.total?int(update.received*100/update.total):0;updateMessage="TÃ©lÃ©chargement de la mise Ã  jour : "+std::to_string(percent)+" %";}
        if(update.phase==Phase::Deferred)updateMessage="DÃ©cision reportÃ©e. Cette version sera proposÃ©e de nouveau plus tard.";
        if(update.phase==Phase::Countdown)updateMessage="Mise Ã  jour "+update.version+" prÃªte.";
        ui::setUpdateStatus(updateMessage,percent);
        if(update.needsSave){auto audio=player::state();
            bool saved=writeUpdateSession("/data/avant-usine-ps4/update-session.ini",activeTrack,audio.position,currentVolume);
            updater.authorizeHandoff(saved);
        }
        displayedPhase=update.phase;
        if(update.phase==Phase::CloseApproved)break;
        sceKernelUsleep(5000);
    }
    player::shutdown();video::shutdown();return 0;
}
