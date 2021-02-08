import { argv } from "process";
import { PendulumManager } from "./pendulumManager.js";
import CommandQueue from "./commands.js";

import express from "express";
import cors from "cors";

const PORT = parseInt(argv[2]);

const cq = new CommandQueue();
const pm = new PendulumManager(cq);
const app = express();

app.use(
  express.urlencoded({
    extended: true,
  })
);
app.use(cors());

app.use(express.json());

const check = (res) => {
  if (pm.pendulum == null) {
    res.status(404).send("pendulum not yet configured");
    return true;
  }
  return false;
};

app.post("/setparams", (req, res) => {
  const {
    pendulumNum,
    leftPendulumURL,
    rightPendulumURL,
    stringLength,
    angularOffset,
    wind,
    damping,
    randomWind,
  } = req.body;
  pm.setParams(
    pendulumNum,
    stringLength,
    angularOffset,
    0.002 * wind,
    damping,
    leftPendulumURL,
    rightPendulumURL
  );
  console.log('[REQ]: Parameters have been set')
  return res.json({ status: "success", pendulum_objecy: pm.pendulum });
});

app.post("/start", (req, res) => {
  if (check(res)) {
    return;
  }
  console.log('[REQ]: Starting simulation')
  pm.start();
  return res.send("success");
});

app.post("/pause", (req, res) => {
  if (check(res)) {
    return;
  }
  console.log('[REQ]: Pausing simulation')
  pm.pause();
  return res.send("success");
});

app.post("/reset", (req, res) => {
  if (check(res)) {
    return;
  }
  console.log('[REQ]: Reseting simulation')
  pm.reset();
  return res.send("success");
});

app.get("/angle", (req, res) => {
  if (check(res)) {
    return;
  }
  let position = pm.pendulum.angularOffset;
  return res.json({ angle: position });
});

app.get("/position", (req, res) => {
  if (check(res)) {
    return;
  }
  let position = pm.pendulum.getPosition();
  return res.json({ x: position.x, y: position.y });
});

app.listen(PORT, () => {
  console.log(`listening at http://localhost:${PORT}`);
});


