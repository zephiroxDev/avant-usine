#include "interface.h"
#include "catalog.h"
#include <cstdio>
#include <cstdint>
#include <vector>
#include <utility>
namespace ui {
static constexpr uint32_t PAPER=0x151316,INK=0xf5eff3,MUTED=0xb6a9b3,PINK=0xe4a5d1,SURFACE=0x211c23;
static lv_obj_t *content,*dockTitle,*dockSubtitle,*progress,*clockLabel,*playButtonLabel;
static lv_group_t* group;
static lv_font_t *normal,*large,*heading;
static std::vector<unsigned char> fontBytes;
static std::string assets;
static Actions actions;
static int activeTrack=-1;
static lv_obj_t* panel(lv_obj_t* parent,int w,int h,uint32_t color,int radius=12) {
    auto* o=lv_obj_create(parent);lv_obj_remove_style_all(o);lv_obj_set_size(o,w,h);
    lv_obj_set_style_bg_color(o,lv_color_hex(color),0);lv_obj_set_style_bg_opa(o,LV_OPA_COVER,0);
    lv_obj_set_style_radius(o,radius,0);lv_obj_remove_flag(o,LV_OBJ_FLAG_SCROLLABLE);return o;
}
static lv_obj_t* label(lv_obj_t* parent,const std::string& text,int x,int y,int width,const lv_font_t* font=nullptr,uint32_t color=INK) {
    auto* l=lv_label_create(parent);lv_label_set_text(l,text.c_str());lv_obj_set_pos(l,x,y);lv_obj_set_width(l,width);
    lv_obj_set_style_text_color(l,lv_color_hex(color),0);lv_obj_set_style_text_font(l,font?font:normal,0);
    lv_label_set_long_mode(l,LV_LABEL_LONG_DOT);return l;
}
static lv_obj_t* button(lv_obj_t* parent,const std::string& title,int x,int y,int w,int h,lv_event_cb_t callback,void* data=nullptr) {
    auto* b=lv_button_create(parent);lv_obj_remove_style_all(b);lv_obj_set_pos(b,x,y);lv_obj_set_size(b,w,h);
    lv_obj_set_style_bg_color(b,lv_color_hex(0x2c252f),0);lv_obj_set_style_bg_opa(b,LV_OPA_COVER,0);lv_obj_set_style_radius(b,9,0);
    lv_obj_set_style_outline_color(b,lv_color_hex(PINK),LV_STATE_FOCUSED);lv_obj_set_style_outline_width(b,2,LV_STATE_FOCUSED);
    lv_obj_set_style_outline_pad(b,3,LV_STATE_FOCUSED);lv_obj_remove_flag(b,LV_OBJ_FLAG_SCROLLABLE);
    auto* l=label(b,title,12,0,w-24);lv_obj_align(l,LV_ALIGN_CENTER,0,0);
    lv_obj_add_event_cb(b,callback,LV_EVENT_CLICKED,data);lv_group_add_obj(group,b);return b;
}
static void clearContent() { lv_obj_clean(content);lv_obj_scroll_to_y(content,0,LV_ANIM_OFF); }
static void albumEvent(lv_event_t* e) { showAlbum(int(reinterpret_cast<intptr_t>(lv_event_get_user_data(e)))); }
static void trackEvent(lv_event_t* e) {
    int index=int(reinterpret_cast<intptr_t>(lv_event_get_user_data(e)));
    if(actions.play)actions.play(index);
}
static void cover(lv_obj_t* parent,int index,int x,int y,int size) {
    auto* image=lv_image_create(parent);char file[64];snprintf(file,sizeof(file),"/cover-%02d.png",index+1);
    std::string src="A:"+assets+file;lv_image_set_src(image,src.c_str());
    lv_obj_set_pos(image,x,y);lv_image_set_scale(image,size*256/360);
    lv_image_set_pivot(image,0,0);
}
static void albumCard(lv_obj_t* parent,int index,int x,int y,int size) {
    auto* card=button(parent,"",x,y,size,size+65,albumEvent,reinterpret_cast<void*>(intptr_t(index)));
    lv_obj_set_style_bg_opa(card,LV_OPA_TRANSP,0);cover(card,index,0,0,size);
    label(card,volumes[index].title,0,size+12,size,normal);
    label(card,std::to_string(volumes[index].count)+" morceaux",0,size+38,size,normal,MUTED);
}
void showHome() {
    clearContent();
    auto* hero=panel(content,1128,246,SURFACE,20);lv_obj_set_pos(hero,0,0);
    label(hero,"LA COLLECTION · JUL",28,25,650,normal,PINK);
    label(hero,"avant l’usine",28,67,720,heading);
    label(hero,"Toute la collection, à portée de manette.",28,133,720,normal,MUTED);
    button(hero,"Explorer la collection",28,180,260,44,[](lv_event_t*){showCollection();});
    cover(hero,7,876,25,196);
    label(content,"La collection",0,274,900,large);
    for(int i=0;i<4;++i)albumCard(content,i,i*286,326,242);
    lv_obj_update_layout(content);
}
void showCollection() {
    clearContent();label(content,"La collection",0,0,1000,heading);
    label(content,"8 volumes · 118 morceaux",0,69,900,normal,MUTED);
    for(int i=0;i<8;++i)albumCard(content,i,(i%4)*286,120+(i/4)*325,242);
}
void showAlbum(int index) {
    if(index<0||index>=int(sizeof(volumes)/sizeof(*volumes)))return;
    clearContent();cover(content,index,0,0,210);
    label(content,"JUL · LA COLLECTION",242,10,800,normal,PINK);
    label(content,volumes[index].title,242,55,830,heading);
    label(content,std::to_string(volumes[index].count)+" morceaux",242,130,800,normal,MUTED);
    button(content,"Tout écouter",242,169,210,44,trackEvent,reinterpret_cast<void*>(intptr_t(volumes[index].first)));
    for(int n=0;n<volumes[index].count;++n) {
        int i=volumes[index].first+n;
        auto* row=button(content,"",0,244+n*64,1110,54,trackEvent,reinterpret_cast<void*>(intptr_t(i)));
        lv_obj_set_style_bg_color(row,lv_color_hex(n%2?PAPER:SURFACE),0);
        label(row,std::to_string(n+1),16,15,40,normal,MUTED);
        label(row,tracks[i].title,66,15,1000);
    }
}
void showSettings() {
    clearContent();label(content,"Réglages",0,0,1000,heading);
    label(content,"Mises à jour de l’application PS4",0,100,1000,large);
    label(content,"Les nouvelles versions seront proposées directement dans l’application.",0,152,1030,normal,MUTED);
    button(content,"Rechercher une mise à jour",0,205,380,50,[](lv_event_t*){if(actions.checkUpdates)actions.checkUpdates();});
}
void showUpdate(const std::string& version) {
    auto* shade=panel(lv_layer_top(),1280,720,0x000000,0);lv_obj_set_style_bg_opa(shade,190,0);
    auto* modal=panel(shade,900,350,SURFACE,20);lv_obj_center(modal);
    label(modal,"Mise à jour "+version+" disponible",32,32,835,large);
    label(modal,"L’installation conservera vos données locales et vos réglages.",32,98,835,normal,MUTED);
    auto cb=[](lv_event_t* e){int choice=int(reinterpret_cast<intptr_t>(lv_event_get_user_data(e)));
        auto* modal=lv_obj_get_parent(lv_event_get_target_obj(e));auto* shade=lv_obj_get_parent(modal);
        lv_obj_delete(shade);if(actions.updateChoice)actions.updateChoice(choice);};
    auto* later=button(modal,"Plus tard",32,158,245,48,cb,reinterpret_cast<void*>(intptr_t(0)));
    button(modal,"Installer",296,158,245,48,cb,reinterpret_cast<void*>(intptr_t(2)));
    button(modal,"Sauter la version "+version+" et me le rappeler lors de la version qui sera déployée après la "+version,32,230,835,82,cb,reinterpret_cast<void*>(intptr_t(1)));
    // Wrapped text is necessary for the complete skip label.
    auto* skipLabel=lv_obj_get_child(lv_obj_get_child(modal,-1),0);lv_label_set_long_mode(skipLabel,LV_LABEL_LONG_WRAP);
    lv_group_focus_obj(later);
}
void setPlayback(int track,float position,float duration,bool playing) {
    if(track>=0&&track<int(sizeof(tracks)/sizeof(*tracks))&&track!=activeTrack) {
        activeTrack=track;lv_label_set_text(dockTitle,tracks[track].title);lv_label_set_text(dockSubtitle,volumes[tracks[track].volume].title);
    }
    lv_label_set_text(playButtonLabel,playing?"Pause":"Lecture");
    int seconds=position>0?int(position):0,total=duration>0?int(duration):0;char time[64];
    snprintf(time,sizeof(time),"%d:%02d / %d:%02d",seconds/60,seconds%60,total/60,total%60);lv_label_set_text(clockLabel,time);
    lv_bar_set_value(progress,total>0?int(1000.0f*position/duration):0,LV_ANIM_OFF);
}
bool create(const std::string& directory,Actions callbacks) {
    assets=directory;actions=std::move(callbacks);
    FILE* f=fopen((assets+"/Inter.ttf").c_str(),"rb");if(!f)return false;
    fseek(f,0,SEEK_END);long size=ftell(f);rewind(f);if(size<=0||size>4*1024*1024){fclose(f);return false;}
    fontBytes.resize(size);bool ok=fread(fontBytes.data(),1,fontBytes.size(),f)==fontBytes.size();fclose(f);if(!ok)return false;
    normal=lv_tiny_ttf_create_data(fontBytes.data(),fontBytes.size(),19);
    large=lv_tiny_ttf_create_data(fontBytes.data(),fontBytes.size(),28);
    heading=lv_tiny_ttf_create_data(fontBytes.data(),fontBytes.size(),51);
    if(!normal||!large||!heading)return false;
    group=lv_group_create();lv_group_set_default(group);
    auto* root=lv_screen_active();lv_obj_set_style_bg_color(root,lv_color_hex(PAPER),0);lv_obj_remove_flag(root,LV_OBJ_FLAG_SCROLLABLE);
    label(root,"avant l’usine",50,28,310,large);
    button(root,"Accueil",396,26,130,46,[](lv_event_t*){showHome();});
    button(root,"Collection",540,26,150,46,[](lv_event_t*){showCollection();});
    button(root,"Réglages",1052,26,170,46,[](lv_event_t*){showSettings();});
    content=lv_obj_create(root);lv_obj_remove_style_all(content);lv_obj_set_pos(content,58,103);lv_obj_set_size(content,1164,479);
    lv_obj_set_scroll_dir(content,LV_DIR_VER);lv_obj_set_scrollbar_mode(content,LV_SCROLLBAR_MODE_AUTO);
    auto* dock=panel(root,1164,94,SURFACE,15);lv_obj_set_pos(dock,58,598);
    dockTitle=label(dock,"Choisissez un morceau",22,17,455);dockSubtitle=label(dock,"La collection",22,48,455,normal,MUTED);
    auto* toggle=button(dock,"Lecture",503,18,145,48,[](lv_event_t*){if(actions.toggle)actions.toggle();});playButtonLabel=lv_obj_get_child(toggle,0);
    clockLabel=label(dock,"0:00 / 0:00",700,15,400,normal,MUTED);
    progress=lv_bar_create(dock);lv_obj_set_pos(progress,700,55);lv_obj_set_size(progress,430,5);lv_bar_set_range(progress,0,1000);
    lv_obj_set_style_bg_color(progress,lv_color_hex(PINK),LV_PART_INDICATOR);showHome();return true;
}
lv_group_t* navigationGroup() { return group; }
}
