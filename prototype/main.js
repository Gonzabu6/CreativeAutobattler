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
    { isStatic: true }
);

Composite.add(world, [ground]);

// --- UI Text ---
Matter.Events.on(engine, 'afterRender', (event) => {
    const ctx = render.context;
    ctx.fillStyle = 'black';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Physics Puzzle (仮) - v0.3', 10, 20);
    ctx.textAlign = 'right';
    ctx.fillText('A/D: Move, W/Space: Jump, Click: Grab/Release', window.innerWidth - 10, 20);
});

// --- Ragdoll Character ---
const createRagdoll = (x, y) => {
    const group = Matter.Body.nextGroup(true);
    const head = Bodies.circle(x, y - 60, 20, { collisionFilter: { group: group } });
    const torso = Bodies.rectangle(x, y, 40, 80, { collisionFilter: { group: group } });
    const leftArm = Bodies.rectangle(x - 40, y, 20, 60, { collisionFilter: { group: group } });
    const rightArm = Bodies.rectangle(x + 40, y, 20, 60, { collisionFilter: { group: group } });
    const leftLeg = Bodies.rectangle(x - 20, y + 80, 20, 80, { collisionFilter: { group: group } });
    const rightLeg = Bodies.rectangle(x + 20, y + 80, 20, 80, { collisionFilter: { group: group } });
    const neck = Matter.Constraint.create({ bodyA: head, bodyB: torso, pointA: { x: 0, y: 20 }, pointB: { x: 0, y: -40 }, stiffness: 0.8, length: 10 });
    const leftShoulder = Matter.Constraint.create({ bodyA: torso, bodyB: leftArm, pointA: { x: -20, y: -30 }, pointB: { x: 0, y: -20 }, stiffness: 0.8, length: 20 });
    const rightShoulder = Matter.Constraint.create({ bodyA: torso, bodyB: rightArm, pointA: { x: 20, y: -30 }, pointB: { x: 0, y: -20 }, stiffness: 0.8, length: 20 });
    const leftHip = Matter.Constraint.create({ bodyA: torso, bodyB: leftLeg, pointA: { x: -10, y: 40 }, pointB: { x: 0, y: -30 }, stiffness: 0.8, length: 20 });
    const rightHip = Matter.Constraint.create({ bodyA: torso, bodyB: rightLeg, pointA: { x: 10, y: 40 }, pointB: { x: 0, y: -30 }, stiffness: 0.8, length: 20 });
    const ragdoll = Composite.create({ bodies: [head, torso, leftArm, rightArm, leftLeg, rightLeg], constraints: [neck, leftShoulder, rightShoulder, leftHip, rightHip] });
    return ragdoll;
};

const ragdoll = createRagdoll(window.innerWidth / 2, window.innerHeight / 2 - 100);
Composite.add(world, ragdoll);

// --- Add some interactive boxes ---
const boxA = Bodies.rectangle(window.innerWidth / 2 - 250, window.innerHeight - 65, 80, 80);
const boxB = Bodies.rectangle(window.innerWidth / 2 + 150, window.innerHeight - 250, 80, 80);

// --- Stage Elements ---
const wall = Bodies.rectangle(window.innerWidth / 2 + 100, window.innerHeight - 90, 20, 120, { isStatic: true });
const goalZone = Bodies.rectangle(window.innerWidth - 100, window.innerHeight - 90, 200, 120, {
    isStatic: true,
    isSensor: true, // No physical collision
    render: {
        fillStyle: 'rgba(144, 238, 144, 0.5)' // Light green, semi-transparent
    }
});

Composite.add(world, [boxA, boxB, wall, goalZone]);

// --- New Grab Logic ---
const mouse = Mouse.create(render.canvas);
let grabConstraint = null;

window.addEventListener('mousedown', (e) => {
    if (grabConstraint) {
        // Release
        Composite.remove(world, grabConstraint);
        grabConstraint = null;
    } else {
        // Grab
        const leftArm = ragdoll.bodies[2];
        const rightArm = ragdoll.bodies[3];
        const allBodies = Composite.allBodies(world);

        let bodyToGrab = null;
        let minDistance = Infinity;

        // Find the closest grabbable body to the mouse
        for (let i = 0; i < allBodies.length; i++) {
            const body = allBodies[i];
            if (body.isStatic || ragdoll.bodies.includes(body)) {
                continue;
            }
            const distance = Matter.Vector.magnitude(Matter.Vector.sub(body.position, mouse.position));
            if (distance < minDistance) {
                minDistance = distance;
                bodyToGrab = body;
            }
        }

        // Check if the closest body is within reach of an arm
        if (bodyToGrab) {
            const reach = 100; // Max grab distance
            const distToLeftArm = Matter.Vector.magnitude(Matter.Vector.sub(leftArm.position, bodyToGrab.position));
            const distToRightArm = Matter.Vector.magnitude(Matter.Vector.sub(rightArm.position, bodyToGrab.position));

            let grabArm = null;
            if (distToLeftArm < reach && distToLeftArm < distToRightArm) {
                grabArm = leftArm;
            } else if (distToRightArm < reach) {
                grabArm = rightArm;
            }

            if (grabArm) {
                grabConstraint = Matter.Constraint.create({
                    bodyA: grabArm,
                    bodyB: bodyToGrab,
                    stiffness: 0.2,
                    length: 40,
                    render: {
                        strokeStyle: '#c44',
                        lineWidth: 2
                    }
                });
                Composite.add(world, grabConstraint);
            }
        }
    }
});

// --- Keyboard Control ---
const keys = {};
window.addEventListener('keydown', (e) => { keys[e.code] = true; });
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

Matter.Events.on(engine, 'beforeUpdate', (event) => {
    // Goal check
    const goalBounds = goalZone.bounds;
    const boxBounds = boxA.bounds;
    if (Matter.Bounds.overlaps(goalBounds, boxBounds)) {
        goalZone.render.fillStyle = 'rgba(255, 215, 0, 0.7)'; // Gold on success
    } else {
        goalZone.render.fillStyle = 'rgba(144, 238, 144, 0.5)'; // Back to green
    }

    const playerTorso = ragdoll.bodies[1];
    const playerLeftLeg = ragdoll.bodies[4];
    const playerRightLeg = ragdoll.bodies[5];
    const forceMagnitude = 0.01;
    const jumpForce = 0.1;

    if (keys['KeyA']) {
        Matter.Body.applyForce(playerLeftLeg, playerLeftLeg.position, { x: -forceMagnitude, y: 0 });
        Matter.Body.applyForce(playerRightLeg, playerRightLeg.position, { x: -forceMagnitude, y: 0 });
    }
    if (keys['KeyD']) {
        Matter.Body.applyForce(playerLeftLeg, playerLeftLeg.position, { x: forceMagnitude, y: 0 });
        Matter.Body.applyForce(playerRightLeg, playerRightLeg.position, { x: forceMagnitude, y: 0 });
    }
    if (keys['KeyW'] || keys['Space']) {
        let canJump = false;
        const groundY = ground.position.y - 30;
        if (Math.abs(playerTorso.position.y - groundY) < 150) {
             canJump = true;
        }
        if(canJump){
            Matter.Body.applyForce(playerTorso, playerTorso.position, { x: 0, y: -jumpForce });
        }
    }
});
