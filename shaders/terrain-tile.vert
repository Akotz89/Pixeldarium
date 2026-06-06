#version 300 es
in vec2 a_corner;
in vec4 a_rect;
in vec4 a_uvRect;
in float a_alpha;
in float a_flipH;
uniform vec2 u_canvasSize;
out vec2 v_uv;
out float v_alpha;
void main() {
  vec2 uvCorner = a_corner;
  if (a_flipH > 0.5) { uvCorner.x = 1.0 - uvCorner.x; }
  v_uv = mix(a_uvRect.xy, a_uvRect.zw, uvCorner);
  v_alpha = a_alpha;
  vec2 pixel = a_rect.xy + a_corner * a_rect.zw;
  vec2 clip = vec2((pixel.x / u_canvasSize.x) * 2.0 - 1.0, 1.0 - (pixel.y / u_canvasSize.y) * 2.0);
  gl_Position = vec4(clip, 0.0, 1.0);
}
