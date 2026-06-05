#version 300 es
precision highp float;
uniform sampler2D u_terrain;
uniform sampler2D u_overlay;
uniform vec2 u_canvasSize;
uniform vec3 u_centerRadius;
uniform vec2 u_view;
uniform int u_overlayMode;
uniform float u_overlayAlpha;
in vec2 v_uv;
out vec4 outColor;
const float PI = 3.141592653589793;
float toDegrees(float radiansValue) {
  return radiansValue * 180.0 / PI;
}
void main() {
  vec2 screen = v_uv * u_canvasSize;
  float radius = max(1.0, u_centerRadius.z);
  float nx = (screen.x - u_centerRadius.x) / radius;
  float ny = (u_centerRadius.y - screen.y) / radius;
  float r2 = nx * nx + ny * ny;
  if (r2 > 1.0) {
    outColor = vec4(1.0 / 255.0, 3.0 / 255.0, 10.0 / 255.0, 1.0);
    return;
  }
  float z = sqrt(max(0.0, 1.0 - r2));
  float sinCenterLat = sin(u_view.x);
  float cosCenterLat = cos(u_view.x);
  float lat = asin(clamp(ny * cosCenterLat + z * sinCenterLat, -1.0, 1.0));
  float lon = u_view.y + atan(nx, z * cosCenterLat - ny * sinCenterLat);
  float terrainU = fract((toDegrees(lon) + 180.0) / 360.0);
  float terrainV = clamp((90.0 - toDegrees(lat)) / 180.0, 0.0, 1.0);
  vec2 terrainUv = vec2(terrainU, terrainV);
  vec3 color = texture(u_terrain, terrainUv).rgb;
  vec4 overlay = texture(u_overlay, terrainUv);
  if (u_overlayMode == 1) {
    color = mix(color, 1.0 - (1.0 - color) * (1.0 - overlay.rgb), overlay.a * u_overlayAlpha);
  } else if (u_overlayMode == 2) {
    color = min(vec3(1.0), color + overlay.rgb * overlay.a * u_overlayAlpha);
  }
  float daylight = clamp(0.50 + z * 0.54 - nx * 0.07 + ny * 0.035, 0.20, 1.05);
  float limb = clamp(pow(1.0 - z, 1.7), 0.0, 1.0);
  color *= daylight;
  color.r = mix(color.r, 42.0 / 255.0, limb * 0.08);
  color.g = mix(color.g, 112.0 / 255.0, limb * 0.11);
  color.b = mix(color.b, 176.0 / 255.0, limb * 0.16);
  outColor = vec4(color, 1.0);
}
