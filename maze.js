
var b2d, world, phyScale = 500
var myQueryCallback
var mouseJointGroundBody
const wallColor = 0x2EF2AA
let r90 = Math.PI / 2

function loadWorld() {
    // if(world) {
    //     b2d.destroy(world)
    //     for( var i = scene.children.length - 1; i >= 0; i--) { 
    //         obj = scene.children[i];
    //         scene.remove(obj); 
    //     }
    // }
    if(!level.lines) level.lines = []
    if(!level.holes2) level.holes2 = []

    let jsonString = localStorage.getItem("rmaze3"+curLevel)
    if(jsonString) {
        let tmp = JSON.parse(jsonString)
        if(tmp) {
            level.lines = tmp.lines
            level.holes2 = tmp.holes2
        }
    }

    level.row = level.wallV.length
    level.column = level.wallH[0].length
    let tlen = level.column * wallLength
    let tlenh = tlen / 2 - wallLength
    wallLeft = -tlen / 2
    wallTop = -tlen / 2
    // camera.position.set(tlen/2, -tlen/2, 500)
    camera.position.set(-00, -00, 800)
    camera.lookAt(0,0,0)

    // debug
    // level.ball.x = level.debug.x
    // level.ball.y = level.debug.y

    // addWall(wallLeft + level.column * wallLength/2, wallTop, level.column * wallLength, wallWidth )
    // addWall(wallLeft + level.column * wallLength/2, wallTop + level.row * wallLength, level.column * wallLength, wallWidth)
    // addWall(wallLeft + level.column * wallLength, wallTop + level.row * wallLength/2, wallWidth, level.row * wallLength)
    // addWall(wallLeft, wallTop + level.row * wallLength/2, wallWidth, level.row * wallLength)
    let rotates = [
        [1, 0, 0, 0],
        [0, 1, 0, -r90],
        [1, 0, 0, r90, -r90],
        [0, 1, 0, r90, r90*2],
        [1, 0, 0, -r90, r90],
        [1, 0, 0, r90 * 2, -r90],
    ]
    for(let sid = 0;sid < 6;sid++) {
        let parent = new THREE.Object3D()
        scene.add( parent );
        let level = levels[sid]
        for(let i = 0;i < level.wallH.length;i++) {
            let wall2 = level.wallH[i]
            for(let j = 0;j < wall2.length;j++) {
                if(wall2[j] == 1) {
                    parent.add(addWall(wallLeft + (j+0.5) * wallLength, -wallTop - (i+1) * wallLength, wallLength/2+tlenh+explodeWall, wallLength, wallWidth, wallDepth, undefined, true, false))
                }
            }
        }

        for(let i = 0;i < level.wallV.length;i++) {
            let wall2 = level.wallV[i]
            for(let j = 0;j < wall2.length;j++) {
                if(wall2[j] == 1) {
                    parent.add(addWall(wallLeft + (j+1) * wallLength, -wallTop - (i + 0.5) * wallLength, wallLength/2+tlenh+explodeWall, wallWidth, wallLength, wallDepth, undefined, true, false))
                }
            }
        }

        for(let i = 0;i < level.floor.length;i++) {
            let floor2 = level.floor[i]
            for(let j = 0;j < floor2.length;j++) {
                if(floor2[j] == 1) {
                    parent.add(addWall(wallLeft + (j+0.5) * wallLength, -wallTop - (i + 0.5) * wallLength, tlenh+explodeWall, wallLength, wallLength, wallWidth, undefined, false, true))
                } else if(floor2[j] == 2) {
                    parent.add(addWallHole(wallLeft + (j+0.5) * wallLength, -wallTop - (i + 0.5) * wallLength, tlenh+explodeWall, wallLength, wallLength, wallWidth, undefined, false, true))
                } else if(floor2[j] == 3) {
                    parent.add(addWallHole(wallLeft + (j+0.5) * wallLength, -wallTop - (i + 0.5) * wallLength, tlenh+explodeWall, wallLength, wallLength, wallWidth, undefined, false, true))
                    parent.add(addWall(wallLeft + (j+0.5) * wallLength, -wallTop - (i + 0.5) * wallLength, tlenh+explodeWall-wallLength/2, wallLength, wallLength, wallWidth, undefined, false, true))
                }
            }
        }

        parent.add(addWall(0, 0, tlenh+wallLength, tlen, tlen, wallWidth, 0xffffff, false, false, 0.3))

        // let holes = level.holes
        // for(let hole of holes) {
        //     let x = hole[0]
        //     let y = hole[1]
        //     let cylinder = addHole(wallLeft + (x+0.5) * wallLength, -wallTop - (y+0.5) * wallLength, tlenh+explodeWall, wallWidth+5, wallLength / 2.7)
        //     parent.add(cylinder)
        // }

        let r = rotates[sid]
        if(r[4]) {
            parent.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), r[4])
        }
        let pos = new THREE.Vector3()
        let quat = new THREE.Quaternion()
        parent.rotateOnWorldAxis(new THREE.Vector3(r[0], r[1], r[2]), r[3])
        for(let c of parent.children) {
            let g = c.geometry
            if(g.type == 'BoxGeometry') {
                c.getWorldPosition(pos)
                c.getWorldQuaternion(quat)
                var boxBody = new CANNON.Body({
                    mass: 0,
                    position: new CANNON.Vec3(pos.x/phyScale, pos.y/phyScale, pos.z/phyScale), // m
                    shape: new CANNON.Box(new CANNON.Vec3(g.parameters.width/2/phyScale,g.parameters.height/2/phyScale,g.parameters.depth/2/phyScale)),
                    quaternion: new CANNON.Quaternion(quat.x, quat.y, quat.z, quat.w)
                 });
                 world.addBody(boxBody);
            }
        }
    }




    addExit(wallLeft + (level.exit.x+0.5) * wallLength, wallTop + (level.exit.y+0.5) * wallLength, 10, 10)
    ballSprite = []
    for(let ball of level.ball) {
        ballSprite.push(addBall(wallLeft + (ball.x+0.5) * wallLength, -wallTop - (ball.y+0.5) * wallLength, tlenh + wallLength/2, 16))
    }

    for(let line of level.lines) {
        let startPos = line[0]
        let lineSpirit = new PIXI.Graphics()
        lineSpirit.lineStyle(2, 0x0)
        lineSpirit.moveTo(0, 0)
        let lastPos = startPos
        for(let pos of line.slice(1)) {
            let dx = pos.x - startPos.x
            let dy = pos.y - startPos.y
            lineSpirit.lineTo(dx, dy)
            addLineWall(lastPos, pos)
            lastPos = pos
        }
        lineSpirit.x = startPos.x
        lineSpirit.y = startPos.y
        app.stage.addChild(lineSpirit)
    }

    // world.SetContactListener( listener )
    mouseDown = null
    mouseJoint = null
    // mouseJointGroundBody = world.CreateBody( new b2d.b2BodyDef() )
}

