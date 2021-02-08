//INPUTS:
let inputs = {
  wind: 0,
  damping: 0,
  fps: 5,
  p1: { mass: 30, length: 100, angle: 0 },
  p2: { mass: 30, length: 100, angle: 0 },
  p3: { mass: 30, length: 100, angle: 0 },
  p4: { mass: 30, length: 100, angle: 0 },
  p5: { mass: 30, length: 100, angle: 0 },
};

const units = { mass: "units", length: "px", angle: "deg" };

//POLLER
class Poller {
  constructor(pendulumID, port) {
    this.pollid = null;
    this.id = pendulumID;
    this.port = port;
  }

  start() {
    let poll_freq = 1000 / inputs.fps;
    this.pollid = setInterval(() => {
      fetch(`http://localhost:${this.port}/angle`)
        .then((res) => res.json())
        .then((res) => {
          this.renderPendulum(res);
        });
    }, poll_freq);
  }

  pause() {
    clearInterval(this.pollid);
  }

  stop() {
    clearInterval(this.pollid);
    this.renderPendulum(inputs[`${this.id}`].angle);
  }

  renderPendulum({ angle }) {
    const pend = document.querySelector(`.${this.id}`);
    pend.style.transform = `rotate(${parseInt((angle * 180) / Math.PI)}deg)`;
  }
}

//POLLER OBJECTS
poller_p1 = new Poller("p1", 8000);
poller_p2 = new Poller("p2", 7000);
poller_p3 = new Poller("p3", 5000);
poller_p4 = new Poller("p4", 4000);
poller_p5 = new Poller("p5", 3000);

//RENDER AND CONTROL
function renderInputControl(id, p_id, max, min, increment = 1) {
  const container = p_id
    ? document.querySelector(`.ic-${p_id} #${id}-input`)
    : document.querySelector(`.other-inputs #${id}-input`);
  const slider = container.querySelector(`.slider`);
  const label = container.querySelector(`.label`);
  const value = container.querySelector(".value");

  const unit = units[id] || " ";

  label.innerHTML = `${id}: `;
  value.innerHTML = p_id ? `${inputs[p_id][id]} ${unit}` : `${inputs[id]}`;
  slider.setAttribute("max", max);
  slider.setAttribute("min", min);
  slider.setAttribute("step", increment);
  slider.setAttribute("value", p_id ? inputs[p_id][id] : inputs[id]);

  slider.addEventListener("change", (e) => {
    value.innerHTML = e.target.value + " " + unit;
    if (p_id) {
      inputs[p_id][id] = e.target.value;
    } else {
      inputs[id] = e.target.value;
    }
  });
}

renderInputControl("wind", null, 100, -100, 25);
renderInputControl("damping", null, 100, 0, 10);
renderInputControl("fps", null, 100, 5, 5);

var pendulumIds = ["p1", "p2", "p3", "p4", "p5"];

pendulumIds.map((id) => {
  renderInputControl("length", id, 200, 50, 10);
  renderInputControl("angle", id, 90, -90, 5);
  renderInputControl("mass", id, 50, 10, 10);
});

//Helper functions
//Updatefigure with new lengths and offsets
function updatefigure() {
  pendulumIds.forEach((value) => {
    const pend = document.querySelector(`.${value}`);
    const bob = pend.querySelector(".pendulum-bob");
    const line = bob.querySelector(".line");
    pend.style.transform = `rotate(${inputs[value].angle}deg)`;
    bob.style.width = `${inputs[value].mass}px`
    bob.style.height = `${inputs[value].mass}px`
    bob.style.top = `${inputs[value].length}px`;
    line.style.height = `${inputs[value].length}px`;
    line.style.top = `-${inputs[value].length}px`;
    line.style.left = `${inputs[value].mass/2}px`;
  });
}

//ADD TO LOG
function addToLog(text) {
  const newDiv = document.createElement("div");
  const newContent = document.createTextNode(
    `[${new Date().toISOString()}] ${text}`
  );
  newDiv.appendChild(newContent);
  log_div = document.querySelector(`.log`);
  log_div.appendChild(newDiv);
}

