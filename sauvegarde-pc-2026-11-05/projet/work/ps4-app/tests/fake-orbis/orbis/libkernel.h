#pragma once
#include <cstddef>
#include "_types/pthread.h"
int scePthreadAttrInit(OrbisPthreadAttr*);
int scePthreadAttrSetstacksize(OrbisPthreadAttr*,size_t);
int scePthreadAttrGetstacksize(const OrbisPthreadAttr*,size_t*);
int scePthreadAttrDestroy(OrbisPthreadAttr*);
int scePthreadCreate(OrbisPthread*,const OrbisPthreadAttr*,void*(*)(void*),void*,const char*);
int scePthreadJoin(OrbisPthread,void**);
