#pragma once
#include "local_store.h"
#include <memory>
namespace local {
struct View {std::string path,message;std::vector<Entry> entries;bool busy=false,library=true;unsigned revision=0;};
class Service {
    struct State;std::unique_ptr<State> state;
public:
    explicit Service(const std::string& root);~Service();
    void browse(int source);void parent();void select(size_t index,unsigned revision);
    View snapshot();
    bool changed(unsigned revision,View& result);
};
}
