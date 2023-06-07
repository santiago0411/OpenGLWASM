#pragma once

#include <stdbool.h>

#define WIDTH 800
#define HEIGHT 600

void Render(double dt);
void Shutdown(void);
bool Init(const char* vertexSource, const char* fragmentSource);