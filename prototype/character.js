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
        leftHip = Matter.Constraint.create({ bodyA: torso, bodyB: leftLeg, pointA: { x: -10, y: 40 }, pointB: { x: 0, y: -30 }, stiffness: 1.0, length: 10 });
        rightHip = Matter.Constraint.create({ bodyA: torso, bodyB: rightLeg, pointA: { x: 10, y: 40 }, pointB: { x: 0, y: -30 }, stiffness: 1.0, length: 10 });

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
        if (Math.abs(newVelocityX) > 0.1) {
            // Loosen hips when walking
            leftHip.stiffness = 0.1;
            rightHip.stiffness = 0.1;
            // Apply a small force to make legs move
            const walkForce = 0.0005;
            Matter.Body.applyForce(ragdoll.bodies[4], ragdoll.bodies[4].position, {x: newVelocityX > 0 ? -walkForce : walkForce, y:0});
            Matter.Body.applyForce(ragdoll.bodies[5], ragdoll.bodies[5].position, {x: newVelocityX > 0 ? -walkForce : walkForce, y:0});
        } else {
            // Stiffen hips when standing still
            leftHip.stiffness = 1.0;
            rightHip.stiffness = 1.0;
        }

        // Keep torso upright
        Matter.Body.setAngle(playerTorso, 0);

        // Keep head fixed to torso
        const head = ragdoll.bodies[0];
        Matter.Body.setPosition(head, { x: playerTorso.position.x, y: playerTorso.position.y - 50 });
        Matter.Body.setVelocity(head, playerTorso.velocity);


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
