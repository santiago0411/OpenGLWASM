import os
import shutil
import subprocess
import sys
from dataclasses import dataclass

ETC_PATH = "../etc"
SRC_PATH = "../OpenGLWASM/src"


@dataclass
class BuildConfig:
    output_path: str
    output_name: str
    src_file: str
    js_file_name: str
    index_file_name: str
    command: []

    def __init__(self, output_path: str, output_name: str, js_file_name: str, index_file_name: str, command: []):
        self.output_path = output_path
        self.output_name = output_name
        self.js_file_name = js_file_name
        self.index_file_name = index_file_name
        self.command = command


BASIC_TEST_COMMAND = [
               f"{SRC_PATH}/BasicTest.c",
               "-o", "../builds/BasicTest/BasicTest.js", "-s", "WASM=1",
               "-s", "EXPORT_ALL=1"]

OPENGL_PARAMS_COMMAND = [
               f"{SRC_PATH}/MainWASM.c", f"{SRC_PATH}/MyMath.c", f"{SRC_PATH}/Shader.c", f"{SRC_PATH}/Renderer.c",
               "-o", "../builds/OpenGL/OpenGL.js", "-s", "WASM=1",
               "-s", "USE_GLFW=3", "-s", "USE_WEBGL2=1",
               "-s", "EXPORT_ALL=1"]

CONFIGS = {
    "basictest": BuildConfig("../builds/BasicTest", "BasicTest", "script - BasicTest.js", "index - BasicTest.html", BASIC_TEST_COMMAND),
    "opengl": BuildConfig("../builds/OpenGL", "OpenGL", "script - OpenGL.js", "index - OpenGL.html", OPENGL_PARAMS_COMMAND)
}


def create_directories(output_path: str):
    output_dir = os.path.abspath(output_path)

    try:
        os.makedirs(output_dir, exist_ok=True)
        return True

    except OSError as e:
        print(f"Error: Failed to create directories - {e}")
        return False


def delete_folder(folder_path: str):
    try:
        shutil.rmtree(folder_path)
    except FileNotFoundError:
        print(f"Folder '{folder_path}' does not exist.")
    except Exception as e:
        print(f"Error: Failed to delete folder '{folder_path}' - {e}")


def delete_file(file_path: str):
    try:
        os.remove(file_path)
    except FileNotFoundError:
        print(f"File '{file_path}' does not exist.")
    except Exception as e:
        print(f"Error: Failed to delete file '{file_path}' - {e}")


def move_and_rename_file(original_file: str, new_file_name: str, output_path: str):
    try:
        # Construct the source and destination paths
        source_path = os.path.abspath(original_file)
        destination_path = os.path.join(output_path, new_file_name)

        # Copy the file to the destination folder with the new name
        shutil.copy(source_path, destination_path)

    except FileNotFoundError:
        print(f"Error: File '{original_file}' not found.")
    except Exception as e:
        print(f"Error: Failed to copy and rename the file - {e}")


def emcc_exists():
    # Check if 'emcc' can be executed without a path
    exe = shutil.which("emcc")
    if exe is None:
        print("Error: 'emcc' executable not found in PATH.")
        print("Please make sure 'emcc' is installed and added to the system's PATH.")
        return None

    return exe


def build(config: BuildConfig):
    exe = emcc_exists()
    if exe is None:
        sys.exit(1)
        return

    if not create_directories(config.output_path):
        sys.exit(1)
        return

    config.command.insert(0, exe)

    result = subprocess.run(config.command, capture_output=True, text=True, shell=True)
    print(result.stdout)
    if result.returncode != 0:
        print("Error: Compilation failed.")
        sys.exit(1)
        delete_folder(OUTPUT_PATH)
        return

    delete_file(f"{config.output_path}/{config.output_name}.js")
    move_and_rename_file(f"{ETC_PATH}/{config.js_file_name}", "script.js", config.output_path)
    move_and_rename_file(f"{ETC_PATH}/{config.index_file_name}", "index.html", config.output_path)
    move_and_rename_file(f"{ETC_PATH}/Run.bat", f"Run{config.output_name}.bat", config.output_path)
    print(f"Successfully built {config.output_name} at {config.output_path}")


def main():
    args = sys.argv
    if len(args) < 2:
        print("Must call with one argument indicating what project to build.")
        return

    project = args[1].lower()
    if project not in CONFIGS:
        print(f"Unknown project: {project}")
        return

    build(CONFIGS.get(project))


if __name__ == "__main__":
    main()

