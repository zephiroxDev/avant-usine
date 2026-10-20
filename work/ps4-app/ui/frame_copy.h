#pragma once
#include <algorithm>
#include <cstdint>
#include <cstring>
namespace frame_copy {
struct Rect { int x1,y1,x2,y2; };
inline Rect unite(Rect a,Rect b) {return {std::min(a.x1,b.x1),std::min(a.y1,b.y1),std::max(a.x2,b.x2),std::max(a.y2,b.y2)};}
// Source is cached CPU memory. Never read the write-combined scanout buffers.
inline void copy(uint32_t* destination,const uint32_t* source,int width,int height,Rect r) {
    r.x1=std::max(0,r.x1);r.y1=std::max(0,r.y1);
    r.x2=std::min(width-1,r.x2);r.y2=std::min(height-1,r.y2);
    if(r.x1>r.x2||r.y1>r.y2)return;
    for(int y=r.y1;y<=r.y2;++y)
        std::memcpy(destination+y*width+r.x1,source+y*width+r.x1,size_t(r.x2-r.x1+1)*4);
}
}
