#pragma once
#include <string>
namespace player {
bool init();
void open(const std::string& source);
void toggle();
void stop();
void seek(int seconds);
void shutdown();
struct State {std::string message;float position,duration;bool playing,busy;};
State state();
}
