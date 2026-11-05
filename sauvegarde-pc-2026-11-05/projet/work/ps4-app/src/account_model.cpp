#include "account_model.h"
#define JSON_HAS_FILESYSTEM 0
#define JSON_HAS_EXPERIMENTAL_FILESYSTEM 0
#include "json.hpp"
#include <cstdio>
#include <fcntl.h>
#include <unistd.h>
#include <sys/stat.h>
namespace account {
using Json=nlohmann::json;
static Json bounded(const std::string& body) {
    if(body.size()>262144)return Json();
    unsigned depth=0;bool quoted=false,escaped=false;
    for(char c:body){if(quoted){if(escaped)escaped=false;else if(c=='\\')escaped=true;else if(c=='\"')quoted=false;continue;}
        if(c=='\"')quoted=true;else if(c=='{'||c=='['){if(++depth>64)return Json();}else if(c=='}'||c==']'){if(!depth)return Json();--depth;}}
    return Json::parse(body,nullptr,false);
}
static std::string text(const Json& json,const char* key){return json.is_object()&&json.contains(key)&&json[key].is_string()?json[key].get<std::string>():std::string();}
std::string passwordBody(const std::string& email,const std::string& password){return Json({{"email",email},{"password",password}}).dump();}
std::string refreshBody(const std::string& token){return Json({{"refresh_token",token}}).dump();}
bool parseSession(const std::string& body,Session& session) {
    auto json=bounded(body);if(!json.is_object()||!json.contains("user")||!json["user"].is_object())return false;
    Session value;value.access=text(json,"access_token");value.refresh=text(json,"refresh_token");
    value.id=text(json["user"],"id");value.email=text(json["user"],"email");
    if(json["user"].contains("user_metadata"))value.nickname=text(json["user"]["user_metadata"],"nickname");
    if(json.contains("expires_in")&&json["expires_in"].is_number_unsigned())value.expiresIn=json["expires_in"].get<uint64_t>();
    if(value.access.empty()||value.access.size()>16384||value.refresh.empty()||value.refresh.size()>4096||value.id.empty()||value.id.size()>128||value.expiresIn<1||value.expiresIn>86400)return false;
    session=std::move(value);return true;
}
void applyServerAccess(const std::string& body,View& view) {
    auto json=bounded(body);view.creator=false;view.moderator=false;view.permissionsKnown=false;
    if(!json.is_object())return;
    view.creator=json.contains("creator")&&json["creator"].is_boolean()&&json["creator"].get<bool>();
    view.moderator=json.contains("moderator")&&json["moderator"].is_boolean()&&json["moderator"].get<bool>();
    view.permissionsKnown=json.contains("creator")&&json["creator"].is_boolean()&&json.contains("moderator")&&json["moderator"].is_boolean();
}
bool saveRefresh(const std::string& path,const std::string& token) {
    if(token.empty()||token.size()>4096)return false;
    std::string temporary=path+".tmp";int fd=open(temporary.c_str(),O_WRONLY|O_CREAT|O_TRUNC,0600);if(fd<0)return false;
    fchmod(fd,0600);size_t offset=0;bool ok=true;
    while(offset<token.size()){ssize_t n=write(fd,token.data()+offset,token.size()-offset);if(n<=0){ok=false;break;}offset+=size_t(n);}
    if(ok)ok=fsync(fd)==0;
    if(close(fd)!=0)ok=false;
    if(ok)ok=rename(temporary.c_str(),path.c_str())==0;
    if(!ok)unlink(temporary.c_str());
    return ok;
}
std::string loadRefresh(const std::string& path) {
    FILE* file=fopen(path.c_str(),"rb");if(!file)return {};
    char buffer[4097];size_t n=fread(buffer,1,sizeof(buffer),file);bool ok=!ferror(file)&&n>0&&n<=4096;fclose(file);
    return ok?std::string(buffer,n):std::string();
}
}
