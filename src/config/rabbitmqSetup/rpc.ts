import { ConfirmChannel } from "amqplib";

export const RPC_QUEUE = "rpc_queue";

// ADD THIS SECTION for RPC
export const setupRPCQueue = async (channel: ConfirmChannel): Promise<void> => {
  console.log("[RabbitMQ Setup] Setting up RPC queue...");
  await channel.assertQueue(RPC_QUEUE, { durable: false });
  console.log("[RabbitMQ Setup] RPC setup complete.");
};
