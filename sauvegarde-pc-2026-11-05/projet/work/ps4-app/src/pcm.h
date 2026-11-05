#pragma once
#include <cstdint>
#include <cstddef>
#include <vector>
// Converts mono/stereo decoded audio to native 48 kHz stereo without changing pitch.
std::vector<int16_t> toStereo48(const int16_t* input,size_t frames,unsigned channels,unsigned rate);
