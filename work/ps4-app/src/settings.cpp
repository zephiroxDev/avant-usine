#include "settings.h"
#include <cstdio>
#include <cstring>
#include <unistd.h>
#include <cmath>
uint32_t readImmersionColor(const std::string& path) {
    FILE* f=fopen(path.c_str(),"rb");if(!f)return 0x101c31;
    char data[16]={};size_t n=fread(data,1,sizeof(data),f);fclose(f);unsigned color=0;int end=0;
    return n==7&&sscanf(data,"%6x\n%n",&color,&end)==1&&end==7?color:0x101c31;
}
bool writeImmersionColor(const std::string& path,uint32_t color) {
    if(color>0xffffff)return false;auto temporary=path+".tmp";FILE* f=fopen(temporary.c_str(),"wb");if(!f)return false;
    bool ok=fprintf(f,"%06x\n",unsigned(color))==7&&fflush(f)==0;
    if(ok)ok=fsync(fileno(f))==0;if(fclose(f)!=0)ok=false;
    if(ok)ok=rename(temporary.c_str(),path.c_str())==0;if(!ok)remove(temporary.c_str());return ok;
}
bool readHints(const std::string& path) {
    FILE* file=fopen(path.c_str(),"rb"); if(!file)return true;
    char value[64]={0};size_t n=fread(value,1,sizeof(value)-1,file);fclose(file);
    return !(n==8&&memcmp(value,"hints=0\n",8)==0);
}
bool writeHints(const std::string& path,bool enabled) {
    std::string temporary=path+".tmp";FILE* file=fopen(temporary.c_str(),"wb");if(!file)return false;
    const char* value=enabled?"hints=1\n":"hints=0\n";
    bool ok=fwrite(value,1,8,file)==8&&fflush(file)==0;
    if(ok)ok=fsync(fileno(file))==0;
    if(fclose(file)!=0)ok=false;
    if(ok)ok=rename(temporary.c_str(),path.c_str())==0;
    if(!ok)remove(temporary.c_str());return ok;
}
bool writeUpdateSession(const std::string& path,int track,float position,int volume) {
    if(track< -1||!std::isfinite(position)||position<0||volume<0||volume>100)return false;
    const auto temporary=path+".tmp";FILE* file=fopen(temporary.c_str(),"wb");if(!file)return false;
    bool ok=fprintf(file,"track=%d\nposition=%.3f\nvolume=%d\n",track,double(position),volume)>0&&fflush(file)==0;
    if(ok)ok=fsync(fileno(file))==0;if(fclose(file)!=0)ok=false;
    if(ok)ok=rename(temporary.c_str(),path.c_str())==0;
    if(!ok)remove(temporary.c_str());return ok;
}
bool readUpdateSession(const std::string& path,int& track,float& position,int& volume) {
    FILE* file=fopen(path.c_str(),"rb");if(!file)return false;char data[256]={};
    size_t size=fread(data,1,sizeof(data)-1,file);bool ok=!ferror(file)&&size<sizeof(data)-1;fclose(file);
    int t=0,v=0,end=0;float p=0;
    if(!ok||sscanf(data,"track=%d\nposition=%f\nvolume=%d\n%n",&t,&p,&v,&end)!=3||size_t(end)!=size||t< -1||!std::isfinite(p)||p<0||p>21600||v<0||v>100)return false;
    track=t;position=p;volume=v;return true;
}
