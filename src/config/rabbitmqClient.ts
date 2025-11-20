import amqp, { ChannelModel, ConfirmChannel } from "amqplib";

let connection: ChannelModel | null = null;
let channel: ConfirmChannel | null = null;

const RABBITMQ_URL =
  process.env.RABBITMQ_URL || "amqp://user:password@localhost:5672";

export const connectRabbitMQ = async (): Promise<void> => {
  try {
    if (connection) return;

    connection = await amqp.connect(RABBITMQ_URL);
    if (!connection) throw new Error("Failed to connect RabbitMQ");
    channel = await connection.createConfirmChannel();

    console.log("✅ RabbitMQ connected successfully.");
    process.once("SIGINT", async () => {
      if (channel) await channel.close();
      if (connection) await connection.close();
    });
  } catch (error) {
    console.error("❌ Failed to connect to RabbitMQ");
    console.error(error);
    // Exit the process if we can't connect to RabbitMQ, as it's a critical dependency
    process.exit(1);
  }
};

export const getChannel = (): ConfirmChannel => {
  if (!channel) {
    throw new Error(
      "RabbitMQ channel has not been initialized. Please call connectRabbitMQ first."
    );
  }
  return channel;
};
