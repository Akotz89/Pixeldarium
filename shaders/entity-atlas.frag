#version 300 es
precision mediump float;
uniform sampler2D u_atlas;
in vec2 v_diffuseUv;
in vec2 v_normalUv;
in vec4 v_tint;
layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outNormalHeight;
void main() {
  vec4 color = texture(u_atlas, v_diffuseUv);
  if (color.a < 0.01) {
    discard;
  }
  vec4 normalData = texture(u_atlas, v_normalUv);
  vec3 keyed = color.rgb * v_tint.rgb;
  outColor = vec4(keyed, color.a * v_tint.a);
  outNormalHeight = vec4(normalData.rgb, normalData.a);
}
