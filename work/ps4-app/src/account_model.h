#pragma once
#include <string>
#include <cstdint>
namespace account {
struct Session {std::string access,refresh,id,email,nickname;uint64_t expiresIn=0;};
struct View {std::string email,nickname,message;bool connected=false,busy=false,creator=false,moderator=false,permissionsKnown=false;unsigned revision=0;};
std::string passwordBody(const std::string& email,const std::string& password);
std::string refreshBody(const std::string& token);
bool parseSession(const std::string& body,Session& session);
void applyServerAccess(const std::string& body,View& view);
bool saveRefresh(const std::string& path,const std::string& token);
std::string loadRefresh(const std::string& path);
}
