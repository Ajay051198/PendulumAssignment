import axios from "axios";
import { Pendulum, PositionVector } from "./objects.js";

export class PendulumManager {
  constructor(cq) {
    this.commandqueue = cq;
    this.simulation_key = null;
    this.pendulum = null;
    this.restartCount = 0;

    cq.init(this.commandListener);
  }

  commandListener = (command) => {
    console.log("FROM queue", command);
    if (this.pendulum) {
      if (command === "STOP") {
        if (this.simulation_key) {
          this.pause();
          setTimeout(() => {
            console.log('Sending RESTART MSG to CHANNEL')
            this.commandqueue.sendCommand("RESTART");
          }, 5000);
        }
      }

      if (command === "RESTART") {
        console.log('RECIEVED RESTART MSG FROM CHANNEL')
        this.restartCount++;

        if (this.restartCount == 5) {
          console.log("RESTARTING...");
          this.restartCount = 0;
          this.reset();
          this.start();
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
    randomWind = false,
    leftPendulumURL = null,
    rightPendulumURL = null
  ) {
    this.origin = new PositionVector(pendulumNum * 200, 0);
    this.stringLength = stringLength;
    this.angularOffset = (angularOffset * Math.PI) / 180;
    this.wind = wind;
    this.damping = damping;
    this.randomWind = randomWind;
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
      this.damping,
      this.randomWind
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
    // do stop
    console.log("Sending STOP MSG to CHANNEL");
    this.commandqueue.sendCommand("STOP");
  };

  pause() {
    clearInterval(this.simulation_key);
    this.simulation_key = null;
  }

  reset() {
    this._createPendulum();
  }
}
