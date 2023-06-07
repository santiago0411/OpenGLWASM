@echo off
emcc MainWASM.c MyMath.c Shader.c Renderer.c -o /bin/OpenGLWASM/OpenGLWASM.wasm -s WASM=1 -s USE_GLFW=3 -s USE_WEBGL2=1 -s EXPORT_ALL=1
PAUSE