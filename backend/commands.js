import amqp from "amqplib";

export default class CommandsQueue {
  constructor() {
    this.exchange_name = "pendulum_commands";
    this.channel = null;
  }

  init(listener) {
    amqp
      .connect("amqp://localhost")
      .then((conn) => {
        conn
          .createChannel()
          .then((channel) => {
            this.channel = channel;
            channel.assertExchange(this.exchange_name, "fanout", {
              durable: false,
            });
            this.listen(listener);
          })
          .catch((err) => console.log("CHANNEL ", err));
      })
      .catch((err) => console.log("CONN ERR", err));
  }

  sendCommand(command) {
    if (!this.channel) {
      console.log("CHANNEL NOT DEFINED");
      return;
    }

    this.channel.publish(this.exchange_name, "", Buffer.from(command));
  }

  listen(listener) {
    if (!this.channel) {
      console.log("CHANNEL NOT DEFINED");
      return;
    }

    this.channel.assertQueue("", { exclusive: true }).then((q) => {
      this.channel.bindQueue(q.queue, this.exchange_name, "");

      this.channel.consume(
        q.queue,
        (msg) => {
          listener(msg.content.toString());
        },
        { noAck: true }
      );
    });
  }
}
