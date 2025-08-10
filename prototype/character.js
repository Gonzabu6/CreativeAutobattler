const Character = (() => {
    let torso, head, leftArm, rightArm;
    let grabConstraint = null;
    const keys = {};

    const create = (x, y, world) => {
        const group = Matter.Body.nextGroup(true);
        const options = { collisionFilter: { group: group }, friction: 0.4 };

        // --- The new "base" of the character (kinematic) ---
        // The torso now represents the non-physical, controlled part.
        torso = Matter.Bodies.rectangle(x, y, 50, 120, {
            // isSensor: true, // It needs to collide with the ground
            render: {
                fillStyle: 'rgba(0, 0, 255, 0.2)' // Make it slightly visible for debugging
            }
        });
        Matter.Body.setInertia(torso, Infinity);

        // --- Physical, wobbly parts ---
        head = Matter.Bodies.circle(x, y - 80, 30, options);
        leftArm = Matter.Bodies.rectangle(x - 45, y - 20, 20, 80, options);
        rightArm = Matter.Bodies.rectangle(x + 45, y - 20, 20, 80, options);

        // --- Constraints to attach physical parts to the torso ---
        const headConstraint = Matter.Constraint.create({ bodyA: torso, bodyB: head, pointA: {x:0, y:-60}, stiffness: 0.7, length: 20 });
        const leftShoulder = Matter.Constraint.create({ bodyA: torso, bodyB: leftArm, pointA: {x:-25, y:-40}, stiffness: 0.7, length: 20 });
        const rightShoulder = Matter.Constraint.create({ bodyA: torso, bodyB: rightArm, pointA: {x:25, y:-40}, stiffness: 0.7, length: 20 });

        const characterComposite = Matter.Composite.create({
            bodies: [torso, head, leftArm, rightArm],
            constraints: [headConstraint, leftShoulder, rightShoulder]
        });

        Matter.Composite.add(world, characterComposite);
    };

    const initControls = (world, mouse) => {
        window.addEventListener('keydown', (e) => { keys[e.code] = true; });
        window.addEventListener('keyup', (e) => { keys[e.code] = false; });

        window.addEventListener('mousedown', (e) => {
            if (grabConstraint) return;
            const armToUse = (Math.random() > 0.5) ? leftArm : rightArm;
            const allBodies = Matter.Composite.allBodies(world);
            let bodyToGrab = null;
            let minDistance = Infinity;

            for (let i = 0; i < allBodies.length; i++) {
                const body = allBodies[i];
                if (body.isStatic || body.isSensor || body === torso || body === head || body === leftArm || body === rightArm) continue;
                const distance = Matter.Vector.magnitude(Matter.Vector.sub(body.position, mouse.position));
                if (distance < minDistance) {
                    minDistance = distance;
                    bodyToGrab = body;
                }
            }
            if (bodyToGrab) {
                const reach = 300;
                const distToArm = Matter.Vector.magnitude(Matter.Vector.sub(armToUse.position, bodyToGrab.position));
                if (distToArm < reach) {
                    grabConstraint = Matter.Constraint.create({
                        bodyA: armToUse,
                        bodyB: bodyToGrab,
                        stiffness: 0.1,
                        render: { strokeStyle: '#c44', lineWidth: 3 }
                    });
                    Matter.Composite.add(world, grabConstraint);
                }
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (grabConstraint) {
                Matter.Composite.remove(world, grabConstraint);
                grabConstraint = null;
            }
        });
    };

    const update = (ground, engine) => {
        if (!torso) return;

        const currentVelocity = torso.velocity;
        const walkSpeed = 7;
        const jumpVelocity = -25;

        let newVelocityX = 0;
        if (keys['KeyA']) newVelocityX = -walkSpeed;
        else if (keys['KeyD']) newVelocityX = walkSpeed;
        else newVelocityX = currentVelocity.x * 0.9;

        let newVelocityY = currentVelocity.y;
        if ((keys['KeyW'] || keys['Space'])) {
            const collisions = Matter.Query.collides(torso, [ground]);
            if (collisions.length > 0) {
                 newVelocityY = jumpVelocity;
            }
        }

        Matter.Body.setVelocity(torso, { x: newVelocityX, y: newVelocityY });
    };

    return {
        create: create,
        initControls: initControls,
        update: update
    };
})();
