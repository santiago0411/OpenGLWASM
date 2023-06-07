#include <emscripten.h>
#include <stdbool.h>
#include <stdlib.h>
#include <stdio.h>

#include "OpenGL.h"
#include "Renderer.h"

static uint8_t s_Pixels[WIDTH * HEIGHT * 4];

void* EMSCRIPTEN_KEEPALIVE MyMalloc(size_t size)
{
	return malloc(size);
}

void EMSCRIPTEN_KEEPALIVE MyFree(void* ptr)
{
	free(ptr);
}

uint8_t* EMSCRIPTEN_KEEPALIVE MyRender(double dt)
{
	Render(dt);
	glReadPixels(0, 0, WIDTH, HEIGHT, GL_RGBA, GL_UNSIGNED_BYTE, s_Pixels);
	return s_Pixels;
}

void EMSCRIPTEN_KEEPALIVE MyShutdown(void)
{
	printf("Shutting down render context.\n");
	Shutdown();
}

bool EMSCRIPTEN_KEEPALIVE MyInit(const char* vertexSource, const char* fragmentSource)
{
	printf("Hello world from C\n");
	return Init(vertexSource, fragmentSource);
}