#pragma once

/*
 * BlockCode watch API
 * -------------------
 * These are the action functions called by BlockCode blocks. Generated apps
 * link these actions to the qos_app_* display hooks exported by Quantum OS.
 *
 * Keep the declarations in sync with app-codegen.js and Quantum OS app_view.h.
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
