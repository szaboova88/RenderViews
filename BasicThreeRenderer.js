'use strict'
function BasicThreeRenderer(domQuery, basicOffscreen) { //for whole window call with domQuery "<body>"
    //A simple inhericance concept. We create an object of the AbstractRenderer type and then we change and extend it to our needs. At the end we return the self variable.
    var self = AbstractRenderer(domQuery);

    //A map with three.js meshes with shape IDs as keys. Only for mergning and picking, not rendered.
    self.Meshes = {};
    //A map with merged geometries per material. Material IDs are keys
    self.MergedMeshes = {};
    //A map for mapping the shape IDs to seed IDs (backward relationship). Might become a part of SeedWidgets in future.
    self.Seeds = {};

    self.doesWebGL = false;

    //Three objects, please refer to any basic tutorial on three.js
    self.renderer = null;
    self.scene = null; //This is the optimized scene with meshes merged by material (NEW 12.2015)
    self.camera = null;
    self.controls = null; //Orbit controls
    self.emptyScene = null; //just an empty scene

    self.imgOverride = false; //for images rendered and sent by the server

    self.basicOffscreen = basicOffscreen; //a boolean flag that decides whether the image is rendered to screen or to a texture (NEW 12.2015)
    self.offscreenParams = { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, format: THREE.RGBFormat, stencilBuffer: false, generateMipmaps: false }; //parameters for the offscreen render-to-texture (NEW 01.2016)

    //Overrides the parent-class function. This renderer is initialized when the self.renderer is assigned.
    //Notice that we have to use self instead of this (otherwise the "this" scope would point to the Window object)
    self.IsInitialized = function () {
        return self.renderer;
    }

    //Initialization of the renderer (in addition to the initialization of the parent object, if any
    self.initCalls.push(function () {
        //get the object matching the container query
        var query = $(this.containerQuery);
        if (query.length == 1) //There must be exactly one result to the query
            this.container = query.first();
        else {
            if (query.length == 0)
                throw "No element matches the renderer target \"" + this.containerQuery + "\".";
            else //query.length > 1
                throw "More than one element matches the renderer target \"" + this.containerQuery + "\".";
        }

        if (this.container) {
            //test if Canvas and WebGl present
            var doesCanvas = !!window.CanvasRenderingContext2D;
            
            if (!!window.WebGLRenderingContext)
            {
                this.doesWebGL = false;
                try
                {
                    var context = WebGLUtils.create3DContext(document.createElement('canvas'));
                    this.doesWebGL = !!context;
                }
                catch (e) { this.doesWebGL = false; }
            }            

            if (this.doesWebGL) {
                this.renderer = new THREE.WebGLRenderer({ antialias: true });
                this.renderer.shadowMapType = THREE.PCFSoftShadowMap;
            }
            else {
                this.basicOffscreen = false;
                if (doesCanvas)
                    this.renderer = new THREE.CanvasRenderer();
                else
                    alert('None of the Threejs renderers is supported on this machine :(');
            }

            //Sets the renderer window size to the size of the container where it will be attached
            this.renderer.setSize(this.container.innerWidth(), this.container.innerHeight());
            this.container.prepend(this.renderer.domElement); //attaches the <canvas> tag for the renderer as a child to the container element

            //Camera initialization
            this.camera = new THREE.PerspectiveCamera(50, this.container.innerWidth() / this.container.innerHeight(), 0.025, 1000); //field of view angle, aspect ratio, near clipping plane, far clipping plane
            //position of the camera
            this.camera.position.y = 20;
            this.camera.position.z = 30;
            this.camera.rotation.x = 45 * (Math.PI / 180);

            //Trackball controls initialization
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.noKeys = true;

            this.controls.addEventListener("start", this.EnableRendering, false);
            this.controls.addEventListener("end", this.DisableRendering, false);

            //initialization of the offscreen rendering (NEW 01.2016)
            if (this.basicOffscreen) {
                this.basicRTT = new THREE.WebGLRenderTarget(this.container.innerWidth(), this.container.innerHeight(), this.offscreenParams); //target texture
                this.RTTCamera = new THREE.OrthographicCamera(-this.container.innerWidth() * 0.5, this.container.innerWidth() * 0.5, this.container.innerHeight() * 0.5, -this.container.innerHeight() * 0.5, -10, 10); //camera for the fullscreen quad
                this.RTTPlane = new THREE.PlaneGeometry(this.container.innerWidth(), this.container.innerHeight()); //plane for the fullscreen quad
                this.basicMaterial = new THREE.MeshBasicMaterial(); //a neutral material (since it is only the depth-buffer we want to keep for the next rendering pass)
            }

            //Make the renderer adaptable to changes of the container size
            $(this.container).addClass("canvas-resizable"); //Normally the resize event may be bound only to the Window object. But we propagate it using jquery to all elements of the "canvas-resizable" class. Therefore we set the container to be a member of that class.

            //When the container gets resized
            $(this.container).resize(function () {
                self.Resize();
            });

            this.renderingEnabled = true; //we want to render the next frame
            this.imgOverride = false; //there is no prerendered image to overlay
            this.requestStopRendering = true; //if the camera does not move, we want to stop rendering

            //Background of the canvas
            this.renderer.setClearColor(0xffffff); //white
            this.renderer.autoClear = false;
            this.renderer.sortObjects = false;
            this.renderer.antialias = true;
            if (!this.doesWebGL)
                this.renderer.domElement.getContext("2d").clearRect(0, 0, self.container.innerWidth() - 1, self.container.innerHeight() - 1);
            else
                this.renderer.clear();
            //Our main scene
            this.scene = new THREE.Scene();
            this.emptyScene = new THREE.Scene();

            this.initLights(this.scene);

            //Plane for testing in case there are some problems receiving or processing the server data
            /*var plane = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshNormalMaterial());
            plane.position.z = -100;
            plane.position.y = -100;
            plane.overdraw = true;
            this.scene.add(plane);*/

            //to make sure the renderer is correctly resized at the beginning
            setTimeout(function () { self.Resize();}, 1000);
        }
    });

    //called when the window gets resized
    self.resizeCalls.push(function () {
        self.renderer.setSize(self.container.innerWidth(), self.container.innerHeight()); //new renderer window size
        self.camera.aspect = self.container.innerWidth() / self.container.innerHeight(); //new aspect ratio
        self.camera.updateProjectionMatrix();

        //(NEW 01.2016)
        if (self.basicOffscreen) {
            //delete the render-target texture
            self.basicRTT.dispose();
            //and replace it by a new one with an updated size
            self.basicRTT = new THREE.WebGLRenderTarget(self.container.innerWidth(), self.container.innerHeight(), self.offscreenParams);

            //update the ortho-camera (used for the fullscreen quad)
            self.RTTCamera.left = self.container.innerWidth() * -0.5; //new camera matrix
            self.RTTCamera.right = self.container.innerWidth() * 0.5;
            self.RTTCamera.top = self.container.innerHeight() * 0.5;
            self.RTTCamera.bottom = self.container.innerHeight() * -0.5;
            self.RTTCamera.updateProjectionMatrix();

            //update the fullscreen plane
            self.RTTPlane.vertices[0].x = -self.container.innerWidth() * 0.5; //new full-screen quad
            self.RTTPlane.vertices[2].x = -self.container.innerWidth() * 0.5;
            self.RTTPlane.vertices[1].x = self.container.innerWidth() * 0.5;
            self.RTTPlane.vertices[3].x = self.container.innerWidth() * 0.5;
            self.RTTPlane.vertices[0].y = self.container.innerHeight() * 0.5;
            self.RTTPlane.vertices[1].y = self.container.innerHeight() * 0.5;
            self.RTTPlane.vertices[2].y = -self.container.innerHeight() * 0.5;
            self.RTTPlane.vertices[3].y = -self.container.innerHeight() * 0.5;
            self.RTTPlane.verticesNeedUpdate = true;
        }
    });

    self.initLights = function(scene)
    {
        var ambientLight = new THREE.AmbientLight(0x555555); // soft white light
        scene.add(ambientLight);

        var directionalLight1 = new THREE.DirectionalLight(0xdddddd, 0.75);
        directionalLight1.position.set(25, 70, 20);
        directionalLight1.shadowMapWidth = 1024;
        directionalLight1.shadowMapHeight = 1024;
        scene.add(directionalLight1);

        var directionalLight2 = new THREE.DirectionalLight(0xdddddd, 0.5);
        directionalLight2.position.set(-25, 50, -20);
        directionalLight2.shadowMapWidth = 1024;
        directionalLight2.shadowMapHeight = 1024;
        scene.add(directionalLight2);
        
        var directionalLight3 = new THREE.DirectionalLight(0xeeeeee, 0.5);
        directionalLight3.position.set(-10, 10, 20);
        directionalLight3.shadowMapWidth = 1024;
        directionalLight3.shadowMapHeight = 1024;
        scene.add(directionalLight3);
    }

    self.updateCalls.push(function () {
        this.controls.update();
    });

    self.renderCalls.push(function () {
        if (!this.doesWebGL)
            this.renderer.domElement.getContext("2d").clearRect(0, 0, self.container.innerWidth() - 1, self.container.innerHeight() - 1);
        else
            this.renderer.clear();

        //Render-To-Texture (NEW 01.2016)
        if (this.basicOffscreen) {
            if (!this.imgOverride) { //only if the path-traced image is not shown
                //render the scene to the texture
                this.renderer.render(this.scene, this.camera, this.basicRTT, true);
                //temporary override the material of all meshes
                this.scene.materialOverride = this.basicMaterial;
                //and render the scene to the screen
                this.renderer.render(this.scene, this.camera); //most likely you will then clear the color buffer (framebufer) and keep the depth buffer
                this.scene.materialOverride = null;
            }
        }
        else
            this.renderer.render(this.imgOverride ? this.emptyScene : this.scene, this.camera);
    });

    self.startCalls.push(function () {
        self.imgOverride = false;
        $("#prerenderedImg").hide();
        $(self.container).css({ opacity: 1 });
    });

    function GenerateMesh(shape)
    {
        var id = shape.id;
        var geo, matrix;
        var t = shape.appearance.transformation;
        var matrix = new THREE.Matrix4().set(t[0], t[1], t[2], t[3], t[4], t[5], t[6], t[7], t[8], t[9], t[10], t[11], t[12], t[13], t[14], t[15]);
        var positiveDeterminant = matrix.determinant() > 0.0;

        if (shape.appearance.primitive) {
            //Instantiate a geometric primitive
            geo = GeometricPrimitives.Get(shape.appearance.primitive, positiveDeterminant);
        }
        else
        {
            //Create a new geometry object
            geo = new THREE.Geometry();
            var vertices = shape.appearance.geometry.points; //positions
            for (var i = 2; i < vertices.length; i += 3) {
                geo.vertices.push(new THREE.Vector3(vertices[i - 2], vertices[i - 1], vertices[i])); //and store it to the list of geometry's vertices
            }

            if (shape.appearance.geometry.indexed) {
                //The geometry of the shape is stored as a list of indexed triangle fans.
                var indices = shape.appearance.geometry.indices; //indexes
                for (var i = 2; i < indices.length; i += 3)
                    geo.faces.push(new THREE.Face3(indices[i - 2], indices[i - 1], indices[i]));
            }
            else {
                for (var i = 2, j = 8; j < vertices.length; i += 3, j += 9)
                    geo.faces.push(new THREE.Face3(i - 2, i - 1, i));
            }

            //Compute normals for the mesh
            geo.computeFaceNormals();
        }

        var mat = BasicMaterials.Get(shape.appearance.material);
        var mesh = new THREE.Mesh(geo, mat);
        mesh.matrixAutoUpdate = false;
        mesh.applyMatrix(matrix);
        mesh.mName = id; //this will help us to recover the shape object when a mesh is picked by the mouse
        mesh.mMaterial = shape.appearance.material;

        self.Meshes[id] = mesh; //remember the mesh also in the map of meshes
        self.Seeds[id] = shape.relations.seed; //remeber the backward relation of shapeID to seedID

        return mesh;
    }

    //Push in a method for adding new shapes
    //Nothice that since the addCalls members are invoked by call(this, shape) the "this" context stays preserved and there is no need to use the self variable
    function OnAddShape(shape) {
        var id = shape.id;

        //If there was any mesh for the current shape, remove it from the scene
        if (id in this.Meshes)
            this.scene.remove(this.Meshes[id]);

        GenerateMesh(shape);
        //add the mesh to the respective material group
        BasicMaterials.Add(shape);
    }
    self.addCalls.push(OnAddShape);

    self.OnUpdateCompleted = function () {
        //now all meshes are grouped in material groups
        var materialGroups = BasicMaterials.Groups();
        //all meshes within a material group are now merged together to speed up their rendering
        for(var mid in materialGroups)
            if (materialGroups.hasOwnProperty(mid)) {
                MergeShapes(materialGroups, mid);
            }
        //after all merging is done, draw the scene
        self.RenderSingleFrame();
    }

    function MergeShapes(materialGroups, mid) {
        var combined = new THREE.Geometry(); //geometry where everything gets accumulated
        for (var i = 0; i < materialGroups[mid].length; ++i) {
            if (materialGroups[mid][i].interaction.visible()) {
                if (!self.Meshes.hasOwnProperty(materialGroups[mid][i].id)) //if the mesh was not generated yet, generate it now (most likely is was already)
                    GenerateMesh(materialGroups[mid][i]);

                combined.mergeMesh(self.Meshes[materialGroups[mid][i].id]); //merge the mesh to the geometry where everything accumulates
            }
        }

        var finalMesh = new THREE.Mesh(combined, BasicMaterials.Get(mid)); //create a mesh from the merged geometry

        finalMesh.matrixAutoUpdate = false; //to show the shear correctly
        self.MergedMeshes[mid] = finalMesh; //keep the final mesh in an associative array

        self.scene.add(finalMesh); //add it to the scene to be rendered
    }

    //When a shape is removed
    self.removeCalls.push(function (shape)
    {
        var id = shape.id;
        if (id in this.ShapeSubscriptions) {
            for (var t in this.ShapeSubscriptions[id])
                this.ShapeSubscriptions[id][t].dispose();
            delete this.ShapeSubscriptions[id];
        }

        var mid = shape.appearance.material; //material ID of the mesh
        if (id in this.Meshes) {
            //TODO there is something wrong about these calls
            //this.Meshes[id].geometry.dispose(); //remove the geometry from the memory
            //this.Meshes[id].material.dispose(); //remove the material from the memory
            delete this.Meshes[id]; //delete the mesh from the map of meshes
        }
        if (id in this.Seeds)
            delete this.Seeds[id]; //delete the shapeId to seedID connection
        //Regenerate the merged material mesh
        if (mid in this.MergedMeshes) {
            this.scene.remove(this.MergedMeshes[mid]); //remove the mesh from the scene
            delete this.MergedMeshes[mid];
        }
    });

    //When a seed is enabled
    self.enableCalls.push(function (shape) {
        var id = shape.id;
        if (id in this.Meshes) {
            this.scene.add(this.Meshes[id]);
        }
        else
            this.addShape(shape);
    });

    //When a seed is disabled
    self.disableCalls.push(function (shape) {
        var id = shape.id;
        this.scene.remove(this.Meshes[id]); //just remove the mesh from the shape
        //the mesh stays in the memory and will be updated if necessary
    });

    return self;
}
