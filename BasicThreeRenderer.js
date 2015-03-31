function BasicThreeRenderer(domQuery) { //for whole window call with domQuery "<body>"
    //A simple inhericance concept. We create an object of the AbstractRenderer type and then we change and extend it to our needs. At the end we return the self variable.
    var self = AbstractRenderer(domQuery);

    //A map with three meshes with shape IDs as keys
    self.Meshes = Array();
    //A map for mapping the shape IDs to seed IDs (backward relationship). Might become a part of SeedWidgets in future.
    self.Seeds = {};

    self.MeshData = {};

    //Three objects, please refer to any basic tutorial on three.js
    self.renderer = null;
    self.scene = null;
    self.camera = null;
    //Trackball controls
    self.controls = null;

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
            var doesWebGL = (function () { try { return !!window.WebGLRenderingContext && !!document.createElement('canvas').getContext('experimental-webgl'); } catch (e) { return false; } })();

            if (doesWebGL)
                this.renderer = new THREE.WebGLRenderer();
            else {
                if (doesCanvas)
                    this.renderer = new THREE.CanvasRenderer();
                else
                    alert('None of the Threejs renderers is supported on this machine :(');
            }

            //Sets the renderer window size to the size of the container where it will be attached
            this.renderer.setSize(this.container.innerWidth(), this.container.innerHeight());
            this.container.append(this.renderer.domElement); //attaches the <canvas> tag for the renderer as a child to the container element

            //Camera initialization
            this.camera = new THREE.PerspectiveCamera(50, this.container.innerWidth() / this.container.innerHeight(), 0.1, 1000); //field of view angle, aspect ratio, near clipping plane, far clipping plane
            //position of the camera
            this.camera.position.y = 5;
            this.camera.position.z = 4;
            this.camera.rotation.x = 45 * (Math.PI / 180);

            //Trackball controls initialization
            this.controls = new THREE.TrackballControls(this.camera, this.renderer.domElement);
            this.controls.rotateSpeed = 1.0;
            this.controls.zoomSpeed = 1.2;
            this.controls.panSpeed = 0.8;
            this.controls.noZoom = false;
            this.controls.noPan = false;
            this.controls.staticMoving = false;
            this.controls.dynamicDampingFactor = 0.3;
            this.controls.keys = [65, 83, 68];

            //Make the renderer adaptable to changes of the container size
            $(this.container).addClass("canvas-resizable"); //Normally the resize event may be bound only to the Window object. But we propagate it using jquery to all elements of the "canvas-resizable" class. Therefore we set the container to be a member of that class.
            //When the container gets resized
            $(this.container).resize(function () {
                self.renderer.setSize(self.container.innerWidth(), self.container.innerHeight()); //new renderer window size
                self.camera.aspect = self.container.innerWidth() / self.container.innerHeight(); //new aspect ratio
                self.camera.updateProjectionMatrix();
                self.controls.handleResize(); //update the trackball controls as well
            });

            //Background of the canvas
            this.renderer.setClearColorHex(0xffffff, 1); //white
            //Our main scene
            this.scene = new THREE.Scene();
            var ambiColor = "#0c0c0c";
            var ambientLight = new THREE.AmbientLight(ambiColor);
            this.scene.add(ambientLight);
            
            var spotLight = new THREE.SpotLight( 0xffffff );
            this.scene.add(spotLight);

            //Plane for testing in case there are some problems receiving or processing the server data
            //var plane = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshNormalMaterial());
            //plane.position.z = -100;
            //plane.position.y = -100;
            //plane.overdraw = true;
            //this.scene.add(plane);
        }
    });

    self.updateCalls.push(function () {
        this.controls.update(); //trackball controls update
    });

    self.renderCalls.push(function () {
        this.renderer.render(this.scene, this.camera);
    });


    //Push in a method for adding new shapes
    //Nothice that since the addCalls members are invoked by call(this, shape) the "this" context stays preserved and there is no need to use the self variable
    self.addCalls.push(function (shape) {
        var id = shape.id;

        //If there was any mesh for the current shape, remove it from the scene
        if (id in this.Meshes)
            this.scene.remove(this.Meshes[id]);

        //Create a new geometry object
        var geo = new THREE.Geometry();

        //The geometry of the shape is stored as a list of indexed triangle fans.
        var indices = shape.appearance.geometry.TriFans; //indexes
        var vertices = shape.appearance.geometry.VPos; //positions

        var verticesLength = Object.keys(vertices).length; //Count of positions
        for (var i = 0; i < verticesLength; ++i) {
            var v = vertices[i].slice(1, vertices[i].length - 1).replace(/,/g, '.').split(';') //Convert the string representation of the 3D point to a float[3]
            geo.vertices.push(new THREE.Vector3(parseFloat(v[0]), parseFloat(v[1]), parseFloat(v[2]))); //and store it to the list of geometry's vertices
        }

        for (var i = 0; i < indices.length; ++i) {
            var fan = indices[i];

            for (var j = 2; j < fan.length; ++j) {
                geo.faces.push(new THREE.Face3(fan[0], fan[j - 1], fan[j]));
            }
        }

        //Compute normals for the mesh
        geo.computeFaceNormals();

        //In this bsic renderer, since there are no lights we use a material coloring the vertices according to their normal
        var mat = new THREE.MeshNormalMaterial();
        //mat.side = THREE.DoubleSide; //render also when the orientation of the triangles is wrong (i.e. their normal points in the same half-dome as the viewing vector)
        var mesh = new THREE.Mesh(geo, mat);
        mesh.overdraw = true;
        mesh.name = id; //this will help us to recover the shape object when a mesh is picked by the mouse

        //add the created mesh to the scene only if it is visible
        //TODO this should be better done in a lazy way, so that the mesh is created and stored in the map of meshes first after the mesh becomes visible first
        if (shape.interaction.visible()) 
            this.scene.add(mesh); //the created mesh is added to the scene
        
        //a subscription to the visible property is created and added to the list of subscriptions
        visCallback = shape.interaction.visible.subscribe(function (newValue) {
            newValue ? this.scene.add(this.Meshes[id]) : this.scene.remove(this.Meshes[id]);
        }, this);
        this.addsubscription(id, "visible", visCallback);

        this.Meshes[id] = mesh; //remember the mesh also in the map of meshes
        this.Seeds[id] = shape.relations.seed; //remeber the backward relation of shapeID to seedID
    });

    //When a shape is removed
    self.removeCalls.push(function (shape)
    {
        var id = shape.id;
        if (id in this.Subscriptions) {
            for (t in this.Subscriptions[id])
                this.Subscriptions[id][t].dispose();
            delete this.Subscriptions[id];
        }
        if (id in this.Meshes) {
            this.scene.remove(this.Meshes[id]); //remove the mesh from the scene
            //TODO there is something wrong about these calls
            //this.Meshes[id].geometry.dispose(); //remove the geometry from the memory
            //this.Meshes[id].material.dispose(); //remove the material from the memory
            delete this.Meshes[id]; //delete the mesh from the map of meshes
        }
        if (id in this.Seeds)
            delete this.Seeds[id]; //delete the shapeId to seedID connection
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
