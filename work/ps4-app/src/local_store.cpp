#include "local_store.h"
#include <algorithm>
#include <cstdio>
#include <cerrno>
#include <cstring>
#include <dirent.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
namespace local {
bool safeName(const std::string& n) {
    return !n.empty()&&n!="."&&n!=".."&&n.size()<=240&&
        n.find('/')==std::string::npos&&n.find('\\')==std::string::npos&&
        n.find('\0')==std::string::npos;
}
bool directory(const std::string& p) {
    struct stat s{};return (mkdir(p.c_str(),0700)==0)||
        (errno==EEXIST&&lstat(p.c_str(),&s)==0&&S_ISDIR(s.st_mode));
}
std::vector<Entry> list(const std::string& p) {
    std::vector<Entry> result;DIR* d=opendir(p.c_str());if(!d)return result;
    while(auto e=readdir(d)) {
        std::string n=e->d_name;if(!safeName(n)||n[0]=='.')continue;
        struct stat s{};std::string path=p+"/"+n;
        if(lstat(path.c_str(),&s)||(!S_ISREG(s.st_mode)&&!S_ISDIR(s.st_mode)))continue;
        result.push_back({n,path,S_ISDIR(s.st_mode),uint64_t(s.st_size)});
    }
    closedir(d);std::sort(result.begin(),result.end(),[](const Entry&a,const Entry&b){
        if(a.directory!=b.directory)return a.directory;return a.name<b.name;
    });return result;
}
bool importFile(const std::string& source,const std::string& root,const std::string& name,std::string& error) {
    error.clear();if(!safeName(name)){error="Nom de fichier invalide";return false;}
    if(!directory(root)){error="Stockage Local inaccessible";return false;}
    struct stat before{};int input=open(source.c_str(),O_RDONLY|O_NOFOLLOW);
    if(input<0||fstat(input,&before)||!S_ISREG(before.st_mode)||before.st_size<=0) {
        if(input>=0)close(input);error="Fichier source inaccessible ou vide";return false;
    }
    std::string target=root+"/"+name,temp=root+"/.import-XXXXXX";
    std::vector<char> pattern(temp.begin(),temp.end());pattern.push_back(0);
    int output=mkstemp(pattern.data());temp=pattern.data();bool ok=output>=0;
    uint64_t bytes=0;char buffer[65536];
    while(ok) {
        ssize_t n=read(input,buffer,sizeof(buffer));if(n==0)break;
        if(n<0){if(errno==EINTR)continue;ok=false;break;}
        ssize_t done=0;while(done<n){ssize_t w=write(output,buffer+done,n-done);
            if(w<0&&errno==EINTR)continue;if(w<=0){ok=false;break;}done+=w;}
        bytes+=uint64_t(done);
    }
    struct stat after{};
    ok=ok&&fstat(input,&after)==0&&before.st_size==after.st_size&&
       before.st_mtime==after.st_mtime&&bytes==uint64_t(before.st_size);
    close(input);
    if(output>=0){if(ok)ok=fsync(output)==0;if(close(output))ok=false;}
    if(ok)ok=rename(temp.c_str(),target.c_str())==0;
    if(!ok){unlink(temp.c_str());error="Copie interrompue ou stockage insuffisant : original conserve";}
    return ok;
}
}
