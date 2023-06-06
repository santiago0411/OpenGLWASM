#include "Shader.h"

#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>

#include <glad/glad.h>

static bool CompileShader(const ShaderSpec* shaderSpec, GLuint* outShaderId)
{
	const GLuint shader = glCreateShader(shaderSpec->Stage);
	glShaderSource(shader, 1, &shaderSpec->Source, NULL);
	glCompileShader(shader);

	int32_t result;
	glGetShaderiv(shader, GL_COMPILE_STATUS, &result);

	if (!result)
	{
		char log[512] = { 0 };
		glGetShaderInfoLog(shader, sizeof log, NULL, log);
		fprintf(stderr, "Error compiling shader %d: %s", shaderSpec->Stage, log);
		glDeleteShader(shader);
		*outShaderId = UINT32_MAX;
		return false;
	}

	*outShaderId = shader;
	return true;
}

static bool LinkAndValidateProgram(const GLuint shaderId)
{
	glLinkProgram(shaderId);
	glValidateProgram(shaderId);

	int32_t result;
	glGetProgramiv(shaderId, GL_LINK_STATUS, &result);

	if (!result)
	{
		char log[512] = { 0 };
		glGetProgramInfoLog(shaderId, sizeof log, NULL, log);
		fprintf(stderr, "Failed to validate shader %s.\n", log);
		return false;
	}

	return true;
}

static void DeleteShaders(const GLuint* shadersCreated, const uint8_t count)
{
	for (uint8_t i = 0; i < count; i++)
		glDeleteShader(shadersCreated[i]);
}

bool ShaderCreate(GLuint* outShaderId, const ShaderSpec* shaderSpecs, const uint8_t count)
{
	const GLuint shaderId = glCreateProgram();
	GLuint* shadersCreated = malloc(count * sizeof(GLuint));

	for (uint8_t i = 0; i < count; i++)
	{
		CompileShader(&shaderSpecs[i], &shadersCreated[i]);
		glAttachShader(shaderId, shadersCreated[i]);
	}

	const bool result = LinkAndValidateProgram(shaderId);
	DeleteShaders(shadersCreated, count);
	free(shadersCreated);
	*outShaderId = shaderId;
	return result;
}

void ShaderDestroy(const GLuint shaderId)
{
	glDeleteProgram(shaderId);
}