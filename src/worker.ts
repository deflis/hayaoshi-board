import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";
import { routePartykitRequest } from "partyserver";
import { apiApp } from "./api";

export { QuizRoom } from "./party/quiz-room";

const handler = createStartHandler(defaultStreamHandler);

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const partyResponse = await routePartykitRequest(request, env);
    if (partyResponse) return partyResponse;

    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return apiApp.fetch(request, env, ctx);
    }

    return handler(request);
  },
};
