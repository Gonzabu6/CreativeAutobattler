// --- Aliases ---
const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
      Mouse = Matter.Mouse,
      Bodies = Matter.Bodies,
      Composite = Matter.Composite;

// --- Engine ---
const engine = Engine.create();
const world = engine.world;

// --- Renderer ---
const render = Render.create({
    element: document.body,
    engine: engine,
    options: {
        width: window.innerWidth,
        height: window.innerHeight,
        wireframes: false,
        background: '#f0f0f0'
    }
});

Render.run(render);

// --- Runner ---
const runner = Runner.create();
Runner.run(runner, engine);

// --- Ground ---
const ground = Bodies.rectangle(
    window.innerWidth / 2,
    window.innerHeight - 30,
    window.innerWidth,
    60,
    { isStatic: true, friction: 0.3 }
);

// Outer walls
const leftWall = Bodies.rectangle(-30, window.innerHeight / 2, 60, window.innerHeight, { isStatic: true });
const rightWall = Bodies.rectangle(window.innerWidth + 30, window.innerHeight / 2, 60, window.innerHeight, { isStatic: true });
const topWall = Bodies.rectangle(window.innerWidth / 2, -30, window.innerWidth, 60, { isStatic: true });


Composite.add(world, [ground, leftWall, rightWall, topWall]);

// --- UI Text ---
Matter.Events.on(engine, 'afterRender', (event) => {
    const ctx = render.context;
    ctx.fillStyle = '#00008B'; // Dark Blue
    ctx.font = '18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Physics Puzzle (仮) - v0.4', 10, 25);
    ctx.textAlign = 'right';
    ctx.fillText('A/D: Move, W/Space: Jump, Hold Click: Grab', window.innerWidth - 10, 25);

    // Draw Goal Text
    if (isGoal) {
        ctx.fillStyle = '#FFD700'; // Gold
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GOAL!', window.innerWidth / 2, window.innerHeight / 2);
    }
});

// --- Ragdoll Character ---
const createRagdoll = (x, y) => {
    const group = Matter.Body.nextGroup(true);
    const options = { collisionFilter: { group: group }, friction: 0.4 };
    const head = Bodies.circle(x, y - 60, 20, options);
    const torso = Bodies.rectangle(x, y, 40, 80, options);
    const leftArm = Bodies.rectangle(x - 40, y, 20, 60, options);
    const rightArm = Bodies.rectangle(x + 40, y, 20, 60, options);
    const leftLeg = Bodies.rectangle(x - 20, y + 80, 20, 80, options);
    const rightLeg = Bodies.rectangle(x + 20, y + 80, 20, 80, options);
    const neck = Matter.Constraint.create({ bodyA: head, bodyB: torso, pointA: { x: 0, y: 20 }, pointB: { x: 0, y: -40 }, stiffness: 1.0, length: 5 });
    const leftShoulder = Matter.Constraint.create({ bodyA: torso, bodyB: leftArm, pointA: { x: -20, y: -30 }, pointB: { x: 0, y: -20 }, stiffness: 1.0, length: 20 });
    const rightShoulder = Matter.Constraint.create({ bodyA: torso, bodyB: rightArm, pointA: { x: 20, y: -30 }, pointB: { x: 0, y: -20 }, stiffness: 1.0, length: 20 });
    const leftHip = Matter.Constraint.create({ bodyA: torso, bodyB: leftLeg, pointA: { x: -10, y: 40 }, pointB: { x: 0, y: -30 }, stiffness: 1.0, length: 10 });
    const rightHip = Matter.Constraint.create({ bodyA: torso, bodyB: rightLeg, pointA: { x: 10, y: 40 }, pointB: { x: 0, y: -30 }, stiffness: 1.0, length: 10 });
    const ragdoll = Composite.create({ bodies: [head, torso, leftArm, rightArm, leftLeg, rightLeg], constraints: [neck, leftShoulder, rightShoulder, leftHip, rightHip] });
    return ragdoll;
};

const ragdoll = createRagdoll(150, window.innerHeight - 100); // Player
Composite.add(world, ragdoll);

// --- Add some interactive boxes ---
const targetBox = Bodies.rectangle(350, window.innerHeight - 65, 60, 60, { // Target Box
    friction: 0.3,
    render: { fillStyle: '#C7B0E8' } // Light purple
});
const obstacleBox = Bodies.rectangle(800, window.innerHeight - 65, 80, 80, { // Obstacle Box
    friction: 0.3,
    render: { fillStyle: '#E8C7B0' } // Light orange
});


