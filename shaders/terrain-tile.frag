#version 300 es
precision mediump float;
uniform sampler2D u_atlas;
in vec2 v_uv;
in float v_alpha;
in float v_shade;
out vec4 outColor;
void main() {
  vec4 color = texture(u_atlas, v_uv);
  outColor = vec4(color.rgb * v_shade, color.a * v_alpha);
}
