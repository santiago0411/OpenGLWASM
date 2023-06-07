#include "Shader.h"

#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>

#include "OpenGL.h"

static bool CompileShader(const ShaderSpec* shaderSpec, GLuint* outShaderId)
{
	printf("Compiling shader:\n%s\n", shaderSpec->Source);

	const GLuint shader = glCreateShader(shaderSpec->Stage);
	glShaderSource(shader, 1, &shaderSpec->Source, NULL);
	glCompileShader(shader);

	GLint compileStatus;
	glGetShaderiv(shader, GL_COMPILE_STATUS, &compileStatus);
	if (compileStatus == GL_FALSE)
	{
		GLint logLength;
		glGetShaderiv(shader, GL_INFO_LOG_LENGTH, &logLength);
		char* log = malloc(logLength);
		glGetShaderInfoLog(shader, logLength, NULL, log);
		fprintf(stderr, "%s", log);
		free(log);
	}

	*outShaderId = shader;
	return compileStatus == GL_TRUE;
}

static bool LinkAndValidateProgram(const GLuint shaderId)
{
	printf("Linking program: %d\n", shaderId);
	glLinkProgram(shaderId);
	glValidateProgram(shaderId);
	int32_t result;
	glGetProgramiv(shaderId, GL_LINK_STATUS, &result);
	return result;
}

static void DeleteShaders(const GLuint* shadersCreated, const uint8_t count)
{
	for (uint8_t i = 0; i < count; i++)
		glDeleteShader(shadersCreated[i]);
}

bool ShaderCreate(GLuint* outShaderId, const ShaderSpec* shaderSpecs, const uint8_t count)
{
	const GLuint shaderId = glCreateProgram();
	printf("Created program: %d\n", shaderId);
	GLuint* shadersCreated = malloc(count * sizeof(GLuint));

	for (uint8_t i = 0; i < count; i++)
	{
		if (CompileShader(&shaderSpecs[i], &shadersCreated[i]))
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