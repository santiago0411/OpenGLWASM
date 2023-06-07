#include <stdio.h>

#include <glad/glad.h>
#include <GLFW/glfw3.h>

#include "Renderer.h"
#include "Utils.h"

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
	GLFWwindow* window = glfwCreateWindow(WIDTH, HEIGHT, "OpenGLWASM", NULL, NULL);
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

	const char* vertexSource = ReadFileToEnd("shaders/Vertex300.glsl");
	const char* fragmentSource = ReadFileToEnd("shaders/Fragment300.glsl");

	if (!vertexSource || !fragmentSource)
	{
		fprintf(stderr, "Failed to read shaders sources. Exiting application...\n");
		glfwTerminate();
		return -1;
	}

	bool initSuccessful = Init(vertexSource, fragmentSource);

	free(vertexSource);
	free(fragmentSource);

	if (!initSuccessful)
	{
		glfwTerminate();
		return -1;
	}

	double previousTime = 0.0;

	while (!glfwWindowShouldClose(window))
	{
		// If ESC was pressed exit the application
		if (glfwGetKey(window, GLFW_KEY_ESCAPE) == GLFW_PRESS)
			glfwSetWindowShouldClose(window, GLFW_TRUE);

		// Calculate delta time
		double currentTime = glfwGetTime();
		double deltaTime = currentTime - previousTime;
		previousTime = currentTime;

		Render(deltaTime);

		// Swap front and back buffers and poll window events
		glfwSwapBuffers(window);
		glfwPollEvents();
	}

	// Clean up
	Shutdown();
	glfwTerminate();

	return 0;
}