#include <iostream>

#include <glad/glad.h>
#include <GLFW/glfw3.h>

static void glfwErrorCallback(int32_t error, const char* description)
{
	std::cerr << "GLFW Error (" << error << "): " << description << "\n";
}

int main()
{
	if (!glfwInit())
	{
		std::cerr << "Failed to initialize GLFW. Exiting application...\n";
		return -1;
	}

	glfwSetErrorCallback(glfwErrorCallback);

	glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 4);
	glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 5);
	glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);

	GLFWwindow* window = glfwCreateWindow(1280, 720, "OpenGLApp", nullptr, nullptr);
	if (!window)
	{
		std::cerr << "Failed to create GLFW window. Exiting application...\n";
		glfwTerminate();
		return -1;
	}

	glfwMakeContextCurrent(window);
	glfwSwapInterval(1);

	if (!gladLoadGLLoader((GLADloadproc)glfwGetProcAddress))
	{
		std::cerr << "Failed to initialize Glad. Existing application...\n";
		return -1;
	}

	std::cout << "OpenGL Info:\n";
	std::cout << "\tVendor: " << glGetString(GL_VENDOR) << "\n";
	std::cout << "\tRenderer: " << glGetString(GL_RENDERER) << "\n";
	std::cout << "\tVersion: " << glGetString(GL_VERSION) << "\n";

	while (!glfwWindowShouldClose(window))
	{
		glClear(GL_COLOR_BUFFER_BIT);
		glfwSwapBuffers(window);
		glfwPollEvents();
	}

	glfwTerminate();

	return 0;
}