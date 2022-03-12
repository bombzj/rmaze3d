importScripts('./ammo.js');

let updateGravityData = null
let phyScale = 10   // smaller scale cause problem in Ammo.js


function updateGravity(data) {
    updateGravityData = data
}

Ammo().then(function(Ammo) {

    let ballBody = null
    var transform = new Ammo.btTransform()
        // Bullet-interfacing code

    var collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
    var dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
    var overlappingPairCache = new Ammo.btDbvtBroadphase();
    var solver = new Ammo.btSequentialImpulseConstraintSolver();
    var dynamicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);

	var _vec3_1 = new Ammo.btVector3(0,0,0);
	var _vec3_2 = new Ammo.btVector3(0,0,0);
	var _vec3_3 = new Ammo.btVector3(0,0,0);

    function updateMaze(boxes) {
        for (let c of boxes) {
            if (c.type == 'box') {
                const { pos, shape, quat } = c

                var startTransform = new Ammo.btTransform(
                    new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w),
                    new Ammo.btVector3(pos.x / phyScale, pos.y / phyScale, pos.z / phyScale)
                );
                var mass = 0;
                var localInertia = new Ammo.btVector3(0, 0, 0);
                let boxShape = new Ammo.btBoxShape(new Ammo.btVector3(shape.width / phyScale, shape.height / phyScale, shape.depth / phyScale));
                boxShape.calculateLocalInertia(mass, localInertia);
    
                var myMotionState = new Ammo.btDefaultMotionState(startTransform);

                
                var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, myMotionState, boxShape, localInertia);
                var body = new Ammo.btRigidBody(rbInfo);
    
                dynamicsWorld.addRigidBody(body);

            } else if(c.type == 'mesh') {
                const { pos, triangles, quat } = c

                var triangle_mesh = new Ammo.btTriangleMesh;
                if (!triangles.length) return false
    
                for ( i = 0; i < triangles.length; i++ ) {
                    let triangle = triangles[i];
    
                    _vec3_1.setX(triangle[0].x / phyScale);
                    _vec3_1.setY(triangle[0].y / phyScale);
                    _vec3_1.setZ(triangle[0].z / phyScale);
    
                    _vec3_2.setX(triangle[1].x / phyScale);
                    _vec3_2.setY(triangle[1].y / phyScale);
                    _vec3_2.setZ(triangle[1].z / phyScale);
    
                    _vec3_3.setX(triangle[2].x / phyScale);
                    _vec3_3.setY(triangle[2].y / phyScale);
                    _vec3_3.setZ(triangle[2].z / phyScale);
    
                    triangle_mesh.addTriangle(
                        _vec3_1,
                        _vec3_2,
                        _vec3_3,
                        true
                    );
                }
    
                let shape = new Ammo.btBvhTriangleMeshShape(
                    triangle_mesh,
                    true,
                    true
                );


                var startTransform = new Ammo.btTransform(
                    new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w),
                    new Ammo.btVector3(pos.x / phyScale, pos.y / phyScale, pos.z / phyScale)
                );
                var mass = 0;
                var localInertia = new Ammo.btVector3(0, 0, 0);
    
                var myMotionState = new Ammo.btDefaultMotionState(startTransform);

                
                var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, myMotionState, shape, localInertia);
                var body = new Ammo.btRigidBody(rbInfo);
    
                dynamicsWorld.addRigidBody(body);

            }
        }
    }
    
    function addBall(data) {
        const { x, y, z, r } = data

        var startTransform = new Ammo.btTransform(
            new Ammo.btQuaternion(0, 0, 0, 1),
            new Ammo.btVector3(x / phyScale, y / phyScale, z / phyScale)
        );
        var mass = 0.5;
        var localInertia = new Ammo.btVector3(0, 0, 0);
        let shape = new Ammo.btSphereShape(r / phyScale);
        shape.calculateLocalInertia(mass, localInertia);

        var myMotionState = new Ammo.btDefaultMotionState(startTransform);

        
        var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, myMotionState, shape, localInertia);
        var body = new Ammo.btRigidBody(rbInfo);

        dynamicsWorld.addRigidBody(body);
        body.activate()
        body.setCcdMotionThreshold(r / phyScale);
        // body.setCcdSweptSphereRadius(r / phyScale);
        ballBody = body
    }


    var transform = new Ammo.btTransform(); // taking this out of readBulletObject reduces the leaking

    var meanDt = 0,
        meanDt2 = 0,
        frame = 1;

    function simulate(dt) {
        ballBody.activate()
        if (updateGravityData) {
            dynamicsWorld.setGravity(new Ammo.btVector3(updateGravityData.x, updateGravityData.y, updateGravityData.z));
            updateGravityData = null
        }

        dt = dt || 1;

        dynamicsWorld.stepSimulation(dt / 1000, 2);

        var alpha;
        if (meanDt > 0) {
            alpha = Math.min(0.1, dt / 1000);
        } else {
            alpha = 0.1; // first run
        }
        meanDt = alpha * dt + (1 - alpha) * meanDt;

        var alpha2 = 1 / frame++;
        meanDt2 = alpha2 * dt + (1 - alpha2) * meanDt2;

        if (ballBody) {
            ballBody.getMotionState().getWorldTransform(transform);
            var origin = transform.getOrigin();
            self.postMessage({ type: 'updateBall', payload: { x: origin.x() * phyScale, y: origin.y() * phyScale, z: origin.z() * phyScale } })
        }

    }

    var interval = null;

    onmessage = function(event) {
        const { data } = event
        const { type, payload } = data

        if (type == 'updateGravity') {
            updateGravity(payload)
        } else if (type == 'updateMaze') {
            updateMaze(payload)
        } else if (type == 'addBall') {
            addBall(payload)
        } else if (type == 'start') {


            frame = 1;
            meanDt = meanDt2 = 0;
    
            var last = Date.now();
    
            function mainLoop() {
                var now = Date.now();
                simulate(now - last);
                last = now;
            }
            if (interval) clearInterval(interval);
            interval = setInterval(mainLoop, 1000 / 60);

        }

    }

    self.postMessage({ type: 'ready' })
});