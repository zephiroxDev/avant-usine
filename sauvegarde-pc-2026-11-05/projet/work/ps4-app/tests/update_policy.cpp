#include "update_policy.h"
#include <cassert>
#include <cstdio>
#include <string>
int main(int argc,char** argv) {
    assert(argc==2);using namespace updates;
    Version value;
    for(const auto* invalid:{"","1","1.0.0-test4","1.0.0\n","01.0.0","1.0.42949672960","1.0.-1","1.0.1/file"})assert(!parseVersion(invalid,value));
    assert(parseVersion("0.24",value)&&value.major==0&&value.minor==24&&value.patch==0);
    assert(Policy().shouldOffer("0.24","0.25",0));
    assert(parseVersion("v1.0.10",value));assert(value.patch==10);
    Policy policy;
    assert(policy.shouldOffer("1.0.9","1.0.10",0));
    assert(!policy.shouldOffer("1.0.10","1.0.9",0));
    assert(!policy.shouldOffer("1.0.10","1.0.10",0));
    assert(policy.choose(Choice::Later,"1.0.10",100));
    assert(!policy.shouldOffer("1.0.9","1.0.10",1899));
    assert(!policy.shouldOffer("1.0.9","v1.0.10",1899));
    assert(policy.shouldOffer("1.0.9","1.0.10",1900));
    assert(policy.shouldOffer("1.0.9","1.0.11",101));
    assert(policy.choose(Choice::Skip,"1.0.10",200));
    assert(!policy.shouldOffer("1.0.9","1.0.10",100000));
    std::string path=std::string(argv[1])+"/update-policy.ini";
    assert(saveSkippedVersion(path,policy.skippedVersion()));
    Policy restarted(loadSkippedVersion(path));
    assert(!restarted.shouldOffer("1.0.9","1.0.10",0));
    assert(!restarted.shouldOffer("1.0.8","1.0.9",0));
    assert(restarted.shouldOffer("1.0.9","1.1.0",0));
    assert(restarted.choose(Choice::Install,"1.1.0",10));
    assert(!saveSkippedVersion(path,"corrupt"));
    assert(loadSkippedVersion(path)=="1.0.10");
    assert(!saveSkippedVersion(path+"/missing","1.0.11"));
    assert(saveSkippedVersion(path,""));assert(loadSkippedVersion(path).empty());
    assert(policy.choose(Choice::Later,"1.0.11",UINT64_MAX-10));
    assert(!policy.shouldOffer("1.0.9","1.0.11",UINT64_MAX-1));
    remove(path.c_str());puts("Update version, skip persistence and reminders passed.");
}
