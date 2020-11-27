import http from "http";
import { JSONBodyParser } from "./parser";

export interface Method<T, U> {
  request: T;
  response: U;
}

export type Methods = Record<string, Method<any, any>>;

export type Handler<T, U> = (req: T) => U | Promise<U>;

export type Handlers<T extends Methods> = {
  [K in keyof T]: Handler<T[K]["request"], T[K]["response"]>;
};

export function jrpcapp<T extends Methods>(methods: Handlers<T>) {
  return async function app(
    request: http.IncomingMessage,
    response: http.ServerResponse
  ) {
    try {
      const body = await JSONBodyParser(request);
      const method = body.method as string;
      const params = body.params as string;
      const id = body.id as string;

      if (!method) {
        response.writeHead(400, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32700, message: "Parse error" },
            id: null,
          }),
          "utf-8"
        );
        return;
      }

      const handler = methods[method];

      if (handler) {
        const result = await handler(params);
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ jsonrpc: "2.0", result, id }), "utf-8");
        return;
      }

      response.writeHead(400, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32601, message: "Method not found" },
          id: "1",
        }),
        "utf-8"
      );
    } catch (err) {
      response.writeHead(400, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32700, message: "Parse error" },
          id: null,
        }),
        "utf-8"
      );
    }
  };
}
