#include "update_manifest.h"
#include "update_policy.h"
#define JSON_HAS_FILESYSTEM 0
#define JSON_HAS_EXPERIMENTAL_FILESYSTEM 0
#include "json.hpp"
namespace updates {
using Json=nlohmann::json;
static std::string text(const Json& object,const char* key) {
    return object.contains(key)&&object[key].is_string()?object[key].get<std::string>():std::string();
}
static uint64_t number(const Json& object,const char* key) {
    return object.contains(key)&&object[key].is_number_unsigned()?object[key].get<uint64_t>():0;
}
static bool flag(const Json& object,const char* key,bool expected) {
    return object.contains(key)&&object[key].is_boolean()&&object[key].get<bool>()==expected;
}
static bool assetUrl(const std::string& url,const std::string& tag,const std::string& name) {
    return url=="https://github.com/zephiroxDev/avant-usine/releases/download/"+tag+"/"+name;
}
static bool boundedJson(const std::string& body) {
    unsigned depth=0;bool quoted=false,escaped=false;
    for(char c:body) {
        if(quoted){if(escaped)escaped=false;else if(c=='\\')escaped=true;else if(c=='"')quoted=false;continue;}
        if(c=='"')quoted=true;
        else if(c=='{'||c=='['){if(++depth>64)return false;}
        else if(c=='}'||c==']'){if(!depth)return false;--depth;}
    }
    return !quoted&&depth==0;
}
bool selectRelease(const std::string& body,Release& output,std::string& error,size_t* entries) {
    error.clear();if(body.size()>4*1024*1024){error="Liste de versions trop volumineuse";return false;}
    if(!boundedJson(body)){error="Liste de versions invalide";return false;}
    auto data=Json::parse(body,nullptr,false);if(!data.is_array()){error="Liste de versions invalide";return false;}
    if(entries)*entries=data.size();
    bool found=false;Version best{};Release selected;
    for(const auto& item:data) {
        if(!item.is_object()||!flag(item,"draft",false)||!flag(item,"prerelease",false))continue;
        std::string tag=text(item,"tag_name");if(tag.compare(0,5,"ps4-v")!=0)continue;
        std::string value=tag.substr(5);Version parsed;
        if(value.empty()||value[0]<'0'||value[0]>'9'||!parseVersion(value,parsed))continue;
        if(!item.contains("assets")||!item["assets"].is_array())continue;
        Release candidate;candidate.version=value;candidate.tag=tag;candidate.packageName="Avant-Usine-PS4-"+value+".pkg";
        for(const auto& asset:item["assets"]) {
            if(!asset.is_object())continue;
            const auto name=text(asset,"name"),url=text(asset,"browser_download_url");
            if(name=="ps4-update.json"&&assetUrl(url,tag,name))candidate.manifestUrl=url;
            if(name==candidate.packageName&&assetUrl(url,tag,name)){candidate.packageUrl=url;candidate.bytes=number(asset,"size");}
        }
        if(candidate.manifestUrl.empty()||candidate.packageUrl.empty()||candidate.bytes<16384||candidate.bytes>512ULL*1024*1024)continue;
        if(!found||compare(parsed,best)>0){selected=candidate;best=parsed;found=true;}
    }
    if(found)output=selected;else output={};return true;
}
bool validateManifest(const std::string& body,Release& release,std::string& error) {
    error.clear();if(body.size()>16384){error="Manifeste trop volumineux";return false;}
    if(!boundedJson(body)){error="Manifeste invalide";return false;}
    auto data=Json::parse(body,nullptr,false);
    if(!data.is_object()||text(data,"platform")!="ps4"||!flag(data,"native",true)||!flag(data,"browser",false)||
       text(data,"titleId")!="ALUS00001"||text(data,"contentId")!="IV0000-ALUS00001_00-AVANTUSINEPS4001"||
       text(data,"version")!=release.version||text(data,"package")!=release.packageName||number(data,"bytes")!=release.bytes) {
        error="Manifeste PS4 incohérent avec la version publiée";return false;
    }
    auto hash=text(data,"sha256"),app=text(data,"appVersion");
    bool valid=hash.size()==64&&app.size()==5&&app[2]=='.';
    for(char c:hash)valid=valid&&((c>='a'&&c<='f')||(c>='0'&&c<='9'));
    for(size_t i=0;i<app.size();++i)if(i!=2)valid=valid&&app[i]>='0'&&app[i]<='9';
    if(!valid){error="Empreinte ou version système du paquet invalide";return false;}
    release.sha256=hash;release.appVersion=app;return true;
}
}
