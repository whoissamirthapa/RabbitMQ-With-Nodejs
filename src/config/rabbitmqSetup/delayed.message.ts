import { ConfirmChannel } from "amqplib";

// Delayed Messaging
export const DELAYED_EXCHANGE = "delayed_exchange";
export const DELAYED_NOTIFICATIONS_QUEUE = "delayed_notifications_queue";
export const DELAYED_NOTIFICATION_ROUTING_KEY = "system_reminder";

// ADD THIS SECTION for Delayed Messaging
export const setupDelayedMessageExchange = async (
  channel: ConfirmChannel
): Promise<void> => {
  console.log("[RabbitMQ Setup] Setting up Delayed Message Exchange...");
  //Assert Exchange with special type 'x-delayed-message'
  await channel.assertExchange(DELAYED_EXCHANGE, "x-delayed-message", {
    durable: true,
    // We must provide the underlying exchange type in the arguments
    arguments: { "x-delayed-type": "direct" },
  });
  // Assert Queue as normal
  await channel.assertQueue(DELAYED_NOTIFICATIONS_QUEUE, { durable: true });
  // Bind the queue to the delayed exchange
  await channel.bindQueue(
    DELAYED_NOTIFICATIONS_QUEUE,
    DELAYED_EXCHANGE,
    DELAYED_NOTIFICATION_ROUTING_KEY
  );
  console.log("[RabbitMQ Setup] Delayed Message setup complete.");
};
