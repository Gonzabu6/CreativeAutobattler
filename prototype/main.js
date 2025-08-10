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

function cleanup() {
    if (runner) Runner.stop(runner);
    if (render) {
        Render.stop(render);
        render.canvas.remove();
        render.textures = {};
    }
    if (engine) Engine.clear(engine);
}

function resetGame() {
    cleanup();
    document.getElementById('stage-select').classList.remove('hidden');
    document.getElementById('back-to-select').classList.add('hidden');
    const canvas = document.querySelector('canvas');
    if (canvas) canvas.remove(); // Remove old canvas
}

function startGame(stageId) {
    // Ensure a clean state
    cleanup();

    // --- Engine & World ---
    engine = Engine.create();
    world = engine.world;
    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight;

    // --- Renderer ---
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    render = Render.create({
        element: document.body,
        canvas: canvas,
        engine: engine,
        options: {
            width: canvasWidth,
            height: canvasHeight,
            wireframes: false,
            background: '#f0f0f0'
        }
    });
    Render.run(render);

    // --- Runner ---
    runner = Runner.create();
    Runner.run(runner, engine);

    // --- Mouse ---
    const mouse = Mouse.create(render.canvas);

    // --- Create Stage and Character ---
    const { ground, targetBox, goalZone, fanVent } = Stage.create(stageId, world, canvasWidth, canvasHeight);
    Character.create(150, canvasHeight - 200, world);
    Character.initControls(world, mouse);

    // --- Game Loop ---
    let isGoal = false;
    Matter.Events.on(engine, 'beforeUpdate', (event) => {
        Character.update(ground, engine);

        // Fan logic
        if (fanVent) {
            const bodiesInFan = Matter.Query.region(Composite.allBodies(world), fanVent.bounds);
            bodiesInFan.forEach(body => {
                if (!body.isStatic) {
                    Matter.Body.applyForce(body, body.position, { x: 0, y: -0.02 }); // Increased fan force
                }
            });
        }

        if (goalZone && targetBox && Matter.Bounds.overlaps(goalZone.bounds, targetBox.bounds)) {
            isGoal = true;
        } else {
            isGoal = false;
        }
    });

    // --- UI Rendering ---
    Matter.Events.on(engine, 'afterRender', (event) => {
        if (isGoal) {
            goalZone.render.fillStyle = 'rgba(255, 215, 0, 0.7)';
            const ctx = render.context;
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 80px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('GOAL!', canvasWidth / 2, canvasHeight / 2);
        } else if (goalZone) {
             goalZone.render.fillStyle = 'rgba(144, 238, 144, 0.5)';
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
    document.getElementById('back-to-select').addEventListener('click', resetGame);
});
