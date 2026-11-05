#pragma once
#include <string>
#include <vector>
#include <cstddef>
namespace lyrics {
struct Point {double character,time;};
struct Line {std::string text,voice;double start=0,end=0;bool back=false;std::vector<Point> points;};
struct Document {std::vector<Line> lines;double duration=0;bool highlight=false;};
bool parse(const std::string& body,Document& output,std::string& error);
size_t characterCount(const std::string& text);
std::string prefix(const std::string& text,size_t characters);
size_t revealed(const Line& line,double time,bool highlight);
std::vector<size_t> active(const Document& document,double time);
}
