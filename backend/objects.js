export class PositionVector {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  add(vec) {
    this.x += vec.x;
    this.y += vec.y;
  }
}

export class Pendulum {
  constructor(
    origin,
    stringLength,
    angularOffset,
    wind,
    damping,
  ) {
    this.origin = origin;
    this.stringLength = stringLength;
    this.angularOffset = angularOffset;
    this.position = new PositionVector(
      this.stringLength * Math.sin(this.angularOffset),
      this.stringLength * Math.cos(this.angularOffset)
    );

    this.aVelocity = 0.0;
    this.aAcceleration = 0.0;
    // Arbitrary damping
    this.damping = damping;
    this.wind = wind;
  }

  updatePosition() {
    // Arbitrary constant
    var gravity = 0.4;
    // Calculate acceleration
    this.aAcceleration =
      ((-1 * gravity) / this.stringLength) * Math.sin(this.angularOffset);
    // Increment velocity
    this.aVelocity += this.aAcceleration;
    // Arbitrary damping
    this.aVelocity *= this.damping;
    // Increment angularOffset
    this.angularOffset += this.aVelocity + this.wind;
    
  }

  getPosition() {
    this.position = new PositionVector(
      -1 * this.stringLength * Math.sin(this.angularOffset),
      this.stringLength * Math.cos(this.angularOffset)
    );
    this.position.add(this.origin);
    return this.position;
  }
}
