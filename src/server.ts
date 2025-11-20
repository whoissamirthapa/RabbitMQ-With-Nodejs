import { initAdminApp } from "./admin";
import { connectRabbitMQ } from "./config/rabbitmqClient";
import { setupRabbitMQ } from "./config/rabbitmqSetup";
import { initPublicApp } from "./public";

// Start both apps
(async () => {
  // Connect to RabbitMQ
  await connectRabbitMQ();
  // Set up exchanges, queues, and bindings
  await setupRabbitMQ();
  // Initialize Apps
  await initAdminApp();
  await initPublicApp();
})();
