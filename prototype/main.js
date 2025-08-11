// --- Aliases ---
const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
      Mouse = Matter.Mouse,
      Composite = Matter.Composite;

// --- Global variables ---
let engine;
let world;
let render;
let runner;
let currentStageId = null;

function cleanup() {
    if (runner) Runner.stop(runner);
    if (render) {
        Render.stop(render);
        if (render.canvas) render.canvas.remove();
        render.textures = {};
    }
    if (engine) Engine.clear(engine);
    Character.cleanupControls();
}

function resetGame() {
    cleanup();
    currentStageId = null;
    document.getElementById('stage-select').classList.remove('hidden');
    document.getElementById('back-to-select').classList.add('hidden');
}

function startGame(stageId) {
    currentStageId = stageId;
    cleanup();

    // --- Engine & World ---
    let wallBroken = false; // Flag to ensure we only break the wall once
    engine = Engine.create();
    engine.enableSleeping = true;
    world = engine.world;
    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight;

    // --- Renderer ---
    const canvas = document.createElement('canvas');
    document.body.insertBefore(canvas, document.body.firstChild);
    render = Render.create({
        element: document.body,
        canvas: canvas,
        engine: engine,
        options: {
            width: canvasWidth,
            height: canvasHeight,
            wireframes: false,
            background: 'transparent' // transparent to see html bg
        }
    });
    Render.run(render);

    // --- Runner ---
    runner = Runner.create();
    Runner.run(runner, engine);

    // --- Mouse ---
    const mouse = Mouse.create(render.canvas);

    // --- Create Stage and Character ---
    const stageElements = Stage.create(stageId, world, canvasWidth, canvasHeight);
    Character.create(150, canvasHeight - 400, world); // Raise character spawn height
    Character.initControls(world, mouse);

    // --- Game Loop ---
    let isGoal = false;
    Matter.Events.on(engine, 'collisionStart', event => {
        if (wallBroken) return;

        const pairs = event.pairs;
        for (const pair of pairs) {
            if (pair.bodyA.label === 'brick' || pair.bodyB.label === 'brick') {
                const impulse = pair.collision.impulse;
                const magnitude = Math.sqrt(impulse.x * impulse.x + impulse.y * impulse.y);

                if (magnitude > 25) { // Increased threshold slightly
                    wallBroken = true; // Set flag immediately to prevent re-entry

                    // Defer the replacement to avoid modifying world during collision event
                    setTimeout(() => {
                        const wall = Composite.allComposites(world).find(c => c.label === 'breakable_wall');
                        if (!wall) return;

                        const bricks = Composite.allBodies(wall);
                        const newBricks = [];

                        // Record properties and create new unconstrained bricks
                        bricks.forEach(brick => {
                            const newBrick = Matter.Bodies.rectangle(
                                brick.position.x, brick.position.y,
                                brick.bounds.max.x - brick.bounds.min.x, // width
                                brick.bounds.max.y - brick.bounds.min.y, // height
                                {
                                    angle: brick.angle,
                                    velocity: brick.velocity,
                                    angularVelocity: brick.angularVelocity,
                                    render: brick.render
                                }
                            );
                            newBricks.push(newBrick);
                        });

                        // Perform the swap
                        Matter.Composite.remove(world, wall);
                        Matter.Composite.add(world, newBricks);
                    }, 0);

                    break; // Exit loop once break is initiated
                }
            }
        }
    });

    Matter.Events.on(engine, 'beforeUpdate', (event) => {
        Character.update(stageElements.ground, engine);

        // Fan logic
        if (stageElements.fanVent) {
            const fanHeight = 300; // The effective height of the fan's air column
            const fanBaseY = stageElements.fanVent.position.y;

            const bodiesInFan = Matter.Query.region(Composite.allBodies(world), stageElements.fanVent.bounds);
            bodiesInFan.forEach(body => {
                // Apply force only if the body is within the fan's effective height range
                if (!body.isStatic && body.position.y > (fanBaseY - fanHeight)) {
                    Matter.Body.applyForce(body, body.position, { x: 0, y: -0.8 }); // Adjusted force
                }
            });
        }

        // Goal check
        if (stageElements.goalZone && stageElements.targetBox && Matter.Bounds.overlaps(stageElements.goalZone.bounds, stageElements.targetBox.bounds)) {
            isGoal = true;
        } else {
            isGoal = false;
        }
    });

    // --- UI Rendering ---
    Matter.Events.on(engine, 'afterRender', (event) => {
        if (isGoal) {
            stageElements.goalZone.render.fillStyle = 'rgba(255, 215, 0, 0.7)';
            const ctx = render.context;
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 80px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('GOAL!', canvasWidth / 2, canvasHeight / 2);
        } else if (stageElements.goalZone) {
             stageElements.goalZone.render.fillStyle = 'rgba(144, 238, 144, 0.5)';
        }
    });

    // --- UI Visibility ---
    document.getElementById('stage-select').classList.add('hidden');
    document.getElementById('back-to-select').classList.remove('hidden');
}

// --- Initial Setup ---
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('back-to-select').classList.add('hidden');
    document.getElementById('stage1').addEventListener('click', () => startGame(1));
    document.getElementById('stage2').addEventListener('click', () => startGame(2));
    document.getElementById('stage3').addEventListener('click', () => startGame(3));
    document.getElementById('back-to-select').addEventListener('click', resetGame);

    window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyR' && currentStageId !== null) {
            startGame(currentStageId);
        }
    });
});
