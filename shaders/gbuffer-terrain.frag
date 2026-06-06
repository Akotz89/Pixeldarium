#version 300 es
precision mediump float;
uniform sampler2D u_material;
in vec2 v_uv;
layout(location = 0) out vec4 outAlbedo;
layout(location = 1) out vec4 outNormalHeight;
void main() {
  vec4 material = texture(u_material, v_uv);
  outAlbedo = vec4(material.rgb, 1.0);
  outNormalHeight = vec4(0.5, 0.5, 1.0, material.a);
}