var listener
function init() {
    // listener = new b2d.JSContactListener();
    // listener.BeginContact = function (contactPtr) {
    //     var contact = b2d.wrapPointer( contactPtr, b2d.b2Contact )
    //     var fixtureA = contact.GetFixtureA()
    //     var fixtureB = contact.GetFixtureB()
    //     if(fixtureA.isExit) {
    //         if(fixtureB.isBall) {
    //             for(let ball of ballSprite) {
    //                 ball.visible = false
    //             }
    //             stopWorld()
    //             setTimeout(nextLevel, 200)
    //         }
    //     }
    // }
    // listener.EndContact = function() {}
    // listener.PreSolve = function() {}
    // listener.PostSolve = function() {}

    window.addEventListener('mousemove', function(e) {
        let pos = {x: e.clientX - renderer.domElement.offsetLeft, y: e.clientY - renderer.domElement.offsetTop}
        onMouseMove(pos);
        if(e.buttons) {
            onMoveCamera(e)
        }
    }, false);
    
    window.addEventListener('mousedown', function(e) {
        let pos = {x: e.clientX - renderer.domElement.offsetLeft, y: e.clientY - renderer.domElement.offsetTop}
        onMouseDown(pos);
    }, false);

    window.addEventListener('mouseup', function(e) {
        let pos = {x: e.clientX - renderer.domElement.offsetLeft, y: e.clientY - renderer.domElement.offsetTop}
        onMouseUp(pos);
    }, false);
    
    window.addEventListener('touchstart', function(e) {
        if(editMode) {
            let t = e.changedTouches[0]
            let pos = {x: t.clientX - renderer.domElement.offsetLeft, y: t.clientY - renderer.domElement.offsetTop}
            onMouseDown(pos);
        }
    }, false);
    window.addEventListener('touchmove', function(e) {
        if(editMode) {
            let t = e.changedTouches[0]
            let pos = {x: t.clientX - renderer.domElement.offsetLeft, y: t.clientY - renderer.domElement.offsetTop}
            onMouseMove(pos);
        }
    }, false);
    window.addEventListener('touchend', function(e) {
        if(editMode) {
            let t = e.changedTouches[0]
            let pos = {x: t.clientX - renderer.domElement.offsetLeft, y: t.clientY - renderer.domElement.offsetTop}
            onMouseUp(pos);
        }
    }, false);
    // window.addEventListener('mouseout', function(e) {
    //     onMouseOut(evt.data.global);
    // }, false);
}


