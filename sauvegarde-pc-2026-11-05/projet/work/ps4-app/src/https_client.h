#pragma once
#include "url_policy.h"
#include <cstdint>
#include <cstddef>
#include <functional>
#include <memory>
#include <string>
#include <utility>
#include <vector>
namespace https {
struct Result { int status=0;uint64_t bytes=0;std::string error; };
using Headers=std::vector<std::pair<std::string,std::string>>;
using Sink=std::function<bool(const uint8_t*,size_t)>;
// One worker owns init/fetch/destruction. cancel() may be called from the UI thread.
// Run the worker with native_thread::start (2 MiB), not a default std::thread.
class Client {
    struct State;
    std::unique_ptr<State> state;
public:
    Client();
    ~Client();
    Client(const Client&)=delete;
    Client& operator=(const Client&)=delete;
    bool fetch(const std::string& url,Purpose,const Headers&,const std::string& body,
               bool post,uint64_t limit,const Sink&,Result&);
    void cancel();
};
}
