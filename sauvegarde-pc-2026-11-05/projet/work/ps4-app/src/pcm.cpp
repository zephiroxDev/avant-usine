#include "pcm.h"
#include <algorithm>
#include <cmath>
std::vector<int16_t> toStereo48(const int16_t* in,size_t frames,unsigned channels,unsigned rate) {
    if(!in||!frames||channels<1||channels>2||rate<8000||rate>192000||frames>size_t(rate)*720)return {};
    size_t count=uint64_t(frames)*48000/rate;
    std::vector<int16_t> out(count*2);
    for(size_t i=0;i<count;++i) {
        double p=double(i)*rate/48000;size_t a=std::min(size_t(p),frames-1),b=std::min(a+1,frames-1);
        double f=p-a;
        for(unsigned c=0;c<2;++c) {unsigned ch=channels==1?0:c;
            out[i*2+c]=int16_t(std::lround(in[a*channels+ch]*(1-f)+in[b*channels+ch]*f));}
    }
    return out;
}
