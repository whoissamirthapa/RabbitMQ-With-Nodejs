import { ConfirmChannel } from "amqplib";

// Dead Letter setup Exchange and Queue
export const ORDER_DLX = "order_dlx";
export const ORDER_DEAD_LETTER_QUEUE = "order_dead_letter_queue";

// Setup for Dead Lettering (MUST BE DECLARED BEFORE THE MAIN QUEUE THAT USES IT)
export const setupDeadLetterExchange = async (
  channel: ConfirmChannel
): Promise<void> => {
  console.log("[RabbitMQ Setup] Setting up Dead Letter Exchange for Orders...");
  await channel.assertExchange(ORDER_DLX, "fanout");
  // Declare the queue that will hold the dead-lettered messages
  await channel.assertQueue(ORDER_DEAD_LETTER_QUEUE, { durable: true });
  await channel.bindQueue(ORDER_DEAD_LETTER_QUEUE, ORDER_DLX, "");
  console.log("[RabbitMQ Setup] Dead Letter setup complete.");
};
