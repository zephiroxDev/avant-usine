#include "update_manifest.h"
#include "json.hpp"
#include <cassert>
#include <cstdio>
using Json=nlohmann::json;
static Json release(const std::string& version,bool prerelease=false) {
    std::string tag="ps4-v"+version,name="Avant-Usine-PS4-"+version+".pkg",base="https://github.com/zephiroxDev/avant-usine/releases/download/"+tag+"/";
    return {{"tag_name",tag},{"draft",false},{"prerelease",prerelease},{"assets",Json::array({{{"name",name},{"size",20000u},{"browser_download_url",base+name}},{{"name","ps4-update.json"},{"browser_download_url",base+"ps4-update.json"}}})}};
}
int main() {
    updates::Release selected;std::string error;
    auto development=release("0.24",true);development["assets"][0]["name"]="Avant-l-usine-0.24.pkg";development["assets"][0]["browser_download_url"]="https://github.com/zephiroxDev/avant-usine/releases/download/ps4-v0.24/Avant-l-usine-0.24.pkg";
    assert(updates::selectRelease(Json::array({development,release("9.0.0",true)}).dump(),selected,error));assert(selected.version=="0.24"&&selected.packageName=="Avant-l-usine-0.24.pkg");
    assert(updates::selectRelease(Json::array({release("1.0.9"),release("9.0.0",true),release("1.0.10")}).dump(),selected,error));
    assert(selected.version=="1.0.10");assert(selected.bytes==20000);
    Json manifest={{"platform","ps4"},{"native",true},{"browser",false},{"titleId","ALUS00001"},{"contentId","IV0000-ALUS00001_00-AVANTUSINEPS4001"},{"version","1.0.10"},{"appVersion","01.12"},{"package",selected.packageName},{"bytes",20000u},{"sha256",std::string(64,'a')}};
    assert(updates::validateManifest(manifest.dump(),selected,error));
    auto wrong=manifest;wrong["titleId"]="OTHER0001";assert(!updates::validateManifest(wrong.dump(),selected,error));
    wrong=manifest;wrong["bytes"]=19999u;assert(!updates::validateManifest(wrong.dump(),selected,error));
    wrong=manifest;wrong["sha256"]="bad";assert(!updates::validateManifest(wrong.dump(),selected,error));
    auto malicious=release("2.0.0");malicious["assets"][0]["browser_download_url"]="https://github.com/other/repository/file.pkg";
    assert(updates::selectRelease(Json::array({malicious}).dump(),selected,error));assert(selected.version.empty());
    assert(updates::selectRelease(Json::array({release("0.1.0-test4",true)}).dump(),selected,error));assert(selected.version.empty());
    assert(!updates::selectRelease("{bad",selected,error));
    assert(!updates::selectRelease(std::string(70,'[')+std::string(70,']'),selected,error));
    puts("Stable PS4 release selection, matching manifest, origin and depth checks passed.");
}
