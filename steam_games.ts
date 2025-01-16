// tsc/index.ts
import * as VDF from "npm:vdf-parser";
import { join } from "https://deno.land/std@0.185.0/path/mod.ts";
import { existsSync } from "https://deno.land/std@0.185.0/fs/mod.ts";
import { homedir } from "node:os";
import { Registry } from "https://deno.land/x/winreg_deno/mod.ts";

function verifyGameManifestPath(
  gameId: string,
  libraryPath: string
): string | null {
  const manifestPath = join(libraryPath, `appmanifest_${gameId}.acf`);
  if (existsSync(manifestPath)) {
    return manifestPath;
  }
  return null;
}

async function getGameManifestPath(
  paths: string[],
  gameId: string
): Promise<string | null> {
  for (const path of paths) {
    console.log("Checking path:", path);
    const manifest = verifyGameManifestPath(gameId, path);
    console.log("Manifest:", manifest);
    if (manifest && (await getGame(manifest))) {
      return manifest;
    }
  }
  return null;
}

async function getSteamLibraries(steamPath: string): Promise<string[] | null> {
  const libraryFilePath = join(steamPath, "steamapps", `libraryfolders.vdf`);
  console.log("Library file path:", libraryFilePath);
  if (existsSync(libraryFilePath)) {
    const content = await Deno.readTextFile(libraryFilePath);
    try {
      console.log("Parsing library file");
      const parsed = VDF.parse(content) as any;
      const libraries = parsed.LibraryFolders || parsed.libraryfolders;
      if (!libraries) return null;

      return Object.values(libraries)
        .filter((value) => value)
        .map((value: any) =>
          typeof value === "string"
            ? join(value, "steamapps")
            : join(value.path as string, "steamapps")
        );
    } catch {
      return null;
    }
  }
  return null;
}

async function getSteamPath(): Promise<string | null> {
  switch (Deno.build.os) {
    case "windows": {
      try {
        const regKey = new Registry({
          hive: Registry.HKLM,
          key: `\\SOFTWARE\\WOW6432Node\\Valve\\Steam`,
        });
        const entry = await regKey.get("InstallPath");
        return (entry as any)?.value || null;
      } catch {
        return null;
      }
    }
    default:
      throw new Error("Unsupported operating system");
  }
}

async function getGame(
  manifestDir: string
): Promise<{ path: string; name: string } | null> {
  console.log("Getting game from manifest:", manifestDir);
  try {
    console.log("Reading manifest");
    const content = await Deno.readTextFile(manifestDir);
    console.log("Parsing manifest");
    const parsed: any = await VDF.parse(content);
    const dir = join(
      manifestDir,
      "../",
      "common",
      (parsed.AppState as any).installdir
    );
    if (!existsSync(dir)) return null;

    return { path: dir, name: (parsed.AppState as any).name };
  } catch {
    return null;
  }
}

export async function getGamePath(gameId: string, findExecutable = false) {
  const steamPath = await getSteamPath();
  console.log("Steam path:", steamPath);
  if (!steamPath) return null;

  const libraries = (await getSteamLibraries(steamPath)) || [];
  libraries.push(join(steamPath, "steamapps"));
  console.log("Libraries:", libraries);
  console.log("getting manifest");
  const manifest = await getGameManifestPath(libraries, gameId);
  console.log("manifest", manifest);
  if (!manifest) {
    return {
      game: null,
      steam: {
        path: steamPath,
        libraries: [...new Set(libraries)],
      },
    };
  }

  const game = await getGame(manifest);
  if (!findExecutable || !game) {
    return {
      game,
      steam: {
        path: steamPath,
        libraries: [...new Set(libraries)],
      },
    };
  }

  // Executable fetching logic is omitted as it requires additional API support.
  return {
    game: { ...game, executable: null },
    steam: {
      path: steamPath,
      libraries: [...new Set(libraries)],
    },
  };
}
