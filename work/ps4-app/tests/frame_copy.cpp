#include "frame_copy.h"
#include <cassert>
#include <array>
int main() {
    std::array<uint32_t,80> cpu{},front{},back{};
    for(unsigned i=0;i<cpu.size();++i)cpu[i]=i+1;
    frame_copy::copy(back.data(),cpu.data(),10,8,{2,1,4,3});
    assert(back[12]==13&&back[34]==35&&back[11]==0&&back[35]==0);
    auto dirty=frame_copy::unite({2,1,4,3},{7,5,9,7});
    frame_copy::copy(back.data(),cpu.data(),10,8,{7,5,9,7});
    frame_copy::copy(front.data(),cpu.data(),10,8,dirty);
    assert(front[12]==back[12]&&front[79]==back[79]);
    cpu[12]=999;frame_copy::copy(front.data(),cpu.data(),10,8,{2,1,2,1});
    frame_copy::copy(back.data(),cpu.data(),10,8,{2,1,2,1});
    assert(front[12]==999&&back[12]==999&&front[79]==80&&back[79]==80);
    frame_copy::copy(back.data(),cpu.data(),10,8,{-10,-10,50,50});assert(back==cpu);
    auto before=back;frame_copy::copy(back.data(),cpu.data(),10,8,{20,20,22,22});assert(back==before);
}
