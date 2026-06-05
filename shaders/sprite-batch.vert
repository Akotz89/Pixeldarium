#version 300 es
precision highp float;

in vec2 a_quadPos;
in vec2 a_position;
in vec4 a_uvRect;
in vec4 a_tintColor;
in vec2 a_scaleFlip;

uniform vec2 u_resolution;
uniform vec2 u_cameraOffset;
uniform float u_zoom;

out vec2 v_diffuseUv;
out vec2 v_normalUv;
out vec4 v_tintColor;

void main() {
  vec2 scaledPos = a_quadPos * a_scaleFlip.x;
  scaledPos.x *= a_scaleFlip.y;

  vec2 worldPos = a_position + scaledPos;
  vec2 screenPos = (worldPos - u_cameraOffset) * u_zoom;
  vec2 clipPos = (screenPos / u_resolution) * 2.0 - 1.0;
  clipPos.y = -clipPos.y;

  gl_Position = vec4(clipPos, 0.0, 1.0);

  vec2 normalizedQuad = a_quadPos / a_scaleFlip.x * 0.5 + 0.5;
  if (a_scaleFlip.y < 0.0) {
    normalizedQuad.x = 1.0 - normalizedQuad.x;
  }

  float uMid = (a_uvRect.x + a_uvRect.z) * 0.5;
  v_diffuseUv = vec2(mix(a_uvRect.x, uMid, normalizedQuad.x), mix(a_uvRect.y, a_uvRect.w, normalizedQuad.y));
  v_normalUv = vec2(mix(uMid, a_uvRect.z, normalizedQuad.x), mix(a_uvRect.y, a_uvRect.w, normalizedQuad.y));
  v_tintColor = a_tintColor;
}