var curLevel
var level
function nextLevel() {
    curLevel++
    if(curLevel >= levels.length) {
        resetLevel()
    } else {
        level = levels[curLevel]
        loadWorld()
    }
}
function resetLevel() {
    curLevel = initLevel
    level = levels[curLevel]
    loadWorld()
}


function addBall(x, y, z, r) {
    // let shape = new b2d.b2CircleShape();
    // shape.set_m_radius(r/phyScale);

    // let bd = new b2d.b2BodyDef();
    // bd.set_type(b2d.b2_dynamicBody)
    // bd.set_position(new b2d.b2Vec2(x/phyScale , y/phyScale))
    // bd.allowSleep = false
    // // bd.set_friction(0.1)
    // let body = world.CreateBody(bd)
    // let fx = body.CreateFixture(shape, 10.0)
    // fx.isBall = true
    // fx.SetRestitution(0.25)
    // body.SetAwake(true)
    var sphereBody = new CANNON.Body({
        mass: 5, // kg
        position: new CANNON.Vec3(x/phyScale, y/phyScale, z/phyScale), // m
        shape: new CANNON.Sphere(r/phyScale)
     });
     world.addBody(sphereBody);

    const geometry = new THREE.SphereGeometry( r, 32, 16 );
    const material = new THREE.MeshPhongMaterial( { color: 0xAAAAAA, specular: 0x666666, shininess: 100 } );
    const sphere = new THREE.Mesh( geometry, material );
    sphere.body = sphereBody
    sphere.position.set(x, y, z)
    sphere.castShadow = true
    scene.add( sphere )

    return sphere
}

function addHiddenWall(x, y, z, w, h, d) {
    var boxBody = new CANNON.Body({
        mass: 0,
        position: new CANNON.Vec3(pos.x/phyScale, pos.y/phyScale, pos.z/phyScale), // m
        shape: new CANNON.Box(new CANNON.Vec3(g.parameters.width/2/phyScale,g.parameters.height/2/phyScale,g.parameters.depth/2/phyScale)),
        quaternion: new CANNON.Quaternion(quat.x, quat.y, quat.z, quat.w)
    });
    world.addBody(boxBody);
}

function addWall(x, y, z, w, h, d, color = wallColor, castShadow = false, receiveShadow = false, opacity = 1) {
    const geometry = new THREE.BoxGeometry( w, h, d )
    const material = new THREE.MeshPhongMaterial( {color: color} )
    const box = new THREE.Mesh( geometry, material )
    box.position.set( x, y, z )
    if(castShadow) {
        box.castShadow = true
    }
    if(receiveShadow) {
        box.receiveShadow = true
    }
    if(opacity < 1) {
        material.transparent = true
        material.opacity = opacity
    }
    return box
}

function addWallHole(x, y, z, w, h, d, color = wallColor, castShadow = false, receiveShadow = false) {
    const geometry = new THREE.BoxGeometry( w, h, d )
    const box = new THREE.Mesh( geometry )

    const size = wallLength / 2.7
    const geometry2 = new THREE.CylinderGeometry( size, size, 2*d+0.1, 16 )
    const cy = new THREE.Mesh( geometry2 )
    cy.rotateX(r90)

    box.updateMatrix()
    cy.updateMatrix()
    let bspA = CSG.fromMesh( box )
    let bspB = CSG.fromMesh( cy )
    let bspC = bspA.subtract( bspB )
    let result = CSG.toMesh( bspC, box.matrix )
    result.material = new THREE.MeshPhongMaterial( {color: color} )
    result.position.set(x, y, z)
    if(castShadow) {
        result.castShadow = true
    }
    if(receiveShadow) {
        result.receiveShadow = true
    }
    return result
}

