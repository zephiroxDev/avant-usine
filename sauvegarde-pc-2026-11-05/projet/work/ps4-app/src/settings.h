#pragma once
#include <string>
#include <cstdint>
uint32_t readImmersionColor(const std::string& path);
bool writeImmersionColor(const std::string& path,uint32_t color);
bool readHints(const std::string& path);
bool writeHints(const std::string& path, bool enabled);
bool writeUpdateSession(const std::string& path,int track,float position,int volume);
bool readUpdateSession(const std::string& path,int& track,float& position,int& volume);
