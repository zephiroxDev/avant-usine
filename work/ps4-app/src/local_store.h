#pragma once
#include <string>
#include <vector>
#include <cstdint>
#include <functional>
namespace local {
struct Entry { std::string name,path; bool directory; uint64_t bytes; };
bool directory(const std::string& path);
std::vector<Entry> list(const std::string& path);
// The final file is never replaced until a complete durable copy exists.
bool importFile(const std::string& source,const std::string& root,
                const std::string& name,std::string& error,
                const std::function<bool(uint64_t,uint64_t)>& progress={});
bool safeName(const std::string& name);
inline std::string displayName(std::string name) {
    auto dot=name.find_last_of('.');if(dot!=std::string::npos)name.resize(dot);
    size_t i=0;while(i<name.size()&&((name[i]>='0'&&name[i]<='9')||name[i]==' '||name[i]=='-'||name[i]=='_'||name[i]=='.'))++i;
    return i<name.size()?name.substr(i):name;
}
}
