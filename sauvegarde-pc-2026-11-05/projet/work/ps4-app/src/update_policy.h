#pragma once
#include <cstdint>
#include <string>
namespace updates {
struct Version { unsigned major=0,minor=0,patch=0; };
bool parseVersion(const std::string&,Version&);
int compare(const Version&,const Version&);
enum class Choice { Later, Skip, Install };
class Policy {
    std::string skipped;
    std::string delayed;
    uint64_t remindAt=0;
public:
    explicit Policy(std::string skippedVersion="");
    bool shouldOffer(const std::string& installed,const std::string& available,uint64_t uptimeSeconds) const;
    // Install is a request, never a claim that the OS has installed the package.
    bool choose(Choice,const std::string& available,uint64_t uptimeSeconds);
    const std::string& skippedVersion() const { return skipped; }
};
bool saveSkippedVersion(const std::string& path,const std::string& version);
std::string loadSkippedVersion(const std::string& path);
}
