import http from "http";
import { JSONBodyParser } from "./parser";
import { Methods, Handlers, JSONRPCRequest, JsonRpcId } from "./types";

function type(obj: any): string {
  return Object.prototype.toString
    .apply(obj)
    .replace(/\[object (.+)\]/i, "$1")
    .toLowerCase();
}

function isType(input: any, test: string[]) {
  return test.includes(type(input));
}

function isString(obj: any): obj is string {
  return isType(obj, ["string"]);
}

function isJsonRpcId(input: any): input is JsonRpcId {
  return isType(input, ["string", "number", "undefined", "null"]);
}

function validateRequest(data: unknown): JSONRPCRequest {
  if (!data || typeof data !== "object") {
    throw new InvalidRequest();
  }

  const { jsonrpc, method, params, id } = data as Record<string, unknown>;

  if (
    !jsonrpc ||
    jsonrpc !== "2.0" ||
    !method ||
    !isString(method) ||
    !isJsonRpcId(id)
  ) {
    throw new InvalidRequest();
  }

  return {
    jsonrpc,
    method,
    params,
    id,
  };
}

export async function requestHandler<T extends Methods>(
  methods: Handlers<T>,
  request: unknown
) {
  try {
    const { method, params, id } = validateRequest(request);

    const handler = methods[method];

    if (!methods) {
      throw new NotFound();
    }

    const result = await handler(params);
    return { jsonrpc: "2.0", result, id };
  } catch (err) {
    if (err.code) {
      throw err;
    }

    return new InternalError(err.message);
  }
}

export function jsonrcpserver<T extends Methods>(methods: Handlers<T>) {
  return async function app(
    request: http.IncomingMessage,
    response: http.ServerResponse
  ) {
    try {
      const body = await JSONBodyParser(request);
      const result = await requestHandler(methods, body);
      serverReponse(response, result);
    } catch (err) {
      if (err.code) {
        serverReponse(response, err);
        return;
      }
      if (err instanceof SyntaxError) {
        serverReponse(response, new ParseError(err.message));
        return;
      }
      serverReponse(response, new InternalError(err.message));
    }
  };
}

function serverReponse(response: http.ServerResponse, body: any) {
  if (body.code !== undefined && body.stack && body.toObject) {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({ jsonrpc: "2.0", error: body.toObject(), id: 0 }),
      "utf-8"
    );
    return;
  }

  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(
    JSON.stringify({ jsonrpc: "2.0", result: body.result, id: 0 }),
    "utf-8"
  );
}

class JSRONRPCError extends Error {
  code: number;
  data: any;
  constructor(message: string, code: number, data?: any) {
    super(message);
    this.code = code;
    this.data = data;
  }
  toObject = () => {
    return {
      code: this.code,
      message: this.message,
      data: this.data,
    };
  };
}

export class ParseError extends JSRONRPCError {
  constructor(message: string, data?: any) {
    super(message || "Parse error", -32700, data);
  }
}

export class InvalidRequest extends JSRONRPCError {
  constructor(message?: string, data?: any) {
    super(message || "Invalid request", -32600, data);
  }
}

export class NotFound extends JSRONRPCError {
  constructor(message?: string, data?: any) {
    super(message || "Method not found", -32601, data);
  }
}

export class InvalidParams extends JSRONRPCError {
  constructor(message?: string, data?: any) {
    super(message || "Invalid params", -32602, data);
  }
}

export class InternalError extends JSRONRPCError {
  constructor(message?: string, data?: any) {
    super(message || "Internal error", -32603, data);
  }
}
