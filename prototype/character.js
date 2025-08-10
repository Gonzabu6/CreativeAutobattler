const Character = (() => {
    let ragdoll, leftHip, rightHip;
    let grabConstraint = null;
    const keys = {};

    const create = (x, y, world) => {
        const group = Matter.Body.nextGroup(true);
        const options = { collisionFilter: { group: group }, friction: 0.4 };
        const head = Matter.Bodies.circle(x, y - 70, 20, options);
        const torso = Matter.Bodies.rectangle(x, y, 40, 80, options);
        const leftArm = Matter.Bodies.rectangle(x - 40, y, 20, 60, options);
        const rightArm = Matter.Bodies.rectangle(x + 40, y, 20, 60, options);
        const leftLeg = Matter.Bodies.rectangle(x - 20, y + 80, 20, 80, options);
        const rightLeg = Matter.Bodies.rectangle(x + 20, y + 80, 20, 80, options);

        const leftShoulder = Matter.Constraint.create({ bodyA: torso, bodyB: leftArm, pointA: { x: -20, y: -30 }, pointB: { x: 0, y: -20 }, stiffness: 1.0, length: 20 });
        const rightShoulder = Matter.Constraint.create({ bodyA: torso, bodyB: rightArm, pointA: { x: 20, y: -30 }, pointB: { x: 0, y: -20 }, stiffness: 1.0, length: 20 });
        leftHip = Matter.Constraint.create({ bodyA: torso, bodyB: leftLeg, pointA: { x: -15, y: 40 }, pointB: { x: 0, y: -35 }, stiffness: 0.8, length: 15 });
        rightHip = Matter.Constraint.create({ bodyA: torso, bodyB: rightLeg, pointA: { x: 15, y: 40 }, pointB: { x: 0, y: -35 }, stiffness: 0.8, length: 15 });

        // --- Make torso unrotatable ---
        Matter.Body.setInertia(torso, Infinity);

        ragdoll = Matter.Composite.create({ bodies: [head, torso, leftArm, rightArm, leftLeg, rightLeg], constraints: [leftShoulder, rightShoulder, leftHip, rightHip] });
        Matter.Composite.add(world, ragdoll);
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
                if (body.isStatic || ragdoll.bodies.includes(body)) continue;
                const distance = Matter.Vector.magnitude(Matter.Vector.sub(body.position, mouse.position));
                if (distance < minDistance) {
                    minDistance = distance;
                    bodyToGrab = body;
                }
            }
            if (bodyToGrab) {
                const reach = 100;
                const distToLeftArm = Matter.Vector.magnitude(Matter.Vector.sub(ragdoll.bodies[2].position, bodyToGrab.position));
                const distToRightArm = Matter.Vector.magnitude(Matter.Vector.sub(ragdoll.bodies[3].position, bodyToGrab.position));
                let grabArm = null;
                if (distToLeftArm < reach && distToLeftArm < distToRightArm) grabArm = ragdoll.bodies[2];
                else if (distToRightArm < reach) grabArm = ragdoll.bodies[3];
                if (grabArm) {
                    grabConstraint = Matter.Constraint.create({ bodyA: grabArm, bodyB: bodyToGrab, stiffness: 0.2, length: 40, render: { strokeStyle: '#c44', lineWidth: 2 } });
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
        if (!ragdoll) return;

        const playerTorso = ragdoll.bodies[1];
        const currentVelocity = playerTorso.velocity;
        const walkSpeed = 5;
        const jumpVelocity = -20; // Significantly increased jump velocity

        // --- Kinematic Control Logic ---

        // Horizontal movement
        let newVelocityX = 0;
        if (keys['KeyA']) {
            newVelocityX = -walkSpeed;
        } else if (keys['KeyD']) {
            newVelocityX = walkSpeed;
        } else {
            // Apply damping to horizontal movement to prevent sliding
            newVelocityX = currentVelocity.x * 0.9;
        }

        let newVelocityY = currentVelocity.y;

        // Jumping
        if (keys['KeyW'] || keys['Space']) {
            const playerLeftLeg = ragdoll.bodies[4];
            const playerRightLeg = ragdoll.bodies[5];
            const feetY = Math.max(playerLeftLeg.position.y, playerRightLeg.position.y);
            // Simple ground check
            if (feetY > ground.position.y - 50) {
                 newVelocityY = jumpVelocity;
            }
        }

        // Apply the new velocity to the torso
        Matter.Body.setVelocity(playerTorso, { x: newVelocityX, y: newVelocityY });

        // Procedural walking animation
        const playerLeftLeg = ragdoll.bodies[4];
        const playerRightLeg = ragdoll.bodies[5];
        const walkCycle = engine.timing.timestamp * 0.008;
        const swingAmount = 0.5;
        const legTorque = 0.001;

        if (Math.abs(newVelocityX) > 0.1) {
            // Walking
            const targetAngleLeft = Math.sin(walkCycle) * swingAmount;
            const targetAngleRight = Math.sin(walkCycle + Math.PI) * swingAmount;

            // Apply torque to move legs towards target angle
            if (playerLeftLeg.angle < targetAngleLeft) Matter.Body.applyForce(playerLeftLeg, playerLeftLeg.position, {x: legTorque, y:0});
            else Matter.Body.applyForce(playerLeftLeg, playerLeftLeg.position, {x: -legTorque, y:0});

            if (playerRightLeg.angle < targetAngleRight) Matter.Body.applyForce(playerRightLeg, playerRightLeg.position, {x: legTorque, y:0});
            else Matter.Body.applyForce(playerRightLeg, playerRightLeg.position, {x: -legTorque, y:0});

        } else {
            // Standing still - try to bring legs to neutral
            if (Math.abs(playerLeftLeg.angle) > 0.05) Matter.Body.applyForce(playerLeftLeg, playerLeftLeg.position, {x: playerLeftLeg.angle > 0 ? -legTorque : legTorque, y:0});
            if (Math.abs(playerRightLeg.angle) > 0.05) Matter.Body.applyForce(playerRightLeg, playerRightLeg.position, {x: playerRightLeg.angle > 0 ? -legTorque : legTorque, y:0});
        }

        // Keep torso upright
        Matter.Body.setAngle(playerTorso, 0);

        // Keep head fixed to torso
        const head = ragdoll.bodies[0];
        Matter.Body.setPosition(head, { x: playerTorso.position.x, y: playerTorso.position.y - 55 });
        Matter.Body.setAngle(head, 0);


        // Make limbs follow the torso's new velocity
        for (let i = 0; i < ragdoll.bodies.length; i++) {
            const part = ragdoll.bodies[i];
            if (part === playerTorso) continue;
            // This is a simplification. A better model might use constraints with motors.
            // For now, we just ensure the limbs don't get left behind.
            const newPartVelocity = {
                x: newVelocityX + (part.velocity.x - currentVelocity.x),
                y: newVelocityY + (part.velocity.y - currentVelocity.y)
            };
            Matter.Body.setVelocity(part, newPartVelocity);
        }
    };

    return {
        create: create,
        initControls: initControls,
        update: update
    };
})();
