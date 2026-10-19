#include "settings.h"
#include <cstdio>
#include <cstring>
#include <unistd.h>
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
