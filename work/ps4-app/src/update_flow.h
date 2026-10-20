#pragma once
#include <cstdint>
#include <string>
namespace updates {
enum class Phase { Idle,Checking,Offered,Downloading,Verifying,Preparing,Countdown,Deferred,HandingOff,CloseApproved,Error };
class Flow {
    Phase current=Phase::Idle;
    std::string candidate,message;
    uint64_t deadline=0;
public:
    Phase phase() const { return current; }
    const std::string& version() const { return candidate; }
    const std::string& error() const { return message; }
    bool checking();
    bool offer(const std::string& version);
    bool download();
    bool verify();
    bool verified();
    bool prepared(uint64_t monotonicMs);
    bool postpone();
    bool handoffDue(uint64_t monotonicMs);
    bool closeNow();
    bool acceptHandoff();
    unsigned secondsLeft(uint64_t monotonicMs) const;
    void fail(const std::string& reason);
    void idle();
};
}
