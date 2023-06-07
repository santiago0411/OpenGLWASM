#include "Renderer.h"

#include <stdio.h>

#include "OpenGL.h"
#include "MyMath.h"
#include "Shader.h"

#define ARRAY_SIZE(array) (sizeof((array))/sizeof((array)[0]))

struct
{
	GLuint Shader;
	GLint ModelUniform;
	GLuint VertexArray;
	GLuint VertexBuffer;
	GLuint IndexBuffer;
	GLuint Framebuffer;
	GLuint FramebufferTexture;
} s_Context;

static Mat4 s_ModelMatrix;

void Render(double dt)
{
	const float rotationSpeed = 20.0f;
	float angle = rotationSpeed * dt;

	const Vec3 rotation = { .X = 0.0f, .Y = 0.0f, .Z = 1.0f };
	MatRotate(&s_ModelMatrix, angle, &rotation, &s_ModelMatrix);
	glUniformMatrix4fv(s_Context.ModelUniform, 1, GL_FALSE, Mat4ValuePtr(&s_ModelMatrix));

	// Draw the square
	glClear(GL_COLOR_BUFFER_BIT);
	glDrawElements(GL_TRIANGLES, 6, GL_UNSIGNED_INT, 0);
}

void Shutdown(void)
{
	printf("Shutting down render context.\n");

	if (s_Context.Shader)
		glDeleteProgram(s_Context.Shader);

	if (s_Context.VertexArray)
		glDeleteVertexArrays(1, &s_Context.VertexArray);

	if (s_Context.VertexBuffer)
		glDeleteBuffers(1, &s_Context.VertexBuffer);

	if (s_Context.IndexBuffer)
		glDeleteBuffers(1, &s_Context.IndexBuffer);

	if (s_Context.Framebuffer)
		glDeleteFramebuffers(1, &s_Context.Framebuffer);

	if (s_Context.FramebufferTexture)
		glDeleteTextures(1, &s_Context.FramebufferTexture);
}

bool Init(const char* vertexSource, const char* fragmentSource)
{
	printf("Initializing renderer.\n");

	const ShaderSpec specs[] = {
		{.Source = vertexSource,   .Stage = GL_VERTEX_SHADER   },
		{.Source = fragmentSource, .Stage = GL_FRAGMENT_SHADER }
	};

	if (!ShaderCreate(&s_Context.Shader, specs, ARRAY_SIZE(specs)))
	{
		fprintf(stderr, "Failed to create shaders. Exiting application...\n");
		Shutdown();
		return false;
	}

	printf("Shader created successfully.\n");

	// Square vertex data
	const float vertices[] = {
		 0.5f,  0.5f, 1.0f, 0.0f, 0.0f,    // top right (X, Y, R, G, B)
		 0.5f, -0.5f, 0.0f, 1.0f, 0.0f,    // bottom right (X, Y, R, G, B)
		-0.5f, -0.5f, 0.0f, 0.0f, 1.0f,    // bottom left (X, Y, R, G, B)
		-0.5f,  0.5f, 1.0f, 1.0f, 0.0f,    // top left (X, Y, R, G, B)
	};

	const GLuint indices[] = {
		0, 1, 3,   // first triangle
		1, 2, 3    // second triangle
	};

	// Create vertex array
	glGenVertexArrays(1, &s_Context.VertexArray);
	glBindVertexArray(s_Context.VertexArray);

	// Create vertex and index buffers
	glGenBuffers(1, &s_Context.VertexBuffer);
	glGenBuffers(1, &s_Context.IndexBuffer);

	// Bind them to use a vertex and index buffers
	glBindBuffer(GL_ARRAY_BUFFER, s_Context.VertexBuffer);
	glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, s_Context.IndexBuffer);

	// Copy the corresponding data into each buffer
	glBufferData(GL_ARRAY_BUFFER, sizeof vertices, vertices, GL_STATIC_DRAW);
	glBufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof indices, indices, GL_STATIC_DRAW);

	// Position attribute
	glVertexAttribPointer(0, 2, GL_FLOAT, GL_FALSE, ARRAY_SIZE(vertices), (void*)0);
	glEnableVertexAttribArray(0);

	// Color attribute
	glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, ARRAY_SIZE(vertices), (void*)(2 * sizeof(float)) /*Stride*/);
	glEnableVertexAttribArray(1);

	// Framebuffer and texture is only used to render in WASM
#ifdef __EMSCRIPTEN__
	// Create and bind the framebuffer
	glGenFramebuffers(1, &s_Context.Framebuffer);
	glBindFramebuffer(GL_FRAMEBUFFER, s_Context.Framebuffer);

	// Create and bind the texture for the color attachment
	glGenTextures(1, &s_Context.FramebufferTexture);
	glBindTexture(GL_TEXTURE_2D, s_Context.FramebufferTexture);
	glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA8, WIDTH, HEIGHT, 0, GL_RGBA, GL_UNSIGNED_BYTE, NULL);
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
	glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, s_Context.FramebufferTexture, 0);

	// Check if the framebuffer is complete
	if (glCheckFramebufferStatus(GL_FRAMEBUFFER) != GL_FRAMEBUFFER_COMPLETE) {
		fprintf(stderr, "Failed to complete framebuffer.\n");
		Shutdown();
		return false;
	}

	// Set the viewport and clear the framebuffer
	glViewport(0, 0, WIDTH, HEIGHT);
#endif

	// Bind the shader
	glUseProgram(s_Context.Shader);
	s_Context.ModelUniform = glGetUniformLocation(s_Context.Shader, "u_Model");
	printf("Model uniform location: %d\n", s_Context.ModelUniform);

	// Set background color to black
	glClearColor(0.0f, 0.0f, 0.0f, 1.0f);

	// Init the mat4 as identity
	Mat4Identity(&s_ModelMatrix);

	return true;
}