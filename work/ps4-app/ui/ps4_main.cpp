// Development entry point. The validated test4 entry point remains src/main.cpp.
#include "interface.h"
#include "ps4_video.h"
#include "player.h"
#include "local_store.h"
#include "settings.h"
#include "catalog.h"
#include <orbis/Pad.h>
#include <orbis/UserService.h>
#include <orbis/libkernel.h>
#include <cstdint>
#include <utility>
extern "C" { uint64_t sceLibcHeapSize=512*1024*1024; }
static int pad=-1,activeTrack=-1;
static uint32_t lastKey=LV_KEY_ENTER;
static uint32_t lastButtons=0;
static bool backRequested=false;
static bool toggleRequested=false,settingsRequested=false;
static int seekRequested=0;
static void input(lv_indev_t*,lv_indev_data_t* event) {
    OrbisPadData data{};uint32_t key=0;
    if(scePadReadState(pad,&data)>=0) {
        uint32_t pressed=data.buttons&~lastButtons;
        if(pressed&ORBIS_PAD_BUTTON_CIRCLE)backRequested=true;
        if(pressed&ORBIS_PAD_BUTTON_TRIANGLE)toggleRequested=true;
        if(pressed&ORBIS_PAD_BUTTON_OPTIONS)settingsRequested=true;
        if(pressed&ORBIS_PAD_BUTTON_L1)seekRequested-=10;
        if(pressed&ORBIS_PAD_BUTTON_R1)seekRequested+=10;
        lastButtons=data.buttons;
        if(data.buttons&ORBIS_PAD_BUTTON_CROSS)key=LV_KEY_ENTER;
        else if(data.buttons&(ORBIS_PAD_BUTTON_DOWN|ORBIS_PAD_BUTTON_RIGHT))key=LV_KEY_NEXT;
        else if(data.buttons&(ORBIS_PAD_BUTTON_UP|ORBIS_PAD_BUTTON_LEFT))key=LV_KEY_PREV;
    }
    if(key)lastKey=key;event->key=lastKey;event->state=key?LV_INDEV_STATE_PRESSED:LV_INDEV_STATE_RELEASED;
}
int main() {
    sceUserServiceInitialize(nullptr);scePadInit();int user=0;sceUserServiceGetInitialUser(&user);
    pad=scePadOpen(user,0,0,nullptr);if(pad<0)return 1;
    lv_init();if(!video::init())return 2;
    local::directory("/data/avant-usine-ps4");
    bool audioReady=player::init();
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
    actions.previous=[playTrack](){int total=int(sizeof(tracks)/sizeof(*tracks));playTrack(activeTrack<=0?total-1:activeTrack-1);};
    actions.volume=[](int percent){player::setVolume(float(percent)/100);};
    actions.hintsChanged=[](bool enabled){return writeHints("/data/avant-usine-ps4/settings.ini",enabled);};
    // The development build intentionally does not expose an unverified installer.
    if(!ui::create("/app0/ui/assets",std::move(actions),readHints("/data/avant-usine-ps4/settings.ini"))){player::shutdown();video::shutdown();return 3;}
    auto* keyboard=lv_indev_create();lv_indev_set_type(keyboard,LV_INDEV_TYPE_KEYPAD);
    lv_indev_set_read_cb(keyboard,input);lv_indev_set_group(keyboard,ui::navigationGroup());
    uint64_t previous=sceKernelGetProcessTime(),lastPlayback=0;
    while(video::healthy()) {
        if(lv_indev_get_group(keyboard)!=ui::navigationGroup())lv_indev_set_group(keyboard,ui::navigationGroup());
        uint64_t now=sceKernelGetProcessTime();uint32_t ms=uint32_t((now-previous)/1000);
        if(ms){lv_tick_inc(ms);previous+=uint64_t(ms)*1000;}
        if(now-lastPlayback>=100000){auto state=player::state();ui::setPlayback(activeTrack,state.position,state.duration,state.playing,audioReady?state.message:"Sortie audio indisponible");
            if(state.message=="Termine"&&!state.busy)next();lastPlayback=now;}
        lv_timer_handler();
        if(backRequested){backRequested=false;ui::back();}
        if(toggleRequested){toggleRequested=false;player::toggle();}
        if(settingsRequested){settingsRequested=false;ui::showSettings();}
        if(seekRequested){player::seek(seekRequested);seekRequested=0;}
        sceKernelUsleep(5000);
    }
    player::shutdown();video::shutdown();return 0;
}
