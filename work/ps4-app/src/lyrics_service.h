#pragma once
#include "lyrics_model.h"
#include <memory>
namespace lyrics {
struct Snapshot {std::string key,message;std::shared_ptr<const Document> document;unsigned revision=0;bool loading=false;};
class Service {
    struct State;std::unique_ptr<State> state;
public:
    Service();~Service();
    void request(const std::string& key);
    Snapshot snapshot();
};
}
