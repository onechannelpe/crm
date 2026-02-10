import { Hono } from "hono";
import { logger } from "hono/logger";
import { authMiddleware } from "./middleware/auth";
import { errorHandler } from "./middleware/error";
import auth from "./modules/auth/routes";
import interactions from "./modules/interactions/routes";
import leads from "./modules/leads/routes";
import salesCrud from "./modules/sales/crud";
import salesReview from "./modules/sales/review";
import team from "./modules/team/routes";
import type { AppVariables } from "./types";

const app = new Hono<{ Variables: AppVariables }>();

app.use("*", logger());
app.onError(errorHandler);

app.route("/api/auth", auth);

app.use("/api/*", authMiddleware);
app.route("/api/leads", leads);
app.route("/api/sales", salesCrud);
app.route("/api/sales", salesReview);
app.route("/api/interactions", interactions);
app.route("/api/team", team);

export default {
  port: 3001,
  hostname: "127.0.0.1",
  fetch: app.fetch,
};
