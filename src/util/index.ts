import express, {
  Express,
  Request,
  Response,
  NextFunction,
  RequestHandler,
  Router,
} from "express";
import { Server } from "http";

export interface CreateAppProps {
  port: number | string;
  baseRoute?: string;
  router?: Router;
  onStart?: () => void | Promise<void>;
  middlewares?: RequestHandler[];
}

// A simple request logger middleware
const requestLogger: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log(`[API REQUEST] ${req.method} ${req.originalUrl} from ${req.ip}`);
  next();
};

// Creates and configures an Express app instance with middleware and routes
function configureApp(
  options: Omit<CreateAppProps, "port" | "onStart">
): Express {
  const { baseRoute = "/", router, middlewares = [] } = options;
  const app: Express = express();

  app.use(express.json());
  app.use(requestLogger);
  middlewares.forEach((mw) => app.use(mw));

  if (router) {
    app.use(baseRoute, router);
  }
  app.get("/health", (_, res) => {
    res.status(200).json({ status: "ok" });
  });
  return app;
}

// Starts the HTTP server for a given Express app
function startServer(
  app: Express,
  port: number | string,
  onStart?: () => void | Promise<void>
): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, async () => {
      console.log(`🚀 App is running at http://localhost:${port}`);
      try {
        if (onStart) {
          await onStart();
        }
        resolve(server);
      } catch (error) {
        console.error(
          `❌ Failed to execute onStart hook for app on port ${port}`,
          error
        );
        reject(error);
      }
    });
    server.on("error", (error) => {
      console.error(`❌ Server failed to start on port ${port}`, error);
      reject(error);
    });
  });
}

export async function createApp(options: CreateAppProps): Promise<Express> {
  const app = configureApp(options);
  await startServer(app, options.port, options.onStart);
  return app;
}
