import express, { Express, Request, Response, Router } from "express";
import { getChannel } from "../config/rabbitmqClient";
import { CACHE_EXCHANGE } from "../config/rabbitmqSetup/fanout.exchange";
import {
  DELAYED_EXCHANGE,
  DELAYED_NOTIFICATION_ROUTING_KEY,
} from "../config/rabbitmqSetup/delayed.message";

const router = Router();

// Simple auth middleware
router.use((req, res, next) => {
  if (req.headers.authorized === "true") {
    next();
  } else {
    res.status(403).send("Forbidden");
  }
});

// HTTP Routes (Publisher)
router.post("/broadcast/clear-cache", (req: Request, res: Response) => {
  const channel = getChannel();
  const reason = req.body.reason || "Manual trigger from admin";
  const message = Buffer.from(JSON.stringify({ event: "CLEAR_CACHE", reason }));

  // Publish to the fanout exchange. The routing key is ignored.
  channel.publish(CACHE_EXCHANGE, "", message);

  console.log(
    `[Admin App] Sent 'clear cache' broadcast to exchange '${CACHE_EXCHANGE}'`
  );
  res.status(200).json({ message: "Broadcast sent to all services." });
});

router.get("/dashboard", (req: Request, res: Response) => {
  res.send("<h1>Admin Dashboard</h1>");
});

router.post("/schedule-reminder", (req: Request, res: Response) => {
  const channel = getChannel();
  const { message, delay } = req.body; // delay in milliseconds

  if (!message || !delay) {
    return res
      .status(400)
      .send({ error: "Message and delay (in ms) are required." });
  }

  const payload = Buffer.from(
    JSON.stringify({ message, scheduledAt: new Date() })
  );

  // Has to add 'x-delay' in 'headers' option
  channel.publish(DELAYED_EXCHANGE, DELAYED_NOTIFICATION_ROUTING_KEY, payload, {
    persistent: true,
    headers: {
      "x-delay": delay,
    },
  });

  console.log(`[Admin App] Scheduled a reminder with a ${delay}ms delay.`);
  res.status(202).send({
    status: `Reminder scheduled for ~${delay / 1000} seconds from now.`,
  });
});

export default router;
