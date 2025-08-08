// --- Aliases ---
const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
      Mouse = Matter.Mouse,
      Composite = Matter.Composite;

// --- Engine ---
const engine = Engine.create();
const world = engine.world;
const canvasWidth = window.innerWidth;
const canvasHeight = window.innerHeight;

// --- Renderer ---
const render = Render.create({
    element: document.body,
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
const runner = Runner.create();
Runner.run(runner, engine);

// --- Mouse ---
const mouse = Mouse.create(render.canvas);

// --- Create Stage and Character ---
const { ground, targetBox, goalZone } = Stage.create(world, canvasWidth, canvasHeight);
Character.create(150, canvasHeight - 200, world); // Spawn higher
Character.initControls(world, mouse);

// --- Game Loop ---
let isGoal = false;
Matter.Events.on(engine, 'beforeUpdate', (event) => {
    // Update character controls
    Character.update(ground);

    // Goal check
    if (Matter.Bounds.overlaps(goalZone.bounds, targetBox.bounds)) {
        isGoal = true;
        goalZone.render.fillStyle = 'rgba(255, 215, 0, 0.7)';
    } else {
        isGoal = false;
        goalZone.render.fillStyle = 'rgba(144, 238, 144, 0.5)';
    }
});

// --- UI Rendering (Goal Text Only) ---
Matter.Events.on(engine, 'afterRender', (event) => {
    const ctx = render.context;

    // Draw Goal Text
    if (isGoal) {
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GOAL!', canvasWidth / 2, canvasHeight / 2);
    }
});
