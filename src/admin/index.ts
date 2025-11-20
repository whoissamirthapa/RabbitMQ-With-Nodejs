import router from "./router";
import { createApp } from "../util";
import { startConsumer } from "./consumer";

const ADMIN_APP_PORT = process.env.ADMIN_APP_PORT || 3001;

export const initAdminApp = async () => {
  return await createApp({
    port: ADMIN_APP_PORT,
    baseRoute: "/admin",
    router,
    onStart: startConsumer,
  });
};
