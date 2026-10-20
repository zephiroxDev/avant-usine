#include "url_policy.h"
namespace https {
std::string host(const std::string& url) {
    if(url.size()>4096||url.compare(0,8,"https://")!=0)return {};
    for(unsigned char c:url)if(c<=32||c==127||c=='\\')return {};
    size_t end=url.find('/',8);if(end==std::string::npos||end==8)return {};
    std::string result=url.substr(8,end-8);
    for(char& c:result){if(c>='A'&&c<='Z')c+=32;
        if(!((c>='a'&&c<='z')||(c>='0'&&c<='9')||c=='.'||c=='-'))return {};}
    return result;
}
bool trusted(const std::string& url,Purpose purpose) {
    auto name=host(url);if(name.empty())return false;
    if(purpose==Purpose::Community)return name=="djjfzymrkncwhrocpxjo.supabase.co";
    return name=="api.github.com"||name=="github.com"||name=="release-assets.githubusercontent.com"||name=="objects.githubusercontent.com";
}
std::string redirect(const std::string& source,const std::string& location,Purpose purpose) {
    if(!trusted(source,purpose)||purpose==Purpose::Community||location.empty())return {};
    std::string target=location;
    if(target[0]=='/') {
        if(target.size()>1&&target[1]=='/')return {};
        target=source.substr(0,source.find('/',8))+target;
    }
    return trusted(target,purpose)?target:std::string();
}
bool validHeader(const std::string& name,const std::string& value) {
    if(name.empty()||name.size()>128||value.size()>16384)return false;
    for(unsigned char c:name)if(!((c>='A'&&c<='Z')||(c>='a'&&c<='z')||(c>='0'&&c<='9')||c=='-'))return false;
    for(unsigned char c:value)if(c<32||c==127)return false;
    return true;
}
}
