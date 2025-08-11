const Character = (() => {
    let torso, head, leftArm, rightArm;
    let leftThigh, leftShin, rightThigh, rightShin;
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

        // Legs
        const legOptions = {
            label: 'character_part',
            collisionFilter: { group: group },
            friction: 0.5,
            render: { fillStyle: '#34A853' } // Green
        };
        leftThigh = Matter.Bodies.rectangle(x - 20, y + 85, 25, 50, legOptions);
        rightThigh = Matter.Bodies.rectangle(x + 20, y + 85, 25, 50, legOptions);
        leftShin = Matter.Bodies.rectangle(x - 20, y + 145, 25, 60, legOptions);
        rightShin = Matter.Bodies.rectangle(x + 20, y + 145, 25, 60, legOptions);

        const leftHip = Matter.Constraint.create({
            bodyA: torso, bodyB: leftThigh,
            pointA: { x: -20, y: 55 },
            pointB: { x: 0, y: -25 },
            stiffness: 0.8, length: 10
        });
        const rightHip = Matter.Constraint.create({
            bodyA: torso, bodyB: rightThigh,
            pointA: { x: 20, y: 55 },
            pointB: { x: 0, y: -25 },
            stiffness: 0.8, length: 10
        });
        const leftKnee = Matter.Constraint.create({
            bodyA: leftThigh, bodyB: leftShin,
            pointA: { x: 0, y: 25 },
            pointB: { x: 0, y: -30 },
            stiffness: 0.9, length: 10
        });
        const rightKnee = Matter.Constraint.create({
            bodyA: rightThigh, bodyB: rightShin,
            pointA: { x: 0, y: 25 },
            pointB: { x: 0, y: -30 },
            stiffness: 0.9, length: 10
        });

        const characterComposite = Matter.Composite.create({
            bodies: [torso, head, leftArm, rightArm, leftThigh, rightThigh, leftShin, rightShin],
            constraints: [headConstraint, leftShoulder, rightShoulder, leftHip, rightHip, leftKnee, rightKnee]
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
            if (grabConstraint) return;

            const allBodies = Matter.Composite.allBodies(world);
            let bodyToGrab = null;

            // 1. Prioritize object directly under the mouse
            const bodiesUnderMouse = Matter.Query.point(allBodies, mouse.position);
            for (const body of bodiesUnderMouse) {
                if (!body.isStatic && !body.isSensor && body.label !== 'character_part') {
                    bodyToGrab = body;
                    break;
                }
            }

            // 2. If nothing under mouse, search in a radius around the player
            if (!bodyToGrab) {
                const grabRadius = 40; // Even smaller radius
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

                // If the closest body is outside the radius, don't grab it
                if (minDistance > grabRadius) {
                    bodyToGrab = null;
                }
            }

            // 3. If a body was found, grab it
            if (bodyToGrab) {
                const armToUse = (Matter.Vector.magnitude(Matter.Vector.sub(mouse.position, leftArm.position)) < Matter.Vector.magnitude(Matter.Vector.sub(mouse.position, rightArm.position))) ? leftArm : rightArm;
                grabConstraint = Matter.Constraint.create({
                    bodyA: armToUse,
                    bodyB: bodyToGrab,
                    stiffness: 0.02,
                    length: Matter.Vector.magnitude(Matter.Vector.sub(armToUse.position, bodyToGrab.position)),
                    render: { strokeStyle: '#c44', lineWidth: 3 }
                });
                Matter.Composite.add(world, grabConstraint);
                setTimeout(() => { if (grabConstraint) grabConstraint.length = 40; }, 100);
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
            // Check if either shin is touching the ground to allow jumping
            const leftShinCollisions = Matter.Query.collides(leftShin, [ground]);
            const rightShinCollisions = Matter.Query.collides(rightShin, [ground]);
            if (leftShinCollisions.length > 0 || rightShinCollisions.length > 0) {
                 newVelocityY = jumpVelocity;
            }
        }
        Matter.Body.setVelocity(torso, { x: newVelocityX, y: newVelocityY });

        // Physical legs animation
        const isMoving = Math.abs(torso.velocity.x) > 1;
        if (isMoving) {
            const walkCycle = engine.timing.timestamp * 0.008;
            const swingAmount = 0.6;
            const targetLeftAngle = Math.sin(walkCycle) * swingAmount;
            const targetRightAngle = Math.sin(walkCycle + Math.PI) * swingAmount;

            const turnSpeed = 0.2;
            Matter.Body.setAngularVelocity(leftThigh, (targetLeftAngle - leftThigh.angle) * turnSpeed);
            Matter.Body.setAngularVelocity(rightThigh, (targetRightAngle - rightThigh.angle) * turnSpeed);

            // Try to keep shins from going backwards too much
            const kneeBend = Math.max(0, Math.sin(walkCycle));
            Matter.Body.setAngularVelocity(leftShin, (leftThigh.angle * 0.5 + kneeBend * 0.5 - leftShin.angle) * 0.1);
            Matter.Body.setAngularVelocity(rightShin, (rightThigh.angle * 0.5 + kneeBend * 0.5 - rightShin.angle) * 0.1);
        } else {
            // Try to stand straight when not moving
            const standSpeed = 0.1;
            Matter.Body.setAngularVelocity(leftThigh, (0 - leftThigh.angle) * standSpeed);
            Matter.Body.setAngularVelocity(rightThigh, (0 - rightThigh.angle) * standSpeed);
            Matter.Body.setAngularVelocity(leftShin, (0 - leftShin.angle) * standSpeed);
            Matter.Body.setAngularVelocity(rightShin, (0 - rightShin.angle) * standSpeed);
        }
    };

    return {
        create: create,
        initControls: initControls,
        cleanupControls: cleanupControls,
        update: update
    };
})();
