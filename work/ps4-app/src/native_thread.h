#pragma once
#include <orbis/_types/pthread.h>
#include <cstddef>

namespace native_thread {
// The decoder and HTTPS code must never inherit the platform's small default.
constexpr size_t stackBytes = 2 * 1024 * 1024;
struct Thread { OrbisPthread handle{}; bool started=false; };
using Entry = void* (*)(void*);
int start(Thread& thread, Entry entry, const char* name);
int join(Thread& thread);
}
