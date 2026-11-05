#pragma once
#include <memory>
#include <string>
namespace updates {
// Native service calls require console validation. No uninstall or forced overwrite.
class Installer {
    struct State;
    std::unique_ptr<State> state;
public:
    Installer();~Installer();
    bool prepare(const std::string& packagePath,const std::string& version,std::string& error);
    bool start(std::string& error);
    void cancelPrepared();
};
}
