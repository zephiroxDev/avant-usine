#include "native_thread.h"
#include <cassert>
#include <cstdio>
#include <cstring>
static int fail=0,destroyed=0,created=0,joined=0;
static size_t configured=0;
static int attrObject,threadObject;
static void* entry(void*) {return nullptr;}
int scePthreadAttrInit(OrbisPthreadAttr* a){if(fail==1)return -101;*a=&attrObject;return 0;}
int scePthreadAttrSetstacksize(OrbisPthreadAttr* a,size_t n){assert(*a==&attrObject);configured=n;return fail==2?-102:0;}
int scePthreadAttrGetstacksize(const OrbisPthreadAttr* a,size_t* n){assert(*a==&attrObject);*n=fail==4?65536:configured;return fail==3?-103:0;}
int scePthreadAttrDestroy(OrbisPthreadAttr* a){assert(*a==&attrObject);++destroyed;return fail==6?-106:0;}
int scePthreadCreate(OrbisPthread* t,const OrbisPthreadAttr* a,void*(*f)(void*),void* p,const char* name){
    assert(*a==&attrObject&&f==entry&&p==nullptr&&!std::strcmp(name,"test"));
    assert(configured==2*1024*1024);++created;
    if(fail==5)return -105;*t=&threadObject;return 0;
}
int scePthreadJoin(OrbisPthread t,void** out){assert(t==&threadObject&&out==nullptr);++joined;return fail==7?-107:0;}
int main(){
    using namespace native_thread;
    for(int error=1;error<=5;++error){
        fail=error;destroyed=created=joined=0;Thread t;
        assert(start(t,entry,"test")!=0&&!t.started);
        assert(destroyed==(error==1?0:1));assert(created==(error==5?1:0));
        assert(join(t)==0&&joined==0);
    }
    fail=6;destroyed=created=joined=0;Thread t;
    assert(start(t,entry,"test")==0&&t.started&&destroyed==1&&created==1);
    assert(start(t,entry,"test")!=0&&created==1);
    fail=7;assert(join(t)==-107&&t.started);
    fail=0;assert(join(t)==0&&!t.started&&t.handle==nullptr&&joined==2);
    assert(join(t)==0&&joined==2);
    assert(start(t,nullptr,"test")!=0);
    std::puts("Explicit thread stack and failure cleanup verified.");
}
