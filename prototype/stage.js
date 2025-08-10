const Stage = (() => {
    const create = (stageId, world, width, height) => {
        // Common elements
        const ground = Matter.Bodies.rectangle(width / 2, height - 30, width, 60, { isStatic: true, friction: 0.3 });
        const leftWall = Matter.Bodies.rectangle(-30, height / 2, 60, height, { isStatic: true });
        const rightWall = Matter.Bodies.rectangle(width + 30, height / 2, 60, height, { isStatic: true });
        const topWall = Matter.Bodies.rectangle(width / 2, -30, width, 60, { isStatic: true });
        Matter.Composite.add(world, [ground, leftWall, rightWall, topWall]);

        let targetBox, goalZone;

        switch (stageId) {
            case 1:
                // --- Stage 1: The Wall ---
                targetBox = Matter.Bodies.rectangle(450, height - 65, 60, 60, {
                    friction: 0.3,
                    render: { fillStyle: '#C7B0E8' }
                });
                const obstacleBox1 = Matter.Bodies.rectangle(550, height - 65, 80, 80, {
                    friction: 0.3,
                    render: { fillStyle: '#E8C7B0' }
                });
                const obstacleBox2 = Matter.Bodies.rectangle(750, height - 65, 80, 80, {
                    friction: 0.3,
                    render: { fillStyle: '#E8C7B0' }
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
                // Seesaw
                const seesawPlank = Matter.Bodies.rectangle(width / 2, height - 150, 500, 20);
                const seesawPivot = Matter.Bodies.rectangle(width / 2, height - 150, 20, 20, {
                    isStatic: true,
                    render: { fillStyle: '#86776B' }
                });
                Matter.Composite.add(world, [seesawPlank, seesawPivot]);
                const seesawConstraint = Matter.Constraint.create({
                    bodyA: seesawPlank,
                    pointB: { x: seesawPivot.position.x, y: seesawPivot.position.y },
                    stiffness: 1,
                    length: 0
                });
                Matter.Composite.add(world, seesawConstraint);

                // Fan area (visual only in stage.js, logic in main.js)
                const fanArea = Matter.Bodies.rectangle(150, height - 90, 200, 120, {
                    isStatic: true,
                    isSensor: true,
                    render: { fillStyle: 'rgba(135, 206, 235, 0.4)' } // Sky blue
                });
                Matter.Composite.add(world, fanArea);

                // Some boxes to play with
                const box1 = Matter.Bodies.rectangle(width / 2 - 100, 100, 50, 50);
                const box2 = Matter.Bodies.rectangle(width / 2 - 150, 150, 50, 50);
                Matter.Composite.add(world, [box1, box2]);

                // For this stage, we don't have a specific target/goal
                targetBox = Matter.Bodies.rectangle(-100, -100, 1, 1, {isStatic: true}); // Out of sight
                goalZone = Matter.Bodies.rectangle(-100, -100, 1, 1, {isStatic: true, isSensor: true});
                break;
        }
        let fanArea = null; // Fan area is specific to stage 2
        if (stageId === 2) {
             fanArea = Matter.Composite.allBodies(world).find(body => body.render.fillStyle === 'rgba(135, 206, 235, 0.4)');
        }

        return { ground, targetBox, goalZone, fanArea };
    };

    return {
        create: create
    };
})();
