// Bugy V3 native core.
// Build target: WebAssembly. Rendering writes a transparent 320x180 RGBA framebuffer.

#include <stdint.h>

namespace {
constexpr int kWidth = 320;
constexpr int kHeight = 180;
constexpr float kGroundY = 136.0f;
constexpr int kActionCount = 6;

enum State {
  STATE_WALK = 0,
  STATE_STORM = 1,
  STATE_TORNADO = 2,
  STATE_PORTAL = 3,
  STATE_CLONE = 4,
  STATE_GRAVITY = 5,
  STATE_ABDUCT = 6
};

uint32_t framebuffer[kWidth * kHeight];
float g_x = 42.0f;
float g_y = kGroundY;
float vx = 0.034f;
float vy = 0.0f;
float action_time = 0.0f;
int face = 1;
int skin = 0;
int state = STATE_WALK;
int next_action = 0;

uint32_t rgba(uint8_t r, uint8_t g, uint8_t b, uint8_t a = 255) {
  return (static_cast<uint32_t>(a) << 24) |
         (static_cast<uint32_t>(b) << 16) |
         (static_cast<uint32_t>(g) << 8) |
         static_cast<uint32_t>(r);
}

uint32_t palette(int slot) {
  const uint32_t palettes[5][5] = {
    { rgba(0, 234, 255), rgba(0, 255, 102), rgba(255, 46, 166), rgba(245, 255, 107), rgba(201, 255, 214) },
    { rgba(48, 98, 48), rgba(139, 172, 15), rgba(15, 56, 15), rgba(196, 212, 58), rgba(217, 240, 107) },
    { rgba(41, 173, 255), rgba(67, 214, 55), rgba(255, 119, 168), rgba(255, 204, 0), rgba(255, 241, 232) },
    { rgba(0, 217, 255), rgba(0, 255, 153), rgba(255, 0, 93), rgba(255, 225, 74), rgba(244, 247, 255) },
    { rgba(207, 207, 207), rgba(244, 244, 244), rgba(143, 143, 143), rgba(255, 255, 255), rgba(92, 92, 92) }
  };
  int safe_skin = skin < 0 ? 0 : (skin > 4 ? 4 : skin);
  int safe_slot = slot < 0 ? 0 : (slot > 4 ? 4 : slot);
  return palettes[safe_skin][safe_slot];
}

void clear() {
  for (int index = 0; index < kWidth * kHeight; ++index) {
    framebuffer[index] = 0;
  }
}

void pixel(int x, int y, uint32_t color) {
  if (x < 0 || x >= kWidth || y < 0 || y >= kHeight) return;
  framebuffer[y * kWidth + x] = color;
}

void rect(int x, int y, int w, int h, uint32_t color) {
  for (int yy = y; yy < y + h; ++yy) {
    for (int xx = x; xx < x + w; ++xx) pixel(xx, yy, color);
  }
}

void outline_rect(int x, int y, int w, int h, uint32_t fill, uint32_t line = rgba(0, 0, 0)) {
  rect(x - 1, y - 1, w + 2, h + 2, line);
  rect(x, y, w, h, fill);
}

void disc(int cx, int cy, int radius, uint32_t color) {
  for (int yy = -radius; yy <= radius; ++yy) {
    for (int xx = -radius; xx <= radius; ++xx) {
      if (xx * xx + yy * yy <= radius * radius) pixel(cx + xx, cy + yy, color);
    }
  }
}

void draw_bugy() {
  const int x = static_cast<int>(g_x);
  const int y = static_cast<int>(g_y);
  rect(x + 3, y + 35, 34, 5, rgba(0, 0, 0, 118));
  outline_rect(x + 7, y + 16, 25, 22, palette(0));
  rect(x + 10, y + 18, 20, 7, palette(4));
  outline_rect(x + 29, y + 10, 15, 18, palette(4));
  rect(x + (face > 0 ? 39 : 31), y + 17, 3, 3, rgba(0, 0, 0));
  outline_rect(x + 14, y + 36, 5, 12, palette(1));
  outline_rect(x + 27, y + 36, 5, 12, palette(1));
  outline_rect(x + 2, y + 23, 8, 8, palette(2));
  if (skin == 3) {
    rect(x + 12, y + 12, 19, 2, rgba(255, 255, 255, 150));
    rect(x + 17, y + 7, 9, 3, rgba(255, 255, 255, 120));
  }
  if (skin == 4) {
    rect(x + 31, y + 4, 12, 4, palette(3));
    pixel(x + 32, y + 2, palette(3));
    pixel(x + 37, y + 0, palette(3));
    pixel(x + 42, y + 2, palette(3));
  }
}

void draw_rain(int x, int y) {
  outline_rect(x + 12, y + 5, 50, 14, palette(4));
  disc(x + 22, y + 7, 10, palette(4));
  disc(x + 40, y + 2, 13, palette(4));
  disc(x + 58, y + 10, 10, palette(4));
  rect(x + 16, y + 22, 4, 18, palette(0));
  rect(x + 32, y + 28, 4, 18, palette(0));
  rect(x + 50, y + 22, 4, 18, palette(0));
  rect(x + 66, y + 30, 4, 18, palette(0));
}

void draw_lightning(int x, int y) {
  rect(x + 14, y, 11, 26, palette(3));
  rect(x + 6, y + 22, 28, 10, palette(3));
  rect(x + 5, y + 30, 12, 34, palette(3));
  rect(x + 14, y + 48, 20, 10, palette(3));
}

void draw_tornado(int x, int y) {
  const uint32_t black = rgba(0, 0, 0);
  rect(x + 3, y + 3, 68, 8, black);
  rect(x + 7, y + 5, 58, 8, palette(4));
  rect(x + 11, y + 26, 54, 8, black);
  rect(x + 16, y + 28, 42, 8, palette(0));
  rect(x + 21, y + 50, 42, 8, black);
  rect(x + 26, y + 52, 29, 8, palette(2));
  rect(x + 28, y + 73, 30, 8, black);
  rect(x + 33, y + 75, 19, 8, palette(3));
  rect(x + 37, y + 96, 16, 16, palette(4));
  pixel(x + 0, y + 22, palette(3));
  pixel(x + 74, y + 42, palette(0));
  pixel(x + 13, y + 76, palette(3));
}

void draw_portal(int x, int y) {
  for (int row = 0; row < 8; ++row) {
    rect(x + 8 + row * 2, y + row, 52 - row * 4, 2, rgba(0, 0, 0, 210));
  }
  rect(x + 8, y + 8, 56, 6, palette(2));
  rect(x + 14, y + 14, 44, 6, palette(0));
  rect(x + 22, y + 19, 28, 5, palette(4));
  rect(x + 31, y + 22, 10, 3, palette(3));
  pixel(x + 5, y + 5, palette(3));
  pixel(x + 68, y + 17, palette(0));
  pixel(x + 19, y + 32, palette(4));
}

void draw_ufo(int x, int y) {
  outline_rect(x + 23, y, 28, 12, palette(4));
  outline_rect(x + 7, y + 11, 62, 16, palette(0));
  rect(x + 22, y + 28, 32, 48, rgba(0, 234, 255, 74));
}

void render() {
  clear();
  if (state == STATE_STORM) {
    draw_rain(static_cast<int>(g_x) - 17, static_cast<int>(g_y) - 80);
    if (action_time > 620.0f) draw_lightning(static_cast<int>(g_x) + 6, static_cast<int>(g_y) - 58);
  } else if (state == STATE_TORNADO) {
    draw_tornado(static_cast<int>(g_x) - 22, static_cast<int>(g_y) - 86);
  } else if (state == STATE_PORTAL) {
    draw_portal(static_cast<int>(g_x) - 10, static_cast<int>(g_y) + 33);
  } else if (state == STATE_CLONE) {
    rect(static_cast<int>(g_x) - 18, static_cast<int>(g_y) + 16, 25, 22, rgba(0, 234, 255, 94));
    rect(static_cast<int>(g_x) + 30, static_cast<int>(g_y) + 16, 25, 22, rgba(255, 46, 166, 94));
  } else if (state == STATE_ABDUCT) {
    draw_ufo(static_cast<int>(g_x) - 18, static_cast<int>(g_y) - 92);
  }
  draw_bugy();
}

void start_action(int action) {
  state = action + 1;
  action_time = 0.0f;
  vy = action == 4 ? -0.18f : 0.0f;
}
} // namespace

