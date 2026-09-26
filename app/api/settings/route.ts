import { PRESETS } from "@/src/llm/presets";
import { handle, readJson } from "@/src/server/errors";
import { loadSettings, mergeIncoming, publicSettings, saveSettings, type AppSettings } from "@/src/server/settings";

export const GET = handle(async (req: Request) => Response.json({ settings: publicSettings(loadSettings(req)), presets: PRESETS }));

export const PUT = handle(async (req: Request) => {
  const incoming = await readJson<Partial<AppSettings>>(req);
  const { settings, setCookie } = saveSettings(req, mergeIncoming(loadSettings(req), incoming));
  return Response.json({ settings: publicSettings(settings) }, setCookie ? { headers: { "set-cookie": setCookie } } : undefined);
});
