// --- Aliases ---
const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
      Mouse = Matter.Mouse,
      MouseConstraint = Matter.MouseConstraint,
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
        wireframes: false, // Set to true for debugging
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

// --- Ragdoll Character ---
const createRagdoll = (x, y) => {
    const group = Matter.Body.nextGroup(true);

    const head = Bodies.circle(x, y - 60, 20, { collisionFilter: { group: group } });
    const torso = Bodies.rectangle(x, y, 40, 80, { collisionFilter: { group: group } });
    const leftArm = Bodies.rectangle(x - 40, y, 20, 60, { collisionFilter: { group: group } });
    const rightArm = Bodies.rectangle(x + 40, y, 20, 60, { collisionFilter: { group: group } });
    const leftLeg = Bodies.rectangle(x - 20, y + 80, 20, 80, { collisionFilter: { group: group } });
    const rightLeg = Bodies.rectangle(x + 20, y + 80, 20, 80, { collisionFilter: { group: group } });

    const neck = Matter.Constraint.create({
        bodyA: head,
        bodyB: torso,
        pointA: { x: 0, y: 20 },
        pointB: { x: 0, y: -40 },
        stiffness: 0.8,
        length: 10
    });

    const leftShoulder = Matter.Constraint.create({
        bodyA: torso,
        bodyB: leftArm,
        pointA: { x: -20, y: -30 },
        pointB: { x: 0, y: -20 },
        stiffness: 0.8,
        length: 20
    });

    const rightShoulder = Matter.Constraint.create({
        bodyA: torso,
        bodyB: rightArm,
        pointA: { x: 20, y: -30 },
        pointB: { x: 0, y: -20 },
        stiffness: 0.8,
        length: 20
    });

    const leftHip = Matter.Constraint.create({
        bodyA: torso,
        bodyB: leftLeg,
        pointA: { x: -10, y: 40 },
        pointB: { x: 0, y: -30 },
        stiffness: 0.8,
        length: 20
    });

    const rightHip = Matter.Constraint.create({
        bodyA: torso,
        bodyB: rightLeg,
        pointA: { x: 10, y: 40 },
        pointB: { x: 0, y: -30 },
        stiffness: 0.8,
        length: 20
    });

    const ragdoll = Composite.create({
        bodies: [head, torso, leftArm, rightArm, leftLeg, rightLeg],
        constraints: [neck, leftShoulder, rightShoulder, leftHip, rightHip]
    });

    return ragdoll;
};

const ragdoll = createRagdoll(window.innerWidth / 2, window.innerHeight / 2 - 100);
Composite.add(world, ragdoll);

// --- Mouse Control ---
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
        stiffness: 0.2,
        render: {
            visible: false
        }
    }
});

Composite.add(world, mouseConstraint);
// keep the mouse in sync with rendering
render.mouse = mouse;

// --- Add some interactive boxes ---
const boxA = Bodies.rectangle(window.innerWidth / 2 - 150, window.innerHeight / 2 - 150, 80, 80);
const boxB = Bodies.rectangle(window.innerWidth / 2 + 150, window.innerHeight / 2 - 250, 80, 80);
Composite.add(world, [boxA, boxB]);


// --- Keyboard Control ---
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
});
window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

Matter.Events.on(engine, 'beforeUpdate', (event) => {
    const playerTorso = ragdoll.bodies[1]; // Assuming torso is the second body
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
        // A simple check to prevent flying. Only allow jump if torso is near the ground.
        // This is a naive check and can be improved.
        let canJump = false;
        const groundY = ground.position.y - 30; // 30 is half of ground height
        if (Math.abs(playerTorso.position.y - groundY) < 150) { // Check if torso is close to ground
             canJump = true;
        }

        if(canJump){
            Matter.Body.applyForce(playerTorso, playerTorso.position, { x: 0, y: -jumpForce });
        }
    }
});
