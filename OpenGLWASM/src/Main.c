#include <stdio.h>

#include <glad/glad.h>
#include <GLFW/glfw3.h>

#include "MyMath.h"
#include "Shader.h"
#include "Utils.h"

#define ARRAY_SIZE(array) (sizeof((array))/sizeof((array)[0]))

static void OpenGLMessageCallback(uint32_t source, uint32_t type, uint32_t id, uint32_t severity, int32_t length, const char* message, const void* userParam)
{
	switch (severity)
	{
		case GL_DEBUG_SEVERITY_HIGH:
			fprintf(stderr, "%s\n", message);
			return;
		case GL_DEBUG_SEVERITY_MEDIUM:
			fprintf(stderr, "%s\n", message);
			return;
		case GL_DEBUG_SEVERITY_LOW:
			fprintf(stderr, "%s\n", message);
			return;
		case GL_DEBUG_SEVERITY_NOTIFICATION:
			puts(message);
			return;
	}
}

int main(void)
{
	if (!glfwInit())
	{
		fprintf(stderr, "Failed to initialize GLFW. Exiting application...\n");
		return -1;
	}

	glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 4);
	glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 5);
	glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);

	// Create the window
	GLFWwindow* window = glfwCreateWindow(1280, 720, "OpenGLWASM", NULL, NULL);
	if (!window)
	{
		fprintf(stderr, "Failed to create GLFW window. Exiting application...\n");
		glfwTerminate();
		return -1;
	}

	// Set the window and turn on VSync
	glfwMakeContextCurrent(window);
	glfwSwapInterval(1);

	// Load the OpenGL functions
	if (!gladLoadGLLoader((GLADloadproc)glfwGetProcAddress))
	{
		fprintf(stderr, "Failed to initialize Glad. Exiting application...\n");
		glfwTerminate();
		return -1;
	}

	puts("OpenGL Info:");
	printf("\tVendor: %s\n", (const char*)glGetString(GL_VENDOR));
	printf("\tRenderer: %s\n", (const char*)glGetString(GL_RENDERER));
	printf("\tVersion: %s\n", (const char*)glGetString(GL_VERSION));

#if !defined(APP_DIST)
	glEnable(GL_DEBUG_OUTPUT);
	glEnable(GL_DEBUG_OUTPUT_SYNCHRONOUS);
	glDebugMessageCallback(OpenGLMessageCallback, NULL);
#endif

	const char* vertexSource = ReadFileToEnd("shaders/Vertex.glsl");
	const char* fragmentSource = ReadFileToEnd("shaders/Fragment.glsl");

	if (!vertexSource || !fragmentSource)
	{
		fprintf(stderr, "Failed to read shaders sources. Exiting application...\n");
		glfwTerminate();
		return -1;
	}

	const ShaderSpec specs[] = {
		{ .Source = vertexSource,   .Stage = GL_VERTEX_SHADER   },
		{ .Source = fragmentSource, .Stage = GL_FRAGMENT_SHADER }
	};

	GLuint shader;
	if (!ShaderCreate(&shader, specs, ARRAY_SIZE(specs)))
	{
		fprintf(stderr, "Failed to create shaders. Exiting application...\n");
		glfwTerminate();
		return -1;
	}

	free(vertexSource);
	free(fragmentSource);

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
	GLuint VAO;
	glGenVertexArrays(1, &VAO);
	glBindVertexArray(VAO);

	// Create vertex and index buffers
	GLuint VBO, IBO;
	glGenBuffers(1, &VBO);
	glGenBuffers(1, &IBO);

	// Bind them to use a vertex and index buffers
	glBindBuffer(GL_ARRAY_BUFFER, VBO);
	glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, IBO);

	// Copy the corresponding data into each buffer
	glBufferData(GL_ARRAY_BUFFER, sizeof vertices, vertices, GL_STATIC_DRAW);
	glBufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof indices, indices, GL_STATIC_DRAW);

	// Position attribute
	glVertexAttribPointer(0, 2, GL_FLOAT, GL_FALSE, ARRAY_SIZE(vertices), (void*)0);
	glEnableVertexAttribArray(0);

	// Color attribute
	glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, ARRAY_SIZE(vertices), (void*)(2 * sizeof(float)) /*Stride*/);
	glEnableVertexAttribArray(1);

	glUseProgram(shader);

	const GLuint modelUniform = glGetUniformLocation(shader, "u_Model");

	Mat4 modelMatrix;
	Mat4Identity(&modelMatrix);

	double previousTime = 0;

	while (!glfwWindowShouldClose(window))
	{
		// If ESC was pressed exit the application
		if (glfwGetKey(window, GLFW_KEY_ESCAPE) == GLFW_PRESS)
			glfwSetWindowShouldClose(window, GLFW_TRUE);

		// Calculate delta time
		double currentTime = glfwGetTime();
		double deltaTime = currentTime - previousTime;
		previousTime = currentTime;

		const float rotationSpeed = 20.0f;
		float angle = rotationSpeed * deltaTime;

		const Vec3 rotation = { .X = 0.0f, .Y = 0.0f, .Z = 1.0f };
		MatRotate(&modelMatrix, angle, &rotation, &modelMatrix);
		glUniformMatrix4fv(modelUniform, 1, GL_FALSE, Mat4ValuePtr(&modelMatrix));

		// Clear the buffer and draw the square
		glClear(GL_COLOR_BUFFER_BIT);
		glDrawElements(GL_TRIANGLES, 6, GL_UNSIGNED_INT, 0);

		// Swap front and back buffers and poll window events
		glfwSwapBuffers(window);
		glfwPollEvents();
	}

	// Clean up
	ShaderDestroy(shader);
	glDeleteBuffers(1, &VBO);
	glDeleteBuffers(1, &IBO);

	glfwTerminate();

	return 0;
}