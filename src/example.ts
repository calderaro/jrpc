import http from "http";
import { jrpcapp } from "./app";

type Methods = {
  add: {
    request: { a: number; b: number };
    response: number;
  };
};

const app = jrpcapp<Methods>({
  add: ({ a, b }) => a + b,
});

const server = http.createServer(app).listen(8080);
