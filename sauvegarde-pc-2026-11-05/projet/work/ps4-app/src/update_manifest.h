#pragma once
#include <string>
#include <cstdint>
#include <cstddef>
namespace updates {
struct Release {
    std::string version,tag,manifestUrl,packageUrl,packageName,sha256,appVersion;
    uint64_t bytes=0;
};
bool selectRelease(const std::string& githubJson,Release& result,std::string& error,size_t* entries=nullptr);
bool validateManifest(const std::string& manifestJson,Release& release,std::string& error);
}
