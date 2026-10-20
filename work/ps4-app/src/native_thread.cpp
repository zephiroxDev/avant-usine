#include "native_thread.h"
#include <orbis/libkernel.h>
#include <cstddef>

// OpenOrbis 0.5.4 links musl, but scePthreadCreate bypasses musl's
// pthread_create bookkeeping. Without this flag malloc/free skip their locks.
// Layout verified against the pinned SDK ELF (__libc size 112, flag offset 12)
// and OpenOrbis/musl src/internal/libc.h. Keep locking enabled for process life.
#if defined(__FreeBSD__) && defined(__x86_64__)
extern "C" {
struct AlusMuslRuntime {
    int canDoThreads,threaded,secure;volatile int threadsMinusOne;
    void* auxv;void* tlsHead;size_t tlsSize,tlsAlign,tlsCount,pageSize;
    const void* locale[6];
};
extern AlusMuslRuntime __libc;
}
static_assert(sizeof(AlusMuslRuntime)==112 && offsetof(AlusMuslRuntime,threadsMinusOne)==12,"Pinned musl runtime ABI changed");
#endif

namespace native_thread {
int start(Thread& thread, Entry entry, const char* name, void* argument) {
    if(thread.started || !entry) return -1;
#if defined(__FreeBSD__) && defined(__x86_64__)
    int expected=0;
    __atomic_compare_exchange_n(&__libc.threadsMinusOne,&expected,1,false,__ATOMIC_SEQ_CST,__ATOMIC_SEQ_CST);
#endif
    OrbisPthreadAttr attr{};
    int rc=scePthreadAttrInit(&attr);
    if(rc!=0) return rc;
    rc=scePthreadAttrSetstacksize(&attr,stackBytes);
    size_t configured=0;
    if(rc==0) rc=scePthreadAttrGetstacksize(&attr,&configured);
    if(rc==0 && configured<stackBytes) rc=-1;
    if(rc==0) {
        rc=scePthreadCreate(&thread.handle,&attr,entry,argument,name);
        if(rc==0) thread.started=true;
    }
    // Attributes are copied by create; a destroy error must not hide a live thread.
    scePthreadAttrDestroy(&attr);
    return rc;
}
int join(Thread& thread) {
    if(!thread.started) return 0;
    int rc=scePthreadJoin(thread.handle,nullptr);
    if(rc==0) {thread.started=false;thread.handle={};}
    return rc;
}
}
