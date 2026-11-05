#include "update_flow.h"
#include "update_policy.h"
namespace updates {
bool Flow::checking() {
    if(current==Phase::Downloading||current==Phase::Verifying||current==Phase::Preparing||current==Phase::Countdown||current==Phase::HandingOff||current==Phase::CloseApproved)return false;
    current=Phase::Checking;message.clear();return true;
}
bool Flow::offer(const std::string& value) {
    Version version;
    if(!parseVersion(value,version)||(current!=Phase::Checking&&current!=Phase::Deferred&&current!=Phase::Idle))return false;
    candidate=value;message.clear();current=Phase::Offered;return true;
}
bool Flow::download(){if(current!=Phase::Offered)return false;current=Phase::Downloading;return true;}
bool Flow::verify(){if(current!=Phase::Downloading)return false;current=Phase::Verifying;return true;}
bool Flow::verified(){if(current!=Phase::Verifying)return false;current=Phase::Preparing;return true;}
bool Flow::prepared(uint64_t now) {
    if(current!=Phase::Preparing)return false;
    constexpr uint64_t delay=10000;deadline=now>UINT64_MAX-delay?UINT64_MAX:now+delay;
    current=Phase::Countdown;return true;
}
bool Flow::postpone() {
    if(current!=Phase::Offered&&current!=Phase::Countdown&&current!=Phase::Deferred)return false;
    deadline=0;current=Phase::Deferred;return true;
}
bool Flow::handoffDue(uint64_t now) {
    if(current!=Phase::Countdown||now<deadline)return false;
    current=Phase::HandingOff;return true;
}
bool Flow::closeNow(){if(current!=Phase::Countdown)return false;current=Phase::HandingOff;return true;}
bool Flow::acceptHandoff(){if(current!=Phase::HandingOff)return false;current=Phase::CloseApproved;return true;}
unsigned Flow::secondsLeft(uint64_t now) const {
    if(current!=Phase::Countdown||now>=deadline)return 0;
    uint64_t ms=deadline-now;return unsigned(ms/1000+(ms%1000!=0));
}
void Flow::fail(const std::string& reason){message=reason;deadline=0;current=Phase::Error;}
void Flow::idle(){if(current==Phase::Checking||current==Phase::Deferred||current==Phase::Error||current==Phase::Offered){current=Phase::Idle;deadline=0;message.clear();}}
}
