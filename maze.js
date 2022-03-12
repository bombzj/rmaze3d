
var b2d, world
var myQueryCallback
var mouseJointGroundBody
const wallColor = 0x2EF2AA
let r90 = Math.PI / 2
let wireframe = false

function loadWorld() {
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

    // debug
    // level.ball.x = level.debug.x
    // level.ball.y = level.debug.y
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
                    parent.add(addWall(wallLeft + (j+0.5) * wallLength, -wallTop - (i+1) * wallLength, wallLength/2+tlenh+explodeWall, wallLength, wallWidth, wallDepth, undefined, true, true))
                }
            }
        }

        for(let i = 0;i < level.wallV.length;i++) {
            let wall2 = level.wallV[i]
            for(let j = 0;j < wall2.length;j++) {
                if(wall2[j] == 1) {
                    parent.add(addWall(wallLeft + (j+1) * wallLength, -wallTop - (i + 0.5) * wallLength, wallLength/2+tlenh+explodeWall, wallWidth, wallLength, wallDepth, undefined, true, true))
                }
            }
        }

        for(let i = 0;i < level.floor.length;i++) {
            let floor2 = level.floor[i]
            for(let j = 0;j < floor2.length;j++) {
                console.log()
                let v = floor2[j]
                if(v == 2 || v == 3) v = [v, 1, 1]
                if(typeof v ==='object') {
                    let x = wallLeft + (j + v[1] / 2) * wallLength
                    let y = -wallTop - (i + v[2] / 2) * wallLength
                    let z = tlenh
                    let z2 = tlenh
                    let l = wallLength * v[1]
                    let w = wallLength * v[2]
                    let d = wallWidth
                    let d2 = wallWidth*2+0.1
                    if(v[0] == 2) { // hole
                        
                    } else if(v[0] == 3) {   // exit
                        z = z-wallLength/2+wallWidth/2
                        z2 = z + wallLength/2
                        d = wallLength
                        d2 = wallLength
                    }
                    parent.add(addWallHole(x, y, z, z2, l, w, d, d2, undefined, false, true))
                } else if(v == 1) {
                    parent.add(addWall(wallLeft + (j+0.5) * wallLength, -wallTop - (i + 0.5) * wallLength, tlenh, wallLength, wallLength, wallWidth, undefined, false, true))
                }
            }
        }

        parent.add(addWall(0, 0, tlenh+wallLength+wallWidth, tlen, tlen, wallWidth, 0xffffff, false, false, 0.3))

        let r = rotates[sid]
        if(r[4]) {
            parent.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), r[4])
        }
        let pos = new THREE.Vector3()
        let quat = new THREE.Quaternion()
        parent.rotateOnWorldAxis(new THREE.Vector3(r[0], r[1], r[2]), r[3])

        let boxes = []
        for(let c of parent.children) {
            let geometry = c.geometry
            c.getWorldPosition(pos)
            c.getWorldQuaternion(quat)
            if(geometry.type == 'BoxGeometry') {
                boxes.push({type: 'box',
                pos: {
                    x: pos.x,
                    y: pos.y,
                    z: pos.z,
                }, quat: {
                    x: quat.x,
                    y: quat.y,
                    z: quat.z,
                    w: quat.w,
                }, shape: {
                    width: geometry.parameters.width/2,
                    height: geometry.parameters.height/2,
                    depth: geometry.parameters.depth/2,
                }})
            } else if(geometry.type == 'BufferGeometry') {
                let triangles = []

                let posattr = geometry.attributes.position
                let index;
                if (geometry.index)
                    index = geometry.index.array;
                else {
                    index = new Array((posattr.array.length / posattr.itemSize) | 0);
                    for (let i = 0; i < index.length; i++)
                        index[i] = i
                }
                let triCount = (index.length / 3) | 0
                polys = new Array(triCount)
                for (let i = 0, pli = 0, l = index.length; i < l; i += 3,
                pli++) {
                    let vertices = new Array(3)
                    for (let j = 0; j < 3; j++) {
                        let vi = index[i + j]
                        let vp = vi * 3;
                        let vt = vi * 2;
                        let x = posattr.array[vp]
                        let y = posattr.array[vp + 1]
                        let z = posattr.array[vp + 2]
                        vertices[j] = {
                            x,
                            y,
                            z
                        }
                    }
                    triangles.push(vertices)
                }


                boxes.push({type: 'mesh',
                pos: {
                    x: pos.x,
                    y: pos.y,
                    z: pos.z,
                }, quat: {
                    x: quat.x,
                    y: quat.y,
                    z: quat.z,
                    w: quat.w,
                }, triangles: triangles})


            }
        }

        worker.postMessage({type: 'updateMaze', payload: boxes})
    }


    ballSprite = []
    for(let ball of level.ball) {
        ballSprite.push(addBall(wallLeft + (ball.x+0.5) * wallLength, -wallTop - (ball.y+0.5) * wallLength, tlenh + wallLength/2, 15))
    }

    // world.SetContactListener( listener )
    mouseDown = null
    mouseJoint = null
    // mouseJointGroundBody = world.CreateBody( new b2d.b2BodyDef() )
}

