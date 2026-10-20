#pragma once
#include "lvgl.h"
#include <cstdint>
namespace video {
bool init();
bool healthy();
void shutdown();
struct Metrics {uint64_t presented=0,totalPresentUs=0,maxPresentUs=0;};
Metrics metrics();
}