function addLineWall(pos1, pos2) {
    let x = pos1.x, y = pos1.y
    let x2 = pos2.x, y2 = pos2.y
    let dx = x2 - x, dy = y2 - y
    let shape = new b2d.b2EdgeShape()
    shape.Set(new b2d.b2Vec2(0, 0), new b2d.b2Vec2(dx/phyScale, dy/phyScale))
    let bd = new b2d.b2BodyDef()
    bd.set_position(new b2d.b2Vec2(x/phyScale, y/phyScale))
    let body = world.CreateBody(bd)
    let fx = body.CreateFixture(shape, 5.0)
    fx.isExit = false
}

function addExit(x, y, w, h) {
    // let shape = new b2d.b2PolygonShape()
    // shape.SetAsBox(w/phyScale/2, h/phyScale/2)
    // let bd = new b2d.b2BodyDef()
    // bd.set_position(new b2d.b2Vec2(x/phyScale, y/phyScale))
    // let body = world.CreateBody(bd)
    // let fx = body.CreateFixture(shape, 5.0)
    // fx.isExit = true

    // var boundary = new PIXI.Graphics()
    // boundary.beginFill(0xff0000)
    // boundary.drawRect(x, y, w, h)
    // boundary.endFill()
    // boundary.x = -w/2
    // boundary.y = -h/2
    // app.stage.addChild(boundary)
}

function addHole(x, y, z, d, size, color = 0x0) {

    const geometry = new THREE.CylinderGeometry( size, size, d, 16 )
    const material = new THREE.MeshPhongMaterial( {color: color} )
    const cy = new THREE.Mesh( geometry, material )
    cy.rotateX(r90)
    cy.position.set( x, y, z )
    return cy

    // var ball = new PIXI.Graphics()
    // ball.beginFill(0x0F4F36)
    // ball.lineStyle(2, 0x0F4F36)
    // ball.drawCircle(0, 0, size, size)
    // ball.endFill()
    // ball.x = x
    // ball.y = y
    // app.stage.addChild(ball)
}
const vectorZ = new THREE.Vector3(0,0,1)
function updateWorld() {
    // camera.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), -0.01)
    if(moveCamera) {
        let axis = new THREE.Vector3(moveCamera.x - moveCamera.fromX, -moveCamera.y + moveCamera.fromY, 0)
        let axisLen = axis.length() / 400
        if(axisLen > 0.00001) {
            axis.normalize()
            axis.cross(vectorZ)
            pivotCamera.localToWorld(axis)
            pivotCamera.rotateOnWorldAxis(axis, axisLen)
            moveCamera.fromX = moveCamera.x
            moveCamera.fromY = moveCamera.y
            // let lightVector = new THREE.Vector3(1, 1, 2 ).normalize()
            // pivotCamera.localToWorld(lightVector)
            // light.position.set(lightVector)
            let dir = new THREE.Vector3()
            camera.getWorldDirection(dir)
            dir.multiplyScalar(9.82)
            world.gravity.set(dir.x, dir.y, dir.z) // m/s²
        }
    }
    if(!world.stop && !editMode) {
        // world.Step(1/60, 3, 2)
        for(let ball of ballSprite) {
            let pos = ball.body.position
            ball.position.x = pos.x*phyScale
            ball.position.y = pos.y*phyScale
            ball.position.z = pos.z*phyScale
    
            for(let hole of level.holes.concat(level.holes2)) {
                let dx = wallLeft + (hole[0]+0.5) * wallLength - ball.x
                let dy = wallTop + (hole[1]+0.5) * wallLength - ball.y
                let r = wallLength / 2.7
                if(dx*dx + dy*dy < r*r) {
                    for(let ball of ballSprite) {
                        ball.visible = false
                    }
                    stopWorld()
                    setTimeout(function() {
                        resetLevel()
                    }, 2000)
                    return
                }
            }
        }
    }
}

function stopWorld() {
    world.stop = true
    world.SetContactListener( null )
}


