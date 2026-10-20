#include "native_thread.h"
#include <orbis/libkernel.h>

namespace native_thread {
int start(Thread& thread, Entry entry, const char* name) {
    if(thread.started || !entry) return -1;
    OrbisPthreadAttr attr{};
    int rc=scePthreadAttrInit(&attr);
    if(rc!=0) return rc;
    rc=scePthreadAttrSetstacksize(&attr,stackBytes);
    size_t configured=0;
    if(rc==0) rc=scePthreadAttrGetstacksize(&attr,&configured);
    if(rc==0 && configured<stackBytes) rc=-1;
    if(rc==0) {
        rc=scePthreadCreate(&thread.handle,&attr,entry,nullptr,name);
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
