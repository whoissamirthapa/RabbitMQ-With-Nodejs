import { ConfirmChannel } from "amqplib";

// Topic Exchange (Event Bus)
export const EVENTS_EXCHANGE = "events_exchange";
export const AUDIT_LOG_QUEUE = "audit_log_queue";
export const USER_METRICS_QUEUE = "user_metrics_queue";

// ADD THIS SECTION for the Topic Exchange
export const setupTopicExchange = async (
  channel: ConfirmChannel
): Promise<void> => {
  console.log(
    "[RabbitMQ Setup] Setting up Topic Exchange for System Events..."
  );
  await channel.assertExchange(EVENTS_EXCHANGE, "topic", { durable: true });
  await channel.assertQueue(AUDIT_LOG_QUEUE, { durable: true });
  await channel.assertQueue(USER_METRICS_QUEUE, { durable: true });
  // Create Bindings with wildcard keys
  // The Audit queue gets ALL messages published to the exchange.
  await channel.bindQueue(AUDIT_LOG_QUEUE, EVENTS_EXCHANGE, "#");
  // The User Metrics queue ONLY gets messages where the routing key starts with "user."
  await channel.bindQueue(USER_METRICS_QUEUE, EVENTS_EXCHANGE, "user.#");
  console.log("[RabbitMQ Setup] Topic exchange setup complete.");
};
