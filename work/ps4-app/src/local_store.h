#pragma once
#include <string>
#include <vector>
#include <cstdint>
namespace local {
struct Entry { std::string name,path; bool directory; uint64_t bytes; };
bool directory(const std::string& path);
std::vector<Entry> list(const std::string& path);
// The final file is never replaced until a complete durable copy exists.
bool importFile(const std::string& source,const std::string& root,
                const std::string& name,std::string& error);
bool safeName(const std::string& name);
}
