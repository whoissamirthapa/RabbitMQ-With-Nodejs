import { getChannel } from "../config/rabbitmqClient";
import { DELAYED_NOTIFICATIONS_QUEUE } from "../config/rabbitmqSetup/delayed.message";
import {
  CACHE_CLEAR_QUEUE1,
  CACHE_CLEAR_QUEUE2,
} from "../config/rabbitmqSetup/fanout.exchange";
import { rpcClient } from "./rpc";

// Consumer
const startCacheClearConsumer = () => {
  const channel = getChannel();
  // This makes sure the consumer only gets one message at a time.
  // It won't get another message until it acknowledges the current one.
  channel.prefetch(1);
  console.log(
    `[Consumer Started: Public App] Waiting for messages in queue: ${CACHE_CLEAR_QUEUE1} ${CACHE_CLEAR_QUEUE2}`
  );
  channel.consume(
    CACHE_CLEAR_QUEUE1,
    (msg) => {
      if (msg) {
        const messageContent = msg.content.toString();
        console.log(
          `[Public API Worker] 1 Received cache clear request: ${messageContent}`
        );
        console.log("[Public API Worker] -> Clearing local cache...");
        setTimeout(() => {
          console.log("[Public API Worker] -> Local cache cleared!");
          // Acknowledge the message, telling RabbitMQ it's been processed.
          channel.ack(msg);
        }, 2000);
      }
    },
    { noAck: false }
  );
  channel.consume(
    CACHE_CLEAR_QUEUE2,
    (msg) => {
      if (msg) {
        const messageContent = msg.content.toString();
        console.log(
          `[Public API Worker] 2 Received cache clear request: ${messageContent}`
        );
        console.log("[Public API Worker] -> Clearing local cache...");
        setTimeout(() => {
          console.log("[Public API Worker] -> Local cache cleared!");
          channel.ack(msg);
        }, 2000);
      }
    },
    { noAck: false }
  );
};

const startDelayedConsumer = () => {
  const channel = getChannel();
  channel.prefetch(1);
  console.log(
    `[Consumer Started: Public App] Waiting for delayed messages in queue: ${DELAYED_NOTIFICATIONS_QUEUE}`
  );
  channel.consume(
    DELAYED_NOTIFICATIONS_QUEUE,
    (msg) => {
      if (msg) {
        const content = JSON.parse(msg.content.toString());
        console.log(`[DELAYED WORKER] ⏰ Received a delayed reminder!`);
        console.log(
          `[${new Date().toISOString()}] -> Message: "${
            content.message
          }" (was scheduled at ${content.scheduledAt})`
        );
        channel.ack(msg);
      }
    },
    { noAck: false }
  );
};

export const startConsumer = async () => {
  startCacheClearConsumer();
  startDelayedConsumer();
  await rpcClient.initialize();
};
