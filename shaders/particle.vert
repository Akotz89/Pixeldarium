#version 300 es
in vec2 a_corner;
in vec2 a_center;
in float a_size;
in vec4 a_color;
uniform vec2 u_canvasSize;
out vec4 v_color;
void main() {
  vec2 pixel = a_center + a_corner * a_size;
  vec2 clip = vec2(
    (pixel.x / max(1.0, u_canvasSize.x)) * 2.0 - 1.0,
    1.0 - (pixel.y / max(1.0, u_canvasSize.y)) * 2.0
  );
  gl_Position = vec4(clip, 0.0, 1.0);
  v_color = a_color;
}
