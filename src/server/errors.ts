import { LlmError } from "@/src/llm/types";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function jsonError(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}

/** Envolve um handler e converte exceções em JSON de erro. */
export function handle<T extends unknown[]>(fn: (...args: T) => Promise<Response>): (...args: T) => Promise<Response> {
  return async (...args: T) => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return jsonError(e.status, e.message);
      if (e instanceof LlmError) return jsonError(e.status >= 400 && e.status < 600 ? 502 : 500, `LLM: ${e.message}`);
      console.error(e);
      return jsonError(500, e instanceof Error ? e.message : "Erro interno");
    }
  };
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "JSON inválido");
  }
}
