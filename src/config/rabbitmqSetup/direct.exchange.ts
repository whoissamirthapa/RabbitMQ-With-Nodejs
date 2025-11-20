import { ConfirmChannel } from "amqplib";
import { ORDER_DLX } from "./deadLetter";

// Direct Exchange (Simple Queue)
export const ORDER_EXCHANGE = "order_exchange";
export const ORDER_QUEUE1 = "order_queue1";
export const ORDER_QUEUE2 = "order_queue2";
export const ORDER_ROUTING_KEY = "new_order";

// Setup for Direct Exchange: Order Processing
export const setupDirectExchange = async (
  channel: ConfirmChannel
): Promise<void> => {
  console.log(
    "[RabbitMQ Setup] Setting up Direct Exchange and Queue for Orders..."
  );
  await channel.assertExchange(ORDER_EXCHANGE, "direct", { durable: true });
  await channel.assertQueue(ORDER_QUEUE1, {
    durable: true,
    // deadLetterExchange: ORDER_DLX,
    arguments: {
      // When a message in this queue is dead-lettered...
      "x-dead-letter-exchange": ORDER_DLX,
      // (Optional) And use this routing key. We can omit it for a fanout DLX.
      // 'x-dead-letter-routing-key': 'failed-order'
    },
  });
  await channel.assertQueue(ORDER_QUEUE2, { durable: true });
  await channel.bindQueue(ORDER_QUEUE1, ORDER_EXCHANGE, ORDER_ROUTING_KEY);
  await channel.bindQueue(ORDER_QUEUE2, ORDER_EXCHANGE, "order_another");
  console.log("[RabbitMQ Setup] Order processing setup complete.");
};
