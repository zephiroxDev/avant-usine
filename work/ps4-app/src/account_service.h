#pragma once
#include "account_model.h"
#include <memory>
namespace account {
class Service {
    struct State;std::unique_ptr<State> state;
public:
    explicit Service(const std::string& sessionPath);~Service();
    void restore();void signIn(std::string email,std::string password);void signOut();
    View tick(uint64_t milliseconds);
};
}
