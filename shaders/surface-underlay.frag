#version 300 es
precision highp float;
uniform sampler2D u_terrain;
uniform vec2 u_viewLatLon;
uniform vec2 u_degreesPerPixel;
uniform vec2 u_canvasSize;
in vec2 v_uv;
out vec4 outColor;
void main() {
  vec2 centered = (v_uv - vec2(0.5)) * u_canvasSize;
  float latitude = clamp(u_viewLatLon.x - centered.y * u_degreesPerPixel.y, -90.0, 90.0);
  float longitude = u_viewLatLon.y + centered.x * u_degreesPerPixel.x;
  float terrainU = fract((longitude + 180.0) / 360.0);
  float terrainV = clamp((90.0 - latitude) / 180.0, 0.0, 1.0);
  vec3 color = texture(u_terrain, vec2(terrainU, terrainV)).rgb;
  float latitudeShade = 0.90 + (1.0 - abs(latitude) / 90.0) * 0.12;
  float vignette = 1.0 - smoothstep(0.45, 0.82, length(v_uv - vec2(0.5))) * 0.12;
  outColor = vec4(color * latitudeShade * vignette, 1.0);
}
