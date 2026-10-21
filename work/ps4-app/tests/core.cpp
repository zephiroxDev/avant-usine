#include "local_store.h"
#include "pcm.h"
#include "settings.h"
#include <cassert>
#include <fstream>
#include <iterator>
#include <unistd.h>
#include <iostream>
#include <sys/stat.h>
static void put(const std::string&p,const std::string&v){std::ofstream f(p,std::ios::binary);f<<v;}
static std::string get(const std::string&p){std::ifstream f(p,std::ios::binary);return {std::istreambuf_iterator<char>(f),{}};}
int main(int argc,char**argv) {
    assert(argc==2);std::string r=argv[1];assert(local::directory(r));
    auto appRoot=r+"/app-root";assert(local::applicationDirectory(appRoot));
    struct stat mode{};assert(stat(appRoot.c_str(),&mode)==0&&(mode.st_mode&0777)==0755);
    auto secret=appRoot+"/account-refresh";put(secret,"private");assert(chmod(secret.c_str(),0600)==0);
    assert(chmod(appRoot.c_str(),0700)==0&&local::applicationDirectory(appRoot));
    assert(stat(secret.c_str(),&mode)==0&&(mode.st_mode&0777)==0600&&get(secret)=="private");
    auto appLink=r+"/app-link";assert(symlink(appRoot.c_str(),appLink.c_str())==0);
    assert(!local::applicationDirectory(appLink));
    auto config=r+"/settings.ini";assert(readHints(config));
    auto color=r+"/immersion-color.ini";assert(readImmersionColor(color)==0x101c31);
    assert(writeImmersionColor(color,0xabcdef)&&readImmersionColor(color)==0xabcdef);
    assert(!writeImmersionColor(color,0x1000000)&&readImmersionColor(color)==0xabcdef);
    put(color,"oops");assert(readImmersionColor(color)==0x101c31);
    assert(writeHints(config,false));assert(!readHints(config));
    assert(writeHints(config,true));assert(readHints(config));
    put(config,"hints=0\nextra");assert(readHints(config));
    assert(!writeHints(r+"/absent/settings.ini",false));
    auto source=r+"/source.mp3",library=r+"/library";std::string error;
    std::string payload("binary\0audio",12);put(source,payload);
    assert(local::importFile(source,library,"track.mp3",error));
    assert(get(library+"/track.mp3")==payload);
    put(source,std::string(200000,'x'));
    assert(!local::importFile(source,library,"track.mp3",error,[](uint64_t done,uint64_t){return done<65536;}));
    assert(get(library+"/track.mp3")==payload);
    assert(local::displayName("05 01 - La vie est belle.mp3")=="La vie est belle");
    assert(local::displayName("01 - été.mp3")=="été");
    assert(local::displayName("123.mp3")=="123");
    // A removed USB/source after a restart must not invalidate the imported copy.
    unlink(source.c_str());assert(get(library+"/track.mp3")==payload);
    assert(!local::importFile(source,library,"track.mp3",error));
    assert(get(library+"/track.mp3")==payload);
    for(auto n:{"../escape","/absolute","..","a/b","a\\b",""})assert(!local::safeName(n));
    assert(!local::importFile(config,library,"../escape",error));
    assert(local::list(library).size()==1);
    auto linked=r+"/symlink";assert(symlink(config.c_str(),linked.c_str())==0);
    assert(!local::importFile(linked,library,"linked.mp3",error));
    int16_t mono[]={-1000,0,1000,2000};auto out=toStereo48(mono,4,1,24000);
    assert(out.size()==16&&out[0]==-1000&&out[2]==-500&&out[3]==-500&&out[4]==0&&out[12]==2000);
    int16_t stereo[]={100,-100,200,-200};out=toStereo48(stereo,2,2,48000);
    assert(out==std::vector<int16_t>(stereo,stereo+4));
    assert(toStereo48(mono,4,0,48000).empty());
    std::cout<<"PASS: durable copy, absent source, failed replacement, traversal, symlinks, hints, mono/stereo resampling\n";
}
