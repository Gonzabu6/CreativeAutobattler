const Character = (() => {
    let legBase, torso, head, leftArm, rightArm, leftLeg, rightLeg;
    let grabConstraint = null;
    const keys = {};

    const create = (x, y, world) => {
        const group = Matter.Body.nextGroup(true);
        const options = { collisionFilter: { group: group }, friction: 0.4 };

        // --- The new "base" of the character ---
        legBase = Matter.Bodies.rectangle(x, y, 50, 20, {
            isSensor: true,
            render: { visible: false }
        });
        Matter.Body.setInertia(legBase, Infinity);

        // --- Physical, wobbly parts ---
        torso = Matter.Bodies.rectangle(x, y - 60, 40, 80, options);
        head = Matter.Bodies.circle(x, y - 115, 20, options);
        leftArm = Matter.Bodies.rectangle(x - 40, y - 60, 20, 60, options);
        rightArm = Matter.Bodies.rectangle(x + 40, y - 60, 20, 60, options);
        leftLeg = Matter.Bodies.rectangle(x - 15, y, 20, 80, options);
        rightLeg = Matter.Bodies.rectangle(x + 15, y, 20, 80, options);

        // --- Constraints ---
        const legToBase = Matter.Constraint.create({ bodyA: legBase, bodyB: torso, stiffness: 0.2, damping: 0.1, length: 60 });
        const neck = Matter.Constraint.create({ bodyA: torso, bodyB: head, stiffness: 0.9, damping: 0.1, length: 40 });
        const leftShoulder = Matter.Constraint.create({ bodyA: torso, bodyB: leftArm, stiffness: 0.8, length: 40 });
        const rightShoulder = Matter.Constraint.create({ bodyA: torso, bodyB: rightArm, stiffness: 0.8, length: 40 });
        const leftHip = Matter.Constraint.create({ bodyA: torso, bodyB: leftLeg, stiffness: 0.5, length: 40 });
        const rightHip = Matter.Constraint.create({ bodyA: torso, bodyB: rightLeg, stiffness: 0.5, length: 40 });

        const characterComposite = Matter.Composite.create({
            bodies: [legBase, torso, head, leftArm, rightArm, leftLeg, rightLeg],
            constraints: [legToBase, neck, leftShoulder, rightShoulder, leftHip, rightHip]
        });

        Matter.Composite.add(world, characterComposite);
    };

    const initControls = (world, mouse) => {
        window.addEventListener('keydown', (e) => { keys[e.code] = true; });
        window.addEventListener('keyup', (e) => { keys[e.code] = false; });

        window.addEventListener('mousedown', (e) => {
            if (grabConstraint) return;
            const allBodies = Matter.Composite.allBodies(world);
            let bodyToGrab = null;
            let minDistance = Infinity;

            for (let i = 0; i < allBodies.length; i++) {
                const body = allBodies[i];
                if (body.isStatic || body.isSensor || body === torso || body === head || body === leftArm || body === rightArm || body === leftLeg || body === rightLeg) continue;
                const distance = Matter.Vector.magnitude(Matter.Vector.sub(body.position, mouse.position));
                if (distance < minDistance) {
                    minDistance = distance;
                    bodyToGrab = body;
                }
            }
            if (bodyToGrab) {
                const reach = 250;
                const distToTorso = Matter.Vector.magnitude(Matter.Vector.sub(torso.position, bodyToGrab.position));
                if (distToTorso < reach) {
                    grabConstraint = Matter.Constraint.create({
                        bodyA: torso,
                        bodyB: bodyToGrab,
                        stiffness: 0.1,
                        render: { strokeStyle: '#c44', lineWidth: 2 }
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
        if (!legBase) return;

        const currentVelocity = legBase.velocity;
        const walkSpeed = 7;
        const jumpVelocity = -22;

        let newVelocityX = 0;
        if (keys['KeyA']) newVelocityX = -walkSpeed;
        else if (keys['KeyD']) newVelocityX = walkSpeed;
        else newVelocityX = currentVelocity.x * 0.9;

        let newVelocityY = currentVelocity.y;
        if (keys['KeyW'] || keys['Space']) {
            if (legBase.position.y > ground.position.y - 40) {
                 newVelocityY = jumpVelocity;
            }
        }

        Matter.Body.setVelocity(legBase, { x: newVelocityX, y: newVelocityY });
    };

    return {
        create: create,
        initControls: initControls,
        update: update
    };
})();
