import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";
import { Hono } from "hono";
import { partyserverMiddleware } from "hono-party";
import { apiApp } from "./api";

export { QuizRoom } from "./party/quiz-room";

const startHandler = createStartHandler(defaultStreamHandler);

const app = new Hono<{ Bindings: Env }>();

app.use("*", partyserverMiddleware());
app.route("/", apiApp);
app.all("*", (c) => startHandler(c.req.raw));

export default app;
