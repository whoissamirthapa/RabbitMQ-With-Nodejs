import { ConfirmChannel } from "amqplib";

// Fanout Exchange (Work Queue)
export const CACHE_EXCHANGE = "cache_exchange";
export const CACHE_CLEAR_QUEUE1 = "cache_clear_work_queue1";
export const CACHE_CLEAR_QUEUE2 = "cache_clear_work_queue2";

// Setup for Fanout Exchange: Cache Clearing
export const setupFanoutExchange = async (
  channel: ConfirmChannel
): Promise<void> => {
  console.log(
    "[RabbitMQ Setup] Setting up Fanout Exchange and Work Queue for Cache Clearing..."
  );
  await channel.assertExchange(CACHE_EXCHANGE, "fanout", { durable: false });
  await channel.assertQueue(CACHE_CLEAR_QUEUE1, { durable: true });
  await channel.assertQueue(CACHE_CLEAR_QUEUE2, { durable: true });
  await channel.bindQueue(CACHE_CLEAR_QUEUE1, CACHE_EXCHANGE, "first-cache");
  await channel.bindQueue(CACHE_CLEAR_QUEUE2, CACHE_EXCHANGE, "second-cache");
  console.log("[RabbitMQ Setup] Cache clearing setup complete.");
};
