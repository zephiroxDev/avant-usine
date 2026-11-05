#include "local_service.h"
#include "native_thread.h"
#include <mutex>
#include <condition_variable>
#include <atomic>
#include <deque>
#include <sys/stat.h>
namespace local {
struct Service::State {
    struct Job {std::string path,importName;unsigned id;};
    std::string root,base;std::mutex lock;std::condition_variable wake;std::deque<Job> jobs;
    native_thread::Thread thread;std::atomic<bool> quit{false};View view;unsigned requestId=0;
    explicit State(std::string directory):root(std::move(directory)),base(root){}
    static void* entry(void* pointer){static_cast<State*>(pointer)->run();return nullptr;}
    void enqueue(Job job) {
        if(!thread.started&&native_thread::start(thread,entry,"alus-local",this)!=0){view.message="Service Local indisponible.";view.busy=false;++view.revision;return;}
        jobs.push_back(std::move(job));wake.notify_one();
    }
    void request(const std::string& path){view.path=path;view.busy=true;view.message="Lecture du dossier…";++view.revision;enqueue({path,"",++requestId});}
    void run() {
        directory(root);
        for(;;) {
            Job job;{std::unique_lock<std::mutex> guard(lock);wake.wait(guard,[&](){return quit||!jobs.empty();});if(quit)return;job=std::move(jobs.front());jobs.pop_front();}
            try {
                std::string message;
                if(!job.importName.empty()) {
                    std::string name=job.importName;struct stat info{};unsigned copy=2;
                    auto dot=name.find_last_of('.');std::string stem=dot==std::string::npos?name:name.substr(0,dot),extension=dot==std::string::npos?"":name.substr(dot);
                    while(lstat((root+"/"+name).c_str(),&info)==0&&copy<10000)name=stem+" ("+std::to_string(copy++)+")"+extension;
                    if(copy>=10000)message="Trop de fichiers portant ce nom.";
                    else if(importFile(job.path,root,name,message,[&](uint64_t,uint64_t){return !quit;}))message="Fichier copié dans Local : "+name;
                }
                std::string path=job.importName.empty()?job.path:root;
                auto entries=list(path);
                std::lock_guard<std::mutex> guard(lock);if(job.id!=requestId)continue;
                view.path=path;view.library=path==root||path.compare(0,root.size()+1,root+"/")==0;view.entries=std::move(entries);view.busy=false;
                view.message=message.empty()?(view.entries.empty()?"Dossier vide ou inaccessible.":std::to_string(view.entries.size())+" éléments"):message;
                if(!job.importName.empty())base=root;
                ++view.revision;
            }catch(...){std::lock_guard<std::mutex> guard(lock);if(job.id==requestId){view.busy=false;view.message="Impossible de lire ce dossier.";++view.revision;}}
        }
    }
};
Service::Service(const std::string& root):state(new State(root)){}
Service::~Service(){state->quit=true;state->wake.notify_all();if(native_thread::join(state->thread)!=0)state.release();}
void Service::browse(int source){std::lock_guard<std::mutex> guard(state->lock);state->base=source==1?"/mnt/usb0":source==2?"/mnt/usb1":state->root;state->request(state->base);}
void Service::parent(){std::lock_guard<std::mutex> guard(state->lock);if(state->view.busy||state->view.path==state->base)return;
    std::string path=state->view.path;auto slash=path.find_last_of('/');if(slash==std::string::npos)return;path.resize(slash);if(path.size()<state->base.size())return;state->request(path);}
void Service::select(size_t index,unsigned revision){std::lock_guard<std::mutex> guard(state->lock);
    if(state->view.busy||revision!=state->view.revision||index>=state->view.entries.size())return;
    Entry entry=state->view.entries[index];if(entry.directory){state->request(entry.path);return;}
    if(state->view.library)return; // Playback is handled on the main thread.
    state->view.busy=true;state->view.message="Copie du fichier dans Local…";++state->view.revision;
    state->enqueue({entry.path,entry.name,++state->requestId});
}
View Service::snapshot(){std::lock_guard<std::mutex> guard(state->lock);return state->view;}
bool Service::changed(unsigned revision,View& result){std::lock_guard<std::mutex> guard(state->lock);if(state->view.revision==revision)return false;result=state->view;return true;}
}
