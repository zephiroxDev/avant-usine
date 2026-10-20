#include "settings.h"
#include <cassert>
#include <cmath>
#include <cstdio>
#include <string>
int main(int argc,char** argv) {
    assert(argc==2);std::string path=std::string(argv[1])+"/session.ini";
    assert(writeUpdateSession(path,7,12.5f,40));int track=-1,volume=0;float position=0;
    assert(readUpdateSession(path,track,position,volume));assert(track==7&&position==12.5f&&volume==40);
    assert(!writeUpdateSession(path,7,NAN,50));assert(!writeUpdateSession(path,7,-1,50));assert(!writeUpdateSession(path,7,0,101));
    assert(readUpdateSession(path,track,position,volume));assert(volume==40);
    assert(!writeUpdateSession(path+"/missing",0,0,100));remove(path.c_str());
    puts("Pre-update session saved, invalid state rejected and previous settings preserved.");
}
