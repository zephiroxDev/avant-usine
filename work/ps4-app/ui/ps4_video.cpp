#include "ps4_video.h"
#include <orbis/VideoOut.h>
#include <orbis/libkernel.h>
#include <cstdint>
#include <cstring>
namespace video {
static int handle=-1;
static off_t offset=0;
static void* mapping=nullptr;
static constexpr size_t frameBytes=1280*720*4,allocationBytes=8*1024*1024;
static void* buffers[2]={nullptr,nullptr};
static int64_t frame=0;
static bool ready=false,allocated=false;
static lv_display_t* display=nullptr;
static void flush(lv_display_t* target,const lv_area_t*,uint8_t* pixels) {
    const int index=pixels==buffers[0]?0:(pixels==buffers[1]?1:-1);
    if(index<0||sceVideoOutSubmitFlip(handle,index,ORBIS_VIDEO_OUT_FLIP_VSYNC,++frame)<0)ready=false;
    if(ready) {
        auto deadline=sceKernelGetProcessTime()+2000000;
        for(;;) {
            OrbisVideoOutFlipStatus status{};
            if(sceVideoOutGetFlipStatus(handle,&status)<0){ready=false;break;}
            if(status.flipArg==frame)break;
            if(sceKernelGetProcessTime()>deadline){ready=false;break;}
            sceKernelUsleep(1000);
        }
    }
    // LVGL must not wait forever after an output error; main exits on !healthy().
    lv_display_flush_ready(target);
}
bool init() {
    handle=sceVideoOutOpen(ORBIS_VIDEO_USER_MAIN,ORBIS_VIDEO_OUT_BUS_MAIN,0,nullptr);
    if(handle<0)return false;
    if(sceKernelAllocateDirectMemory(0,sceKernelGetDirectMemorySize(),allocationBytes,0x200000,3,&offset)<0){shutdown();return false;}
    allocated=true;
    if(sceKernelMapDirectMemory(&mapping,allocationBytes,0x33,0,offset,0x200000)<0){shutdown();return false;}
    std::memset(mapping,0,allocationBytes);
    buffers[0]=mapping;buffers[1]=static_cast<uint8_t*>(mapping)+frameBytes;
    OrbisVideoOutBufferAttribute attribute{};
    sceVideoOutSetBufferAttribute(&attribute,0x80000000,1,0,1280,720,1280);
    if(sceVideoOutRegisterBuffers(handle,0,buffers,2,&attribute)<0){shutdown();return false;}
    sceVideoOutSetFlipRate(handle,0);
    display=lv_display_create(1280,720);if(!display){shutdown();return false;}
    lv_display_set_color_format(display,LV_COLOR_FORMAT_XRGB8888);
    lv_display_set_buffers(display,buffers[0],buffers[1],frameBytes,LV_DISPLAY_RENDER_MODE_FULL);
    lv_display_set_flush_cb(display,flush);ready=true;return true;
}
bool healthy(){return ready;}
void shutdown() {
    ready=false;
    if(display){lv_display_delete(display);display=nullptr;}
    if(handle>=0){sceVideoOutClose(handle);handle=-1;}
    if(mapping){sceKernelMunmap(mapping,allocationBytes);mapping=nullptr;}
    if(allocated){sceKernelReleaseDirectMemory(offset,allocationBytes);allocated=false;offset=0;}
}
}
