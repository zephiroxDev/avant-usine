#pragma once
#include <functional>
#include <string>
#include "lvgl.h"
namespace ui {
struct Actions {
    std::function<void(int)> play;
    std::function<void()> toggle;
    std::function<void()> previous,next;
    std::function<void(int)> volume;
    std::function<bool(bool)> hintsChanged;
    std::function<void()> checkUpdates;
    std::function<void(int)> updateChoice; // 0 later, 1 skip, 2 install
    std::function<void(int)> readyChoice; // 0 later, 1 close now
};
bool create(const std::string& assetDirectory,Actions actions,bool hints=true);
void showHome();
void showCollection();
void showAlbum(int index);
void showSettings();
void showUpdate(const std::string& version);
void showUpdateReady(const std::string& version,unsigned seconds,bool handingOff=false);
void showUpdateNotice(const std::string& message);
void setUpdateStatus(const std::string& message,int percent=-1);
void setVolumeLevel(int percent);
void back();
void setPlayback(int track,float position,float duration,bool playing,const std::string& status="");
lv_group_t* navigationGroup();
}
