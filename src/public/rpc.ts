import { v4 as uuidv4 } from "uuid";
import { getChannel } from "../config/rabbitmqClient";
import { RPC_QUEUE } from "../config/rabbitmqSetup/rpc";

export const rpcClient = {
  // We'll use a Map to correlate responses back to their original requests
  pendingRequests: new Map<string, (response: any) => void>(),
  replyQueue: "",

  // Initialize the client by creating the reply queue
  async initialize() {
    const channel = getChannel();
    // Assert an exclusive, auto-deleting queue with a server-generated name
    const assertQueueReply = await channel.assertQueue("", { exclusive: true });
    this.replyQueue = assertQueueReply.queue;
    console.log(`[RPC Client] Created reply queue: ${this.replyQueue}`);

    // Start consuming from the reply queue
    channel.consume(
      this.replyQueue,
      (msg) => {
        if (msg) {
          const correlationId = msg.properties.correlationId;
          // Check if this is a response we are waiting for
          if (this.pendingRequests.has(correlationId)) {
            const resolve = this.pendingRequests.get(correlationId)!;
            resolve(JSON.parse(msg.content.toString()));
            this.pendingRequests.delete(correlationId);
            channel.ack(msg);
            return;
          }
          channel.reject(msg, false);
        }
      },
      { noAck: false }
    );
  },

  // The main function to send a request
  sendRequest(payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const correlationId = uuidv4();
      this.pendingRequests.set(correlationId, resolve);

      const channel = getChannel();
      channel.sendToQueue(RPC_QUEUE, Buffer.from(JSON.stringify(payload)), {
        correlationId: correlationId,
        replyTo: this.replyQueue,
      });

      // Add a timeout to prevent waiting forever
      setTimeout(() => {
        if (this.pendingRequests.has(correlationId)) {
          this.pendingRequests.delete(correlationId);
          reject(new Error("RPC request timed out"));
        }
      }, 5000);
    });
  },
};
