// --- Aliases ---
const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
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
