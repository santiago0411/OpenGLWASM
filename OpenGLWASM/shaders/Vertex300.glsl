#version 300 es
precision mediump float;
in vec2 a_Pos;
in vec3 a_Color;
uniform mat4 u_Model;
out vec4 v_Color;

void main()
{
    gl_Position = u_Model * vec4(a_Pos.x, a_Pos.y, 0.0, 1.0);
    v_Color = vec4(a_Color, 1.0);
}