var levels = [
    {       // 1
        wallH: [
            [0,1,1,0,0,1,0,0,],
            [0,0,0,1,1,1,0,0,],
            [0,0,0,0,1,1,1,1,],
            [1,1,1,1,1,1,0,0,],
            [0,0,1,1,1,1,1,1,],
            [0,0,0,1,0,0,0,0,],
            [0,0,0,0,1,0,1,1,],
        ],
        wallV: [
            [0,1,0,0,0,0,1,],
            [0,0,0,0,0,0,0,],
            [0,1,1,0,0,0,1,],
            [0,1,0,0,0,0,1,],
            [1,0,0,0,0,0,1,],
            [1,1,0,0,1,0,0,],
            [1,0,1,0,0,0,1,],
            [0,0,0,0,0,0,0,],
        ],
        floor: [
            [1,1,1,1,0,1,1,1,],
            [1,1,1,1,1,1,1,1,],
            [0,1,2,1,1,1,1,1,],
            [1,1,1,1,1,1,1,1,],
            [1,1,1,1,1,1,1,0,],
            [1,1,1,1,1,1,1,1,],
            [1,1,1,1,1,1,2,1,],
            [1,1,0,0,1,1,1,1,],
        ],
        holes: [
            [6, 6],
            [2, 2.5],
        ],
        ball: [{x: 7, y: 7}],
        exit: {x: -0.4, y: 3},
        debug: {x: 1, y: 3, dx: -5, dy: 0}
    }, 
    {       // 2
        wallH: [
            [0,1,1,0,0,1,0,0,],
            [0,0,1,0,0,1,0,1,],
            [1,0,0,1,1,1,1,0,],
            [0,0,1,0,1,1,0,0,],
            [1,1,1,1,1,1,0,0,],
            [0,0,0,1,1,0,0,0,],
            [0,0,0,0,0,0,0,0,],
        ],
        wallV: [
            [0,0,0,1,0,1,0,],
            [0,0,0,1,0,0,0,],
            [0,1,0,0,1,0,0,],
            [0,1,0,0,0,0,1,],
            [1,0,0,0,0,0,0,],
            [0,0,0,0,0,0,0,],
            [0,1,0,0,0,1,0,],
            [0,0,0,0,0,0,0,],
        ],
        floor: [
            [0,1,1,1,1,1,1,0,],
            [0,1,1,1,1,1,1,0,],
            [0,1,2,1,1,1,1,1,],
            [1,1,1,1,1,1,1,0,],
            [1,1,1,1,2,1,1,0,],
            [0,1,1,2,1,1,1,0,],
            [0,1,1,1,1,1,1,0,],
            [0,0,0,0,0,0,0,0,],
        ],
        holes: [
            [2, 2.5],
            [4.5, 4],
            [3.5, 5],
        ],
        ball: [{x: 7, y: 3}],
        exit: {x: 1, y: 7.4},
        debug: {x: 1, y: 6, dx: 0, dy: 5}
    }, 
    {       // 3
        wallH: [
            [0,0,0,0,0,0,0,0],
            [0,0,0,1,0,0,0,0],
            [0,1,1,1,1,1,0,0],
            [1,0,1,0,1,0,0,1],
            [0,0,1,1,1,1,1,1],
            [1,0,1,0,1,0,0,1],
            [0,1,0,1,0,1,0,0],
        ],
        wallV: [
            [0,0,0,0,0,0,0],
            [0,1,0,0,1,0,0],
            [0,0,1,0,0,1,0],
            [0,0,1,0,0,1,0],
            [1,0,0,0,0,0,0],
            [0,1,0,0,0,1,0],
            [0,0,0,1,0,0,0],
            [0,0,0,1,0,1,0],
        ],
        floor: [
            [0,0,0,0,0,0,0,0,],
            [0,1,1,1,1,1,1,0,],
            [0,1,1,2,1,1,1,0,],
            [0,1,2,1,1,1,1,0,],
            [1,1,1,1,2,1,1,1,],
            [1,1,2,1,1,1,1,1,],
            [0,1,1,1,1,1,1,0,],
            [0,1,1,1,1,1,0,0,],
        ],
        holes: [
            [3, 2],
            [2, 3],
            [4, 4],
            [2, 5],
        ],
        ball: [{x: 6, y: 7}],
        exit: {x: 1, y: -0.4},
        debug: {x: 1, y: 1, dx: 0, dy: -5}
    }, 
    {       // 4
        wallH: [
            [0,1,0,1,0,0,0,0,],
            [0,0,1,0,1,0,1,0,],
            [0,0,1,0,0,1,0,1,],
            [1,1,0,0,0,0,1,0,],
            [1,0,1,1,0,1,1,1,],
            [0,0,0,0,1,0,0,0,],
            [0,0,0,0,0,0,0,0,],
        ],
        wallV: [
            [0,0,1,0,1,1,0,],
            [0,0,0,0,1,0,0,],
            [0,0,0,1,1,0,0,],
            [0,0,1,0,1,0,0,],
            [0,0,0,1,0,0,1,],
            [0,1,0,0,1,0,1,],
            [0,0,1,0,0,1,1,],
            [0,0,0,0,0,0,0,],
        ],
        floor: [
            [0,1,1,1,1,1,0,0,],
            [0,1,1,1,1,1,1,0,],
            [0,1,2,1,2,1,1,0,],
            [0,1,1,1,1,1,1,1,],
            [1,1,1,2,1,1,2,1,],
            [0,1,1,1,2,1,1,0,],
            [0,1,1,1,1,1,1,0,],
            [0,0,0,0,0,0,0,0,],
        ],
        holes: [
            [2,2],
            [3,4],
            [4,2],
            [4,5],
            [6,4],
        ],
        ball: [{x: 6, y: 0}],
        exit: {x: 6, y: 7.4},
    }, 
    {       // 5
        wallH: [
            [0,0,0,0,0,0,0,0,],
            [0,0,0,1,0,0,1,0,],
            [0,1,0,1,0,0,0,1,],
            [1,0,1,0,0,0,1,1,],
            [1,1,0,0,0,1,0,0,],
            [0,0,0,0,0,0,0,0,],
            [0,0,0,1,0,0,1,0,],
        ],
        wallV: [
            [0,0,0,0,0,0,0,],
            [0,1,0,0,1,0,0,],
            [0,0,0,0,0,1,0,],
            [0,0,1,0,1,0,0,],
            [0,0,1,1,1,0,0,],
            [0,1,1,0,0,1,0,],
            [0,0,1,1,1,0,0,],
            [0,1,0,1,1,0,0,],
        ],
        floor: [
            [0,0,0,0,0,0,0,0,],
            [0,1,1,1,1,1,1,0,],
            [0,2,1,2,1,2,1,0,],
            [0,1,1,1,1,1,1,1,],
            [1,1,1,1,2,1,1,0,],
            [0,1,1,1,1,1,1,0,],
            [0,1,1,1,2,1,1,0,],
            [0,0,1,1,1,1,1,0,],
        ],
        holes: [
            [1,2],
            [3,2],
            [5,2],
            [4,4],
            [4,6],
        ],
        ball: [{x: 1, y: 7}],
        exit: {x: 7.5, y: 2},
    }, 
    {       // 6
        wallH: [
            [0,1,0,0,0,0,1,0,],
            [1,0,0,0,0,1,0,1,],
            [0,1,1,1,1,0,0,0,],
            [0,0,0,1,0,1,0,0,],
            [0,0,1,0,1,1,1,0,],
            [0,0,0,1,0,0,0,1,],
            [0,1,0,0,0,0,0,0,],
        ],
        wallV: [
            [1,0,1,0,0,0,1,],
            [0,0,1,0,1,0,0,],
            [0,0,0,1,0,0,0,],
            [1,0,0,0,1,0,1,],
            [0,0,0,1,0,0,0,],
            [0,0,0,1,0,1,0,],
            [0,0,0,0,1,0,1,],
            [1,0,0,0,0,1,0,],
        ],
        floor: [
            [1,1,1,1,0,1,1,1,],
            [1,3,1,1,1,1,2,1,],
            [1,1,1,1,1,1,1,1,],
            [1,2,1,1,1,2,1,1,],
            [0,1,1,1,1,1,1,0,],
            [0,1,1,2,1,1,1,0,],
            [1,1,1,1,1,1,1,1,],
            [1,1,1,0,0,1,1,1,],
        ],
        holes: [
            [6,1],
            [5,3],
            [1,3],
            [3,5],
        ],
        ball: [{x: 7, y: 5}],
        exit: {x: 1.5, y: 1.5},
    }, 
    {       // 7
        wallH: [
            [0,0,0,0,0,0,0,0,],
            [0,0,0,0,1,0,0,0,],
            [0,0,0,0,0,0,0,0,],
            [0,0,0,0,0,0,0,0,],
            [0,1,1,1,0,1,1,0,],
            [0,0,0,0,0,0,0,1,],
            [0,0,0,0,0,0,0,0,],
        ],
        wallV: [
            [1,0,0,0,0,0,0,],
            [1,0,0,1,0,0,0,],
            [1,0,0,0,1,0,0,],
            [1,0,0,0,1,0,0,],
            [1,0,0,0,1,0,0,],
            [0,0,1,0,1,0,0,],
            [0,0,0,0,1,0,0,],
            [0,0,0,0,1,0,0,],
        ],
        holes: [
            [1,0],
            [5,0],
            [3,1],
            [6,1],
            [2,2],
            [7,2],
            [5,3],
            [7,3],
            [1,4],
            [3,4],
            [0,6],
            [2,6],
            [4,6],
            [6,6],
            [0,7],
        ],
        ball: [{x: 7, y: 7}],
        exit: {x: 0, y: 0},
    }, 
    {       // 8
        wallH: [
            [0,0,0,0,0,0,0,0,],
            [0,0,0,0,0,1,1,0,],
            [1,1,1,1,1,0,0,0,],
            [0,0,0,0,0,0,0,0,],
            [0,0,0,0,0,1,1,0,],
            [0,0,0,0,0,1,0,0,],
            [1,0,0,0,0,0,0,0,],
        ],
        wallV: [
            [0,0,0,1,0,0,0,],
            [0,0,0,1,0,0,0,],
            [0,0,0,0,1,0,0,],
            [0,0,0,0,1,0,0,],
            [0,0,0,0,1,0,0,],
            [0,1,0,0,1,0,0,],
            [0,1,0,0,0,0,0,],
            [0,1,0,0,1,0,0,],
        ],
        holes: [

            [0,0],
            [7,0],
            [2,1],
            [5,1],
            [1,2],
            [5,2],
            [0,3],
            [7,3],
            [2,4],
            [4,4],
            [5,4],
            [1,5],
            [3,6],
            [6,6],
            [4,7],
        ],
        ball: [{x: 0, y: 7}],
        exit: {x: 0, y: 2.4},
    }, 
    {       // 9
        wallH: [
            [0,0,0,0,1,1,1,0],
            [0,0,0,0,0,1,0,0],
            [0,0,1,0,0,0,0,1],
            [0,0,1,1,0,0,1,0],
            [0,0,0,0,0,1,0,1],
            [0,1,1,0,0,0,0,0],
            [1,0,1,0,1,0,0,0],
        ],
        wallV: [
            [0,0,0,0,0,0,0],
            [1,0,0,1,0,0,0],
            [1,1,0,0,0,1,1],
            [0,0,0,0,1,1,0],
            [0,0,0,1,0,0,0],
            [0,0,0,1,0,0,1],
            [1,0,0,0,1,1,0],
            [0,0,1,0,0,0,0],
        ],
        holes: [
            [0,0],
            [0,2],
            [2,1],
            [3,3],
            [4,3],
            [5,0],
            [5,2],
            [7,1],
            [1,4],
            [3,4],
            [6,5],
            [4,6],
            [2,7],
            [3,7],
            [7,7],
        ],
        ball: [{x: 0, y: 7}],
        exit: {x: 7.4, y: 5},
    }, 

    {       // 10
        wallH: [
            [0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0],
        ],
        wallV: [
            [0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0],
        ],
        holes: [
        ],
        ball: [
            {x: 0, y: 0},
            {x: 0, y: 1},
        ],
        exit: {x: 11.4, y: 9},
    }, 
    {       // 11
        wallH: [
            [0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0],
        ],
        wallV: [
            [0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0],
        ],
        holes: [
        ],
        ball: [
            {x: 0, y: 0},
            {x: 0, y: 1},
        ],
        exit: {x: 11.4, y: 9},
    }, 
]

