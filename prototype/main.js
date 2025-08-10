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
        if (wallBroken) return; // Don't do anything if wall is already broken

        const pairs = event.pairs;
        for (const pair of pairs) {
            const { bodyA, bodyB } = pair;
            if (bodyA.label === 'brick' || bodyB.label === 'brick') {
                const impulse = pair.collision.impulse;
                const magnitude = Math.sqrt(impulse.x * impulse.x + impulse.y * impulse.y);

                if (magnitude > 20) {
                    const brickConstraints = Composite.allConstraints(world).filter(c => c.label === 'brickConstraint');
                    if (brickConstraints.length > 0) {
                        wallBroken = true; // Set the flag
                        // Defer removal to avoid modifying the world during collision event
                        setTimeout(() => {
                            Matter.Composite.remove(world, brickConstraints);
                        }, 0);
                    }
                }
            }
        }
    });

    Matter.Events.on(engine, 'beforeUpdate', (event) => {
        Character.update(stageElements.ground, engine);

        // Fan logic
        if (stageElements.fanVent) {
            const bodiesInFan = Matter.Query.region(Composite.allBodies(world), stageElements.fanVent.bounds);
            bodiesInFan.forEach(body => {
                if (!body.isStatic) {
                    Matter.Body.applyForce(body, body.position, { x: 0, y: -2.5 }); // Dramatically increased fan force
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
