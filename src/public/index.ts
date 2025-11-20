import router from "./router";
import { createApp } from "../util";
import { startConsumer } from "./consumer";

const PUBLIC_APP_PORT = process.env.PUBLIC_APP_PORT || 3000;

export const initPublicApp = async () => {
  return await createApp({
    port: PUBLIC_APP_PORT,
    baseRoute: "/api",
    router,
    onStart: startConsumer,
  });
};
