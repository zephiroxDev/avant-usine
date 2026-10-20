#pragma once
#include <string>
namespace https {
enum class Purpose { Updates, Community };
std::string host(const std::string& url);
bool trusted(const std::string& url,Purpose purpose);
std::string redirect(const std::string& source,const std::string& location,Purpose purpose);
bool validHeader(const std::string& name,const std::string& value);
}
