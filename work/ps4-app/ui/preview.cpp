// Runs the same native widgets as the PS4 port, without a browser or console APIs.
#include "interface.h"
#include <cstdio>
#include <cassert>
#include <cstdlib>
#include <vector>
#include <string>
static std::vector<unsigned char> pixels(1280*720*4);
static void require(bool condition) { if(!condition){fputs("Native preview check failed\n",stderr);std::abort();} }
static void flush(lv_display_t* display,const lv_area_t*,uint8_t*) { lv_display_flush_ready(display); }
static void capture(lv_display_t* display,const std::string& file) {
    lv_obj_update_layout(lv_screen_active());lv_refr_now(display);
    FILE* output=fopen(file.c_str(),"wb");require(output!=nullptr);
    require(fwrite(pixels.data(),1,pixels.size(),output)==pixels.size());require(fclose(output)==0);
}
int main(int argc,char** argv) {
    setvbuf(stdout,nullptr,_IONBF,0);
    require(argc==3);puts("Initialize LVGL");lv_init();auto* display=lv_display_create(1280,720);
    lv_display_set_color_format(display,LV_COLOR_FORMAT_XRGB8888);
    lv_display_set_buffers(display,pixels.data(),nullptr,pixels.size(),LV_DISPLAY_RENDER_MODE_FULL);
    lv_display_set_flush_cb(display,flush);
    int choice=-1;ui::Actions callbacks;callbacks.updateChoice=[&choice](int value){choice=value;};
    puts("Create native interface");require(ui::create(argv[1],callbacks));std::string out=argv[2];
    puts("Render home");
    capture(display,out+"/home.bgra");
    puts("Render collection");ui::showCollection();capture(display,out+"/collection.bgra");
    puts("Render album");ui::showAlbum(0);ui::setPlayback(0,43,180,true);capture(display,out+"/album.bgra");
    auto* mainGroup=ui::navigationGroup();
    puts("Render update");ui::showUpdate("1.0.1");require(ui::navigationGroup()!=mainGroup);capture(display,out+"/update.bgra");
    ui::back();require(ui::navigationGroup()==mainGroup);require(choice==0);
    puts("Native UI rendered: home, collection, album, update dialog.");
}
