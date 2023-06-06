#pragma once

#include <stdio.h>
#include <stdlib.h>

const char* ReadFileToEnd(const char* filename) {

    FILE* file;
    if (fopen_s(&file, filename, "rb") != 0)
    {
        fprintf(stderr, "Failed to open file: %s\n", filename);
        return NULL;
    }

    // Determine the size of the file
    fseek(file, 0, SEEK_END);
    const size_t fileSize = ftell(file);
    rewind(file);

    // Allocate memory to hold the file contents
    char* buffer = (char*)malloc(fileSize + 1);
    if (buffer == NULL) {
        fprintf(stderr, "Memory allocation failed.\n");
        fclose(file);
        return NULL;
    }

    // Read the file into the buffer
    size_t bytesRead = fread(buffer, 1, fileSize, file);
    if (bytesRead != fileSize) {
        fprintf(stderr, "Failed to read file: %s\n", filename);
        fclose(file);
        free(buffer);
        return NULL;
    }

    buffer[bytesRead] = '\0'; // Null-terminate the buffer

    fclose(file);
    return buffer;
}