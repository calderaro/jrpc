import http from "http";

const limit = 100000; // 100kb

export const JSONBodyParser = (stream: http.IncomingMessage) => {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const requestMethod = stream.method;
    const contentType = stream.headers["content-type"];
    const contentLength = stream.headers["content-length"] || 0;

    if (requestMethod !== "POST") {
      done(new Error("invalid http method"), null);
      return;
    }

    if (contentType !== "application/json") {
      done(new Error("invalid enconding"), null);
      return;
    }

    if (contentLength > limit) {
      done(new Error("413 - entity too large"), null);
      return;
    }

    let complete = false;
    let buffer = "";
    let length = 0;

    stream.on("aborted", onAborted);
    stream.on("close", cleanup);
    stream.on("data", onData);
    stream.on("end", onEnd);
    stream.on("error", onEnd);

    function onData(chunk: string) {
      buffer += chunk;
      length += chunk.length;

      if (length > limit) {
        done(new Error("413 - entity too large"), null);
      }
    }

    function onEnd(err: Error) {
      if (complete) return;
      if (err) return done(err, null);

      if (length !== null && length !== length) {
        done(new Error("request size did not match content length"), null);
      } else {
        try {
          const parsedData = JSON.parse(buffer);
          done(null, parsedData);
        } catch (err) {
          done(err, null);
        }
      }
    }

    function onAborted() {
      if (complete) return;

      done(new Error("request aborted"), null);
    }

    function done(err: Error | null, data: Record<string, unknown> | null) {
      // mark complete
      complete = true;

      if (err) {
        return reject(err);
      }

      return resolve(data as Record<string, unknown>);
    }

    function cleanup() {
      buffer = "";
      stream.removeListener("aborted", onAborted);
      stream.removeListener("data", onData);
      stream.removeListener("end", onEnd);
      stream.removeListener("error", onEnd);
      stream.removeListener("close", cleanup);
    }
  });
};
