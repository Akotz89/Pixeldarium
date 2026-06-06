#version 300 es
precision highp float;

in vec2 v_diffuseUv;
in vec2 v_normalUv;
in vec4 v_tintColor;

uniform sampler2D u_atlas;

out vec4 fragColor;

void main() {
  vec4 texColor = texture(u_atlas, v_diffuseUv);

  if (texColor.a < 0.01) {
    discard;
  }

  fragColor = texColor * v_tintColor;
}
