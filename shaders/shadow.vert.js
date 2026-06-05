PS.assets.registerText("shaders/shadow.vert", "#version 300 es\nin vec2 a_position;\nvoid main() {\n  gl_Position = vec4(a_position, 0.0, 1.0);\n}\n");
