#include "update_flow.h"
#include <cassert>
#include <cstdio>
using updates::Flow;using updates::Phase;
static Flow ready(uint64_t now) {
    Flow flow;assert(flow.checking());assert(flow.offer("1.0.1"));assert(flow.download());assert(flow.verify());assert(flow.verified());assert(flow.prepared(now));return flow;
}
int main() {
    Flow invalid;assert(!invalid.prepared(0));assert(!invalid.closeNow());assert(!invalid.acceptHandoff());
    assert(invalid.checking());assert(!invalid.offer("1.0.1-test"));
    auto flow=ready(4000);assert(flow.secondsLeft(4000)==10);assert(flow.secondsLeft(4001)==10);assert(flow.secondsLeft(5000)==9);
    assert(!flow.handoffDue(13999));assert(flow.secondsLeft(13999)==1);assert(flow.handoffDue(14000));
    assert(!flow.handoffDue(15000));assert(flow.phase()==Phase::HandingOff);assert(flow.phase()!=Phase::CloseApproved);
    flow.fail("Installation refusée par la console");assert(flow.phase()==Phase::Error);assert(!flow.acceptHandoff());
    auto later=ready(0);assert(later.postpone());assert(!later.handoffDue(1000000));assert(!later.closeNow());
    assert(later.offer("1.0.1"));assert(later.download());assert(!later.prepared(10));assert(later.verify());assert(later.verified());assert(later.prepared(50000));
    assert(later.secondsLeft(50000)==10);assert(later.closeNow());assert(!later.closeNow());assert(later.acceptHandoff());assert(!later.acceptHandoff());
    auto cancelled=ready(0);assert(cancelled.postpone());assert(!cancelled.handoffDue(10000));
    auto overflow=ready(UINT64_MAX-5000);assert(overflow.secondsLeft(UINT64_MAX-5000)==5);assert(overflow.handoffDue(UINT64_MAX));
    puts("Ten-second countdown, postpone, immediate handoff and refusal-without-exit passed.");
}
