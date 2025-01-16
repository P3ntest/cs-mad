import { SAMPLE_CONFIG } from "./sample_config.ts";
import { join } from "https://deno.land/std@0.185.0/path/mod.ts";
import { getGamePath } from "./steam_games.ts";

console.log("Injecting into CS2");
const game = await getGamePath("730");
const gamePath = game?.game?.path;
console.log("Found cs at:", gamePath);
if (!gamePath) {
  console.error("Could not find CS2, will not inject.");
} else {
  const PATH_APPEND = "/game/csgo/cfg/gamestate_integration_csmad.cfg";
  const finalPath = join(gamePath!, PATH_APPEND);

  console.log("Writing config to:", finalPath);

  Deno.writeFile(finalPath, new TextEncoder().encode(SAMPLE_CONFIG));

  console.log(
    "Injected! Make sure to restart CS2 for the changes to take effect."
  );
}