var wallLength = 60, wallWidth = 4, wallDepth = 60
var wallLeft = 0, wallTop = 0
var initLevel = 0
var explodeWall = 0




var mouseDown = false
var mouseJoint = null
var lineSteps = []
function onMouseDown(pos) {
    if(pos.x < wallLeft || pos.y < wallTop
        || pos.x > wallLeft + level.column * wallLength || pos.y > wallTop + level.row * wallLength) {
            return
        }
    if(editMode) {
        // for(let [index,hole] of level.holes.entries()) {
        //     let dx = hole[0] - pos.x / wallLength
        //     let dy = hole[0] - pos.y / wallLength
        //     let r = 0.5
        //     if(dx*dx + dy*dy < r*r) {
        //         holes.splice(index, 1)
        //         break
        //     }
        // }
        lineSteps.push(pos)
    } else {
        startMouseJoint(pos)
        mouseDown = true
    }
}


var lineSpirit

function onMouseMove(pos) {
    if(pos.x < wallLeft || pos.y < wallTop
        || pos.x > wallLeft + level.column * wallLength || pos.y > wallTop + level.row * wallLength) {
            return
        }
    if ( mouseDown && mouseJoint != null ) {
        mouseJoint.SetTarget( new b2d.b2Vec2(pos.x/phyScale, pos.y/phyScale) );
    } else {
        if(editMode && lineSteps.length > 0) {
            let lastPos = lineSteps[lineSteps.length - 1]
            let startPos = lineSteps[0]
            let dx = pos.x - lastPos.x
            let dy = pos.y - lastPos.y
            let len = 10
            if(dx*dx + dy*dy > len*len) {
                lineSteps.push(pos)
                if(!lineSpirit) {
                    lineSpirit = new PIXI.Graphics()
                    lineSpirit.lineStyle(2, 0x0)
                    lineSpirit.moveTo(0, 0)
                    lineSpirit.lineTo(dx, dy)
                    lineSpirit.x = startPos.x
                    lineSpirit.y = startPos.y
                    app.stage.addChild(lineSpirit)
                } else {
                    lineSpirit.moveTo(lastPos.x - startPos.x, lastPos.y - startPos.y)
                    lineSpirit.lineTo(pos.x - startPos.x, pos.y - startPos.y)
                }
                addLineWall(lineSteps[lineSteps.length - 2], lineSteps[lineSteps.length - 1])
            }
        }
    }
}

