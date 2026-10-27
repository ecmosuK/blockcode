#pragma once

/*
 * BlockCode watch API
 * -------------------
 * These are the action functions called by BlockCode blocks. Exported apps
 * include stand-in implementations that track position and print to serial;
 * replace those bodies with the watch display and hardware calls.
 *
 * Include this header in the firmware implementation to keep the signatures
 * in sync.
 */

#define WATCH_API_VERSION 1

#ifdef __cplusplus
extern "C" {
#endif

void watch_move(float steps);
void watch_turn(float degrees);
void watch_goto_start(void);
void watch_say(const char *text, float seconds);
void watch_wait(float seconds);

#ifdef __cplusplus
}
#endif
