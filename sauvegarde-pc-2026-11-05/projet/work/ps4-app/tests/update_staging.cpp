#include "update_staging.h"
#include "picosha2.h"
#include <cassert>
#include <fstream>
#include <iterator>
#include <vector>
#include <cstdio>
static std::string read(const std::string& path) {
    std::ifstream file(path,std::ios::binary);return {std::istreambuf_iterator<char>(file),std::istreambuf_iterator<char>()};
}
int main(int argc,char** argv) {
    assert(argc==2);std::string path=std::string(argv[1])+"/update.pkg";
    std::vector<uint8_t> data(20000,42);data[0]=0x7f;data[1]='C';data[2]='N';data[3]='T';
    std::string hash=picosha2::hash256_hex_string(data);
    {std::ofstream file(path);file<<"previous validated cache";}
    {
        updates::Staging interrupted(path,data.size(),hash);
        assert(interrupted.append(data.data(),700));assert(!interrupted.finish());
        assert(read(path)=="previous validated cache");
    }
    {
        updates::Staging corrupt(path,data.size(),std::string(64,'0'));
        assert(corrupt.append(data.data(),data.size()));assert(!corrupt.finish());
        assert(read(path)=="previous validated cache");
    }
    {
        updates::Staging oversized(path,data.size(),hash);
        assert(!oversized.append(data.data(),data.size()+1));assert(!oversized.finish());
    }
    {
        auto bad=data;bad[0]=0;
        updates::Staging nonPkg(path,bad.size(),picosha2::hash256_hex_string(bad));
        assert(nonPkg.append(bad.data(),bad.size()));assert(!nonPkg.finish());
    }
    {
        updates::Staging good(path,data.size(),hash);
        // Magic split across chunks, as can happen on the network.
        assert(good.append(data.data(),2));assert(good.append(data.data()+2,data.size()-2));
        assert(good.received()==data.size());assert(good.finish());assert(!good.finish());
        assert(!good.append(data.data(),1));assert(read(path)==std::string(data.begin(),data.end()));
    }
    assert(updates::verifyCachedPackage(path,data.size(),hash));
    assert(!updates::verifyCachedPackage(path,data.size()+1,hash));
    assert(!updates::verifyCachedPackage(path,data.size(),std::string(64,'0')));
    assert(!updates::verifyCachedPackage(path,data.size(),hash,[](){return true;}));
    {updates::Staging invalid(path,UINT64_MAX,hash);assert(!invalid.error().empty());}
    {updates::Staging invalid(path,data.size(),"not a hash");assert(!invalid.error().empty());}
    assert(read(path)==std::string(data.begin(),data.end()));remove(path.c_str());
    puts("Interrupted, corrupt, oversized and non-PKG downloads rejected; verified cache committed.");
}
