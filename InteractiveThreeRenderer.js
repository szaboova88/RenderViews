'use strict'
var fsqVertex =
    'varying vec2 vUv;\
    \
    void main() {\
        vUv = uv;\
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\
    }';

var fsqFragment =
    'varying vec2 vUv;\
    uniform sampler2D tDiffuse;\
    \
    void main() {\
    \
        gl_FragColor = texture2D( tDiffuse, vUv );\
    }';

function InteractiveThreeRenderer(domQuery) { //for a whole window call with domQuery "<body>"
    //inherit the base class
    var self = new BasicThreeRenderer(domQuery, true);

    self.interactiveScene = null;
    self.rayScene = null;

    self.IMeshes = {};
    self.NMeshes = {};
    self.GMeshes = {};

    self.resolveNode = function (mesh) {
        var shapeID = mesh.mName;
        var seedID = self.Seeds[shapeID];
        var _seed = SeedWidgets.GetById(seedID);
        return {shape: _seed.GetShape(shapeID), seed: _seed};
    };

    //This renderer adds a very basic picking of shapes
    //It sends the results to the shape, which notifies all its subscribers that something has changed.
    //The picking code is based on the following example
    //http://stemkoski.github.io/Three.js/Mouse-Tooltip.html

    //First we need to add a new initialization call wich will be executed after the one of BasicThreeRenderer
    self.initCalls.push(function () { //push the init function to the list of initCalls
        this.projector = new THREE.Projector(); //create a new Projector. It will be used to cast a ray through the scene and get the list of intersections of the ray with shapes
        document.addEventListener('mousemove', this.onDocumentMouseMove, false); //each time the mouse moves we want to execute our mouse move routine (defined below)
        document.addEventListener('keydown', this.onDocumentKeyDown, false);
        document.addEventListener('keyup', this.onDocumentKeyUp, false);

        this.interactiveScene = new THREE.Scene();
        this.rayScene = new THREE.Scene();
        this.initLights(this.interactiveScene);

        //Full Screen Quad
        this.fsqScene = new THREE.Scene();

        this.fullScreenQuadMaterial = new THREE.ShaderMaterial({
            uniforms: {tDiffuse: {type: "t", value: this.basicRTT}},
            vertexShader: fsqVertex,
            fragmentShader: fsqFragment,
            depthTest: false,
            depthWrite: false
        });

        var quad = new THREE.Mesh(this.RTTPlane, this.fullScreenQuadMaterial);
        quad.dynamic = true;
        quad.position.z = -1;
        this.fsqScene.add(quad);
    });

    self.InteractiveRender = function () {
        if (!this.imgOverride) {
            this.renderer.clear(true, false, false);
            this.renderer.render(this.fsqScene, this.RTTCamera);
            this.renderer.render(self.debugRays ? this.rayScene : this.interactiveScene, this.camera);
        }
    };

    self.renderCalls.push(function () {
        self.InteractiveRender();
    });

    self.resizeCalls.push(function () {
        this.fullScreenQuadMaterial.uniforms.tDiffuse.value = this.basicRTT;
        this.fullScreenQuadMaterial.uniforms.tDiffuse.needsUpdate = true;
    });

    self.mouse = {x: 0, y: 0}; //here we store the last mouse position. The mouse position is stored only when the mouse moves, but the scene is mostly updated with a much higher frequence

    self.onDocumentMouseMove = function onDocumentMouseMove(event) {
        //Update the mouse position, a transformation from screen to normalized device coordinates is necessary; notice the flipped y
        self.mouse.x = ((event.clientX - self.container.offset().left) / self.container.innerWidth()) * 2 - 1;
        self.mouse.y = -((event.clientY - self.container.offset().top) / self.container.innerHeight()) * 2 + 1;
        self.Update();
    };

    self.highlighted = [];
    self.pickingUnlocked = true;

    self.debugRays = false;

    self.onDocumentKeyDown = function onDocumentKeyDown(event) {
        if ((self.picked) && (self.pickingUnlocked) && ((event.key == "Shift") || (event.shiftKey == true))) {
            self.pickingUnlocked = false;
            var node = self.resolveNode(self.picked);
            node.shape.interaction.visible(false);
            var parent = node.seed.GetParentShape(node.shape);
            if (parent) {
                parent.interaction.visible(true);
                self.highlighted.push(parent);
            }
        }

        if ((self.picked) && (self.pickingUnlocked) && (event.key == "Alt") || (event.altKey == true)) {
            self.pickingUnlocked = false;
            if (self.picked) {
                var node = self.resolveNode(self.picked);
                node.shape.interaction.selected(true);
            }
        }
        //if (event.ctrlKey)
        //    self.debugRays = true;

        self.Update();
    };

    self.onDocumentKeyUp = function onDocumentKeyUp(event) {
        while (self.highlighted.length > 0) {
            self.highlighted.pop().interaction.visible(false);
        }
        if (!self.pickingUnlocked) {
            var node = self.resolveNode(self.picked);
            node.shape.interaction.visible(true);
            node.shape.interaction.selected(false);
            self.pickingUnlocked = true;
        }
        //self.debugRays = false;
        self.Update();
    };

    //reference to the mesh being currently picked; null if none
    self.picked = null;
    //material wich substitutes the default mesh material when a mesh is picked
    self.pickedMaterial = new THREE.MeshBasicMaterial({
        color: 'purple',
        transparent: true,
        opacity: 0.4,
        //depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1, // positive value pushes polygon further away
        polygonOffsetUnits: 1
    });

    //---------------------------------------------

    self.notPickedMaterial = new THREE.MeshBasicMaterial({
        color: 'black',
        transparent: true,
        opacity: 0.4,
        //depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1, // positive value pushes polygon further away
        polygonOffsetUnits: 1
    });

    //---------------------------------------------

    self.newGeometry = new THREE.BoxGeometry(1.2, 1.2, 2);

    //At last we add a new update method
    self.updateCalls.push(function () {
        //For an excellent explanation of the following few lines, please refer to
        //http://stackoverflow.com/questions/11036106/three-js-projector-and-ray-objects

        this.interactiveScene.updateMatrixWorld();
        this.camera.updateMatrixWorld();

        if (this.pickingUnlocked && (this.rayScene.children.length > 0)) {
            //First we create a ray passing through the mouse position
            var mousePoint = new THREE.Vector3(this.mouse.x, this.mouse.y, 1); //The mouse point in homogenous coordinates (1 at the end)
            //this.projector.unprojectVector(mousePoint, this.camera); //Unproject the point into the 3D world space
            mousePoint.unproject(this.camera); //Unproject the point into the 3D world space
            var ray = new THREE.Raycaster(this.camera.position, mousePoint.sub(this.camera.position).normalize()); //Ray with origin at the mouse position and direction into the scene passing through the unprojected point

            //Returns an array containing all objects in the scene with which the ray intersects. Result are ordered by increasing distance from the start of the ray.
            var intersects = ray.intersectObjects(this.picked ? this.rayScene.children.concat([this.picked]) : this.rayScene.children);

            ///////// THIS ALTERNATIVE DOES NOT USE THE KNOCKOUT BINDING (and stays here just for educative purposes, please read it first and compare to the approach used below)
            //If any intersection exists
            /*
             if (intersects.length > 0) {
             //If the closest mesh intersected is not the currently stored intersection (i.e. picked) mesh
             if (intersects[0].object != this.picked) {
             //Restore previous intersection mash (if anything was picked before) to its original material
             if (this.picked) {
             this.picked.material = this.picked.defaultMaterial;
             this.picked.defaultMaterial = null;
             }
             //Store reference to closest mesh as current intersection mesh
             this.picked = intersects[0].object;
             //Store the material of the closest mesh (for later restoration)
             this.picked.defaultMaterial = this.picked.material;
             //Set a new material for closest mesh
             this.picked.material = this.pickedMaterial;
             }
             }
             else //There are no intersections
             {
             //Restore previous intersection mesh (if it exists) to its original material
             if (this.picked) {
             this.picked.material = this.picked.defaultMaterial;
             this.picked.defaultMaterial = null;
             }
             //Remove previous intersection mesh reference by setting current intersection object to null
             this.picked = null;
             }
             */

            ///////// THIS ALTERNATIVE USES THE KNOCKOUT BINDING
            if (intersects.length > 0) {
                //If the closest mesh intersected is not the currently stored intersection (i.e. picked) mesh
                if (intersects[0].object != this.picked) {
                    //Restore previous intersection mash (if anything was picked before) to its original material
                    if (this.picked) {
                        var shapeID = this.picked.mName;
                        var seedID = this.Seeds[shapeID];
                        var seed = SeedWidgets.GetById(seedID);
                        var shape = seed.GetShape(shapeID);
                        //Use Knockout to unset the picked state of the shape
                        shape.interaction.picked(false);
                    }
                    //Store reference to closest mesh as current intersection mesh
                    this.picked = intersects[0].object;
                    //The same as above but compressed into a single line
                    SeedWidgets.GetById(this.Seeds[this.picked.mName]).GetShape(this.picked.mName).interaction.picked(true);
                }
            }
            else //There are no intersections
            {
                //Use Knockout to unset the picked state of the shape
                if (this.picked)
                    SeedWidgets.GetById(this.Seeds[this.picked.mName]).GetShape(this.picked.mName).interaction.picked(false);
                //Remove previous intersection mesh reference by setting current intersection object to null
                this.picked = null;
            }
            /**/
        }
    });

    //////// AS KNOCKOUT IS USED, WE NEED TO SUBSCRIBE TO THE PICKED STATE CHANGES
    self.addCalls.push(function (shape) {

            var id = shape.id;
            //if (!self.Meshes.hasOwnProperty(id))
            var m = self.Meshes[id].clone();
            var g = self.Meshes[id].clone();
            var n = self.Meshes[id].clone();

            m.material = self.pickedMaterial;
            g.material = self.pickedMaterial;
            n.material = self.notPickedMaterial;

            m.mName = id;
            g.mName = id;
            n.mName = id;

            //console.log('self.newGeometry');
            //console.log(self.newGeometry);
            //m.geometry = self.newGeometry;
            g.scale.set(1.5, 1.5, 1.5);
            g.matrixAutoUpdate = true;

            console.log(m);
            console.log(g);
            console.log(n);
            console.log(id);
            console.log('self.IMeshes');
            console.log(self.IMeshes);
            console.log('self.NMeshes');
            console.log(self.NMeshes);

            self.IMeshes[id] = m;
            self.GMeshes[id] = g;
            self.NMeshes[id] = n;

            if (shape.interaction.visible()) {
                self.rayScene.add(m);
                self.rayScene.add(g);
                self.rayScene.add(n);
            }

            var pickSubscription = shape.interaction.picked.subscribe(function (newVal) {
                var mesh = this.IMeshes[id]; //get the mesh for the shape
                if (mesh) {
                    if (newVal) {
                        //this.interactiveScene.add(this.NMeshes[6]);
                        for (var item in this.NMeshes) {
                            if (item != id) {
                                if (this.NMeshes[item].parent) {
                                    this.interactiveScene.add(this.NMeshes[item]);
                                }
                            }
                        }
                        this.interactiveScene.add(mesh);
                    } else {
                        if (shape.interaction.visible()) {
                            //this.rayScene.add(this.NMeshes[6]);
                            this.rayScene.add(mesh);
                            for (var item in this.NMeshes) {
                                if (item != id) {
                                    if (this.NMeshes[item].parent) {
                                        this.rayScene.add(this.NMeshes[item]);
                                    }
                                }
                            }
                        } else {
                            this.interactiveScene.remove(mesh);
                            //this.interactiveScene.remove(this.NMeshes[6]);
                            for (var item in this.NMeshes) {
                                if (item != id) {
                                    if (this.NMeshes[item].parent) {
                                        this.interactiveScene.remove(this.NMeshes[item]);
                                    }
                                }
                            }
                        }
                    }
                    //this.RenderSingleFrame();
                    self.InteractiveRender();
                }
            }.bind(self));

            var selectSubscription = shape.interaction.selected.subscribe(function (newVal) {
                console.log('selectSubscription');

                self.InteractiveRender();
            }.bind(self));

            //Add the subscription to the subscriptions map for the given shape, note that again we use an object to possibly store several subscriptions per shape
            if (id in this.ShapeSubscriptions) {
                this.ShapeSubscriptions[id].pick = pickSubscription;
                this.ShapeSubscriptions[id].select = selectSubscription;
            } else {
                this.ShapeSubscriptions[id] = {pick: pickSubscription};
                this.ShapeSubscriptions[id] = {select: selectSubscription};
            }

            //TODO STUDENTS add subscriptions to other shape properties in a similar way
        }
    );

    //The seed subscriptions stored in this.subscriptions are disposed by the AbstractRenderer, so we don't need to take care of them here. No push to removeCalls necessary.
    //But we need to take care of subscriptions to shapes we created above.
    self.removeCalls.push(function (shape) {
        //very similar to RemoveSeedSubscription
        var id = shape.id;
        console.log(id);
        if (self.IMeshes.hasOwnProperty(id)) {
            self.rayScene.remove(self.IMeshes[id]);
            self.interactiveScene.remove(self.IMeshes[id]);
        }
        delete self.IMeshes[id];

        if (self.NMeshes.hasOwnProperty(id)) {
            self.rayScene.remove(self.NMeshes[id]);
            self.interactiveScene.remove(self.NMeshes[id]);
        }
        delete self.NMeshes[id];

        if (id in this.ShapeSubscriptions) {
            for (t in this.ShapeSubscriptions[id])
                this.ShapeSubscriptions[id][t].dispose();

            delete this.ShapeSubscriptions[id];
        }
    });

    return self;
}
