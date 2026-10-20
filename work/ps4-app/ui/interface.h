#pragma once
#include <functional>
#include <string>
#include "lvgl.h"
namespace ui {
struct Actions {
    std::function<void(int)> play;
    std::function<void()> toggle;
    std::function<void()> checkUpdates;
    std::function<void(int)> updateChoice; // 0 later, 1 skip, 2 install
};
bool create(const std::string& assetDirectory,Actions actions);
void showHome();
void showCollection();
void showAlbum(int index);
void showSettings();
void showUpdate(const std::string& version);
void setPlayback(int track,float position,float duration,bool playing);
lv_group_t* navigationGroup();
}
