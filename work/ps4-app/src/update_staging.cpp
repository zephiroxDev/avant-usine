#include "update_staging.h"
#include "picosha2.h"
#include <cstdio>
#include <cstring>
#include <cstdlib>
#include <vector>
#include <unistd.h>
namespace updates {
struct Staging::State {
    std::string target,temporary,expectedHash,error;
    uint64_t expected=0,received=0;
    FILE* file=nullptr;
    picosha2::hash256_one_by_one hash;
    uint8_t magic[4]={0,0,0,0};
    bool finished=false;
    ~State(){if(file)fclose(file);if(!temporary.empty())remove(temporary.c_str());}
};
Staging::Staging(const std::string& path,uint64_t bytes,const std::string& digest):state(new State) {
    auto& s=*state;s.target=path;s.expected=bytes;s.expectedHash=digest;
    bool validHash=digest.size()==64;
    for(char c:digest)validHash=validHash&&((c>='0'&&c<='9')||(c>='a'&&c<='f'));
    if(!validHash||bytes<16384||bytes>512ULL*1024*1024||path.size()<5||path.substr(path.size()-4)!=".pkg") {
        s.error="Description de mise à jour invalide";return;
    }
    std::string pattern=path+".partial-XXXXXX";std::vector<char> name(pattern.begin(),pattern.end());name.push_back(0);
    int fd=mkstemp(name.data());if(fd<0){s.error="Cache de téléchargement inaccessible";return;}
    s.temporary=name.data();s.file=fdopen(fd,"wb");
    if(!s.file){close(fd);s.error="Ouverture du téléchargement impossible";}
}
Staging::~Staging()=default;
bool Staging::append(const uint8_t* data,size_t count) {
    auto& s=*state;if(!s.file||!s.error.empty()||s.finished)return false;
    if((!data&&count)||count>s.expected-s.received){s.error="Taille du paquet reçue incorrecte";return false;}
    if(!count)return true;
    if(s.received<4)for(size_t i=0;i<count&&s.received+i<4;++i)s.magic[s.received+i]=data[i];
    if(fwrite(data,1,count,s.file)!=count){s.error="Stockage insuffisant ou écriture interrompue";return false;}
    s.hash.process(data,data+count);s.received+=count;return true;
}
bool Staging::finish() {
    auto& s=*state;if(!s.file||!s.error.empty()||s.finished)return false;
    if(s.received!=s.expected){s.error="Téléchargement incomplet";return false;}
    s.hash.finish();
    if(picosha2::get_hash_hex_string(s.hash)!=s.expectedHash){s.error="Vérification SHA-256 échouée";return false;}
    const uint8_t magic[]={0x7f,'C','N','T'};
    if(memcmp(s.magic,magic,4)!=0){s.error="Le fichier reçu n’est pas un paquet PS4";return false;}
    bool ok=fflush(s.file)==0&&fsync(fileno(s.file))==0;
    if(fclose(s.file)!=0)ok=false;s.file=nullptr;
    if(!ok){s.error="Enregistrement du paquet impossible";return false;}
    if(rename(s.temporary.c_str(),s.target.c_str())!=0){s.error="Validation du cache impossible";return false;}
    s.temporary.clear();s.finished=true;return true;
}
uint64_t Staging::received() const{return state->received;}
const std::string& Staging::error() const{return state->error;}
}
