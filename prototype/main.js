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
let mouse;

function startGame(stageId) {
    // --- Engine ---
    engine = Engine.create();
    world = engine.world;
    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight;

    // --- Renderer ---
    render = Render.create({
        element: document.body,
        engine: engine,
        canvas: document.querySelector('canvas'), // Use existing canvas
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
    mouse = Mouse.create(render.canvas);

    // --- Create Stage and Character ---
    const { ground, targetBox, goalZone, fanArea } = Stage.create(stageId, world, canvasWidth, canvasHeight);
    Character.create(150, canvasHeight - 200, world);
    Character.initControls(world, mouse);

    // --- Game Loop ---
    let isGoal = false;
    Matter.Events.on(engine, 'beforeUpdate', (event) => {
        Character.update(ground, engine);

        // Fan logic
        if (fanArea) {
            const bodiesInFan = Matter.Query.region(Composite.allBodies(world), fanArea.bounds);
            bodiesInFan.forEach(body => {
                if (!body.isStatic) {
                    Matter.Body.applyForce(body, body.position, { x: 0, y: -0.01 });
                }
            });
        }

        if (goalZone && targetBox && Matter.Bounds.overlaps(goalZone.bounds, targetBox.bounds)) {
            isGoal = true;
            goalZone.render.fillStyle = 'rgba(255, 215, 0, 0.7)';
        } else {
            isGoal = false;
            goalZone.render.fillStyle = 'rgba(144, 238, 144, 0.5)';
        }
    });

    // --- UI Rendering (Goal Text Only) ---
    Matter.Events.on(engine, 'afterRender', (event) => {
        if (isGoal) {
            const ctx = render.context;
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 80px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('GOAL!', canvasWidth / 2, canvasHeight / 2);
        }
    });

    // Hide stage select UI
    document.getElementById('stage-select').style.display = 'none';
}

// --- Initial Setup ---
window.addEventListener('DOMContentLoaded', () => {
    // Create a canvas element for the renderer
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);

    document.getElementById('stage1').addEventListener('click', () => {
        startGame(1);
    });
    document.getElementById('stage2').addEventListener('click', () => {
        startGame(2);
    });
});
