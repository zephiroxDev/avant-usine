#include "url_policy.h"
#include <cassert>
#include <cstdio>
int main() {
    using namespace https;
    assert(trusted("https://api.github.com/repos/zephiroxDev/avant-usine/releases",Purpose::Updates));
    assert(trusted("https://release-assets.githubusercontent.com/path?signature=a%2Fb",Purpose::Updates));
    for(const auto* url:{"http://github.com/file","https://github.com@evil.test/file","https://github.com.evil.test/file","https://github.com:444/file","https://github.com\\@evil.test/file","https://github.com/file\r\nHost: evil.test","https://user:pass@github.com/file","https://localhost/file"})assert(!trusted(url,Purpose::Updates));
    assert(trusted("https://djjfzymrkncwhrocpxjo.supabase.co/auth/v1/token",Purpose::Community));
    assert(!trusted("https://github.com/file",Purpose::Community));
    assert(redirect("https://github.com/asset","https://release-assets.githubusercontent.com/file",Purpose::Updates)=="https://release-assets.githubusercontent.com/file");
    assert(redirect("https://github.com/asset","/next",Purpose::Updates)=="https://github.com/next");
    assert(redirect("https://github.com/asset","//evil.test/file",Purpose::Updates).empty());
    assert(redirect("https://github.com/asset","http://github.com/file",Purpose::Updates).empty());
    assert(redirect("https://djjfzymrkncwhrocpxjo.supabase.co/auth/v1/token","https://github.com/file",Purpose::Community).empty());
    assert(validHeader("Authorization","Bearer example"));
    assert(!validHeader("Authorization","Bearer example\r\nX-Other: injected"));
    assert(!validHeader("Bad: Name","value"));
    puts("HTTPS origins, redirects and header injection checks passed.");
}
