# RabbitMQ with Node.js

## Overview

**Focus**: This project is a comprehensive demonstration of **RabbitMQ** patterns and messaging strategies.
**Framework**: It utilizes **Express.js** solely as the HTTP interface to trigger and interact with the messaging system.
**Goal**: To provide clear, working examples of how to implement various RabbitMQ concepts in a Node.js environment.

## Prerequisites & Setup

### Prerequisites

- **Docker & Docker Compose**: Used to run the RabbitMQ server with the delayed message plugin.
- **Node.js** (v14+ recommended) & **npm**.

### Installation

1.  **Clone the repository** (if applicable) or navigate to the project folder.
2.  **Install Dependencies**:
    ```bash
    npm install
    ```

### Starting the Services

1.  **Start RabbitMQ**:
    This project uses a custom Docker image (`rabbitmq-extended:v1`) to support delayed messaging.

    ```bash
    docker build -t rabbitmq-extended:v1 .
    ```

    ```bash
    docker-compose up -d
    ```

    _Wait for few minutes for RabbitMQ to fully start._

2.  **Start the Application**:
    ```bash
    npm run dev
    ```
    There are two apps that will start at `http://localhost:3000` and `http://localhost:3001`.
3.  **Test**: [Click here](#api-usage--examples) to test execution.

---

## Key Concepts & Implementation Details

This project demonstrates several core RabbitMQ patterns. Below is an explanation of each, along with how they are implemented in this codebase.

### RabbitMQ

RabbitMQ is a message broker that allows different applications, services, or parts of a system to communicate with each other by sending messages in a reliable, asynchronous way. Instead of one service calling another directly, messages are sent to RabbitMQ, which then delivers them to the appropriate receiver(s).

#### Components

- Producer – The application or service that sends messages.

- Queue – A buffer that stores messages until a consumer is ready to process them.

- Consumer – The application or service that receives and processes messages.

- Exchange – Routes messages from producers to one or more queues based on rules called bindings.

#### 1. Direct Exchange

**What it is**: Messages are routed to queues based on an exact match of the **routing key**.
**Use Case**: Processing specific tasks like "new orders".

- **Exchange**: `order_exchange` (Direct)
- **Queues**:
  - `order_queue1`: Bound with key `new_order`.
  - `order_queue2`: Bound with key `order_another`.
- **Code Reference**: `src/config/rabbitmqSetup/direct.exchange.ts`
  ```typescript
  await channel.assertExchange(ORDER_EXCHANGE, "direct", { durable: true });
  await channel.bindQueue(ORDER_QUEUE1, ORDER_EXCHANGE, ORDER_ROUTING_KEY);
  ```

#### 2. Fanout Exchange

**What it is**: Messages are broadcast to **all** queues bound to the exchange, ignoring routing keys.
**Use Case**: Notifying multiple services to clear their local cache simultaneously.

- **Exchange**: `cache_exchange` (Fanout)
- **Queues**: `cache_clear_work_queue1`, `cache_clear_work_queue2`
- **Code Reference**: `src/config/rabbitmqSetup/fanout.exchange.ts`
  ```typescript
  await channel.assertExchange(CACHE_EXCHANGE, "fanout", { durable: false });
  // Both queues receive the same message
  ```

#### 3. Topic Exchange

**What it is**: Messages are routed based on wildcard pattern matching (`*` for one word, `#` for multiple).
**Use Case**: flexible logging or event systems where some consumers want "all logs" and others want only "user logs".

- **Exchange**: `events_exchange` (Topic)
- **Queues**:
  - `audit_log_queue`: Bound with `#` (Receives **everything**).
  - `user_metrics_queue`: Bound with `user.#` (Receives only keys starting with `user.`).
- **Code Reference**: `src/config/rabbitmqSetup/topic.exchange.ts`

#### 4. Dead Letter Exchange (DLX)

**What it is**: A safety net. If a message is rejected (nack'd) or expires, it is automatically moved to a "Dead Letter Queue" instead of being lost.

A message is "dead-lettered" (sent to the DLX) if:

- It is rejected by a consumer (channel.nack(msg, false false)).
- Its Time-To-Live (TTL) expires.
- The queue length limit is exceeded.

**Use Case**: Handling failed orders that couldn't be processed.

- **Setup**: `ORDER_QUEUE1` is configured with `x-dead-letter-exchange: ORDER_DLX`.
- **Flow**:
  1.  Consumer receives message from `ORDER_QUEUE1`.
  2.  Processing fails (simulated by `productId: "FAIL"`).
  3.  Consumer rejects message (`channel.nack(msg, false, false)`).
  4.  RabbitMQ moves it to `order_dead_letter_queue`.

#### 5. Delayed Messaging

**What it is**: Scheduling a message to be delivered after a specific delay.
**Implementation**: Uses the `rabbitmq_delayed_message_exchange` plugin.

- **Exchange**: `delayed_exchange` (Type: `x-delayed-message`).
- **Code Reference**: `src/config/rabbitmqSetup/delayed.message.ts`

#### 6. RPC (Remote Procedure Call)

**What it is**: A request-response pattern. The client sends a message and waits for a reply.
**Implementation**:
_ Client sends message to `rpc_queue` with a `replyTo` queue and `correlationId`.
_ Server processes it and sends the result back to the `replyTo` queue. \* Client matches the `correlationId` to know which request the response belongs to.

---

## API Usage & Examples

You can use `curl` or Postman to interact with the API and trigger these RabbitMQ flows.

### 1. Submit a contact form (Simple queue)

It is the direct way to publish to a named queue.

```bash
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name": "Jane Doe", "email": "jane.doe@example.com", "message": "I have a question about my order."}'
```

### 2. Create an Order (Direct Exchange)

Triggers the order processing flow.

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"productId": "prod-1", "quantity": 5}'
```

**Simulate Failure (DLX)**:
Send a product ID of "FAIL" to see the message go to the Dead Letter Queue.

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"productId": "FAIL", "quantity": 1}'
```

### 3. Publish Event (Topic Exchange)

**User Event** (Goes to Audit AND User Metrics):

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{"routingKey": "user.login", "eventData": {"userId": 123}}'
```

**System Event** (Goes ONLY to Audit):

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{"routingKey": "system.backup", "eventData": {"status": "ok"}}'
```

### 3. RPC Call

Request total orders from the "backend" via RabbitMQ.

```bash
curl http://localhost:3000/api/reports/total-orders
```

## References

- https://www.rabbitmq.com/docs
- https://github.com/rabbitmq
- https://github.com/rabbitmq/rabbitmq-delayed-message-exchange
