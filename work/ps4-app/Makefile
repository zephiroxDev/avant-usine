SDK := $(OO_PS4_TOOLCHAIN)
CXX := clang++-18
LD := ld.lld-18
PS4_FSELF ?= $(SDK)/bin/linux/create-fself
FLAGS := --target=x86_64-pc-freebsd12-elf -D_GNU_SOURCE -fPIC -funwind-tables -fstack-usage -std=c++17 -O2 -isysroot $(SDK) -isystem $(SDK)/include -isystem $(SDK)/include/c++/v1 -Isrc -Ivendor
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
	$(PS4_FSELF) -in=$< -out=build/avant-usine.oelf --eboot $@ --paid 0x3800000000000011

# Isolated development executable; never overwrites the validated prototype eboot.bin.
build/alus_build_version.h: release.json scripts/generate_build_metadata.py
	python3 scripts/generate_build_metadata.py
ui-development: build/alus_build_version.h $(filter-out build/src/main.o build/vendor/graphics.o,$(OBJECTS))
	python3 scripts/prepare_ui_engine.py
	cmake -S ui -B build/ui-native -DCMAKE_TOOLCHAIN_FILE=$(CURDIR)/ui/openorbis.cmake -DCMAKE_BUILD_TYPE=Release
	cmake --build build/ui-native -j2
	$(CXX) $(FLAGS) -Iui -Ibuild -Ireference/lvgl -DLV_CONF_INCLUDE_SIMPLE -c ui/ps4_main.cpp -o build/ui-main.o
	$(CXX) $(FLAGS) -Iui -Ireference/lvgl -DLV_CONF_INCLUDE_SIMPLE -c ui/ps4_video.cpp -o build/ui-video.o
	$(LD) -m elf_x86_64 -pie --script $(SDK)/link.x --eh-frame-hdr -L$(SDK)/lib build/ui-main.o build/ui-video.o $(filter-out build/src/main.o build/vendor/graphics.o build/src/lyrics_model.o build/src/account_model.o,$(OBJECTS)) build/ui-native/libavant_ui.a build/ui-native/liblvgl.a $(LIBS) $(SDK)/lib/crt1.o -o build/ui-development.elf
	$(PS4_FSELF) -in=build/ui-development.elf -out=build/ui-development.oelf --eboot build/ui-development.bin --paid 0x3800000000000011
.PHONY: ui-development
