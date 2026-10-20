#include "lyrics_service.h"
#include "native_thread.h"
#include "https_client.h"
#include "public_backend_config.h"
#include <mutex>
#include <condition_variable>
#include <atomic>
namespace lyrics {
struct Service::State {
    std::mutex lock;std::condition_variable wake;native_thread::Thread thread;
    std::atomic<bool> quit{false};bool pending=false;unsigned requestId=0;
    Snapshot current;https::Client client;
    static void* entry(void* pointer){static_cast<State*>(pointer)->run();return nullptr;}
    void run() {
        for(;;) {
            std::string key;unsigned id;
            {std::unique_lock<std::mutex> guard(lock);wake.wait(guard,[&](){return quit||pending;});if(quit)return;
                key=current.key;id=requestId;pending=false;}
            try {
            std::string body,error;https::Result result;std::shared_ptr<Document> document;
            // Keys come from the public catalogue and are never interpolated from account text.
            bool valid=!key.empty()&&key.size()<40&&key.find_first_not_of("0123456789:")==std::string::npos;
            bool ok=valid&&client.fetch(public_backend::url+std::string("/rest/v1/rpc/au_sync"),https::Purpose::Community,
                {{"apikey",public_backend::key},{"Content-Type","application/json"}},
                "{\"p_action\":\"published\",\"p\":{\"track\":\""+key+"\"}}",true,4*1024*1024,
                [&](const uint8_t* p,size_t n){body.append(reinterpret_cast<const char*>(p),n);return true;},result);
            if(ok&&body!="null"){document=std::make_shared<Document>();ok=parse(body,*document,error);}
            if(!ok&&error.empty())error=result.error.empty()?"Impossible de charger les paroles publiées.":result.error;
            {std::lock_guard<std::mutex> guard(lock);if(id!=requestId)continue;
                current.loading=false;current.document=ok?document:nullptr;
                current.message=ok?(document?"":"Aucune synchronisation publiée pour ce morceau."):error;++current.revision;}
            }catch(...){std::lock_guard<std::mutex> guard(lock);if(id==requestId){current.loading=false;current.document.reset();current.message="Impossible de lire les paroles publiées.";++current.revision;}}
        }
    }
};
Service::Service():state(new State){}
Service::~Service(){state->quit=true;state->client.cancel();state->wake.notify_all();if(native_thread::join(state->thread)!=0)state.release();}
void Service::request(const std::string& key) {
    std::lock_guard<std::mutex> guard(state->lock);
    if(state->current.key==key&&(state->current.loading||state->current.document))return;
    if(!state->thread.started&&native_thread::start(state->thread,State::entry,"alus-lyrics",state.get())!=0) {
        state->current={key,"Service des paroles indisponible.",nullptr,state->current.revision+1,false};return;
    }
    state->current={key,"Chargement des paroles…",nullptr,state->current.revision+1,true};
    ++state->requestId;state->pending=true;state->wake.notify_one();
}
Snapshot Service::snapshot(){std::lock_guard<std::mutex> guard(state->lock);return state->current;}
}
