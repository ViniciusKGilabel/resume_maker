import { PRESETS } from "@/src/llm/presets";
import { handle, readJson } from "@/src/server/errors";
import { loadSettings, mergeIncoming, publicSettings, saveSettings, type AppSettings } from "@/src/server/settings";

export const GET = handle(async () => Response.json({ settings: publicSettings(loadSettings()), presets: PRESETS }));

export const PUT = handle(async (req: Request) => {
  const incoming = await readJson<Partial<AppSettings>>(req);
  const merged = saveSettings(mergeIncoming(loadSettings(), incoming));
  return Response.json({ settings: publicSettings(merged) });
});
