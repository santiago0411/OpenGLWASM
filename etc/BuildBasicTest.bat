@echo off
emcc BasicTest.c -o BasicTest.js -s EXPORTED_FUNCTIONS="['_AddNumbers', '_SubtractNumbers']"
PAUSE