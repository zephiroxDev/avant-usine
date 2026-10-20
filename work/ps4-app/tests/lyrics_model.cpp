#include "lyrics_model.h"
#include <cassert>
int main() {
    lyrics::Document d;std::string error;
    assert(lyrics::parse(R"({"duration":10,"sync_mode":"highlight","tracks":[{"id":"main","kind":"main"},{"id":"back","kind":"back"}],"lines":["été !","oui"],"times":[2,1],"line_ends":[6,3],"line_tracks":["main","back"],"curves":[[[0,2],[2,4],[5,6]],[[0,1],[3,3]]]})",d,error));
    assert(d.lines[1].back&&d.lines[1].start<d.lines[0].start);
    assert(lyrics::active(d,2.5).size()==2);assert(lyrics::active(d,3).size()==1);
    assert(lyrics::revealed(d.lines[0],6,true)==5);
    assert(lyrics::revealed(d.lines[0],5.9,true)==5); // Final letter appears before the line expires.
    assert(lyrics::characterCount("été !")==5);assert(lyrics::prefix("été !",2)=="ét");
    assert(lyrics::prefix("été !",0).empty());assert(lyrics::prefix("été !",100)=="été !");
    assert(lyrics::active(d,6).empty()); // No frame where an expired line reappears.
    assert(lyrics::parse(R"({"duration":12,"sync_mode":"blocks","lines":["first","second"],"times":[1,5]})",d,error));
    assert(d.lines[0].end==5&&d.lines[1].end==12);
    assert(!lyrics::parse(R"({"duration":12,"lines":["first"],"times":[15]})",d,error));
}
