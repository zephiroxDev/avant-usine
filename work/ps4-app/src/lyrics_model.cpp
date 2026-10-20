#include "lyrics_model.h"
#define JSON_HAS_FILESYSTEM 0
#define JSON_HAS_EXPERIMENTAL_FILESYSTEM 0
#include "json.hpp"
#include <algorithm>
#include <cmath>
#include <map>
namespace lyrics {
using Json=nlohmann::json;
size_t characterCount(const std::string& text) {size_t n=0;for(unsigned char c:text)if((c&0xc0)!=0x80)++n;return n;}
std::string prefix(const std::string& text,size_t characters) {
    size_t seen=0,i=0;for(;i<text.size();++i)if((static_cast<unsigned char>(text[i])&0xc0)!=0x80&&seen++==characters)break;
    return text.substr(0,i);
}
static double numeric(const Json& value,double fallback=-1) {return value.is_number()&&std::isfinite(value.get<double>())?value.get<double>():fallback;}
static double item(const Json& object,const char* key,size_t index) {
    return object.contains(key)&&object[key].is_array()&&index<object[key].size()?numeric(object[key][index]):-1;
}
bool parse(const std::string& body,Document& output,std::string& error) {
    error.clear();if(body.size()>4*1024*1024){error="Paroles trop volumineuses";return false;}
    unsigned depth=0;bool quoted=false,escaped=false;
    for(char c:body){if(quoted){if(escaped)escaped=false;else if(c=='\\')escaped=true;else if(c=='\"')quoted=false;continue;}
        if(c=='\"')quoted=true;else if(c=='{'||c=='['){if(++depth>64){error="Structure des paroles trop profonde";return false;}}
        else if(c=='}'||c==']'){if(!depth){error="Structure des paroles invalide";return false;}--depth;}}
    auto json=Json::parse(body,nullptr,false);
    if(!json.is_object()||!json.contains("lines")||!json["lines"].is_array()||json["lines"].size()>4096){error="Paroles indisponibles ou invalides";return false;}
    Document doc;doc.duration=json.contains("duration")?numeric(json["duration"]):-1;
    if(doc.duration<=0||doc.duration>86400){error="Durée des paroles invalide";return false;}
    doc.highlight=json.contains("sync_mode")&&json["sync_mode"].is_string()&&json["sync_mode"].get<std::string>()=="highlight";
    std::map<std::string,bool> voices;
    if(json.contains("tracks")&&json["tracks"].is_array())for(const auto& voice:json["tracks"])
        if(voice.is_object()&&voice.contains("id")&&voice["id"].is_string()&&voice.contains("kind")&&voice["kind"].is_string())voices[voice["id"].get<std::string>()]=voice["kind"].get<std::string>()!="main";
    for(size_t i=0;i<json["lines"].size();++i) {
        if(!json["lines"][i].is_string()){error="Texte de phrase invalide";return false;}
        Line line;line.text=json["lines"][i].get<std::string>();if(line.text.size()>65536){error="Phrase trop volumineuse";return false;}
        line.start=item(json,"times",i);line.end=item(json,"line_ends",i);
        if(json.contains("line_tracks")&&json["line_tracks"].is_array()&&i<json["line_tracks"].size()&&json["line_tracks"][i].is_string())line.voice=json["line_tracks"][i].get<std::string>();
        line.back=voices[line.voice];
        if(doc.highlight&&json.contains("curves")&&json["curves"].is_array()&&i<json["curves"].size()&&json["curves"][i].is_array()) {
            double lastCharacter=-1,lastTime=-1;auto count=characterCount(line.text);
            for(const auto& point:json["curves"][i]) {
                if(!point.is_array()||point.size()!=2){error="Point de synchronisation invalide";return false;}
                double c=numeric(point[0]),t=numeric(point[1]);
                if(c<0||c>count||c<lastCharacter||t<0||t<lastTime||t>doc.duration){error="Minutage de synchronisation invalide";return false;}
                line.points.push_back({c,t});lastCharacter=c;lastTime=t;
            }
            if(!line.points.empty()){if(line.start<0)line.start=line.points.front().time;if(line.end<0)line.end=line.points.back().time;}
        }
        if(line.start<0||line.start>doc.duration){error="Début de phrase invalide";return false;}
        if(line.end<0) {
            line.end=doc.duration;
            for(size_t j=0;j<json["lines"].size();++j){double next=item(json,"times",j);if(next>line.start)line.end=std::min(line.end,next);}
        }
        if(line.end<line.start||line.end>doc.duration){error="Fin de phrase invalide";return false;}
        doc.lines.push_back(std::move(line));
    }
    output=std::move(doc);return true;
}
size_t revealed(const Line& line,double time,bool highlight) {
    if(!std::isfinite(time)||time<line.start)return 0;
    auto count=characterCount(line.text);
    if(time>=line.end)return count;
    if(!highlight||line.points.empty())return count;
    if(time>=line.points.back().time)return count;
    Point previous=line.points.front();if(time<=previous.time)return size_t(previous.character);
    for(const auto& next:line.points){if(next.time>=time){double span=next.time-previous.time;double c=span>0?previous.character+(next.character-previous.character)*(time-previous.time)/span:next.character;return std::min(count,size_t(std::max(0.0,std::ceil(c))));}previous=next;}
    return count;
}
std::vector<size_t> active(const Document& document,double time) {
    std::vector<size_t> result;if(!std::isfinite(time))return result;
    for(size_t i=0;i<document.lines.size();++i)if(time>=document.lines[i].start&&time<document.lines[i].end)result.push_back(i);
    return result;
}
}