extern "C" {
void bugy_init() {
  g_x = 42.0f;
  g_y = kGroundY;
  vx = 0.034f;
  vy = 0.0f;
  face = 1;
  state = STATE_WALK;
  action_time = 0.0f;
  render();
}

void bugy_update(float dt_ms) {
  if (dt_ms > 40.0f) dt_ms = 40.0f;
  if (state == STATE_WALK) {
    g_x += vx * dt_ms;
    if (g_x < 12.0f || g_x > 266.0f) {
      vx = -vx;
      face = -face;
    }
    if (g_x < 12.0f) g_x = 12.0f;
    if (g_x > 266.0f) g_x = 266.0f;
    g_y = kGroundY;
  } else {
    action_time += dt_ms;
    if (state == STATE_TORNADO) {
      g_x += face * 0.052f * dt_ms;
      g_y = kGroundY - 16.0f - ((static_cast<int>(action_time) / 90) % 4) * 8.0f;
    } else if (state == STATE_GRAVITY) {
      vy += 0.00032f * dt_ms;
      g_x += vx * 1.2f * dt_ms;
      g_y += vy * dt_ms;
      if (g_y > kGroundY) {
        g_y = kGroundY;
        vy = -vy * 0.55f;
      }
    } else if (state == STATE_ABDUCT) {
      if (action_time < 1150.0f) g_y -= 0.055f * dt_ms;
      else g_y += 0.08f * dt_ms;
    }
    if (action_time > 1800.0f && state != STATE_ABDUCT) {
      state = STATE_WALK;
      g_y = kGroundY;
    }
    if (action_time > 2700.0f && state == STATE_ABDUCT) {
      state = STATE_WALK;
      g_y = kGroundY;
    }
  }
  render();
}

int bugy_trigger(int action) {
  if (action < 0 || action >= kActionCount) return 0;
  if (state != STATE_WALK) return 0;
  start_action(action);
  render();
  return 1;
}

void bugy_next() {
  start_action(next_action);
  next_action = (next_action + 1) % kActionCount;
  render();
}

void bugy_set_skin(int next_skin) {
  if (next_skin < 0) next_skin = 0;
  if (next_skin > 4) next_skin = 4;
  skin = next_skin;
  render();
}

uint32_t* bugy_framebuffer() { return framebuffer; }
int bugy_width() { return kWidth; }
int bugy_height() { return kHeight; }
int bugy_x() { return static_cast<int>(g_x); }
int bugy_y() { return static_cast<int>(g_y); }
int bugy_state() { return state; }
int bugy_skin() { return skin; }
}
