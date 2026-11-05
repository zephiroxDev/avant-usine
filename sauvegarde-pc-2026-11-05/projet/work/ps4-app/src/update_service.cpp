#include "update_service.h"
#include "update_policy.h"
#include "update_manifest.h"
#include "update_staging.h"
#include "update_installer.h"
#include "https_client.h"
#include "native_thread.h"
#include <orbis/libkernel.h>
#include <condition_variable>
#include <mutex>
#include <atomic>
#include <deque>
#include <cstdio>
#include <cstring>
namespace updates {
struct Service::State {
    enum class Job {Check,Download,Cancel,Start};
    std::mutex lock;std::condition_variable wake;std::deque<Job> jobs;
    native_thread::Thread thread;std::atomic<bool> quit{false};
    https::Client client;Installer installer;
    Flow flow;Policy policy;Release release;
    std::string root,installed,message;
    bool notify=false,prepared=false,startQueued=false;
    uint64_t received=0,nextCheck=0;
    State(std::string directory,std::string version):policy(loadSkippedVersion(directory+"/update-policy.ini")),root(std::move(directory)),installed(std::move(version)){}
    void enqueue(Job job){jobs.push_back(job);wake.notify_one();} // lock held
    void fail(std::string error){std::lock_guard<std::mutex> guard(lock);flow.fail(error);message=std::move(error);prepared=false;}
    bool get(const std::string& url,uint64_t cap,std::string& body,std::string& error) {
        https::Result result;body.clear();
        bool ok=client.fetch(url,https::Purpose::Updates,{{"Accept","application/json"},{"Cache-Control","no-cache"}},"",false,cap,
            [&](const uint8_t* p,size_t n){body.append(reinterpret_cast<const char*>(p),n);return true;},result);
        if(!ok)error=result.error;return ok;
    }
    void checkRelease() {
        Release latest;std::string error,body;bool complete=false;
        for(unsigned page=1;page<=10&&!quit;++page) {
            if(!get("https://api.github.com/repos/zephiroxDev/avant-usine/releases?per_page=100&page="+std::to_string(page),4*1024*1024,body,error)){fail(error);return;}
            Release candidate;size_t entries=0;
            if(!selectRelease(body,candidate,error,&entries)){fail(error);return;}
            Version a,b;
            if(!candidate.version.empty()&&(latest.version.empty()||(parseVersion(candidate.version,a)&&parseVersion(latest.version,b)&&compare(a,b)>0)))latest=candidate;
            if(entries<100){complete=true;break;}
        }
        if(quit)return;
        if(!complete){fail("La liste des versions est trop longue pour garantir la dernière version.");return;}
        if(!latest.version.empty()) {
            if(!get(latest.manifestUrl,16384,body,error)||!validateManifest(body,latest,error)){fail(error);return;}
        }
        std::lock_guard<std::mutex> guard(lock);release=latest;received=0;
        uint64_t now=sceKernelGetProcessTime()/1000;nextCheck=now+6*60*60*1000;
        if(!latest.version.empty()&&policy.shouldOffer(installed,latest.version,now/1000))flow.offer(latest.version);
        else {flow.idle();message="Aucune nouvelle version PS4 disponible.";}
    }
    void downloadRelease() {
        Release target;{std::lock_guard<std::mutex> guard(lock);target=release;}
        std::string error;
        if(!verifyCachedPackage(root+"/update.pkg",target.bytes,target.sha256,[&](){return bool(quit);})) {
            Staging staging(root+"/update.pkg",target.bytes,target.sha256);https::Result result;
            if(!staging.error().empty()){fail(staging.error());return;}
            bool ok=client.fetch(target.packageUrl,https::Purpose::Updates,{},"",false,target.bytes,
                [&](const uint8_t* p,size_t n){if(!staging.append(p,n))return false;
                    std::lock_guard<std::mutex> guard(lock);received=staging.received();return true;},result);
            if(!ok){fail(staging.error().empty()?result.error:staging.error());return;}
            {std::lock_guard<std::mutex> guard(lock);flow.verify();message="Vérification du paquet…";}
            if(!staging.finish()){fail(staging.error());return;}
        }else {std::lock_guard<std::mutex> guard(lock);flow.verify();received=target.bytes;}
        if(quit)return;
        {std::lock_guard<std::mutex> guard(lock);flow.verified();message="Préparation de l’installation PS4…";}
        if(!installer.prepare(root+"/update.pkg",target.version,error)){fail(error);return;}
        std::lock_guard<std::mutex> guard(lock);prepared=true;
        // The UI starts the ten visible seconds on its next tick.
    }
    void run() {
        for(;;) {
            Job job;
            {std::unique_lock<std::mutex> guard(lock);wake.wait(guard,[&](){return quit||!jobs.empty();});if(quit)break;job=jobs.front();jobs.pop_front();}
            try {
                if(job==Job::Check)checkRelease();else if(job==Job::Download)downloadRelease();
                else if(job==Job::Cancel)installer.cancelPrepared();
                else {std::string error;if(!installer.start(error))fail(error);
                    else {std::lock_guard<std::mutex> guard(lock);flow.acceptHandoff();}}
            }catch(...){fail("Erreur pendant la mise à jour. L’installation actuelle est conservée.");}
        }
        installer.cancelPrepared();
    }
    static void* entry(void* argument){static_cast<State*>(argument)->run();return nullptr;}
};
Service::Service(const std::string& root,const std::string& installed):state(new State(root,installed)){}
Service::~Service(){if(!state)return;state->quit=true;state->client.cancel();state->wake.notify_all();
    if(native_thread::join(state->thread)!=0)state.release();} // Avoid freeing a worker that failed to join.
bool Service::start() {
    if(state->thread.started)return true;
    if(native_thread::start(state->thread,State::entry,"alus-update",state.get())!=0){state->fail("Service de mise à jour indisponible");return false;}
    check(false);return true;
}
void Service::check(bool manual) {
    auto& s=*state;std::lock_guard<std::mutex> guard(s.lock);
    if(!s.thread.started||s.flow.phase()==Phase::Checking||!s.flow.checking())return;
    s.nextCheck=sceKernelGetProcessTime()/1000+6*60*60*1000;
    s.notify=manual;s.message="Recherche des mises à jour PS4…";s.enqueue(State::Job::Check);
}
void Service::choose(int choice,uint64_t now) {
    auto& s=*state;std::lock_guard<std::mutex> guard(s.lock);if(s.flow.phase()!=Phase::Offered)return;
    if(choice==2){if(s.flow.download()){s.notify=true;s.received=0;s.message="Téléchargement de la mise à jour…";s.enqueue(State::Job::Download);}return;}
    Policy next=s.policy;next.choose(choice==1?Choice::Skip:Choice::Later,s.release.version,now/1000);
    if(choice==1&&!saveSkippedVersion(s.root+"/update-policy.ini",next.skippedVersion())){s.flow.fail("Impossible de mémoriser la version ignorée");s.notify=true;return;}
    s.policy=std::move(next);if(choice==1){s.flow.idle();s.message="Version "+s.release.version+" ignorée.";}else s.flow.postpone();s.notify=false;
}
void Service::readyChoice(int choice,uint64_t now) {
    auto& s=*state;std::lock_guard<std::mutex> guard(s.lock);
    if(choice==1){s.flow.closeNow();return;}
    if(s.flow.postpone()){s.policy.choose(Choice::Later,s.release.version,now/1000);s.prepared=false;s.enqueue(State::Job::Cancel);}
}
void Service::authorizeHandoff(bool saved) {
    auto& s=*state;std::lock_guard<std::mutex> guard(s.lock);
    if(s.flow.phase()!=Phase::HandingOff||s.startQueued)return;
    if(!saved){s.flow.fail("Enregistrement des réglages impossible. L’application reste ouverte.");s.prepared=false;s.enqueue(State::Job::Cancel);return;}
    s.startQueued=true;s.enqueue(State::Job::Start);
}
Snapshot Service::tick(uint64_t now) {
    auto& s=*state;std::lock_guard<std::mutex> guard(s.lock);
    if(s.flow.phase()==Phase::Preparing&&s.prepared){s.flow.prepared(now);s.startQueued=false;}
    if(s.flow.phase()==Phase::Deferred&&!s.release.version.empty()&&s.policy.shouldOffer(s.installed,s.release.version,now/1000))s.flow.offer(s.release.version);
    if((s.flow.phase()==Phase::Idle||s.flow.phase()==Phase::Error)&&now>=s.nextCheck) {
        s.nextCheck=now+6*60*60*1000;
        if(s.thread.started&&s.flow.checking()){s.notify=false;s.enqueue(State::Job::Check);}
    }
    s.flow.handoffDue(now);
    return {s.flow.phase(),s.release.version,s.flow.phase()==Phase::Error?s.flow.error():s.message,
        s.received,s.release.bytes,s.flow.secondsLeft(now),s.notify,s.flow.phase()==Phase::HandingOff&&!s.startQueued};
}
}