const PortMap = {
  p1: { port: 8000, poller: poller_p1 },
  p2: { port: 7000, poller: poller_p2 },
  p3: { port: 5000, poller: poller_p3 },
  p4: { port: 4000, poller: poller_p4 },
  p5: { port: 3000, poller: poller_p5 },
};

//EVENT LISTENERS
set_btn = document.querySelector(".controls #set");
start_btn = document.querySelector(".controls #start");
start_btn.disabled = true;
pause_btn = document.querySelector(".controls #pause");
pause_btn.disabled = true;
reset_btn = document.querySelector(".controls #reset");
export_btn = document.querySelector(".controls #export");

//SET
set_btn.addEventListener("click", () => {
  const pend_url = (e) => `http://localhost:${PortMap[e]["port"]}`;
  //Spawn pendulum
  let success = true;
  updatefigure();
  pendulumIds.forEach(async (e, idx) => {
    const rawResponse = await fetch(`${pend_url(e)}/setparams`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pendulumNum: parseInt(e[1]),
        stringLength: inputs[e].length,
        angularOffset: inputs[e].angle,
        wind: inputs.wind/inputs[e].mass,
        damping: 1 - (inputs.damping * 0.005) / 100,
        leftPendulumURL: idx > 0 ? pend_url(pendulumIds[idx - 1]) : null,
        rightPendulumURL:
          idx < pendulumIds.length - 1 ? pend_url(pendulumIds[idx + 1]) : null,
      }),
    });
    if (rawResponse.status == 200) {
      addToLog(`[X]: Successfully set params for pendulum ${e};`);
    } else {
      addToLog(`[ERROR]: Error setting params for pendulum ${e};`);
      success = false;
    }
  });
  if (success) {
    start_btn.disabled = false;
  }
});

// Start Simulation
start_btn.addEventListener("click", () => {
  let success = true;
  pendulumIds.forEach(async (e) => {
    const rawResponse = await fetch(
      `http://localhost:${PortMap[e]["port"]}/start`,
      {
        method: "POST",
      }
    );
    if (rawResponse.status == 200) {
      addToLog(`[X]: Successfully started simulation for pendulum ${e};`);
      PortMap[e]["poller"].start();
    } else {
      addToLog(`[ERROR]: Error starting simulation for pendulum ${e};`);
      success = false;
    }
  });
  if (success) {
    set_btn.disabled = true;
    start_btn.disabled = true;
    pause_btn.disabled = false;
    reset_btn.disabled = true;
  }
});

// Pause Simulation
pause_btn.addEventListener("click", () => {
  let success = true;
  pendulumIds.forEach(async (e) => {
    const rawResponse = await fetch(
      `http://localhost:${PortMap[e]["port"]}/pause`,
      {
        method: "POST",
      }
    );
    if (rawResponse.status == 200) {
      PortMap[e]["poller"].pause();
      addToLog(`[X]: Pausing simulation for pendulum ${e}`);
    } else {
      addToLog(`[ERROR]: Error sPausing simulation for pendulum ${e}`);
      success = false;
    }
  });

  if (success) {
    start_btn.disabled = false;
    reset_btn.disabled = false;
    pause_btn.disabled = true;
  }
});

//Pause Simulation
reset_btn.addEventListener("click", () => {
  updatefigure();
  let success = true;
  pendulumIds.forEach(async (e) => {
    const rawResponse = await fetch(
      `http://localhost:${PortMap[e]["port"]}/reset`,
      {
        method: "POST",
      }
    );
    if (rawResponse.status == 200) {
      addToLog(`[X]: Stoping simulation for pendulum ${e}`);
      PortMap[e]["poller"].stop();
    } else {
      addToLog(`[ERROR]: Error Stoping simulation for pendulum ${e}`);
      addToLog("RESET || error");
    }
  });

  if (success) {
    set_btn.disabled = false;
  }
});

// Export config

export_btn.addEventListener("click", (e) => {
  e.preventDefault();
  addToLog(`[INFO] Exporting config`);
  addToLog(JSON.stringify(inputs, null, 4));
});
