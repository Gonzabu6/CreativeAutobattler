const Character = (() => {
    let torso, head, leftArm, rightArm;
    let visualLegs = { left: {x:0, y:0}, right: {x:0, y:0} };
    let grabConstraint = null;
    const keys = {};

    const create = (x, y, world) => {
        const group = Matter.Body.nextGroup(true);
        const torsoOptions = {
            label: 'character_part',
            collisionFilter: { group: group },
            render: { fillStyle: '#4285F4' }
        };
        const limbOptions = {
            label: 'character_part',
            collisionFilter: { group: group },
            friction: 0.4,
            render: { fillStyle: '#8AB4F8' }
        };

        torso = Matter.Bodies.rectangle(x, y, 60, 110, torsoOptions);
        Matter.Body.setInertia(torso, Infinity);

        head = Matter.Bodies.circle(x, y - 85, 30, limbOptions);
        leftArm = Matter.Bodies.rectangle(x - 50, y - 20, 20, 80, limbOptions);
        rightArm = Matter.Bodies.rectangle(x + 50, y - 20, 20, 80, limbOptions);

        const headConstraint = Matter.Constraint.create({
            bodyA: torso, bodyB: head, pointA: {x:0, y:-55},
            stiffness: 0.95,
            damping: 0.3,
            length: 5
        });
        const leftShoulder = Matter.Constraint.create({
            bodyA: torso, bodyB: leftArm, pointA: {x:-30, y:-35},
            pointB: { x: 0, y: -40 },
            stiffness: 0.8,
            length: 20
        });
        const rightShoulder = Matter.Constraint.create({
            bodyA: torso, bodyB: rightArm, pointA: {x:30, y:-35},
            pointB: { x: 0, y: -40 },
            stiffness: 0.8,
            length: 20
        });

        const characterComposite = Matter.Composite.create({
            bodies: [torso, head, leftArm, rightArm],
            constraints: [headConstraint, leftShoulder, rightShoulder]
        });

        Matter.Composite.add(world, characterComposite);
    };

    let keydownListener, keyupListener, mousedownListener, mouseupListener;

    const cleanupControls = () => {
        if (keydownListener) window.removeEventListener('keydown', keydownListener);
        if (keyupListener) window.removeEventListener('keyup', keyupListener);
        if (mousedownListener) window.removeEventListener('mousedown', mousedownListener);
        if (mouseupListener) window.removeEventListener('mouseup', mouseupListener);
    };

    const initControls = (world, mouse) => {
        cleanupControls(); // Clean up any old listeners first

        keydownListener = (e) => { keys[e.code] = true; };
        keyupListener = (e) => { keys[e.code] = false; };

        mousedownListener = (e) => {
            // Simplified grab logic for debugging
            if (grabConstraint) return;

            const allBodies = Matter.Composite.allBodies(world);
            const grabRadius = 150; // Generous radius for testing
            let bodyToGrab = null;
            let minDistance = Infinity;

            allBodies.forEach(body => {
                if (body.isStatic || body.isSensor || body.label === 'character_part') {
                    return;
                }
                const distance = Matter.Vector.magnitude(Matter.Vector.sub(torso.position, body.position));
                if (distance < minDistance) {
                    minDistance = distance;
                    bodyToGrab = body;
                }
            });

            if (bodyToGrab && minDistance < grabRadius) {
                const armToUse = leftArm; // Always use left arm for simplicity
                grabConstraint = Matter.Constraint.create({
                    bodyA: armToUse,
                    bodyB: bodyToGrab,
                    stiffness: 0.05,
                    length: 50,
                    render: { strokeStyle: '#c44', lineWidth: 3 }
                });
                Matter.Composite.add(world, grabConstraint);
            }
        };

        mouseupListener = (e) => {
            if (grabConstraint) {
                // A body's `world` property is a direct reference to the live world it's in.
                // This is more robust than relying on a `world` variable from a closure,
                // which can become stale if not managed perfectly.
                const liveWorld = grabConstraint.bodyA.world;
                Matter.Composite.remove(liveWorld, grabConstraint);
                grabConstraint = null;
            }
        };

        window.addEventListener('keydown', keydownListener);
        window.addEventListener('keyup', keyupListener);
        window.addEventListener('mousedown', mousedownListener);
        window.addEventListener('mouseup', mouseupListener);
    };

    const update = (ground, engine) => {
        if (!torso) return;

        const walkSpeed = 7;
        const jumpVelocity = -30;

        let newVelocityX = 0;
        if (keys['KeyA']) newVelocityX = -walkSpeed;
        else if (keys['KeyD']) newVelocityX = walkSpeed;
        else newVelocityX = torso.velocity.x * 0.9;

        let newVelocityY = torso.velocity.y;
        if ((keys['KeyW'] || keys['Space'])) {
            const collisions = Matter.Query.collides(torso, [ground]);
            if (collisions.length > 0) {
                 newVelocityY = jumpVelocity;
            }
        }
        Matter.Body.setVelocity(torso, { x: newVelocityX, y: newVelocityY });

        // Visual legs animation
        const walkCycle = engine.timing.timestamp * 0.01;
        const stepLength = 30;
        const stepHeight = 15;
        const torsoBottomY = torso.position.y + 55;

        let targetLeftX = torso.position.x - 15;
        let targetRightX = torso.position.x + 15;
        let targetLeftY = torsoBottomY;
        let targetRightY = torsoBottomY;

        if (Math.abs(torso.velocity.x) > 1) {
            targetLeftX += Math.cos(walkCycle) * stepLength;
            targetRightX += Math.cos(walkCycle + Math.PI) * stepLength;
            targetLeftY += Math.sin(walkCycle) * stepHeight;
            targetRightY += Math.sin(walkCycle + Math.PI) * stepHeight;
        }

        const groundY = ground.position.y - 30;
        visualLegs.left.x = targetLeftX;
        visualLegs.left.y = Math.min(targetLeftY, groundY);
        visualLegs.right.x = targetRightX;
        visualLegs.right.y = Math.min(targetRightY, groundY);
    };

    const draw = (context) => {
        if(!torso) return;
        context.beginPath();
        context.moveTo(torso.position.x - 15, torso.position.y + 55);
        context.lineTo(visualLegs.left.x, visualLegs.left.y);
        context.moveTo(torso.position.x + 15, torso.position.y + 55);
        context.lineTo(visualLegs.right.x, visualLegs.right.y);
        context.strokeStyle = '#34A853';
        context.lineWidth = 25;
        context.stroke();
    }

    return {
        create: create,
        initControls: initControls,
        cleanupControls: cleanupControls,
        update: update,
        draw: draw
    };
})();
