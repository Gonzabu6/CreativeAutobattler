const Character = (() => {
    let ragdoll;
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

        const neck = Matter.Constraint.create({ bodyA: head, bodyB: torso, pointA: { x: 0, y: 20 }, pointB: { x: 0, y: -40 }, stiffness: 1.0, length: 5 });
        const leftShoulder = Matter.Constraint.create({ bodyA: torso, bodyB: leftArm, pointA: { x: -20, y: -30 }, pointB: { x: 0, y: -20 }, stiffness: 1.0, length: 20 });
        const rightShoulder = Matter.Constraint.create({ bodyA: torso, bodyB: rightArm, pointA: { x: 20, y: -30 }, pointB: { x: 0, y: -20 }, stiffness: 1.0, length: 20 });
        const leftHip = Matter.Constraint.create({ bodyA: torso, bodyB: leftLeg, pointA: { x: -10, y: 40 }, pointB: { x: 0, y: -30 }, stiffness: 1.0, length: 10 });
        const rightHip = Matter.Constraint.create({ bodyA: torso, bodyB: rightLeg, pointA: { x: 10, y: 40 }, pointB: { x: 0, y: -30 }, stiffness: 1.0, length: 10 });

        ragdoll = Matter.Composite.create({ bodies: [head, torso, leftArm, rightArm, leftLeg, rightLeg], constraints: [neck, leftShoulder, rightShoulder, leftHip, rightHip] });
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

    const update = (ground) => {
        if (!ragdoll) return;
        const playerTorso = ragdoll.bodies[1];
        const playerLeftLeg = ragdoll.bodies[4];
        const playerRightLeg = ragdoll.bodies[5];
        const forceMagnitude = 0.005;
        const jumpForce = 0.2; // Further increased jump force
        const maxSpeed = 5;
        // --- Character Stabilization ---
        // Keep the torso upright
        Matter.Body.setAngle(playerTorso, 0);

        if (keys['KeyA'] && playerTorso.velocity.x > -maxSpeed) {
            Matter.Body.applyForce(playerLeftLeg, playerLeftLeg.position, { x: -forceMagnitude, y: 0 });
            Matter.Body.applyForce(playerRightLeg, playerRightLeg.position, { x: -forceMagnitude, y: 0 });
        }
        if (keys['KeyD'] && playerTorso.velocity.x < maxSpeed) {
            Matter.Body.applyForce(playerLeftLeg, playerLeftLeg.position, { x: forceMagnitude, y: 0 });
            Matter.Body.applyForce(playerRightLeg, playerRightLeg.position, { x: forceMagnitude, y: 0 });
        }
        if (keys['KeyW'] || keys['Space']) {
            const feetY = Math.max(playerLeftLeg.position.y, playerRightLeg.position.y);
            if (feetY > ground.position.y - 40) {
                Matter.Body.applyForce(playerTorso, playerTorso.position, { x: 0, y: -jumpForce });
                Matter.Body.applyForce(playerLeftLeg, playerLeftLeg.position, { x: 0, y: -jumpForce * 0.5 });
                Matter.Body.applyForce(playerRightLeg, playerRightLeg.position, { x: 0, y: -jumpForce * 0.5 });
            }
        }
    };

    return {
        create: create,
        initControls: initControls,
        update: update
    };
})();