function onMouseUp(pos) {
    moveCamera = undefined
    if ( mouseDown && mouseJoint != null ) {
        mouseDown = false
        world.DestroyJoint(mouseJoint)
        mouseJoint = null
    } else {
        if(editMode) {
            if(lineSteps.length > 0) {
                let len = 20
                if(lineSteps.length > 1) {  // wall
                    lineSpirit = null
                    level.lines.push(lineSteps)
                    localStorage.setItem("rmaze3"+curLevel, JSON.stringify(level))
                } else {    // hole
                    let x = Math.round(pos.x / wallLength - 0.5)
                    let y = Math.round(pos.y / wallLength - 0.5)
                    addHole(wallLeft + (x+0.5) * wallLength, wallTop + (y+0.5) * wallLength, wallLength / 2.7)
                    level.holes2.push([x, y])
                    localStorage.setItem("rmaze3"+curLevel, JSON.stringify(level))
                }
            }
            lineSteps = []

        }
    }
}


var moveCamera
function onMoveCamera(e) {
    if(!moveCamera) {
        moveCamera = {
            fromX: e.clientX,
            fromY: e.clientY,
            x: e.clientX,
            y: e.clientY
        }
    } else {
        moveCamera.x = e.clientX
        moveCamera.y = e.clientY
    }
}

function startMouseJoint(pos) {
    if ( mouseJoint != null )
        return
    let ball = ballSprite[0]
    let body = ball.body
    var md = new b2d.b2MouseJointDef()
    md.set_bodyA(mouseJointGroundBody)
    md.set_bodyB(body)
    md.set_target( body.GetPosition() )
    md.set_maxForce( 100 * body.GetMass() )
    md.set_collideConnected(true)
    
    mouseJoint = b2d.castObject( world.CreateJoint(md), b2d.b2MouseJoint )
    mouseJoint.SetTarget( new b2d.b2Vec2(pos.x/phyScale, pos.y/phyScale) )
}