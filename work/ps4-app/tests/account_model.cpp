#include "account_model.h"
#include <cassert>
#include <sys/stat.h>
int main(int argc,char** argv) {
    assert(argc==2);account::Session session;
    assert(account::parseSession(R"({"access_token":"access","refresh_token":"refresh","expires_in":3600,"user":{"id":"account-id","email":"test@example.com","user_metadata":{"nickname":"Test","creator":true}}})",session));
    account::View view;account::applyServerAccess(R"({"user_metadata":{"creator":true},"creator":"true"})",view);assert(!view.creator&&!view.moderator);
    account::applyServerAccess(R"({"creator":true,"moderator":false})",view);assert(view.creator&&!view.moderator);
    account::applyServerAccess("null",view);assert(!view.creator&&!view.moderator);
    assert(account::passwordBody("a\"b@example.com","x\n\"y").find("x\\n\\\"y")!=std::string::npos);
    std::string file=std::string(argv[1])+"/account-refresh-test";assert(account::saveRefresh(file,"refresh"));assert(account::loadRefresh(file)=="refresh");
    struct stat state{};assert(stat(file.c_str(),&state)==0&&(state.st_mode&0777)==0600);
    assert(!account::parseSession(R"({"access_token":"access","user":{"id":"x"}})",session));
    assert(!account::saveRefresh(file,""));assert(account::loadRefresh(file)=="refresh");
}