// --- Stage Elements ---
const wall = Bodies.rectangle(600, window.innerHeight - 150, 20, 240, { isStatic: true }); // Wall height doubled
const goalZone = Bodies.rectangle(window.innerWidth - 150, window.innerHeight - 90, 300, 120, {
    isStatic: true,
    isSensor: true,
    render: { fillStyle: 'rgba(144, 238, 144, 0.5)' }
});

Composite.add(world, [targetBox, obstacleBox, wall, goalZone]);

// --- New Grab Logic ---
const mouse = Mouse.create(render.canvas);
let grabConstraint = null;
let isGoal = false;

window.addEventListener('mousedown', (e) => {
    if (grabConstraint) return; // Already grabbing

    const leftArm = ragdoll.bodies[2];
    const rightArm = ragdoll.bodies[3];
    const allBodies = Composite.allBodies(world);
    let bodyToGrab = null;
    let minDistance = Infinity;

    for (let i = 0; i < allBodies.length; i++) {
        const body = allBodies[i];
        if (body.isStatic || ragdoll.bodies.includes(body)) continue;
        const distance = Matter.Vector.magnitude(Matter.Vector.sub(body.position, mouse.position));
        if (distance < minDistance) {
            minDistance = distance;
            bodyToGrab = body;
        }
    }

    if (bodyToGrab) {
        const reach = 100;
        const distToLeftArm = Matter.Vector.magnitude(Matter.Vector.sub(leftArm.position, bodyToGrab.position));
        const distToRightArm = Matter.Vector.magnitude(Matter.Vector.sub(rightArm.position, bodyToGrab.position));
        let grabArm = null;
        if (distToLeftArm < reach && distToLeftArm < distToRightArm) grabArm = leftArm;
        else if (distToRightArm < reach) grabArm = rightArm;
        if (grabArm) {
            grabConstraint = Matter.Constraint.create({
                bodyA: grabArm,
                bodyB: bodyToGrab,
                stiffness: 0.2,
                length: 40,
                render: { strokeStyle: '#c44', lineWidth: 2 }
            });
            Composite.add(world, grabConstraint);
        }
    }
});

window.addEventListener('mouseup', (e) => {
    if (grabConstraint) {
        Composite.remove(world, grabConstraint);
        grabConstraint = null;
    }
});

// --- Keyboard Control ---
const keys = {};
window.addEventListener('keydown', (e) => { keys[e.code] = true; });
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

Matter.Events.on(engine, 'beforeUpdate', (event) => {
    // Goal check
    if (Matter.Bounds.overlaps(goalZone.bounds, targetBox.bounds)) {
        goalZone.render.fillStyle = 'rgba(255, 215, 0, 0.7)'; // Gold on success
        isGoal = true;
    } else {
        goalZone.render.fillStyle = 'rgba(144, 238, 144, 0.5)'; // Back to green
        isGoal = false;
    }

    // Player controls
    const playerTorso = ragdoll.bodies[1];
    const playerLeftLeg = ragdoll.bodies[4];
    const playerRightLeg = ragdoll.bodies[5];
    const forceMagnitude = 0.005; // Further reduced
    const jumpForce = 0.05;     // Further reduced
    const maxSpeed = 5;

    // Walking
    if (keys['KeyA'] && playerTorso.velocity.x > -maxSpeed) {
        Matter.Body.applyForce(playerLeftLeg, playerLeftLeg.position, { x: -forceMagnitude, y: 0 });
        Matter.Body.applyForce(playerRightLeg, playerRightLeg.position, { x: -forceMagnitude, y: 0 });
    }
    if (keys['KeyD'] && playerTorso.velocity.x < maxSpeed) {
        Matter.Body.applyForce(playerLeftLeg, playerLeftLeg.position, { x: forceMagnitude, y: 0 });
        Matter.Body.applyForce(playerRightLeg, playerRightLeg.position, { x: forceMagnitude, y: 0 });
    }
    // Jumping
    if (keys['KeyW'] || keys['Space']) {
        let canJump = false;
        // Check if feet are on the ground
        const feetY = playerLeftLeg.position.y > playerRightLeg.position.y ? playerLeftLeg.position.y : playerRightLeg.position.y;
        if (feetY > ground.position.y - 40) {
             canJump = true;
        }
        if (canJump) {
            Matter.Body.applyForce(playerTorso, playerTorso.position, { x: 0, y: -jumpForce });
            // Apply a small upward force to legs as well to make it look more natural
            Matter.Body.applyForce(playerLeftLeg, playerLeftLeg.position, { x: 0, y: -jumpForce * 0.5 });
            Matter.Body.applyForce(playerRightLeg, playerRightLeg.position, { x: 0, y: -jumpForce * 0.5 });
        }
    }
});
