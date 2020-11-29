import http from "http";
import { InvalidParams, jsonrcpserver } from "./app";

type Methods = {
  createOrder: {
    request: { id: number; description: string };
    response: { id: number };
  };
};

function createOrder(props: {
  id: number;
  description: string;
}): { id: number } {
  console.log("createOrder");

  if (!props.id) {
    throw new InvalidParams("id is required");
  }
  return { id: props.id };
}

const app = jsonrcpserver<Methods>({
  createOrder,
});

const server = http.createServer(app).listen(8080);