var listener
function init() {

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
    worker.postMessage({type: 'addBall', payload: {x: x, y: y, z: z, r: r}})

    const geometry = new THREE.SphereGeometry( r, 32, 16 );
    const material = new THREE.MeshPhongMaterial( { color: 0xAAAAAA, specular: 0x666666, shininess: 100 } );
    const sphere = new THREE.Mesh( geometry, material );
    // sphere.body = sphereBody
    sphere.position.set(x, y, z)
    sphere.castShadow = true
    scene.add( sphere )

    return sphere
}

function addWall(x, y, z, w, h, d, color = wallColor, castShadow = false, receiveShadow = false, opacity = 1) {
    const geometry = new THREE.BoxGeometry( w, h, d )
    const material = new THREE.MeshPhongMaterial( {color: color, wireframe: wireframe} )
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

function addWallHole(x, y, z, z2, w, h, d, d2, color = wallColor, castShadow = false, receiveShadow = false) {
    const geometry = new THREE.BoxGeometry( w, h, d )
    const box = new THREE.Mesh( geometry )

    const size = wallLength / 2.7
    const geometry2 = new THREE.CylinderGeometry( size, size, d2, 16 )
    const cy = new THREE.Mesh( geometry2 )
    cy.position.z = z2 - z
    cy.rotateX(r90)

    box.updateMatrix()
    cy.updateMatrix()
    let bspA = CSG.fromMesh( box )
    let bspB = CSG.fromMesh( cy )
    let bspC = bspA.subtract( bspB )
    let result = CSG.toMesh( bspC, box.matrix )
    result.material = new THREE.MeshPhongMaterial( {color: color, wireframe: wireframe} )
    result.position.set(x, y, z)
    if(castShadow) {
        result.castShadow = true
    }
    if(receiveShadow) {
        result.receiveShadow = true
    }
    return result
}

function addHole(x, y, z, d, size, color = 0x0) {

    const geometry = new THREE.CylinderGeometry( size, size, d, 16 )
    const material = new THREE.MeshPhongMaterial( {color: color} )
    const cy = new THREE.Mesh( geometry, material )
    cy.rotateX(r90)
    cy.position.set( x, y, z )
    return cy
}
const vectorZ = new THREE.Vector3(0,0,1)
function updateWorld() {
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

            let dir = new THREE.Vector3()
            camera.getWorldDirection(dir)
            dir.multiplyScalar(defaultGravity)
            worker.postMessage({type: 'updateGravity', payload: {x: dir.x, y: dir.y, z: dir.z}})
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
            [0,1,0,0,0,0,0,],
            [1,0,0,0,0,0,0,],
            [1,1,0,0,1,0,0,],
            [1,0,1,0,0,0,1,],
            [0,0,0,0,0,0,0,],
        ],
        floor: [
            [1,1,1,1,0,1,1,1,],
            [1,1,1,1,1,1,1,1,],
            [0,1,[2, 1, 2],1,1,1,1,1,],
            [1,1,0,1,1,1,1,0,],
            [1,1,1,1,1,1,1,0,],
            [1,1,1,1,1,1,1,1,],
            [1,1,1,1,1,1,[2, 1, 1],1,],
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
            [0,1,0,0,0,0,0,],
            [1,0,0,0,0,0,0,],
            [0,0,0,0,0,0,0,],
            [0,1,0,0,0,1,0,],
            [0,0,0,0,0,0,0,],
        ],
        floor: [
            [0,1,1,1,1,1,1,0,],
            [0,1,1,1,1,1,1,0,],
            [0,1,[2, 1, 2],1,1,1,1,1,],
            [1,1,0,1,1,1,1,0,],
            [1,1,1,1,[2, 2, 1],0,1,0,],
            [0,1,1,[2, 2, 1],0,1,1,0,],
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
            [0,1,0,0,1,0,0,],
            [0,0,1,0,0,1,0,],
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
            [1,[3, 2, 2],0,1,1,1,2,1,],
            [1,0,0,1,1,1,1,1,],
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
]

var wallLength = 60, wallWidth = 4, wallDepth = 60
var wallLeft = 0, wallTop = 0
var initLevel = 0
var explodeWall = -1




var mouseDown = false
var mouseJoint = null
var lineSteps = []
function onMouseDown(pos) {
    if(!level) return
    if(pos.x < wallLeft || pos.y < wallTop
        || pos.x > wallLeft + level.column * wallLength || pos.y > wallTop + level.row * wallLength) {
            return
        }
}


var lineSpirit

function onMouseMove(pos) {
    if(!level) return
    if(pos.x < wallLeft || pos.y < wallTop
        || pos.x > wallLeft + level.column * wallLength || pos.y > wallTop + level.row * wallLength) {
            return
        }
}

function onMouseUp(pos) {
    moveCamera = undefined
    if ( mouseDown && mouseJoint != null ) {
        mouseDown = false
        mouseJoint = null
    } else {
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