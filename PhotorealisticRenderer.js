function PhotorealisticRenderer(domQuery) {

// definition of my class PhotorealisticRenderer


    var self = BasicThreeRenderer(domQuery);
        
    self.renderer = null;
    self.scene = null;
    self.camera = null;
    self.shadowMapEnabled = true;
        
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

            //Plane for testing in case there are some problems receiving or processing the server data
            var plane = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshNormalMaterial());
            plane.position.z = -100;
            plane.position.y = -100;
            plane.overdraw = true;
            this.scene.add(plane);
            
            
            THREE.AmbientLight = function ( color ) {
	          THREE.Light.call( this, color );
	          this.type = 'AmbientLight';
            };

            THREE.AmbientLight.prototype = Object.create( THREE.Light.prototype );
            THREE.AmbientLight.prototype.clone = function () {
           	var light = new THREE.AmbientLight();
          	THREE.Light.prototype.clone.call( this, light );
          	return light;
            }
    });
    return self;
}