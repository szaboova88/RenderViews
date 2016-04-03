'use strict'
var RenderWidgets = {
    Instances: ko.observableArray(),
    Main3D: null,

    AddRenderer: function (renderer) {
        this.Instances.push(renderer);
    },

    Add3DRenderer: function (renderer) {
        this.Main3D = renderer;
        this.Instances.push(renderer);
    },

    InitializeAll: function()
    {
        ko.utils.arrayForEach(this.Instances(), function (item) {
            if (!item.IsInitialized())
                item.Init();//.apply(item);
        });
    },

    UpdateComplete: function () {
        ko.utils.arrayForEach(this.Instances(), function (item) {
            if (item.IsInitialized() && item.OnUpdateCompleted)
                item.OnUpdateCompleted();
        });
    },

    UsePrerenderedImage: function (enabled) {
        ko.utils.arrayForEach(this.Instances(), function (item) {
            if (item.IsInitialized() && item.hasOwnProperty("imgOverride")) {
                item.imgOverride = enabled;
                if (item.container)
                    $(item.container).css({ opacity: enabled ? 0.001 : 1.0 });
            }
        });
    },

    MainCamera: function () {

        function MitsubaCam(camera) {
            var pos = camera.position;
            var up = camera.up;

            var x = new THREE.Vector3();
            var y = new THREE.Vector3();
            var z = new THREE.Vector3();
            camera.matrix.extractBasis(x, y, z);
            var result = camera.position.clone();
            result.sub(z);

            return { pos: pos.toArray().toString(), up: up.toArray().toString(), target: result.toArray().toString(), fov: camera.fov };
        }

        if (this.Main3D) {
            var container = this.Main3D.container;
            var cam = MitsubaCam(this.Main3D.camera);
                
            return {
                    width: container.innerWidth(),
                    height: container.innerHeight(),
                    pos: cam.pos,
                    up: cam.up,
                    target: cam.target,
                    fov: cam.fov
                };
        }
        else
            return null;
    }
    /*
    AllInitialized: function()
    {
        var result = true;
        ko.utils.arrayForEach(this.Instances, function (item) {
            result &= item.IsInitialized();
        });
    }
    */
}
