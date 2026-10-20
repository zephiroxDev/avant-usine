// Runs the same native widgets as the PS4 port, without a browser or console APIs.
#include "interface.h"
#include <cstdio>
#include <cassert>
#include <cstdlib>
#include <vector>
#include <string>
static std::vector<unsigned char> pixels(1280*720*4);
static unsigned flushes=0;
static void requireAt(bool condition,int line) { if(!condition){fprintf(stderr,"Native preview check failed at line %d\n",line);std::abort();} }
#define require(condition) requireAt((condition),__LINE__)
static void flush(lv_display_t* display,const lv_area_t*,uint8_t*) {++flushes;lv_display_flush_ready(display);}
static void capture(lv_display_t* display,const std::string& file) {
    lv_obj_update_layout(lv_screen_active());lv_refr_now(display);
    FILE* output=fopen(file.c_str(),"wb");require(output!=nullptr);
    require(fwrite(pixels.data(),1,pixels.size(),output)==pixels.size());require(fclose(output)==0);
}
int main(int argc,char** argv) {
    setvbuf(stdout,nullptr,_IONBF,0);
    require(argc==3);puts("Initialize LVGL");lv_init();auto* display=lv_display_create(1280,720);
    lv_display_set_color_format(display,LV_COLOR_FORMAT_XRGB8888);
    lv_display_set_buffers(display,pixels.data(),nullptr,pixels.size(),LV_DISPLAY_RENDER_MODE_DIRECT);
    lv_display_set_flush_cb(display,flush);
    int choice=-1,readyChoice=-1;ui::Actions callbacks;callbacks.updateChoice=[&choice](int value){choice=value;};
    double selectedTime=-1;callbacks.seekTo=[&selectedTime](double time){selectedTime=time;};
    callbacks.readyChoice=[&readyChoice](int value){readyChoice=value;};
    puts("Create native interface");require(ui::create(argv[1],callbacks));std::string out=argv[2];
    puts("Render home");
    capture(display,out+"/home.bgra");
    puts("Check controller navigation and activation");
    ui::showCollection();auto* first=lv_group_get_focused(ui::navigationGroup());require(first!=nullptr);
    ui::moveFocus(ui::Direction::Right);auto* second=lv_group_get_focused(ui::navigationGroup());require(second!=first);
    ui::moveFocus(ui::Direction::Down);auto* below=lv_group_get_focused(ui::navigationGroup());require(below!=second);
    ui::activateFocused(); // Opens the volume selected in the second row.
    ui::back();require(lv_group_get_focused(ui::navigationGroup())!=nullptr);
    puts("Render collection");ui::showCollection();capture(display,out+"/collection.bgra");
    puts("Render album");ui::showAlbum(0);ui::setPlayback(0,43,180,true);capture(display,out+"/album.bgra");
    puts("Check long album scrolling");
    for(int i=0;i<10;++i)ui::moveFocus(ui::Direction::Down);
    auto* selected=lv_group_get_focused(ui::navigationGroup());require(selected!=nullptr);
    lv_area_t selectedArea;lv_obj_get_coords(selected,&selectedArea);require(selectedArea.y1>=103&&selectedArea.y2<=582);
    ui::showAlbum(0);ui::setUpdateStatus("Vérification terminée");lv_refr_now(display);
    unsigned stableFlushes=flushes;
    for(int i=0;i<20;++i){ui::setPlayback(0,43,180,true);ui::setUpdateStatus("Vérification terminée");lv_refr_now(display);}
    require(flushes==stableFlushes);puts("Repeated unchanged playback and update state cause zero redraws");
    puts("Render timed lyrics with overlapping backing voice");
    auto lyricDocument=std::make_shared<lyrics::Document>();std::string error;
    require(lyrics::parse(R"({"duration":180,"sync_mode":"highlight","tracks":[{"id":"main","kind":"main"},{"id":"back","kind":"back"}],"lines":["Une phrase de démonstration","Une seconde phrase","Une voix en arrière-plan"],"times":[40,45,42],"line_ends":[46,50,44],"line_tracks":["main","main","back"],"curves":[[[0,40],[27,46]],[[0,45],[18,50]],[[0,42],[24,44]]]})",*lyricDocument,error));
    ui::setLyrics(0,lyricDocument,"");ui::showLyrics();ui::setPlayback(0,43,180,true);capture(display,out+"/lyrics.bgra");
    stableFlushes=flushes;for(int i=0;i<20;++i){ui::setPlayback(0,43,180,true);lv_refr_now(display);}require(flushes==stableFlushes);
    ui::moveFocus(ui::Direction::Down);ui::activateFocused();require(selectedTime==42);
    ui::showAlbum(0);
    puts("Render native account and controller keyboard");
    ui::showAccount();capture(display,out+"/account.bgra");
    auto* accountGroup=ui::navigationGroup();ui::activateFocused();require(ui::textEntryActive()&&ui::navigationGroup()!=accountGroup);
    ui::moveFocus(ui::Direction::Right);ui::activateFocused();capture(display,out+"/keyboard.bgra");
    ui::finishTextEntry();require(!ui::textEntryActive()&&ui::navigationGroup()==accountGroup);
    puts("Render native Local file browser");
    local::View localFiles;localFiles.path="/data/avant-usine-ps4/local";localFiles.library=true;
    localFiles.entries.push_back({"01 - Exemple.mp3","/data/avant-usine-ps4/local/01 - Exemple.mp3",false,1000});
    ui::setLocal(std::move(localFiles));ui::showLocal();capture(display,out+"/local.bgra");
    ui::showMenu();capture(display,out+"/menu.bgra");
    ui::showAlbum(0);
    auto* mainGroup=ui::navigationGroup();
    puts("Render update");ui::showUpdate("1.0.1");require(ui::navigationGroup()!=mainGroup);capture(display,out+"/update.bgra");
    ui::back();require(ui::navigationGroup()==mainGroup);require(choice==0);
    ui::showUpdate("1.0.1");ui::moveFocus(ui::Direction::Right);ui::activateFocused();require(choice==2&&ui::navigationGroup()==mainGroup);choice=0;
    ui::setUpdateStatus("Téléchargement de la mise à jour : 42 %",42);capture(display,out+"/download.bgra");
    ui::setUpdateStatus("Mise à jour 1.0.1 prête.");
    ui::showUpdateReady("1.0.1",10);capture(display,out+"/countdown.bgra");ui::back();require(readyChoice==0);require(ui::navigationGroup()==mainGroup);
    ui::showUpdateReady("1.0.1",0,true);ui::back();require(ui::navigationGroup()!=mainGroup);
    ui::setUpdateStatus("L’installateur PS4 a refusé la mise à jour.");
    ui::showUpdateNotice("L’installateur PS4 a refusé la mise à jour. L’application reste ouverte.");capture(display,out+"/installer-error.bgra");
    ui::back();require(ui::navigationGroup()==mainGroup);require(choice==0&&readyChoice==0);
    puts("Native UI rendered: home, collection, album, update dialog.");
}
