importScripts('cannon.min.js')

let updateGravityData = null
let phyScale = 500

var world = new CANNON.World()

self.onmessage = function(e) {
    const { data } = e
    const { type, payload } = data
    
    if(type == 'updateGravity') {
        updateGravity(payload)
    } else if(type == 'updateMaze') {
        updateMaze(payload)
    } else if(type == 'addBall') {
        addBall(payload)
    } else if(type == 'start') {


        setInterval(loop, 1000/60)
        let lastTime = Date.now()
        function loop() {
            if(updateGravityData) {
                world.gravity.set(updateGravityData.x, updateGravityData.y, updateGravityData.z)
                updateGravityData = null
            }
            
            let now = Date.now()
            world.step(1.0 / 60.0, now - lastTime, 1)
            lastTime = now
        
            if(ballBody) {
                const {x, y, z} = ballBody.position
                self.postMessage({type: 'updateBall', payload: {x:x*phyScale, y:y*phyScale, z:z*phyScale}})
            }
        }

    }
}

function updateGravity(data) {
    updateGravityData = data
}

function updateMaze(boxes) {
    for(let c of boxes) {
        if(c.type == 'box') {
            const {pos, shape, quat} = c
            var boxBody = new CANNON.Body({
                mass: 0,
                position: new CANNON.Vec3(pos.x/phyScale, pos.y/phyScale, pos.z/phyScale), // m
                shape: new CANNON.Box(new CANNON.Vec3(shape.width/phyScale,shape.height/phyScale,shape.depth/phyScale)),
                quaternion: new CANNON.Quaternion(quat.x, quat.y, quat.z, quat.w)
             });
             world.addBody(boxBody);
        }
    }
}
let ballBody = null
function addBall(data) {
    const {x, y, z, r} = data
    var sphereBody = new CANNON.Body({
        mass: 5, // kg
        position: new CANNON.Vec3(x/phyScale, y/phyScale, z/phyScale), // m
        shape: new CANNON.Sphere(r/phyScale)
     });
     world.addBody(sphereBody);
     ballBody = sphereBody
}


self.postMessage({ type: 'ready' })