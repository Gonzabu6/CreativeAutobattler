const Stage = (() => {
    const create = (stageId, world, width, height) => {
        // Common elements
        const ground = Matter.Bodies.rectangle(width / 2, height - 30, width, 60, { isStatic: true, friction: 0.5 });
        const leftWall = Matter.Bodies.rectangle(-30, height / 2, 60, height, { isStatic: true });
        const rightWall = Matter.Bodies.rectangle(width + 30, height / 2, 60, height, { isStatic: true });
        const topWall = Matter.Bodies.rectangle(width / 2, -30, width, 60, { isStatic: true });
        Matter.Composite.add(world, [ground, leftWall, rightWall, topWall]);

        let targetBox, goalZone, fanVent;

        switch (stageId) {
            case 3: {
                // --- Stage 3: Breakable Wall ---
                const wallStack = Matter.Composites.stack(width / 2, height - 250, 4, 6, 0, 0, (x, y) => {
                    return Matter.Bodies.rectangle(x, y, 50, 30, {
                        render: { fillStyle: '#b08a76' }
                    });
                });
                wallStack.bodies.forEach(b => { b.label = 'brick'; });
                wallStack.constraints.forEach(c => { c.label = 'brickConstraint'; });
                Matter.Composite.add(world, wallStack);

                // Add a heavy ball to break the wall
                const heavyBall = Matter.Bodies.circle(400, height - 300, 40, { density: 0.05, render: {fillStyle: '#5D4037'} });
                Matter.Composite.add(world, heavyBall);

                targetBox = Matter.Bodies.rectangle(width - 250, height - 65, 60, 60, {
                    friction: 0.3,
                    render: { fillStyle: '#C7B0E8' } // Light purple
                });
                goalZone = Matter.Bodies.rectangle(width - 150, height - 90, 300, 120, {
                    isStatic: true,
                    isSensor: true,
                    render: { fillStyle: 'rgba(144, 238, 144, 0.5)' }
                });
                Matter.Composite.add(world, [targetBox, goalZone]);
                break;
            }
            case 1:
                // --- Stage 1: The Wall ---
                targetBox = Matter.Bodies.rectangle(450, height - 65, 60, 60, {
                    friction: 0.3,
                    render: { fillStyle: '#C7B0E8' } // Light purple
                });
                const obstacleBox1 = Matter.Bodies.rectangle(550, height - 65, 80, 80, {
                    friction: 0.3,
                    render: { fillStyle: '#E8C7B0' } // Light orange
                });
                const obstacleBox2 = Matter.Bodies.rectangle(750, height - 65, 80, 80, {
                    friction: 0.3,
                    render: { fillStyle: '#E8C7B0' } // Light orange
                });
                const wall = Matter.Bodies.rectangle(600, height - 130, 20, 200, { isStatic: true });
                goalZone = Matter.Bodies.rectangle(width - 150, height - 90, 300, 120, {
                    isStatic: true,
                    isSensor: true,
                    render: { fillStyle: 'rgba(144, 238, 144, 0.5)' }
                });
                Matter.Composite.add(world, [targetBox, obstacleBox1, obstacleBox2, wall, goalZone]);
                break;

            case 2:
                // --- Stage 2: The Playground ---
                const seesawGroup = Matter.Body.nextGroup(true);
                const seesawPlank = Matter.Bodies.rectangle(width / 2, height - 200, 500, 20, { collisionFilter: { group: seesawGroup } });
                const seesawPivot = Matter.Bodies.rectangle(width / 2, height - 180, 40, 20, { // Raised pivot
                    isStatic: true,
                    render: { fillStyle: '#86776B' },
                    collisionFilter: { group: seesawGroup }
                });
                const seesawConstraint = Matter.Constraint.create({
                    bodyA: seesawPlank, bodyB: seesawPivot, stiffness: 0.9, length: 0
                });

                fanVent = Matter.Bodies.rectangle(150, height - 45, 200, 30, {
                    isStatic: true, isSensor: true,
                    render: { fillStyle: 'rgba(135, 206, 235, 0.4)' }
                });
                const fanWallLeft = Matter.Bodies.rectangle(50, height - 90, 20, 120, { isStatic: true });
                const fanWallRight = Matter.Bodies.rectangle(250, height - 90, 20, 120, { isStatic: true });

                const box1 = Matter.Bodies.rectangle(width / 2 - 100, 100, 50, 50, {friction: 0.3});
                const box2 = Matter.Bodies.rectangle(width / 2 - 150, 150, 50, 50, {friction: 0.3});

                Matter.Composite.add(world, [seesawPlank, seesawPivot, seesawConstraint, fanVent, fanWallLeft, fanWallRight, box1, box2]);

                targetBox = Matter.Bodies.rectangle(-100, -100, 1, 1, {isStatic: true});
                goalZone = Matter.Bodies.rectangle(-100, -100, 1, 1, {isStatic: true, isSensor: true});
                break;
        }

        return { ground, targetBox, goalZone, fanVent };
    };

    return {
        create: create
    };
})();
