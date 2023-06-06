project "OpenGLApp"
	kind "ConsoleApp"
	language "C++"
	cppdialect "C++20"
	targetdir "bin/%{cfg.buildcfg}"
	staticruntime "off"

	files 
	{ 
		"src/**.h",
		"src/**.cpp",
		"vendor/stb_image/**.h",
		"vendor/stb_image/**.cpp"
	}

	includedirs
	{
		"src",
		"%{wks.location}/vendor/GLFW/include",
		"%{wks.location}/vendor/Glad/include",
		"%{wks.location}/vendor/ImGui",
		"vendor/glm",
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