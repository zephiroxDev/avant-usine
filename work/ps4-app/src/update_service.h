#pragma once
#include "update_flow.h"
#include <memory>
#include <string>
namespace updates {
struct Snapshot {
    Phase phase=Phase::Idle;std::string version,message;
    uint64_t received=0,total=0;
    unsigned seconds=0;
    bool notify=false,needsSave=false;
};
class Service {
    struct State;std::unique_ptr<State> state;
public:
    Service(const std::string& storageRoot,const std::string& installedVersion);
    ~Service();
    bool start();
    void check(bool manual=true);
    void choose(int choice,uint64_t monotonicMs); // Offer: 0 later, 1 skip, 2 install.
    void readyChoice(int choice,uint64_t monotonicMs); // Ready: 0 later, 1 close now.
    void authorizeHandoff(bool saveSucceeded);
    Snapshot tick(uint64_t monotonicMs);
};
}
