import { setupDeadLetterExchange } from "./deadLetter";
import { setupDelayedMessageExchange } from "./delayed.message";
import { setupDirectExchange } from "./direct.exchange";
import { setupFanoutExchange } from "./fanout.exchange";
import { getChannel } from "../rabbitmqClient";
import { setupRPCQueue } from "./rpc";
import { setupSimpleQueue } from "./simpleQueue";
import { setupTopicExchange } from "./topic.exchange";

export const setupRabbitMQ = async (): Promise<void> => {
  const channel = getChannel();
  await setupSimpleQueue(channel);
  await setupDirectExchange(channel);
  await setupFanoutExchange(channel);
  await setupTopicExchange(channel);
  await setupDeadLetterExchange(channel);
  await setupDelayedMessageExchange(channel);
  await setupRPCQueue(channel);
};
