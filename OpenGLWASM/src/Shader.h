#pragma once

#include <stdbool.h>
#include <stdint.h>

typedef unsigned int GLuint;
typedef unsigned int GLenum;

typedef struct
{
	const char* Source;
	const GLenum Stage;
} ShaderSpec;

bool ShaderCreate(GLuint* outShaderId, const ShaderSpec* shaderSpecs, const uint8_t count);
void ShaderDestroy(const GLuint shaderId);