#version 300 es
precision mediump float;
uniform sampler2D u_chunk;
uniform float u_alpha;
in vec2 v_uv;
out vec4 outColor;
void main() {
  vec4 color = texture(u_chunk, v_uv);
  outColor = vec4(color.rgb, color.a * u_alpha);
}
