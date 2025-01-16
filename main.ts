import * as keyboard from "https://deno.land/x/denopilot/mod_keyboard.ts";
let lastKills = 0;

Deno.serve(
  {
    port: 16969,
  },
  async (_req) => {
    const json = await _req.json();

    if (json.player?.match_stats?.kills) {
      const kills = json.player.match_stats.kills;
      const diff = kills - lastKills;
      lastKills = kills;

      if (diff > 0) {
        send_mad();
      }
      if (diff < 0 && kills > 0) {
        // happens when a new round starts and the kills reset
        send_mad();
      }
    }

    return new Response();
  }
);

function send_mad() {
  console.log(`Player got a kill!`);
  keyboard.sendKey({
    key: keyboard.Key.SemiColon,
    action: "press",
  });
}
