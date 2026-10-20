#pragma once
#include <string>
bool readHints(const std::string& path);
bool writeHints(const std::string& path, bool enabled);
bool writeUpdateSession(const std::string& path,int track,float position,int volume);
bool readUpdateSession(const std::string& path,int& track,float& position,int& volume);
