export interface Method<T, U> {
  request: T;
  response: U;
}

export type Methods = Record<string, Method<any, any>>;

export type Handler<T, U> = (req: T) => U | Promise<U>;

export type Handlers<T extends Methods> = {
  [K in keyof T]: Handler<T[K]["request"], T[K]["response"]>;
};

export type JsonRpcId = string | number | null | undefined;

export interface JSONRPCRequest {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method: string;
  params: unknown;
}
