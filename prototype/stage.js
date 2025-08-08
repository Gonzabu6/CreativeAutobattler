const Stage = (() => {
    let targetBox;
    let goalZone;

    const create = (world, width, height) => {
        // Ground
        const ground = Matter.Bodies.rectangle(width / 2, height - 30, width, 60, { isStatic: true, friction: 0.3 });

        // Outer walls
        const leftWall = Matter.Bodies.rectangle(-30, height / 2, 60, height, { isStatic: true });
        const rightWall = Matter.Bodies.rectangle(width + 30, height / 2, 60, height, { isStatic: true });
        const topWall = Matter.Bodies.rectangle(width / 2, -30, width, 60, { isStatic: true });

        Matter.Composite.add(world, [ground, leftWall, rightWall, topWall]);

        // Stage-specific elements
        targetBox = Matter.Bodies.rectangle(350, height - 65, 60, 60, {
            friction: 0.3,
            render: { fillStyle: '#C7B0E8' } // Light purple
        });
        const obstacleBox = Matter.Bodies.rectangle(800, height - 65, 80, 80, {
            friction: 0.3,
            render: { fillStyle: '#E8C7B0' } // Light orange
        });
        const wall = Matter.Bodies.rectangle(600, height - 130, 20, 200, { isStatic: true }); // Lowered wall
        goalZone = Matter.Bodies.rectangle(width - 150, height - 90, 300, 120, {
            isStatic: true,
            isSensor: true,
            render: { fillStyle: 'rgba(144, 238, 144, 0.5)' }
        });

        Matter.Composite.add(world, [targetBox, obstacleBox, wall, goalZone]);

        return { ground, targetBox, goalZone };
    };

    return {
        create: create
    };
})();
