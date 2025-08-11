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
        // Matter.Body.setInertia(torso, Infinity); // Removed to allow tumbling

        head = Matter.Bodies.circle(x, y - 100, 30, limbOptions); // Raised head
        leftArm = Matter.Bodies.rectangle(x - 50, y - 20, 20, 80, limbOptions);
        rightArm = Matter.Bodies.rectangle(x + 50, y - 20, 20, 80, limbOptions);

        const headConstraint = Matter.Constraint.create({
            bodyA: torso, bodyB: head, pointA: {x:0, y:-70}, // Raised neck joint
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

    const getGrabRadius = () => 120; // Expose grab radius for rendering
    const isGrabbing = () => grabConstraint !== null;

    const initControls = (world, mouse) => {
        cleanupControls(); // Clean up any old listeners first

        keydownListener = (e) => { keys[e.code] = true; };
        keyupListener = (e) => { keys[e.code] = false; };

        mousedownListener = (e) => {
            if (grabConstraint) return;

            const allBodies = Matter.Composite.allBodies(world);
            const grabRadius = getGrabRadius();
            const characterPosition = torso.position;
            let closestBody = null;
            let minDistanceSq = Infinity;

            // Find the body closest to the mouse, but only within a radius of the character.
            allBodies.forEach(body => {
                if (body.isStatic || body.isSensor || body.label === 'character_part') {
                    return;
                }

                const distanceToChar = Matter.Vector.magnitude(Matter.Vector.sub(characterPosition, body.position));
                if (distanceToChar < grabRadius) {
                    const distanceToMouseSq = Matter.Vector.magnitudeSquared(Matter.Vector.sub(mouse.position, body.position));
                    if (distanceToMouseSq < minDistanceSq) {
                        minDistanceSq = distanceToMouseSq;
                        closestBody = body;
                    }
                }
            });

            if (closestBody) {
                // Grab the body with a constraint to the torso for stability and simplicity.
                grabConstraint = Matter.Constraint.create({
                    bodyA: torso,
                    bodyB: closestBody,
                    pointA: { x: 0, y: 0 },
                    pointB: { x: 0, y: 0 },
                    stiffness: 0.05,
                    length: 100, // A fixed comfortable holding distance
                    render: { strokeStyle: '#c44', lineWidth: 3, type: 'line' }
                });
                Matter.Composite.add(world, grabConstraint);
            }
        };

        mouseupListener = (e) => {
            if (grabConstraint) {
                // Using bodyA.world is robust, ensures we're removing from the correct world instance.
                const liveWorld = grabConstraint.bodyA.world;
                Matter.Composite.remove(liveWorld, grabConstraint, true); // true for deep remove
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
            const swingAmount = 1.0; // Increased for more swing
            const targetLeftAngle = Math.sin(walkCycle) * swingAmount;
            const targetRightAngle = Math.sin(walkCycle + Math.PI) * swingAmount;

            const turnSpeed = 0.3; // Increased for faster leg movement
            Matter.Body.setAngularVelocity(leftThigh, (targetLeftAngle - leftThigh.angle) * turnSpeed);
            Matter.Body.setAngularVelocity(rightThigh, (targetRightAngle - rightThigh.angle) * turnSpeed);

            // Simplified shin logic for a more puppet-like, visible walk
            Matter.Body.setAngularVelocity(leftShin, (leftThigh.angle * 0.9 - leftShin.angle) * turnSpeed);
            Matter.Body.setAngularVelocity(rightShin, (rightThigh.angle * 0.9 - rightShin.angle) * turnSpeed);
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
        update: update,
        getTorso: () => torso,
        getGrabRadius: getGrabRadius,
        isGrabbing: isGrabbing
    };
})();
