import { ConfirmChannel } from "amqplib";

export const CONTACT_FORM_QUEUE = "contact_form_submissions";

// Simple Queue
export const setupSimpleQueue = async (
  channel: ConfirmChannel
): Promise<void> => {
  console.log("[RabbitMQ Setup] Setting up Simple Queue for Contact Forms...");
  await channel.assertQueue(CONTACT_FORM_QUEUE, {
    durable: true,
  });
  console.log("[RabbitMQ Setup] Simple Queue setup complete.");
};
