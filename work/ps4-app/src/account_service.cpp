#include "account_service.h"
#include "public_backend_config.h"
#include "native_thread.h"
#include "https_client.h"
#include <orbis/libkernel.h>
#include <mutex>
#include <condition_variable>
#include <atomic>
#include <deque>
#include <algorithm>
#include <unistd.h>
namespace account {
struct Service::State {
    enum class Kind {Password,Refresh,Logout};
    struct Job {Kind kind;std::string first,second;unsigned epoch;};
    std::mutex lock;std::condition_variable wake;native_thread::Thread thread;
    std::atomic<bool> quit{false};std::deque<Job> jobs;View view;Session session;https::Client client;
    std::string path;unsigned epoch=0;uint64_t refreshAt=0;
    explicit State(std::string file):path(std::move(file)){}
    static void* entry(void* pointer){static_cast<State*>(pointer)->run();return nullptr;}
    bool enqueue(Job job) {
        if(!thread.started&&native_thread::start(thread,entry,"alus-account",this)!=0){view.busy=false;view.message="Service de compte indisponible.";++view.revision;return false;}
        jobs.push_back(std::move(job));wake.notify_one();return true;
    }
    bool post(const std::string& route,const std::string& body,const std::string& token,std::string& output,https::Result& result) {
        https::Headers headers={{"apikey",public_backend::key},{"Content-Type","application/json"}};
        if(!token.empty())headers.emplace_back("Authorization","Bearer "+token);
        output.clear();return client.fetch(public_backend::url+route,https::Purpose::Community,headers,body,true,262144,
            [&](const uint8_t* p,size_t n){output.append(reinterpret_cast<const char*>(p),n);return true;},result);
    }
    void run() {
        for(;;) {
            Job job;
            {std::unique_lock<std::mutex> guard(lock);wake.wait(guard,[&](){return quit||!jobs.empty();});if(quit)return;job=std::move(jobs.front());jobs.pop_front();}
            try {
                std::string body;https::Result result;
                if(job.kind==Kind::Logout){post("/auth/v1/logout?scope=local","{}",job.first,body,result);continue;}
                std::string payload=job.kind==Kind::Password?passwordBody(job.first,job.second):refreshBody(job.first);
                bool ok=post(job.kind==Kind::Password?"/auth/v1/token?grant_type=password":"/auth/v1/token?grant_type=refresh_token",payload,"",body,result);
                std::fill(job.second.begin(),job.second.end(),'\0');job.second.clear();std::fill(payload.begin(),payload.end(),'\0');payload.clear();
                Session received;ok=ok&&parseSession(body,received);body.clear();
                View next;next.connected=ok;next.email=ok?received.email:(job.kind==Kind::Password?job.first:std::string());next.nickname=received.nickname;
                if(ok) {
                    if(post("/rest/v1/rpc/au_account_access","{}",received.access,body,result))applyServerAccess(body,next);
                    next.message="Connecté au même compte que sur les autres plateformes.";
                }else next.message=(result.status==400||result.status==401)?"Connexion refusée. Vérifie l’adresse et le mot de passe.":"Le service de compte est indisponible. Réessaie.";
                std::lock_guard<std::mutex> guard(lock);
                if(job.epoch!=epoch)continue;
                if(!ok&&job.kind==Kind::Refresh&&result.status!=400&&result.status!=401) {
                    view.busy=false;view.message="Connexion réseau indisponible ; la session enregistrée est conservée.";++view.revision;
                    refreshAt=sceKernelGetProcessTime()/1000+60000;continue;
                }
                if(ok){session=std::move(received);refreshAt=sceKernelGetProcessTime()/1000+(session.expiresIn>60?session.expiresIn-60:1)*1000;
                    if(!saveRefresh(path,session.refresh))next.message="Connecté pour cette session ; l’enregistrement de la connexion a échoué.";}
                else {session={};refreshAt=0;if(job.kind==Kind::Refresh)unlink(path.c_str());}
                next.revision=view.revision+1;view=std::move(next);
            }catch(...){std::lock_guard<std::mutex> guard(lock);if(job.epoch==epoch){view.busy=false;view.creator=view.moderator=false;view.message="Impossible de terminer la connexion.";++view.revision;}}
        }
    }
};
Service::Service(const std::string& path):state(new State(path)){}
Service::~Service(){state->quit=true;state->client.cancel();state->wake.notify_all();if(native_thread::join(state->thread)!=0)state.release();}
void Service::restore(){std::lock_guard<std::mutex> guard(state->lock);std::string refresh=loadRefresh(state->path);if(refresh.empty())return;
    state->session.refresh=refresh;
    state->view.busy=true;state->view.message="Restauration de la connexion…";++state->view.revision;state->enqueue({State::Kind::Refresh,std::move(refresh),"",++state->epoch});}
void Service::signIn(std::string email,std::string password){std::lock_guard<std::mutex> guard(state->lock);if(state->view.busy)return;
    state->view.busy=true;state->view.message="Connexion en cours…";++state->view.revision;state->enqueue({State::Kind::Password,std::move(email),std::move(password),++state->epoch});}
void Service::signOut(){std::lock_guard<std::mutex> guard(state->lock);std::string token=state->session.access;state->session={};state->jobs.clear();++state->epoch;unlink(state->path.c_str());
    unsigned revision=state->view.revision+1;state->view={};state->view.revision=revision;state->view.message="Déconnecté de cette PS4.";
    if(!token.empty())state->enqueue({State::Kind::Logout,std::move(token),"",state->epoch});}
View Service::tick(uint64_t now){std::lock_guard<std::mutex> guard(state->lock);
    if(!state->session.refresh.empty()&&!state->view.busy&&now>=state->refreshAt){state->view.busy=true;++state->view.revision;state->enqueue({State::Kind::Refresh,state->session.refresh,"",state->epoch});}
    return state->view;
}
}
