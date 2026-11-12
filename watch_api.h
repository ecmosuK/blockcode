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

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

void watch_move(float steps);
void watch_turn(float degrees);
void watch_goto_start(void);
void watch_say(const char *text, float seconds);
void watch_wait(float seconds);
int qos_app_wifi_connect(const char *ssid, const char *password, uint32_t timeout_ms);
int qos_app_wifi_disconnect(void);
int qos_app_wifi_connected(void);
int qos_app_http_request(const char *method, const char *url, const char *body,
                         char *response, size_t response_capacity);
int qos_app_ble_scan(uint32_t duration_ms, char *output, size_t output_capacity);
int qos_app_ble_connect(const char *address);
int qos_app_ble_disconnect(void);
int qos_app_ble_connected(void);
int qos_app_ble_gatt_read(const char *service_uuid,
                          const char *characteristic_uuid,
                          char *output, size_t output_capacity);
int qos_app_ble_gatt_write(const char *service_uuid,
                           const char *characteristic_uuid,
                           const char *value);

#ifdef __cplusplus
}
#endif
