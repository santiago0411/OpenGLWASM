project "OpenGLWASM"
	kind "ConsoleApp"
	language "C"
	cdialect "C99"
	targetdir "bin/%{cfg.buildcfg}"
	staticruntime "off"

	files 
	{ 
		"src/**.h",
		"src/**.c",
		"vendor/stb_image/**.h",
		"vendor/stb_image/**.c"
	}

	removefiles
	{
		"src/MainWASM.c",
		"src/BasicTest.c"
	}

	includedirs
	{
		"src",
		"%{wks.location}/vendor/GLFW/include",
		"%{wks.location}/vendor/Glad/include",
		"%{wks.location}/vendor/ImGui",
		"vendor/stb_image"
	}

	defines
	{
		"GLFW_INCLUDE_NONE"
	}

	links
	{
		"GLFW",
		"Glad",
		"ImGui",
		"opengl32.lib"
	}

	targetdir ("../bin/" .. outputdir .. "/%{prj.name}")
	objdir ("../bin-int/" .. outputdir .. "/%{prj.name}")

	filter "system:windows"
		systemversion "latest"
		defines { "APP_PLATFORM_WINDOWS" }

	filter "configurations:Debug"
		defines { "APP_DEBUG" }
		runtime "Debug"
		symbols "On"

	filter "configurations:Release"
   		defines { "APP_RELEASE" }
		runtime "Release"
		optimize "On"
		symbols "On"

	filter "configurations:Dist"
		kind "WindowedApp"
		defines { "APP_DIST" }
		runtime "Release"
		optimize "On"
		symbols "Off"