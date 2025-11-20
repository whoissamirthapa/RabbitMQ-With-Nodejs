import { getChannel } from "../config/rabbitmqClient";
import { ORDER_DEAD_LETTER_QUEUE } from "../config/rabbitmqSetup/deadLetter";
import {
  ORDER_QUEUE1,
  ORDER_QUEUE2,
} from "../config/rabbitmqSetup/direct.exchange";
import { RPC_QUEUE } from "../config/rabbitmqSetup/rpc";
import { CONTACT_FORM_QUEUE } from "../config/rabbitmqSetup/simpleQueue";
import {
  AUDIT_LOG_QUEUE,
  USER_METRICS_QUEUE,
} from "../config/rabbitmqSetup/topic.exchange";

// RabbitMQ Consumer
const startContactFormConsumer = () => {
  const channel = getChannel();
  console.log(
    `[Consumer Started: Admin App] Waiting for contact form submissions in queue: ${CONTACT_FORM_QUEUE}`
  );
  channel.consume(
    CONTACT_FORM_QUEUE,
    (msg) => {
      if (msg) {
        try {
          const submission = JSON.parse(msg.content.toString());
          console.log("[CONTACT WORKER] Received new contact form submission:");
          console.log(submission);

          // Simulate doing slow work, like sending an email
          console.log(
            "[CONTACT WORKER] Processing: Sending email notification to support..."
          );
          setTimeout(() => {
            console.log("[CONTACT WORKER] Processing complete. Email sent.");
            channel.ack(msg);
          }, 3000);
        } catch (e) {
          console.error("Error processing contact form submission", e);
          // Reject the message so it can potentially be dead-lettered
          channel.nack(msg, false, false);
        }
      }
    },
    {
      // Acknowledge messages manually
      noAck: false,
    }
  );
};

const startOrderConsumer = () => {
  const channel = getChannel();
  channel.prefetch(1);

  console.log(
    `[Consumer Started: Admin App] Waiting for messages in queue: ${ORDER_QUEUE1} ${ORDER_QUEUE2}`
  );
  channel.consume(
    ORDER_QUEUE1,
    (msg) => {
      if (msg) {
        try {
          const order = JSON.parse(msg.content.toString());
          console.log("[Admin App Worker] Received new order:", order);
          if (order.productId === "FAIL") {
            console.error(
              "[Admin App Worker] ❌ This is a poison pill message! Rejecting and dead-lettering."
            );
            // Reject the message, and DO NOT re-queue it (the final 'false').
            // This will trigger the DLX policy on the queue.
            channel.nack(msg, false, false);
            return;
          }
          console.log(
            "1 [Admin App Worker] -> Processing order: logging to DB, updating inventory..."
          );
          channel.ack(msg);
        } catch (e) {
          console.error("Error processing message", e);
          // Reject the message and tell RabbitMQ not to re-queue it.
          // It could be sent to a Dead Letter Exchange in a real app.
          channel.nack(msg, false, false);
        }
      }
    },
    { noAck: false }
  );
  channel.consume(
    ORDER_QUEUE2,
    (msg) => {
      if (msg) {
        try {
          const order = JSON.parse(msg.content.toString());
          console.log("[Admin App Worker] Received new order:", order);
          console.log(
            "2 [Admin App Worker] -> Processing order: logging to DB, updating inventory..."
          );

          // Acknowledge the message once processing is successful
          channel.ack(msg);
        } catch (e) {
          console.error("Error processing message", e);
          // Reject the message and tell RabbitMQ not to re-queue it.
          // It could be sent to a Dead Letter Exchange in a real app.
          channel.nack(msg, false, false);
        }
      }
    },
    { noAck: false }
  );
};

const startEventConsumers = () => {
  const channel = getChannel();
  channel.prefetch(1);
  // Audit Service (gets everything)
  console.log(
    `[Consumer Started: Admin App] Waiting for messages in audit queue: ${AUDIT_LOG_QUEUE}`
  );
  channel.consume(
    AUDIT_LOG_QUEUE,
    (msg) => {
      if (msg) {
        // msg.fields.routingKey contains the key the message was published with!
        console.log(
          `[AUDIT CONSUMER] Received event with key: "${msg.fields.routingKey}"`
        );
        console.log(` -> Data: ${msg.content.toString()}`);
        channel.ack(msg);
      }
    },
    { noAck: false }
  );

  // User Metrics Service (only gets user.* events)
  console.log(
    `[Consumer Started: Admin App] Waiting for messages in user metrics queue: ${USER_METRICS_QUEUE}`
  );
  channel.consume(
    USER_METRICS_QUEUE,
    (msg) => {
      if (msg) {
        console.log(
          `[USER METRICS CONSUMER] Received user event with key: "${msg.fields.routingKey}"`
        );
        console.log(` -> Data: ${msg.content.toString()}`);
        channel.ack(msg);
      }
    },
    { noAck: false }
  );
};

const startDeadLetterConsumers = () => {
  const channel = getChannel();
  channel.prefetch(1);
  console.log(
    `[Consumer Started: Admin App] Waiting for messages in deader letter queue: ${ORDER_DEAD_LETTER_QUEUE}`
  );
  channel.consume(
    ORDER_DEAD_LETTER_QUEUE,
    (msg) => {
      if (msg) {
        console.log(
          `[DEAD LETTER CONSUMER] Received event with key: "${msg.fields.routingKey}"`
        );
        console.log(`❌❌❌ Failed Data: ${msg.content.toString()}`);
        channel.ack(msg);
      }
    },
    { noAck: false }
  );
};

let totalOrdersProcessed = 0;
// RPC SERVER/CONSUMER
const startRpcServer = () => {
  const channel = getChannel();
  channel.prefetch(1);
  console.log(
    `[Consumer Started: Admin App] Awaiting RPC requests on queue: ${RPC_QUEUE}`
  );

  channel.consume(RPC_QUEUE, (msg) => {
    if (msg) {
      const request = JSON.parse(msg.content.toString());
      console.log(`[RPC Server] Received request:`, request);

      let result;
      // Basic routing based on request type
      if (request.type === "GET_TOTAL_ORDERS") {
        result = { totalOrders: totalOrdersProcessed };
      } else {
        result = { error: "Unknown request type" };
      }

      // Send the result back to the 'reply_to' queue from the original message
      // Use the same 'correlationId' so the client knows it's the response to its request
      channel.sendToQueue(
        msg.properties.replyTo,
        Buffer.from(JSON.stringify(result)),
        {
          correlationId: msg.properties.correlationId,
        }
      );

      // Acknowledge the original request message
      channel.ack(msg);
    }
  });
};

export const startConsumer = () => {
  startContactFormConsumer();
  startOrderConsumer();
  startEventConsumers();
  startDeadLetterConsumers();
  startRpcServer();
};
