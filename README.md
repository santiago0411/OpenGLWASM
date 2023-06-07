# OpenGL WASM
A project written in C to demonstrate how the same code can be ported to WASM  and ran in a browser or ran standalone natively.

## Run Pre-Compiled Binaries

If you prefer not to build the application yourself, pre-compiled binaries are available for download in the [Releases](https://github.com/santiago0411/OpenGLWASM/releases/) section of this repository. Follow these steps to run the application using the pre-compiled binaries:

1. Navigate to the [Releases](https://github.com/santiago0411/OpenGLWASM/releases/) section of this repository on GitHub.
2. Locate the desired release version that includes the compiled binaries.
3. Extract the downloaded archive to a directory of your choice.
4. Navigate to the extracted directory containing the binary files.
5. Run the executable file for the standalone application or the Run.bat script to deploy the WASM app into a local web server using Python.
6. If running a WASM app navigate to (http://localhost:8000/) on your preferred browser.


## WASM Build

To build the WebAssembly (WASM) application, follow these steps:

1. Ensure that you have the necessary dependencies installed, such as [Emscripten](https://emscripten.org/docs/getting_started/downloads.html) SDK and Python.
2. Navigate to the "scripts" folder in the project directory.
3. Use the appropriate batch script based on the project you want to build.
4. Once the build process completes successfully, the output files will be available in the builds directory.
5. You can run a local server with Python to host the application using the Run.bat script provided in the build output directory.

Please note that the batch scripts assume that the necessary tools (e.g., emcc) are accessible through the system's PATH environment variable. If any issues arise during the build process, ensure that the required dependencies are correctly installed and accessible.


## Standalone Build

To build the standalone application using Visual Studio, follow these steps:

1. Ensure that you have Visual Studio installed on your Windows machine.
2. Navigate to the "scripts" folder in the project directory.
3. Run the GenWinProjects.bat script. This script will generate a Visual Studio solution (.sln) file and associated project files.
4. Once the script completes successfully, you can open the solution and build or run from within Visual Studio.
5. The solution will build the executable into bin/{Configuration}/OpenGLWASM. (To run directly from this folder you need to copy the shaders folder from inside the project folder)
