import { Request, Response, Router } from "express";
import { getChannel } from "../config/rabbitmqClient";
import { rpcClient } from "./rpc";
import {
  ORDER_EXCHANGE,
  ORDER_ROUTING_KEY,
} from "../config/rabbitmqSetup/direct.exchange";
import { EVENTS_EXCHANGE } from "../config/rabbitmqSetup/topic.exchange";
import { CONTACT_FORM_QUEUE } from "../config/rabbitmqSetup/simpleQueue";

const router = Router();

// HTTP Routes (Publisher)
router.post("/contact", (req: Request, res: Response) => {
  const channel = getChannel();
  const { email, name, message } = req.body;

  if (!email || !name || !message) {
    return res
      .status(400)
      .json({ error: "Email, name, and message are required." });
  }

  const submission = { email, name, message, submittedAt: new Date() };
  const payload = Buffer.from(JSON.stringify(submission));

  const sent = channel.sendToQueue(CONTACT_FORM_QUEUE, payload, {
    persistent: true,
  });

  if (sent) {
    console.log(
      `[Public API] Successfully sent contact submission to queue '${CONTACT_FORM_QUEUE}'`
    );
    res
      .status(202)
      .json({ status: "Submission received and will be processed." });
  } else {
    // This can happen if the channel's write buffer is full
    console.error(`[Public API] Failed to send contact submission to queue.`);
    res.status(503).json({ error: "Server is busy, please try again later." });
  }
});

router.post("/orders", (req: Request, res: Response) => {
  const channel = getChannel();
  const orderDetails = {
    productId: req.body.productId || "product-123",
    quantity: req.body.quantity || 1,
    customer: "John Doe",
    timestamp: new Date(),
  };

  const message = Buffer.from(JSON.stringify(orderDetails));
  channel.publish(
    ORDER_EXCHANGE,
    ORDER_ROUTING_KEY,
    message,
    {
      persistent: true,
    },
    (error, ok) => {
      if (error) {
        // The message failed to be confirmed by the broker.
        // This is rare but could happen if the broker is out of memory/disk.
        console.error(
          `[Publisher] ❌ Order message failed to be confirmed. Error: ${error}`
        );
        // retry or save this order to a failure DB.
      } else {
        console.log(
          "[Publisher] ✅ Order message confirmed by the broker.",
          ok
        );
      }
    }
  );

  console.log(`[Public API] Sent new order to exchange '${ORDER_EXCHANGE}'`);

  res.status(202).json({
    message: "Order received and is being processed.",
    data: orderDetails,
  });
});

router.post("/events", (req: Request, res: Response) => {
  const channel = getChannel();
  const { routingKey, eventData } = req.body;

  if (!routingKey || !eventData) {
    return res
      .status(400)
      .send({ message: "Missing routingKey or eventData in body." });
  }
  const message = Buffer.from(JSON.stringify(eventData));
  // Publish to the TOPIC exchange with the dynamic routing key from the request
  channel.publish(EVENTS_EXCHANGE, routingKey, message);
  console.log(
    `[Public API] Sent event with key '${routingKey}' to exchange '${EVENTS_EXCHANGE}'`
  );
  res.status(202).json({ message: "Event published successfully." });
});

router.get("/products", (req: Request, res: Response) => {
  res.json({ products: ["Laptop", "Mouse", "Keyboard"] });
});

// RPC call
router.get("/reports/total-orders", async (req: Request, res: Response) => {
  try {
    console.log("[Public API] Sending RPC request for total orders...");
    const response = await rpcClient.sendRequest({ type: "GET_TOTAL_ORDERS" });
    console.log("[Public API] Received RPC response:", response);
    res.json(response);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
