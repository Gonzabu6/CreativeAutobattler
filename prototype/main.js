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

let fanParticles = [];

function cleanup() {
    if (runner) Runner.stop(runner);
    if (render) {
        Render.stop(render);
        if (render.canvas) render.canvas.remove();
        render.textures = {};
    }
    if (engine) Engine.clear(engine);
    Character.cleanupControls();
    fanParticles = []; // Clear particles on cleanup
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

                    // Defer the action to avoid modifying the world during a collision event.
                    // This new approach is much safer. Instead of replacing the composite,
                    // we just remove its constraints, letting the bodies fall apart naturally.
                    setTimeout(() => {
                        const wall = Composite.allComposites(world).find(c => c.label === 'breakable_wall');
                        if (!wall) return;

                        // Create a copy of the constraints array to iterate over,
                        // as removing constraints will modify the original array.
                        const constraints = [...wall.constraints];
                        constraints.forEach(constraint => {
                            Matter.Composite.remove(wall, constraint);
                        });

                        // Re-label the composite so this logic doesn't run on it again.
                        wall.label = 'broken_wall';
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
            const fanBounds = stageElements.fanVent.bounds;
            const bodiesInFan = Matter.Query.region(Composite.allBodies(world), fanBounds);

            bodiesInFan.forEach(body => {
                if (!body.isStatic && !body.isSensor) {
                    // Apply a force that counters gravity and adds a little lift.
                    // This makes objects of all masses "float" equally.
                    const force = {
                        x: 0,
                        y: -body.mass * engine.world.gravity.y * 1.1 // 10% stronger than gravity
                    };
                    Matter.Body.applyForce(body, body.position, force);
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

    function manageFanParticles(fanVent, render) {
        // Add new particles
        if (fanVent && Math.random() < 0.6) { // Spawn rate
            fanParticles.push({
                x: fanVent.position.x + (Math.random() - 0.5) * (fanVent.bounds.max.x - fanVent.bounds.min.x),
                y: fanVent.position.y - 15,
                life: 60 + Math.random() * 60, // Lifetime in frames
                vx: (Math.random() - 0.5) * 0.5,
                vy: -Math.random() * 1.5 - 0.5
            });
        }

        // Update and draw particles
        const ctx = render.context;
        for (let i = fanParticles.length - 1; i >= 0; i--) {
            let p = fanParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;

            if (p.life <= 0) {
                fanParticles.splice(i, 1);
            } else {
                ctx.fillStyle = `rgba(220, 240, 255, ${p.life / 100 * 0.6})`;
                const size = Math.max(1, p.life / 30);
                ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
            }
        }
    }

    // --- UI Rendering ---
    Matter.Events.on(engine, 'afterRender', (event) => {
        const ctx = render.context;

        // Draw fan particles
        manageFanParticles(stageElements.fanVent, render);

        // Draw grab radius indicator
        const torso = Character.getTorso();
        if (torso) {
            const grabRadius = Character.getGrabRadius();
            const grabbing = Character.isGrabbing();
            ctx.beginPath();
            ctx.arc(torso.position.x, torso.position.y, grabRadius, 0, 2 * Math.PI);
            ctx.strokeStyle = grabbing ? 'rgba(255, 223, 0, 0.8)' : 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = grabbing ? 2.5 : 1.5;
            ctx.stroke();
        }

        // Goal check and rendering
        if (isGoal) {
            stageElements.goalZone.render.fillStyle = 'rgba(255, 215, 0, 0.7)';
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
