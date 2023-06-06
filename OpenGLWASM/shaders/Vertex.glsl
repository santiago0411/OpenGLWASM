#version 450

layout (location = 0) in vec2 a_Pos;
layout (location = 1) in vec3 a_Color;

uniform mat4 u_Model;

layout (location = 0) out vec4 v_Color;

void main()
{
  	gl_Position = u_Model * vec4(a_Pos.x, a_Pos.y, 0, 1.0);
	v_Color = vec4(a_Color, 1.0);
}