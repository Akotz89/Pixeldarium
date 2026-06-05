#version 300 es
in vec2 a_corner;
in vec2 a_center;
in vec2 a_size;
in vec4 a_uvRect;
in vec4 a_tint;
in float a_flipH;
uniform vec2 u_canvasSize;
out vec2 v_diffuseUv;
out vec2 v_normalUv;
out vec4 v_tint;
void main() {
  vec2 local = a_corner + vec2(0.5);
  if (a_flipH > 0.5) {
    local.x = 1.0 - local.x;
  }
  float uMid = (a_uvRect.x + a_uvRect.z) * 0.5;
  v_diffuseUv = vec2(mix(a_uvRect.x, uMid, local.x), mix(a_uvRect.y, a_uvRect.w, local.y));
  v_normalUv = vec2(mix(uMid, a_uvRect.z, local.x), mix(a_uvRect.y, a_uvRect.w, local.y));
  v_tint = a_tint;
  vec2 pixel = a_center + a_corner * a_size;
  vec2 clip = vec2((pixel.x / u_canvasSize.x) * 2.0 - 1.0, 1.0 - (pixel.y / u_canvasSize.y) * 2.0);
  gl_Position = vec4(clip, 0.0, 1.0);
}
