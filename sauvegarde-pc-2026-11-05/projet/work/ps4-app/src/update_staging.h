#pragma once
#include <cstddef>
#include <cstdint>
#include <memory>
#include <functional>
#include <string>
namespace updates {
bool verifyCachedPackage(const std::string& path,uint64_t bytes,const std::string& sha256,
                         const std::function<bool()>& cancelled={});
// Transactional download cache, never an application-directory writer.
class Staging {
    struct State;
    std::unique_ptr<State> state;
public:
    Staging(const std::string& cachePath,uint64_t expectedBytes,const std::string& sha256);
    ~Staging();
    Staging(const Staging&)=delete;
    Staging& operator=(const Staging&)=delete;
    bool append(const uint8_t*,size_t);
    bool finish();
    uint64_t received() const;
    const std::string& error() const;
};
}
