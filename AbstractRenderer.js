'use strict'
//This is an abstract class for a renderer. It connects to the data view model, but it presents nothing.
function AbstractRenderer(domQuery) { //for whole window call with domQuery "<body>"
    //Create an empty object. We will return it at the end of this function call.
    var result = {};

    result.containerQuery = domQuery; //Stores the DOM container of the renderer. It should be a tring query for jQuery; e.g. if it is a div with id="abc" then domQuery will be "#abc"

    //A multi-value map which stores IDs of shapes as keys and as values objects with subscriptions set as the properties of the objects
    result.ShapeSubscriptions = {};
    result.SeedSubscriptions = {};

    //Arrays of calls. Renderers inheriting from this abstract one should push their methods here. Functions in these arrays should never be called (i.e. executed) directly, but only using the functions defined below.
    result.initCalls = []; //initialization (called only once)
    result.updateCalls = []; //per frame update of interaction, e.g. ray cast query (see animate() function)
    result.renderCalls = []; //per frame drawing (see animate() function)
    result.resizeCalls = []; //called each time the window is resized

    result.addCalls = []; //add new shape to the renderer
    result.removeCalls = []; //remove a shape from the renderer
    result.enableCalls = []; //enable rendering of a seed and all of its shapes
    result.disableCalls = []; //disable rendering of a seed and all of its shapes
    result.startCalls = []; //when the camera starts to move rendering is activated again

    result.renderingEnabled = true;
    result.requestStopRendering = true; //no rendering once the camera stops moving

    result.animationFrameId = 0; //in order to be able to cancel the requestAnimationFrame cycle

    //Returns true when the renderer has been initialized. lways override this function when inheriting from this renderer.
    result.IsInitialized = function () {
        return false;
    }

    result.EnableSeed = function (shape) {
        for (var i = 0, l = this.enableCalls.length; i < l; i++) {
            this.enableCalls[i].call(this, shape);
        }
        this.render();
    }

    result.DisableSeed = function (shape) {
        for (var i = 0, l = this.disableCalls.length; i < l; i++) {
            this.disableCalls[i].call(this, shape);
        }
        this.render();
    }

    result.render = function () {
        if (this.renderingEnabled) {
            for (var i = 0, l = this.renderCalls.length; i < l; i++) {
                this.renderCalls[i].call(this);
            }

            if (this.requestStopRendering) {
                this.requestStopRendering = false;
                this.renderingEnabled = false;
            }
        }
    }

    result.EnableRendering = function() {
        for (var i = 0, l = result.startCalls.length; i < l; i++)
            result.startCalls[i].call(result);
        result.renderingEnabled = true;
        result.requestStopRendering = false;
        result.animate();
    }

    result.DisableRendering = function() {
        result.requestStopRendering = true;
        result.animate();
    }

    result.RenderSingleFrame = function() {
        for (var i = 0, l = this.renderCalls.length; i < l; i++) {
            this.renderCalls[i].call(this);
        }
    }

    result.Update = function () {
        for (var i = 0, l = this.updateCalls.length; i < l; i++) {
            this.updateCalls[i].call(this);
        }
    }

    result.Resize = function () {
        for (var i = 0, l = this.resizeCalls.length; i < l; i++) {
            this.resizeCalls[i].call(this);
        }
        this.RenderSingleFrame();
    }

    //called once per frame, executes all updates and renders the result
    result.animate = function () {
        this.Update();
        this.render();

        if (this.renderingEnabled)
            requestAnimationFrame(this.animate.bind(this));
    }

    result.Init = function () {
        for (var i = 0, l = this.initCalls.length; i < l; i++) {
            this.initCalls[i].call(this);
        }
        this.animate();
    }

    result.addShape = function (shape) {
        for (var i = 0, l = this.addCalls.length; i < l; i++) {
            this.addCalls[i].call(this, shape);
        }
        this.render();
    }

    result.removeShape = function (shape) {
        for (var i = 0, l = this.removeCalls.length; i < l; i++) {
            this.removeCalls[i].call(this, shape);
        }
        this.render();
    }

    result.addShapeSubscription = function (id, name, callback) {
        if (result.ShapeSubscriptions.hasOwnProperty(id)) {
            result.ShapeSubscriptions[id][name] = callback;
        }
        else {
            var obj = {};
            obj[name] = callback;
            result.ShapeSubscriptions[id] = obj;
        }
    }

    //When a new seed is added the renderer subscribes to its shapes storage here, so that it will be notified on any further modificatioins
    result.AddSeedSubscription = function (self, seed) {
        //A new subscription for the shapes observable array is created
        var shapesSubscription = seed.Shapes.subscribe(function (shapeChanges) { //shapeChanges contains the list of changes which happened since the last call of this function
            ko.utils.arrayForEach(shapeChanges, function (shape) { //for each change in the array
                switch (shape.status) {
                    case "added":
                        self.addShape(shape.value);
                        break;
                    case "deleted":
                        self.removeShape(shape.value);
                        break;
                }
            });
        }, null, "arrayChange"); //the last parameter tells the method to subscribe to the diff. Otherwise we would get the whole array on input of the callback. That would inefficint for small local changes which occur the most often.

        //Add the shaped already existing in the seed's shape storage.
        //seed.Shapes() must be used as a function call since it is a knockout observable array
        ko.utils.arrayForEach(seed.Shapes(), function (shape) {
            self.addShape(shape);
        });

        //Also a new subscription for the on/off switch of the seed is created
        var onOffSubscription = seed.Enabled_bool.subscribe(function (enabled) {
            ko.utils.arrayForEach(seed.Shapes(), function (shape) {
                enabled ? self.EnableSeed(shape) : self.DisableSeed(shape);
            });
        });

        //Both subscriptions to the seed are stored in a singe object and added to the map of subscriptions. Note that there mey be only a single value for each seed.ID, therefore we wrap the two subscriptions to a new object.
        self.SeedSubscriptions[seed.ID] = { shapes: shapesSubscription, enabled: onOffSubscription };
    }

    //When a seed is removed, we need to cancel and destroy all subscriptions
    result.RemoveSeedSubscription = function (self, seed) {
        var id = seed.value.ID;
        if (id in self.SeedSubscriptions) { //If there are any subscriptions stored for this id
            for (t in self.SeedSubscriptions[id]) //get the subscriptions object for this id
                self.SeedSubscriptions[id][t].dispose(); //dispose all subscriptions stored in the object
            delete self.SeedSubscriptions[id]; //delete the whole object from the map of subscriptions
        }        
    }

    //Subscribe to new seeds which will arrive. They are stored in the observable array SeedWidgets.Instances
    SeedWidgets.Instances.subscribe(function (seedChanges) {
        var self = this;
        ko.utils.arrayForEach(seedChanges, function (seed) {
            switch (seed.status) {
                case "added":
                    self.AddSeedSubscription(self, seed.value);
                    break;
                case "deleted":
                    self.RemoveSeedSubscription(self, seed);
                    break;
            }
        });
    }, result, "arrayChange");

    //We also must subscribe to the existing seeds
    ko.utils.arrayForEach(SeedWidgets.Instances(), function (seed) {
        this.AddSeedSubscription(this, seed);
    }.bind(result)); //bind sets the this scope for the function to "result". Otherwise it would be the Window object and everything would break down.

    return result;
}
