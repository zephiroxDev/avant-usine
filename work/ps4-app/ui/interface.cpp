#include "interface.h"
#include "catalog.h"
#include <cstdio>
#include <cstdint>
#include <vector>
#include <utility>
#include <algorithm>
#include <cstring>
#include <limits>
#include <cstdlib>
#include "public_backend_config.h"
#include <sstream>
#include <numeric>
namespace ui {
static constexpr uint32_t PAPER=0x101c31,INK=0xf7f9ff,MUTED=0x9aaecb,PINK=0xb9b9ff,SURFACE=0x1b2c47;
static lv_obj_t *content,*dockTitle,*dockSubtitle,*progress,*clockLabel,*playButtonLabel;
static lv_group_t* group;
static lv_group_t* underlyingGroup=nullptr;
static lv_obj_t* updateShade=nullptr;
enum class Dialog {Offer,Ready,Notice};
static Dialog dialog=Dialog::Offer;
static bool updateLocked=false;
static lv_obj_t *countdownLabel,*readyLater,*readyNow,*updateStatus,*updateBar;
static lv_font_t *normal,*large,*heading;
static std::vector<unsigned char> fontBytes;
static std::string assets;
static Actions actions;
static int activeTrack=-1;
static int volumePercent=100;
static bool hintsEnabled=true;
static lv_obj_t *volumeLabel;
static std::string settingsNotice;
static std::string applicationVersion="Développement";
enum class Page {Home,Collection,Album,Settings,Lyrics,Account,Menu,Local};
static Page page=Page::Home;
static int lyricsTrack=-1,followedLine=-1;
static double playbackPosition=0;
static double playbackDuration=0;
static bool approximateLyrics=false;
static bool lyricsFollow=true;
static std::shared_ptr<const lyrics::Document> lyricsDocument;
static std::string lyricsMessage;
static lv_obj_t* lyricsList=nullptr;
static lv_obj_t* lyricsFollowLabel=nullptr;
struct LyricRow {lv_obj_t* object;lv_obj_t* spans;lv_span_t *spoken,*remaining;size_t shown,source;bool active;};
static std::vector<LyricRow> lyricRows;
static void paintLyrics();
static account::View accountView;
static lv_obj_t *emailField=nullptr,*passwordField=nullptr,*keyboardShade=nullptr,*textKeyboard=nullptr;
static lv_group_t* keyboardUnderlying=nullptr;
static bool accountRedrawPending=false;
static void openKeyboard(lv_obj_t* field);
static local::View localView;
static size_t localPage=0;
static bool localPlayback=false;
static bool immersionMode=false;
static uint32_t immersionColor=0x101c31;
static lv_obj_t *menuChrome=nullptr,*navigationChrome=nullptr,*colorPreview=nullptr;
static lv_obj_t* colorValues[3]={nullptr,nullptr,nullptr};
static void applyImmersionLayout() {
    for(auto* object:{menuChrome,navigationChrome,updateStatus})if(object){if(immersionMode)lv_obj_add_flag(object,LV_OBJ_FLAG_HIDDEN);else lv_obj_remove_flag(object,LV_OBJ_FLAG_HIDDEN);}
    lv_obj_set_style_bg_color(lv_screen_active(),lv_color_hex(immersionMode?immersionColor:PAPER),0);
    lv_obj_set_pos(content,58,immersionMode?28:103);lv_obj_set_size(content,1164,immersionMode?550:479);
    if(immersionMode&&lyricsList){lv_obj_set_height(lyricsList,540);lv_obj_set_style_bg_color(lyricsList,lv_color_hex(immersionColor),0);}
}
void setImmersionColor(uint32_t color){if(color<=0xffffff){immersionColor=color;if(content)applyImmersionLayout();}}
void showImmersion(){if(updateShade||keyboardShade)return;immersionMode=!immersionMode;showLyrics();}
enum class KeyIcon {Cross,Circle,Square,Triangle,L1,R1,L2,R2,Options,Arrows,Touchpad};
static void textIfChanged(lv_obj_t* target,const std::string& text) {
    if(std::strcmp(lv_label_get_text(target),text.c_str()))lv_label_set_text(target,text.c_str());
}
static bool usable(lv_obj_t* object) {
    if(lv_obj_has_state(object,LV_STATE_DISABLED))return false;
    for(auto* p=object;p;p=lv_obj_get_parent(p))if(lv_obj_has_flag(p,LV_OBJ_FLAG_HIDDEN))return false;
    return true;
}
static void hintVisibility(lv_obj_t* object) {
    if(lv_obj_has_flag(object,LV_OBJ_FLAG_USER_1)) {
        if(hintsEnabled&&(!lv_obj_has_flag(object,LV_OBJ_FLAG_USER_2)||lv_obj_has_state(lv_obj_get_parent(object),LV_STATE_FOCUSED)))lv_obj_remove_flag(object,LV_OBJ_FLAG_HIDDEN);
        else lv_obj_add_flag(object,LV_OBJ_FLAG_HIDDEN);
    }
    for(uint32_t i=0;i<lv_obj_get_child_count(object);++i)hintVisibility(lv_obj_get_child(object,i));
}
static void iconLine(lv_obj_t* parent,const lv_point_precise_t* points,uint32_t count,uint32_t color) {
    auto* line=lv_line_create(parent);lv_line_set_points(line,points,count);
    lv_obj_set_style_line_width(line,2,0);lv_obj_set_style_line_color(line,lv_color_hex(color),0);
    lv_obj_set_style_line_rounded(line,true,0);lv_obj_remove_flag(line,LV_OBJ_FLAG_CLICKABLE);
}
static lv_obj_t* keyIcon(lv_obj_t* parent,KeyIcon key,int x,int y) {
    auto* box=lv_obj_create(parent);lv_obj_remove_style_all(box);lv_obj_set_pos(box,x,y);lv_obj_set_size(box,28,26);
    lv_obj_remove_flag(box,static_cast<lv_obj_flag_t>(LV_OBJ_FLAG_SCROLLABLE|LV_OBJ_FLAG_CLICKABLE));
    lv_obj_add_flag(box,LV_OBJ_FLAG_USER_1);
    static const lv_point_precise_t crossA[]={{7,6},{21,20}},crossB[]={{21,6},{7,20}};
    static const lv_point_precise_t triangle[]={{14,4},{24,21},{4,21},{14,4}};
    static const lv_point_precise_t optionsA[]={{5,7},{23,7}},optionsB[]={{5,13},{23,13}},optionsC[]={{5,19},{23,19}};
    static const lv_point_precise_t up[]={{10,8},{14,4},{18,8}},down[]={{10,18},{14,22},{18,18}};
    static const lv_point_precise_t left[]={{7,9},{3,13},{7,17}},right[]={{21,9},{25,13},{21,17}};
    if(key==KeyIcon::Cross){iconLine(box,crossA,2,0x99bfff);iconLine(box,crossB,2,0x99bfff);}
    else if(key==KeyIcon::Triangle)iconLine(box,triangle,4,0x83dfc1);
    else if(key==KeyIcon::Options){iconLine(box,optionsA,2,INK);iconLine(box,optionsB,2,INK);iconLine(box,optionsC,2,INK);}
    else if(key==KeyIcon::Arrows){iconLine(box,up,3,INK);iconLine(box,down,3,INK);iconLine(box,left,3,INK);iconLine(box,right,3,INK);}
    else if(key==KeyIcon::Touchpad) {
        auto* shape=lv_obj_create(box);lv_obj_remove_style_all(shape);lv_obj_remove_flag(shape,static_cast<lv_obj_flag_t>(LV_OBJ_FLAG_CLICKABLE|LV_OBJ_FLAG_SCROLLABLE));
        lv_obj_set_pos(shape,1,5);lv_obj_set_size(shape,26,16);lv_obj_set_style_border_width(shape,2,0);lv_obj_set_style_border_color(shape,lv_color_hex(INK),0);lv_obj_set_style_radius(shape,4,0);
    }else {
        auto* shape=lv_obj_create(box);lv_obj_remove_style_all(shape);lv_obj_remove_flag(shape,static_cast<lv_obj_flag_t>(LV_OBJ_FLAG_CLICKABLE|LV_OBJ_FLAG_SCROLLABLE));
        bool circle=key==KeyIcon::Circle,square=key==KeyIcon::Square;
        lv_obj_set_pos(shape,circle||square?5:1,circle||square?4:3);lv_obj_set_size(shape,circle||square?18:26,circle||square?18:20);
        lv_obj_set_style_border_width(shape,2,0);lv_obj_set_style_radius(shape,circle?LV_RADIUS_CIRCLE:(square?1:5),0);
        lv_obj_set_style_border_color(shape,lv_color_hex(circle?0xf3a0a0:(square?0xe8a9dc:INK)),0);
        if(!circle&&!square){auto* l=lv_label_create(shape);lv_label_set_text(l,key==KeyIcon::L1?"L1":key==KeyIcon::R1?"R1":key==KeyIcon::L2?"L2":"R2");lv_obj_set_style_text_font(l,&lv_font_montserrat_14,0);lv_obj_set_style_text_color(l,lv_color_hex(INK),0);lv_obj_center(l);}
    }
    if(!hintsEnabled)lv_obj_add_flag(box,LV_OBJ_FLAG_HIDDEN);
    return box;
}
static lv_obj_t* primaryBadge(lv_obj_t* button) {
    for(uint32_t i=0;i<lv_obj_get_child_count(button);++i){auto* child=lv_obj_get_child(button,i);if(lv_obj_has_flag(child,LV_OBJ_FLAG_USER_1)&&!lv_obj_has_flag(child,LV_OBJ_FLAG_USER_2))return child;}
    return nullptr;
}
static void shortcut(lv_obj_t* button,KeyIcon key) {
    auto* old=primaryBadge(button);if(old)lv_obj_delete(old);
    lv_obj_set_width(lv_obj_get_child(button,0),std::max(1,lv_obj_get_style_width(button,0)-52));
    if(key==KeyIcon::Touchpad) {
        for(uint32_t i=0;i<lv_obj_get_child_count(button);++i){auto* child=lv_obj_get_child(button,i);if(lv_obj_has_flag(child,LV_OBJ_FLAG_USER_2)){lv_obj_delete(child);break;}}
        lv_obj_set_width(lv_obj_get_child(button,0),lv_obj_get_style_width(button,0)-52);
    }
    keyIcon(button,key,lv_obj_get_style_width(button,0)-37,(lv_obj_get_style_height(button,0)-26)/2);
}
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
    lv_obj_set_style_bg_color(b,lv_color_hex(0x243650),0);lv_obj_set_style_bg_opa(b,LV_OPA_COVER,0);lv_obj_set_style_radius(b,22,0);
    lv_obj_set_style_outline_color(b,lv_color_hex(PINK),LV_STATE_FOCUSED);lv_obj_set_style_outline_width(b,3,LV_STATE_FOCUSED);
    lv_obj_set_style_outline_pad(b,4,LV_STATE_FOCUSED);lv_obj_remove_flag(b,static_cast<lv_obj_flag_t>(LV_OBJ_FLAG_SCROLLABLE|LV_OBJ_FLAG_SCROLL_ON_FOCUS));
    lv_obj_set_style_bg_color(b,lv_color_hex(0x435b80),LV_STATE_FOCUSED);
    lv_obj_set_style_anim_duration(b,0,0);
    auto* l=label(b,title,12,0,std::max(1,w-24));lv_obj_set_height(l,lv_font_get_line_height(normal));lv_obj_align(l,LV_ALIGN_LEFT_MID,12,0);
    lv_obj_add_event_cb(b,callback,LV_EVENT_CLICKED,data);lv_group_add_obj(group,b);return b;
}
static void focusFirstContent() {
    lv_obj_update_layout(content);
    for(uint32_t i=0;i<lv_group_get_obj_count(group);++i){auto* o=lv_group_get_obj_by_index(group,i);
        if(!usable(o))continue;
        for(auto* p=lv_obj_get_parent(o);p;p=lv_obj_get_parent(p))if(p==content){lv_group_focus_obj(o);lv_obj_scroll_to_view(o,LV_ANIM_OFF);return;}}
}
bool textEntryActive(){return keyboardShade!=nullptr;}
void finishTextEntry() {
    if(!keyboardShade)return;
    auto* obsolete=group;group=keyboardUnderlying;keyboardUnderlying=nullptr;
    lv_obj_delete(keyboardShade);keyboardShade=nullptr;textKeyboard=nullptr;lv_group_delete(obsolete);
    if(accountRedrawPending){accountRedrawPending=false;showAccount();}
}
static void openKeyboard(lv_obj_t* field) {
    if(updateShade||keyboardShade)return;
    keyboardUnderlying=group;group=lv_group_create();lv_group_set_editing(group,true);
    keyboardShade=panel(lv_layer_top(),1280,720,0x000000,0);lv_obj_set_style_bg_opa(keyboardShade,LV_OPA_50,0);
    auto* keyboardPanel=panel(keyboardShade,1150,390,SURFACE,16);lv_obj_set_pos(keyboardPanel,65,310);
    label(keyboardPanel,field==passwordField?"Mot de passe":"Adresse e-mail",24,18,600,large);
    auto* done=button(keyboardPanel,"Terminer",802,12,155,44,[](lv_event_t*){finishTextEntry();});shortcut(done,KeyIcon::Options);lv_group_remove_obj(done);
    auto* cancel=button(keyboardPanel,"Fermer",972,12,155,44,[](lv_event_t*){finishTextEntry();});shortcut(cancel,KeyIcon::Circle);lv_group_remove_obj(cancel);
    textKeyboard=lv_keyboard_create(keyboardPanel);lv_obj_set_size(textKeyboard,1102,300);lv_obj_set_align(textKeyboard,LV_ALIGN_TOP_LEFT);lv_obj_set_pos(textKeyboard,24,73);
    lv_obj_set_style_text_font(textKeyboard,normal,LV_PART_ITEMS);
    lv_obj_set_style_bg_color(textKeyboard,lv_color_hex(SURFACE),0);lv_obj_set_style_border_width(textKeyboard,0,0);
    lv_obj_set_style_bg_color(textKeyboard,lv_color_hex(0x302834),LV_PART_ITEMS);
    lv_obj_set_style_text_color(textKeyboard,lv_color_hex(INK),LV_PART_ITEMS);
    lv_obj_set_style_bg_color(textKeyboard,lv_color_hex(0x755270),LV_PART_ITEMS|LV_STATE_FOCUSED);
    lv_obj_set_style_bg_color(textKeyboard,lv_color_hex(0x755270),LV_PART_ITEMS|LV_STATE_PRESSED);
    lv_keyboard_set_textarea(textKeyboard,field);lv_keyboard_set_mode(textKeyboard,LV_KEYBOARD_MODE_TEXT_LOWER);
    lv_group_add_obj(group,textKeyboard);lv_group_focus_obj(textKeyboard);lv_buttonmatrix_set_selected_button(textKeyboard,0);
    lv_obj_add_event_cb(textKeyboard,[](lv_event_t*){finishTextEntry();},LV_EVENT_READY,nullptr);
    lv_obj_add_event_cb(textKeyboard,[](lv_event_t*){finishTextEntry();},LV_EVENT_CANCEL,nullptr);
}
static void clearContent() {if(page!=Page::Lyrics)immersionMode=false;approximateLyrics=false;lyricRows.clear();lyricsList=nullptr;lyricsFollowLabel=nullptr;followedLine=-1;emailField=passwordField=nullptr;lv_obj_clean(content);lv_obj_scroll_to_y(content,0,LV_ANIM_OFF);applyImmersionLayout();}
static void albumEvent(lv_event_t* e) { showAlbum(int(reinterpret_cast<intptr_t>(lv_event_get_user_data(e)))); }
static void trackEvent(lv_event_t* e) {
    int index=int(reinterpret_cast<intptr_t>(lv_event_get_user_data(e)));
    if(actions.play)actions.play(index);
}
static void cover(lv_obj_t* parent,int index,int x,int y,int size) {
    auto* frame=panel(parent,size,size,PAPER,7);lv_obj_set_pos(frame,x,y);lv_obj_set_style_clip_corner(frame,true,0);
    auto* image=lv_image_create(frame);char file[64];snprintf(file,sizeof(file),"/cover-%02d.png",index+1);
    std::string src="A:"+assets+file;lv_image_set_src(image,src.c_str());
    lv_obj_set_pos(image,0,0);lv_image_set_scale(image,size*256/360);
    lv_image_set_pivot(image,0,0);
}
static void albumCard(lv_obj_t* parent,int index,int x,int y,int size) {
    auto* card=button(parent,"",x,y,size,size+65,albumEvent,reinterpret_cast<void*>(intptr_t(index)));
    lv_obj_set_style_bg_opa(card,LV_OPA_TRANSP,0);cover(card,index,0,0,size);
    label(card,volumes[index].title,0,size+12,size,normal);
    label(card,std::to_string(volumes[index].count)+" morceaux",0,size+38,size,normal,MUTED);
    auto* badge=primaryBadge(card);if(badge){lv_obj_set_pos(badge,size-36,8);lv_obj_move_foreground(badge);}
    for(uint32_t i=0;i<lv_obj_get_child_count(card);++i){auto* child=lv_obj_get_child(card,i);if(lv_obj_has_flag(child,LV_OBJ_FLAG_USER_2)){lv_obj_set_pos(child,size-72,8);lv_obj_move_foreground(child);break;}}
}
void showHome() {
    page=Page::Home;
    clearContent();
    auto* hero=panel(content,1128,246,SURFACE,20);lv_obj_set_pos(hero,0,0);
    label(hero,"LA COLLECTION · JUL",28,25,650,normal,PINK);
    label(hero,"avant l’usine",28,67,720,heading);
    label(hero,"Toute la collection, à portée de manette.",28,133,720,normal,MUTED);
    button(hero,"Explorer la collection",28,180,260,44,[](lv_event_t*){showCollection();});
    cover(hero,7,876,25,196);
    label(content,"La collection",0,274,900,large);
    for(int i=0;i<4;++i)albumCard(content,i,i*286,326,242);
    focusFirstContent();
}
void showCollection() {
    if(updateShade)return;
    page=Page::Collection;
    clearContent();label(content,"La collection",0,0,1000,heading);
    label(content,"8 volumes · 118 morceaux",0,69,900,normal,MUTED);
    for(int i=0;i<8;++i)albumCard(content,i,(i%4)*286,120+(i/4)*325,242);
    focusFirstContent();
}
void showAlbum(int index) {
    if(index<0||index>=int(sizeof(volumes)/sizeof(*volumes)))return;
    page=Page::Album;
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
        label(row,tracks[i].title,66,15,950);
    }
    focusFirstContent();
}
void showSettings() {
    if(updateShade)return;
    page=Page::Settings;
    clearContent();label(content,"Réglages",0,0,1000,heading);
    label(content,"Avant l’usine PS4 · Version "+applicationVersion,0,68,1100,normal,MUTED);
    label(content,"Mises à jour de l’application PS4",0,100,1000,large);
    label(content,"Les nouvelles versions seront proposées directement dans l’application.",0,152,1030,normal,MUTED);
    auto* check=button(content,actions.checkUpdates?"Rechercher une mise à jour":"Mises à jour : raccordement en cours",0,205,520,50,[](lv_event_t*){if(actions.checkUpdates)actions.checkUpdates();});
    if(!actions.checkUpdates)lv_obj_add_state(check,LV_STATE_DISABLED);
    button(content,std::string(hintsEnabled?"Masquer":"Afficher")+" les indications de la manette",0,285,620,50,[](lv_event_t*){
        bool wanted=!hintsEnabled;
        if(actions.hintsChanged&&!actions.hintsChanged(wanted)) {settingsNotice="Impossible d’enregistrer le réglage : stockage inaccessible.";showSettings();return;}
        hintsEnabled=wanted;settingsNotice.clear();
        hintVisibility(lv_screen_active());hintVisibility(lv_layer_top());
        showSettings();
    });
    if(!settingsNotice.empty())label(content,settingsNotice,0,365,1080,normal,PINK);
    label(content,"Fond uni du mode immersion",0,415,900,large);
    label(content,"Gauche / droite : ajuster la couleur. Enregistrer pour la conserver.",0,462,1050,normal,MUTED);
    colorPreview=panel(content,150,160,immersionColor,15);lv_obj_set_pos(colorPreview,920,505);
    for(int channel=0;channel<3;++channel){
        int shift=(2-channel)*8,y=510+channel*60;
        label(content,channel==0?"Rouge":channel==1?"Vert":"Bleu",0,y,100);
        auto* slider=lv_slider_create(content);lv_obj_set_pos(slider,118,y+6);lv_obj_set_size(slider,610,18);lv_slider_set_range(slider,0,255);lv_slider_set_value(slider,(immersionColor>>shift)&255,LV_ANIM_OFF);lv_group_add_obj(group,slider);
        colorValues[channel]=label(content,std::to_string((immersionColor>>shift)&255),780,y,90);
        lv_obj_add_event_cb(slider,[](lv_event_t* e){int c=int(reinterpret_cast<intptr_t>(lv_event_get_user_data(e))),shift=(2-c)*8;auto* slider=static_cast<lv_obj_t*>(lv_event_get_target(e));int value=lv_slider_get_value(slider);immersionColor=(immersionColor&~(0xffu<<shift))|(uint32_t(value)<<shift);lv_obj_set_style_bg_color(colorPreview,lv_color_hex(immersionColor),0);textIfChanged(colorValues[c],std::to_string(value));},LV_EVENT_VALUE_CHANGED,reinterpret_cast<void*>(intptr_t(channel)));
    }
    button(content,"Enregistrer la couleur",0,708,450,50,[](lv_event_t*){settingsNotice=actions.immersionColorChanged&&actions.immersionColorChanged(immersionColor)?"Couleur enregistrée.":"Impossible d’enregistrer la couleur.";showSettings();});
    focusFirstContent();
}
void showAccount() {
    if(updateShade||keyboardShade)return;
    page=Page::Account;clearContent();label(content,"Mon compte",0,0,1050,heading);
    auto* notice=label(content,accountView.message,0,72,1080,normal,MUTED);lv_label_set_long_mode(notice,LV_LABEL_LONG_WRAP);
    if(accountView.connected) {
        label(content,accountView.nickname.empty()?accountView.email:accountView.nickname,0,142,1060,large);
        label(content,accountView.email,0,190,1000,normal,MUTED);
        label(content,!accountView.permissionsKnown?"Droits du compte non vérifiés pour le moment":accountView.creator?"Créateur":accountView.moderator?"Modérateur":"Membre",0,237,1000,normal,PINK);
        button(content,"Déconnecter cette PS4",0,307,360,50,[](lv_event_t*){if(actions.signOut)actions.signOut();});
    }else {
        label(content,"Adresse e-mail",0,130,950,normal);
        emailField=lv_textarea_create(content);lv_obj_set_pos(emailField,0,160);lv_obj_set_size(emailField,760,50);
        lv_textarea_set_one_line(emailField,true);lv_textarea_set_max_length(emailField,254);lv_obj_set_style_text_font(emailField,normal,0);
        lv_textarea_set_text(emailField,accountView.email.c_str());lv_group_add_obj(group,emailField);
        lv_obj_add_event_cb(emailField,[](lv_event_t* e){openKeyboard(static_cast<lv_obj_t*>(lv_event_get_target(e)));},LV_EVENT_CLICKED,nullptr);
        label(content,"Mot de passe",0,230,950,normal);
        passwordField=lv_textarea_create(content);lv_obj_set_pos(passwordField,0,260);lv_obj_set_size(passwordField,760,50);
        lv_textarea_set_one_line(passwordField,true);lv_textarea_set_password_mode(passwordField,true);lv_textarea_set_max_length(passwordField,512);lv_obj_set_style_text_font(passwordField,normal,0);
        lv_group_add_obj(group,passwordField);lv_obj_add_event_cb(passwordField,[](lv_event_t* e){openKeyboard(static_cast<lv_obj_t*>(lv_event_get_target(e)));},LV_EVENT_CLICKED,nullptr);
        for(auto* field:{emailField,passwordField}) {
            lv_obj_set_style_bg_color(field,lv_color_hex(SURFACE),0);lv_obj_set_style_text_color(field,lv_color_hex(INK),0);
            lv_obj_set_style_border_color(field,lv_color_hex(MUTED),0);lv_obj_set_style_radius(field,8,0);
            lv_obj_set_style_border_color(field,lv_color_hex(PINK),LV_STATE_FOCUSED);
            lv_obj_set_style_border_width(field,2,LV_STATE_FOCUSED);
        }
        auto* submit=button(content,accountView.busy?"Connexion en cours…":"Se connecter",0,345,330,50,[](lv_event_t*){
            if(!emailField||!passwordField||accountView.busy)return;
            std::string email=lv_textarea_get_text(emailField),password=lv_textarea_get_text(passwordField);
            if(email.find('@')==std::string::npos||password.empty()){accountView.message="Renseigne ton adresse e-mail et ton mot de passe.";showAccount();return;}
            lv_textarea_set_text(passwordField,"");if(actions.signIn)actions.signIn(std::move(email),std::move(password));
        });
        if(accountView.busy)lv_obj_add_state(submit,LV_STATE_DISABLED);
    }
    focusFirstContent();
}
void setAccount(const account::View& view) {
    accountView=view;
    if(page==Page::Account){if(keyboardShade)accountRedrawPending=true;else if(!updateShade)showAccount();}
}
void showMenu() {
    if(updateShade||keyboardShade)return;
    page=Page::Menu;clearContent();label(content,"Menu",0,0,1050,heading);
    button(content,"La collection",0,100,540,62,[](lv_event_t*){showCollection();});
    button(content,"Paroles",570,100,540,62,[](lv_event_t*){showLyrics();});
    button(content,"Mon compte",0,190,540,62,[](lv_event_t*){showAccount();});
    button(content,"Musique locale",570,190,540,62,[](lv_event_t*){showLocal();});
    button(content,"Réglages",0,280,540,62,[](lv_event_t*){showSettings();});
    focusFirstContent();
}
void showLocal() {
    if(updateShade||keyboardShade)return;
    page=Page::Local;clearContent();label(content,"Local",0,0,1050,heading);
    auto* path=label(content,localView.path.empty()?"Bibliothèque de cette PS4":localView.path,0,65,1100,normal,MUTED);lv_label_set_long_mode(path,LV_LABEL_LONG_DOT);
    button(content,"Bibliothèque",0,107,250,44,[](lv_event_t*){localPage=0;if(actions.localBrowse)actions.localBrowse(0);});
    button(content,"Clé USB 1",270,107,230,44,[](lv_event_t*){localPage=0;if(actions.localBrowse)actions.localBrowse(1);});
    button(content,"Clé USB 2",520,107,230,44,[](lv_event_t*){localPage=0;if(actions.localBrowse)actions.localBrowse(2);});
    button(content,"Dossier parent",770,107,340,44,[](lv_event_t*){localPage=0;if(actions.localParent)actions.localParent();});
    label(content,localView.message,0,170,1100,normal,PINK);
    const size_t pageSize=40,begin=localPage*pageSize;
    if(localView.entries.empty()&&!localView.busy)label(content,"Choisis une clé USB pour copier des fichiers dans la bibliothèque.",0,225,1100,normal,MUTED);
    for(size_t i=begin;i<std::min(begin+pageSize,localView.entries.size());++i) {
        const auto& entry=localView.entries[i];std::string text=entry.directory?"Dossier · "+entry.name:(localView.library?local::displayName(entry.name):"Importer · "+entry.name);
        auto* row=button(content,text,0,224+int(i-begin)*62,1110,50,[](lv_event_t* e){size_t index=size_t(reinterpret_cast<uintptr_t>(lv_event_get_user_data(e)));if(actions.localSelect)actions.localSelect(index,localView.revision);},reinterpret_cast<void*>(uintptr_t(i)));
        if(localView.busy)lv_obj_add_state(row,LV_STATE_DISABLED);
    }
    int bottom=224+int(std::min(pageSize,localView.entries.size()>begin?localView.entries.size()-begin:0))*62;
    if(localPage)button(content,"Page précédente",0,bottom,340,46,[](lv_event_t*){--localPage;showLocal();});
    if(begin+pageSize<localView.entries.size())button(content,"Page suivante",380,bottom,340,46,[](lv_event_t*){++localPage;showLocal();});
    focusFirstContent();
    if(localView.path.empty()&&actions.localBrowse)actions.localBrowse(0);
}
void setLocal(local::View view) {
    if(view.path!=localView.path||localPage*40>=view.entries.size())localPage=0;
    localView=std::move(view);if(page==Page::Local&&!updateShade&&!keyboardShade)showLocal();
}
void setLocalTitle(const std::string& title) {
    localPlayback=true;activeTrack=-1;textIfChanged(dockTitle,title);textIfChanged(dockSubtitle,"Local · Fichier conservé sur cette PS4");
}
void setLocalNotice(const std::string& message){localView.message=message;if(page==Page::Local)showLocal();}
void stepTrack(int direction){if(direction<0){if(actions.previous)actions.previous();}else if(actions.next)actions.next();}
void showLyrics() {
    if(updateShade)return;
    page=Page::Lyrics;clearContent();
    if(activeTrack<0){auto* text=label(content,localPlayback?"Les paroles des fichiers locaux ne sont pas encore disponibles dans cet aperçu.":"Choisissez un morceau pour ouvrir ses paroles.",0,30,1100,large);lv_label_set_long_mode(text,LV_LABEL_LONG_WRAP);return;}
    cover(content,tracks[activeTrack].volume,0,16,330);
    label(content,tracks[activeTrack].title,0,370,360,large);
    auto* follow=button(content,lyricsFollow?"Suivi auto : activé":"Suivi auto : désactivé",0,421,350,44,[](lv_event_t*){lyricsFollow=!lyricsFollow;showLyrics();});
    lyricsFollowLabel=lv_obj_get_child(follow,0);
    lyricsList=panel(content,744,470,PAPER,0);lv_obj_set_pos(lyricsList,400,0);
    applyImmersionLayout();
    lv_obj_add_flag(lyricsList,LV_OBJ_FLAG_SCROLLABLE);lv_obj_set_scroll_dir(lyricsList,LV_DIR_VER);
    lv_obj_set_style_anim_duration(lyricsList,0,0);
    if(!lyricsDocument||lyricsTrack!=activeTrack) {
        std::string plain=public_backend::plainLyrics[activeTrack];
        if(!plain.empty()) {auto* text=label(lyricsList,plain,8,12,704,large);lv_label_set_long_mode(text,LV_LABEL_LONG_WRAP);approximateLyrics=true;}
        else {auto* text=label(lyricsList,lyricsMessage.empty()?"Chargement des paroles…":lyricsMessage,8,20,704,large);lv_label_set_long_mode(text,LV_LABEL_LONG_WRAP);}
        focusFirstContent();return;
    }
    int y=10;
    std::vector<size_t> order(lyricsDocument->lines.size());std::iota(order.begin(),order.end(),size_t(0));
    std::stable_sort(order.begin(),order.end(),[](size_t a,size_t b){return lyricsDocument->lines[a].start<lyricsDocument->lines[b].start;});
    for(size_t i:order) {
        const auto& line=lyricsDocument->lines[i];
        auto* row=button(lyricsList,"",4,y,718,100,[](lv_event_t* e){size_t index=size_t(reinterpret_cast<uintptr_t>(lv_event_get_user_data(e)));if(lyricsDocument&&index<lyricsDocument->lines.size()&&actions.seekTo){lyricsFollow=true;followedLine=-1;if(lyricsFollowLabel)textIfChanged(lyricsFollowLabel,"Suivi auto : activé");actions.seekTo(lyricsDocument->lines[index].start);}},reinterpret_cast<void*>(uintptr_t(i)));
        lv_obj_set_style_bg_opa(row,LV_OPA_TRANSP,0);lv_obj_set_style_bg_opa(row,LV_OPA_20,LV_STATE_FOCUSED);
        auto* spans=lv_spangroup_create(row);lv_obj_set_pos(spans,10,10);lv_obj_set_width(spans,620);
        lv_spangroup_set_mode(spans,LV_SPAN_MODE_BREAK);
        auto* spoken=lv_spangroup_new_span(spans);auto* remaining=lv_spangroup_new_span(spans);
        for(auto* span:{spoken,remaining}){lv_style_set_text_font(lv_span_get_style(span),line.back?normal:large);}
        lv_style_set_text_color(lv_span_get_style(spoken),lv_color_hex(line.back?PINK:INK));
        lv_style_set_text_color(lv_span_get_style(remaining),lv_color_hex(MUTED));
        lv_span_set_text(spoken,"");lv_span_set_text(remaining,line.text.c_str());lv_spangroup_refresh(spans);
        lv_obj_update_layout(spans);int height=std::max(72,int(lv_obj_get_height(spans))+24);lv_obj_set_height(row,height);
        auto* badge=primaryBadge(row);if(badge)lv_obj_set_y(badge,(height-26)/2);
        for(uint32_t c=0;c<lv_obj_get_child_count(row);++c){auto* child=lv_obj_get_child(row,c);if(lv_obj_has_flag(child,LV_OBJ_FLAG_USER_2))lv_obj_set_y(child,(height-26)/2);}
        lyricRows.push_back({row,spans,spoken,remaining,size_t(-1),i,false});y+=height+18;
    }
    paintLyrics();
    if(!lyricRows.empty()){size_t selected=followedLine>=0?size_t(followedLine):0;lv_group_focus_obj(lyricRows[selected].object);lv_obj_scroll_to_view(lyricRows[selected].object,LV_ANIM_OFF);}
    else focusFirstContent();
}
void setLyrics(int track,std::shared_ptr<const lyrics::Document> document,const std::string& message) {
    lyricsTrack=track;lyricsDocument=std::move(document);lyricsMessage=message;
    if(page==Page::Lyrics&&!updateShade)showLyrics();
}
static void paintLyrics() {
    if(!updateShade&&page==Page::Lyrics&&lyricsList&&approximateLyrics&&lyricsFollow&&playbackDuration>0){
        lv_obj_update_layout(lyricsList);
        int extent=lv_obj_get_scroll_bottom(lyricsList)+lv_obj_get_scroll_y(lyricsList);
        double fraction=std::max(0.0,std::min(1.0,playbackPosition/playbackDuration));
        lv_obj_scroll_to_y(lyricsList,int(std::max(0,extent)*fraction),LV_ANIM_OFF);
        return;
    }
    if(updateShade||page!=Page::Lyrics||!lyricsDocument||lyricsTrack!=activeTrack)return;
    int target=-1;
    for(size_t i=0;i<lyricRows.size();++i) {
        auto& row=lyricRows[i];if(row.source>=lyricsDocument->lines.size())continue;const auto& line=lyricsDocument->lines[row.source];
        bool active=playbackPosition>=line.start&&playbackPosition<line.end;
        size_t shown=active?lyrics::revealed(line,playbackPosition,lyricsDocument->highlight):0;
        if(active&&(target<0||(lyricsDocument->lines[lyricRows[size_t(target)].source].back&&!line.back)))target=int(i);
        if(shown!=row.shown||active!=row.active) {
            std::string spoken=lyrics::prefix(line.text,shown);
            lv_span_set_text(row.spoken,spoken.c_str());lv_span_set_text(row.remaining,line.text.substr(spoken.size()).c_str());
            lv_obj_set_style_opa(row.spans,active?LV_OPA_COVER:LV_OPA_40,0);lv_spangroup_refresh(row.spans);
            row.shown=shown;row.active=active;
        }
    }
    if(lyricsFollow&&target>=0&&target!=followedLine) {
        auto* selected=lv_group_get_focused(group);if(selected&&lv_obj_get_parent(selected)==lyricsList)lv_group_focus_obj(lyricRows[size_t(target)].object);
        lv_obj_scroll_to_view(lyricRows[size_t(target)].object,LV_ANIM_OFF);followedLine=target;
    }
}
static void closeUpdate(int choice,bool notify=true) {
    if(!updateShade)return;
    if(updateLocked&&notify)return;
    Dialog previousDialog=dialog;
    auto* obsolete=group;group=underlyingGroup;underlyingGroup=nullptr;
    lv_obj_delete(updateShade);updateShade=nullptr;lv_group_delete(obsolete);
    updateLocked=false;
    if(notify&&previousDialog==Dialog::Offer&&actions.updateChoice)actions.updateChoice(choice);
    if(notify&&previousDialog==Dialog::Ready&&actions.readyChoice)actions.readyChoice(choice);
    if(page==Page::Lyrics)showLyrics();
    else if(page==Page::Account)showAccount();
    else if(page==Page::Local)showLocal();
}
void back() {
    if(keyboardShade)finishTextEntry();
    else if(updateShade)closeUpdate(0);
    else if(page==Page::Album)showCollection();
    else if(page==Page::Lyrics&&activeTrack>=0)showAlbum(tracks[activeTrack].volume);
    else if(page==Page::Local) {
        if(localView.path=="/data/avant-usine-ps4/local"||localView.path=="/mnt/usb0"||localView.path=="/mnt/usb1"||localView.path.empty())showMenu();
        else if(actions.localParent)actions.localParent();
    }else if(page==Page::Account||page==Page::Settings)showMenu();
    else showHome();
}
void activateFocused() {
    auto* selected=lv_group_get_focused(group);
    if(keyboardShade&&selected==textKeyboard){lv_obj_send_event(textKeyboard,LV_EVENT_VALUE_CHANGED,nullptr);return;}
    if(selected&&usable(selected))lv_obj_send_event(selected,LV_EVENT_CLICKED,nullptr);
}
void moveFocus(Direction direction) {
    if(keyboardShade){lv_group_send_data(group,direction==Direction::Left?LV_KEY_LEFT:direction==Direction::Right?LV_KEY_RIGHT:direction==Direction::Up?LV_KEY_UP:LV_KEY_DOWN);return;}
    lv_obj_update_layout(lv_screen_active());
    lv_obj_update_layout(lv_layer_top());
    auto* selected=lv_group_get_focused(group);if(!selected){focusFirstContent();return;}
    if(lv_obj_check_type(selected,&lv_slider_class)&&(direction==Direction::Left||direction==Direction::Right)){
        lv_slider_set_value(selected,lv_slider_get_value(selected)+(direction==Direction::Left?-1:1),LV_ANIM_OFF);lv_obj_send_event(selected,LV_EVENT_VALUE_CHANGED,nullptr);return;
    }
    auto inContent=[](lv_obj_t* object){for(auto* p=object;p;p=lv_obj_get_parent(p))if(p==content)return true;return false;};
    lv_area_t from;lv_obj_get_coords(selected,&from);
    int cx=(from.x1+from.x2)/2,cy=(from.y1+from.y2)/2;
    lv_obj_t* best=nullptr;int64_t bestScore=std::numeric_limits<int64_t>::max();
    // Prefer remaining items in the current content before crossing to the dock.
    for(int pass=0;pass<2&&!best;++pass) {
        for(uint32_t i=0;i<lv_group_get_obj_count(group);++i) {
            auto* candidate=lv_group_get_obj_by_index(group,i);
            if(candidate==selected||!usable(candidate))continue;
            bool same=(inContent(candidate)&&inContent(selected))||
                (!inContent(candidate)&&!inContent(selected)&&lv_obj_get_parent(candidate)==lv_obj_get_parent(selected));
            if(pass==0&&!same)continue;
            lv_area_t to;lv_obj_get_coords(candidate,&to);
            int dx=(to.x1+to.x2)/2-cx,dy=(to.y1+to.y2)/2-cy;
            bool horizontal=direction==Direction::Left||direction==Direction::Right;
            int advance=direction==Direction::Left?-dx:direction==Direction::Right?dx:direction==Direction::Up?-dy:dy;
            if(advance<=0)continue;
            // Prefer the same visual row, but allow entering a lyrics column
            // whose final visible phrase is above the left-hand controls.
            if(!same&&(to.y2<103||to.y1>582)&&inContent(candidate))continue;
            int lateral=horizontal?std::abs(dy):std::abs(dx);
            int64_t score=int64_t(advance)+int64_t(lateral)*4;
            if(score<bestScore){bestScore=score;best=candidate;}
        }
    }
    if(best){
        if(page==Page::Lyrics&&lyricsList&&lv_obj_get_parent(best)==lyricsList){lyricsFollow=false;if(lyricsFollowLabel)textIfChanged(lyricsFollowLabel,"Suivi auto : désactivé");}
        lv_group_focus_obj(best);lv_obj_scroll_to_view(best,LV_ANIM_OFF);
    }
}
void showUpdate(const std::string& version) {
    if(updateShade)return;
    dialog=Dialog::Offer;updateLocked=false;
    underlyingGroup=group;group=lv_group_create();
    auto* shade=panel(lv_layer_top(),1280,720,0x000000,0);lv_obj_set_style_bg_opa(shade,190,0);
    updateShade=shade;
    auto* modal=panel(shade,900,350,SURFACE,20);lv_obj_center(modal);
    label(modal,"Mise à jour "+version+" disponible",32,32,835,large);
    label(modal,"L’installation conservera vos données locales et vos réglages.",32,98,835,normal,MUTED);
    auto cb=[](lv_event_t* e){int choice=int(reinterpret_cast<intptr_t>(lv_event_get_user_data(e)));
        closeUpdate(choice);};
    auto* later=button(modal,"Plus tard",32,158,245,48,cb,reinterpret_cast<void*>(intptr_t(0)));
    button(modal,"Installer",296,158,245,48,cb,reinterpret_cast<void*>(intptr_t(2)));
    button(modal,"Sauter la version "+version+" et me le rappeler lors de la version qui sera déployée après la "+version,32,230,835,82,cb,reinterpret_cast<void*>(intptr_t(1)));
    // Wrapped text is necessary for the complete skip label.
    auto* skipLabel=lv_obj_get_child(lv_obj_get_child(modal,-1),0);lv_label_set_long_mode(skipLabel,LV_LABEL_LONG_WRAP);lv_obj_set_height(skipLabel,LV_SIZE_CONTENT);
    lv_group_focus_obj(later);
}
void showUpdateReady(const std::string& version,unsigned seconds,bool handingOff) {
    if(updateShade&&dialog!=Dialog::Ready)closeUpdate(0,false);
    if(!updateShade) {
        dialog=Dialog::Ready;underlyingGroup=group;group=lv_group_create();
        updateShade=panel(lv_layer_top(),1280,720,0x000000,0);lv_obj_set_style_bg_opa(updateShade,190,0);
        auto* modal=panel(updateShade,900,330,SURFACE,20);lv_obj_center(modal);
        label(modal,"Mise à jour "+version+" prête",32,30,835,large);
        countdownLabel=label(modal,"",32,103,835,normal);
        auto* subtitle=label(modal,"L’installation PS4 prendra le relais. Vos données locales sont conservées.",32,146,835,normal,MUTED);
        lv_label_set_long_mode(subtitle,LV_LABEL_LONG_WRAP);
        auto cb=[](lv_event_t* e){closeUpdate(int(reinterpret_cast<intptr_t>(lv_event_get_user_data(e))));};
        readyLater=button(modal,"Plus tard",32,239,245,48,cb,reinterpret_cast<void*>(intptr_t(0)));
        readyNow=button(modal,"Fermer maintenant",296,239,300,48,cb,reinterpret_cast<void*>(intptr_t(1)));
        lv_group_focus_obj(readyLater);
    }
    updateLocked=handingOff;
    textIfChanged(countdownLabel,handingOff?"Transmission à l’installateur PS4…":("L’application va se fermer dans "+std::to_string(seconds)+" secondes."));
    if(handingOff){lv_obj_add_state(readyLater,LV_STATE_DISABLED);lv_obj_add_state(readyNow,LV_STATE_DISABLED);}
}
void showUpdateNotice(const std::string& message) {
    if(updateShade)closeUpdate(0,false);
    dialog=Dialog::Notice;updateLocked=false;underlyingGroup=group;group=lv_group_create();
    updateShade=panel(lv_layer_top(),1280,720,0x000000,0);lv_obj_set_style_bg_opa(updateShade,190,0);
    auto* modal=panel(updateShade,900,330,SURFACE,20);lv_obj_center(modal);
    label(modal,"Mises à jour PS4",32,30,835,large);
    auto* text=label(modal,message,32,103,835,normal);lv_label_set_long_mode(text,LV_LABEL_LONG_WRAP);
    auto* close=button(modal,"Fermer",32,239,245,48,[](lv_event_t*){closeUpdate(0);});lv_group_focus_obj(close);
}
void setUpdateStatus(const std::string& message,int percent) {
    textIfChanged(updateStatus,message);
    if(percent<0)lv_obj_add_flag(updateBar,LV_OBJ_FLAG_HIDDEN);
    else {lv_obj_remove_flag(updateBar,LV_OBJ_FLAG_HIDDEN);lv_bar_set_value(updateBar,percent,LV_ANIM_OFF);}
}
void setVolumeLevel(int percent) {
    if(percent<0||percent>100)return;
    volumePercent=percent;textIfChanged(volumeLabel,std::to_string(percent)+" %");
}
void adjustVolume(int step) {setVolumeLevel(std::max(0,std::min(100,volumePercent+step)));if(actions.volume)actions.volume(volumePercent);}
void setApplicationVersion(const std::string& version){applicationVersion=version;}
void setPlayback(int track,float position,float duration,bool playing,const std::string& status) {
    playbackPosition=position;playbackDuration=duration;
    if(track>=0&&track<int(sizeof(tracks)/sizeof(*tracks))&&track!=activeTrack) {
        localPlayback=false;activeTrack=track;textIfChanged(dockTitle,tracks[track].title);
        if(page==Page::Lyrics&&!updateShade)showLyrics();
    }
    if(track>=0&&track<int(sizeof(tracks)/sizeof(*tracks)))textIfChanged(dockSubtitle,std::string(volumes[tracks[track].volume].title)+(status.empty()?"":" · "+status));
    textIfChanged(playButtonLabel,playing?"Pause":"Lecture");
    int seconds=position>0?int(position):0,total=duration>0?int(duration):0;char time[64];
    snprintf(time,sizeof(time),"%d:%02d / %d:%02d",seconds/60,seconds%60,total/60,total%60);textIfChanged(clockLabel,time);
    lv_bar_set_value(progress,total>0?int(1000.0f*position/duration):0,LV_ANIM_OFF);
    paintLyrics();
}
bool create(const std::string& directory,Actions callbacks,bool hints) {
    assets=directory;actions=std::move(callbacks);hintsEnabled=hints;
    FILE* f=fopen((assets+"/Inter.ttf").c_str(),"rb");if(!f)return false;
    fseek(f,0,SEEK_END);long size=ftell(f);rewind(f);if(size<=0||size>4*1024*1024){fclose(f);return false;}
    fontBytes.resize(size);bool ok=fread(fontBytes.data(),1,fontBytes.size(),f)==fontBytes.size();fclose(f);if(!ok)return false;
    normal=lv_tiny_ttf_create_data(fontBytes.data(),fontBytes.size(),19);
    large=lv_tiny_ttf_create_data(fontBytes.data(),fontBytes.size(),28);
    heading=lv_tiny_ttf_create_data(fontBytes.data(),fontBytes.size(),51);
    if(!normal||!large||!heading)return false;
    normal->fallback=&lv_font_montserrat_14;large->fallback=&lv_font_montserrat_14;heading->fallback=&lv_font_montserrat_14;
    group=lv_group_create();lv_group_set_default(group);
    auto* root=lv_screen_active();lv_obj_set_style_bg_color(root,lv_color_hex(PAPER),0);lv_obj_remove_flag(root,LV_OBJ_FLAG_SCROLLABLE);
    auto* menu=button(root,"avant l’usine",50,26,238,46,[](lv_event_t*){showMenu();});menuChrome=menu;shortcut(menu,KeyIcon::Touchpad);
    lv_obj_set_style_bg_opa(menu,LV_OPA_TRANSP,0);auto* brand=lv_obj_get_child(menu,0);lv_obj_set_style_text_font(brand,large,0);lv_obj_set_height(brand,lv_font_get_line_height(large));
    auto* navigation=panel(root,918,62,SURFACE,31);navigationChrome=navigation;lv_obj_set_pos(navigation,310,18);
    button(navigation,"Accueil",10,8,150,46,[](lv_event_t*){showHome();});
    shortcut(button(navigation,"Collection",174,8,190,46,[](lv_event_t*){showCollection();}),KeyIcon::Square);
    button(navigation,"Local",378,8,140,46,[](lv_event_t*){showLocal();});
    button(navigation,"Mon compte",532,8,180,46,[](lv_event_t*){showAccount();});
    shortcut(button(navigation,"Réglages",726,8,180,46,[](lv_event_t*){showSettings();}),KeyIcon::Options);
    updateStatus=label(root,"",58,78,1164,normal,MUTED);
    updateBar=lv_bar_create(root);lv_obj_set_pos(updateBar,58,101);lv_obj_set_size(updateBar,1164,2);lv_bar_set_range(updateBar,0,100);
    lv_obj_set_style_bg_color(updateBar,lv_color_hex(PINK),LV_PART_INDICATOR);lv_obj_add_flag(updateBar,LV_OBJ_FLAG_HIDDEN);
    content=lv_obj_create(root);lv_obj_remove_style_all(content);lv_obj_set_pos(content,58,103);lv_obj_set_size(content,1164,479);
    lv_obj_set_scroll_dir(content,LV_DIR_VER);lv_obj_set_scrollbar_mode(content,LV_SCROLLBAR_MODE_AUTO);
    lv_obj_set_style_anim_duration(content,0,0);
    auto* dock=panel(root,1164,94,SURFACE,15);lv_obj_set_pos(dock,58,598);
    dockTitle=label(dock,"Choisissez un morceau",22,12,295);dockSubtitle=label(dock,"La collection",22,43,295,normal,MUTED);
    shortcut(button(dock,"",340,10,52,40,[](lv_event_t*){if(actions.previous)actions.previous();}),KeyIcon::L1);
    auto* toggle=button(dock,"Lecture",404,10,132,40,[](lv_event_t*){if(actions.toggle)actions.toggle();});playButtonLabel=lv_obj_get_child(toggle,0);
    shortcut(toggle,KeyIcon::Triangle);
    shortcut(button(dock,"",548,10,52,40,[](lv_event_t*){if(actions.next)actions.next();}),KeyIcon::R1);
    clockLabel=label(dock,"0:00 / 0:00",640,15,235,normal,MUTED);
    auto changeVolume=[](lv_event_t* e){int step=int(reinterpret_cast<intptr_t>(lv_event_get_user_data(e)));
        adjustVolume(step);};
    button(dock,"−",923,8,70,44,changeVolume,reinterpret_cast<void*>(intptr_t(-10)));
    volumeLabel=label(dock,"100 %",1002,20,78,normal,MUTED);
    button(dock,"+",1083,8,70,44,changeVolume,reinterpret_cast<void*>(intptr_t(10)));
    progress=lv_bar_create(dock);lv_obj_set_pos(progress,640,55);lv_obj_set_size(progress,240,5);lv_bar_set_range(progress,0,1000);
    button(dock,"Paroles",923,57,110,32,[](lv_event_t*){if(page==Page::Lyrics)back();else showLyrics();});
    button(dock,"Immersion",1041,57,112,32,[](lv_event_t*){showImmersion();});
    lv_obj_set_style_bg_color(progress,lv_color_hex(PINK),LV_PART_INDICATOR);
    shortcut(button(dock,"−10 s",340,57,118,32,[](lv_event_t*){if(actions.seek)actions.seek(-10);}),KeyIcon::L2);
    shortcut(button(dock,"+10 s",474,57,126,32,[](lv_event_t*){if(actions.seek)actions.seek(10);}),KeyIcon::R2);
    showHome();return true;
}
lv_group_t* navigationGroup() { return group; }
}
