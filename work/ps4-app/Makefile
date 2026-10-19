SDK := $(OO_PS4_TOOLCHAIN)
CXX := clang++-18
LD := ld.lld-18
FLAGS := --target=x86_64-pc-freebsd12-elf -D_GNU_SOURCE -fPIC -funwind-tables -std=c++17 -O2 -isysroot $(SDK) -isystem $(SDK)/include -isystem $(SDK)/include/c++/v1 -Isrc -Ivendor
SOURCES := $(wildcard src/*.cpp) vendor/graphics.cpp
OBJECTS := $(patsubst %.cpp,build/%.o,$(SOURCES))
LIBS := -lc -lkernel -lc++ -lSceVideoOut -lSceSysmodule -lScePad -lSceUserService -lSceAudioOut -lSceNet -lSceSsl -lSceHttp

all: eboot.bin
build/%.o: %.cpp
	mkdir -p $(dir $@)
	$(CXX) $(FLAGS) -c $< -o $@
build/avant-usine.elf: $(OBJECTS)
	$(LD) -m elf_x86_64 -pie --script $(SDK)/link.x --eh-frame-hdr -L$(SDK)/lib $(OBJECTS) $(LIBS) $(SDK)/lib/crt1.o -o $@
eboot.bin: build/avant-usine.elf
	$(SDK)/bin/linux/create-fself -in=$< -out=build/avant-usine.oelf --eboot $@ --paid 0x3800000000000011
