#include <emscripten.h>
#include <stdio.h>

// Function to add two numbers
int EMSCRIPTEN_KEEPALIVE AddNumbers(int a, int b) {
    int result = a + b;
    printf("C AddNumbers result: %d\n", result);
    return result;
}

// Function to subtract two numbers
int EMSCRIPTEN_KEEPALIVE SubtractNumbers(int a, int b) {
    int result = a - b;
    printf("C SubtractNumbers result: %d\n", result);
    return result;
}