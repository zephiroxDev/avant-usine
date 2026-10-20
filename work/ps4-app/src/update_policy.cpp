#include "update_policy.h"
#include <cstdio>
#include <limits>
#include <unistd.h>
#include <utility>
namespace updates {
bool parseVersion(const std::string& input,Version& result) {
    if(input.empty()||input.size()>32)return false;
    size_t pos=input[0]=='v'?1:0;
    unsigned values[3]={0,0,0};
    for(unsigned field=0;field<3;++field) {
        size_t start=pos;
        while(pos<input.size()&&input[pos]>='0'&&input[pos]<='9') {
            unsigned digit=unsigned(input[pos]-'0');
            if(values[field]>(std::numeric_limits<unsigned>::max()-digit)/10)return false;
            values[field]=values[field]*10+digit;++pos;
        }
        if(pos==start||(pos-start>1&&input[start]=='0'))return false;
        if(field<2) { if(pos==input.size()||input[pos++]!='.')return false; }
    }
    if(pos!=input.size())return false; // No test/prerelease builds in the public updater.
    result={values[0],values[1],values[2]};return true;
}
int compare(const Version& a,const Version& b) {
    if(a.major!=b.major)return a.major<b.major?-1:1;
    if(a.minor!=b.minor)return a.minor<b.minor?-1:1;
    return a.patch==b.patch?0:(a.patch<b.patch?-1:1);
}
Policy::Policy(std::string value) {
    Version version;if(parseVersion(value,version))skipped=std::move(value);
}
bool Policy::shouldOffer(const std::string& installed,const std::string& available,uint64_t now) const {
    Version current,next,ignored;
    if(!parseVersion(installed,current)||!parseVersion(available,next)||compare(next,current)<=0)return false;
    if(parseVersion(skipped,ignored)&&compare(next,ignored)<=0)return false;
    // A later release bypasses a reminder for an older one.
    Version postponed;
    return !parseVersion(delayed,postponed)||compare(next,postponed)!=0||now>=remindAt;
}
bool Policy::choose(Choice choice,const std::string& available,uint64_t now) {
    Version version;if(!parseVersion(available,version))return false;
    if(choice==Choice::Skip) { skipped=available;delayed.clear();remindAt=0; }
    else if(choice==Choice::Later) {
        delayed=available;
        constexpr uint64_t delay=30*60;
        remindAt=now>UINT64_MAX-delay?UINT64_MAX:now+delay;
    } else { delayed.clear();remindAt=0; }
    return true;
}
bool saveSkippedVersion(const std::string& path,const std::string& value) {
    Version version;if(!value.empty()&&!parseVersion(value,version))return false;
    const std::string temporary=path+".tmp",data="skipped="+value+"\n";
    FILE* file=fopen(temporary.c_str(),"wb");if(!file)return false;
    bool ok=fwrite(data.data(),1,data.size(),file)==data.size()&&fflush(file)==0;
    if(ok)ok=fsync(fileno(file))==0;
    if(fclose(file)!=0)ok=false;
    if(ok)ok=rename(temporary.c_str(),path.c_str())==0;
    if(!ok)remove(temporary.c_str());return ok;
}
std::string loadSkippedVersion(const std::string& path) {
    FILE* file=fopen(path.c_str(),"rb");if(!file)return {};
    char buffer[64];size_t size=fread(buffer,1,sizeof(buffer),file);bool ok=!ferror(file);fclose(file);
    if(!ok||size<9||size==sizeof(buffer))return {};
    std::string data(buffer,size);if(data.compare(0,8,"skipped=")!=0||data.back()!='\n')return {};
    std::string value=data.substr(8,data.size()-9);Version version;
    return parseVersion(value,version)?value:std::string();
}
}
