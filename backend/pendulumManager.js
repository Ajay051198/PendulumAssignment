import axios from "axios";
import { Pendulum, PositionVector } from "./objects.js";

export class PendulumManager {
  constructor(cq) {
    this.commandqueue = cq;
    this.simulation_key = null;
    this.pendulum = null;
    this.restartCount = 0;
    this.enablePause = true;
    cq.init(this.commandListener);
  }

  commandListener = (command) => {
    console.log(`[INFO]: RECIEVED FROM QUEUE: [${command}]`);
    if (this.pendulum) {
      if (command === "STOP") {
        if (this.simulation_key) {
          this.pause();
          this.enablePause = false;
          setTimeout(() => {
            console.log("[INFO]: SENDING RESTART MSG TO QUEUE");
            this.commandqueue.sendCommand("RESTART");
          }, 5000);
        }
      }

      if (command === "RESTART") {
        this.restartCount++;

        if (this.restartCount == 5) {
          console.log("[INFO]: COUNT = 5: RESTARTING...");
          this.restartCount = 0;
          this.enablePause = false;
          this.reset();
          this.start();
          this.enablePause = true;
        }
      }
    }
  };

  setParams(
    pendulumNum = 1,
    stringLength = 200,
    angularOffset = 45,
    wind = 0,
    damping = 1,
    leftPendulumURL = null,
    rightPendulumURL = null
  ) {
    this.origin = new PositionVector(pendulumNum * 200, 0);
    this.stringLength = stringLength;
    this.angularOffset = (angularOffset * Math.PI) / 180;
    this.wind = wind;
    this.damping = damping;
    this.leftPendulumURL = leftPendulumURL;
    this.rightPendulumURL = rightPendulumURL;
    this._createPendulum();
    console.log(this.pendulum);
  }

  _createPendulum() {
    this.pendulum = new Pendulum(
      this.origin,
      this.stringLength,
      this.angularOffset,
      this.wind,
      this.damping
    );
  }

  start() {
    // TODO: ADD VALIDATION
    this.simulation_key = setInterval(async () => {
      this.pendulum.updatePosition();
      const left = await this.checkCollision(this.leftPendulumURL, "left");
      const right = await this.checkCollision(this.rightPendulumURL, "right");
      if (left || right) {
        this.stopEveryone();
      }
    }, 200);
  }

  checkCollision = async (pendulumURL, direction) => {
    const currentPosition = this.pendulum.getPosition();
    const BUFFER = 70;

    if (!pendulumURL) {
      return false;
    }
    try {
      const { data: position } = await axios.get(`${pendulumURL}/position`);
      if (direction === "left") {
        return (
          currentPosition.x < position.x + BUFFER &&
          currentPosition.y < position.y + BUFFER / 2 &&
          currentPosition.y > position.y - BUFFER / 2
        );
      } else {
        return (
          currentPosition.x > position.x - BUFFER &&
          currentPosition.y < position.y + BUFFER / 2 &&
          currentPosition.y > position.y - BUFFER / 2
        );
      }
    } catch (err) {
      console.error("Error happened while getting position, ignoring!", err);
    }
    return false;
  };

  stopEveryone = () => {
    if (this.simulation_key) {
      console.log("Sending STOP MSG to CHANNEL");
      this.commandqueue.sendCommand("STOP");
    }
  };

  pause() {
    if (this.enablePause) {
      clearInterval(this.simulation_key);
      this.simulation_key = null;
    } else {
      console.log(
        "[WARNING]: YOU TRIED TO PAUSE WHILE AUTO-RESTARTING PAUSE COMMAND HAS BEEN DELAYED BY 5s (MAX)"
      );
      setTimeout(() => {
        clearInterval(this.simulation_key);
        this.simulation_key = null;
      }, 5000);
    }
  }

  reset() {
    this._createPendulum();
  }
}
