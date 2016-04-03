'use strict'

var BasicMaterials = (function () {
    //singleton pattern follows http://www.dofactory.com/javascript/singleton-design-pattern
    var instance = null;
    var fallback = new THREE.MeshNormalMaterial();

    function createInstance() {
        var obj = {
            Get: function (id) {
                if (this.hasOwnProperty(id))
                    return this[id];
                else
                    return null;
            },
            Set: function (id, material) {
                this[id] = material;
            },
            Groups: {}
        };
        return obj;
    }

    return {
        Get: function (id) {
            if (!instance) {
                instance = createInstance();
            }
            var result = instance.Get(id);
            return result ? result : fallback;
        },

        Set: function (id, material) {
            if (!instance) {
                instance = createInstance();
            }
            instance.Set(id, material);
        },

        ParseAndSet: function (id, m) {
            if (instance && instance.hasOwnProperty(id)) {
                return instance.Get(id);
            }
            else {

                var mat;
                var M = JSON.parse(m);
                if (M.hasOwnProperty("Specular")) {
                    mat = new THREE.MeshPhongMaterial();

                    mat.specular = new THREE.Color(M.Specular[0], M.Specular[1], M.Specular[2]);
                    mat.shininess = M.Shininess;
                }
                else {
                    mat = new THREE.MeshLambertMaterial();
                }

                mat.ambient = new THREE.Color(M.Ambient[0], M.Ambient[1], M.Ambient[2]);
                mat.color = new THREE.Color(M.Diffuse[0], M.Diffuse[1], M.Diffuse[2]);

                this.Set(id, mat);

                return mat;
            }
        },

        Clear: function(){
            //clear groups
            if (instance) {
                instance.Groups = {};
                instance = createInstance();
            }
        },

        Add: function (shape) {
            if (!instance) {
                instance = createInstance();
            }
            var mid = shape.appearance.material;
            if (!instance.Groups.hasOwnProperty(mid))
                instance.Groups[mid] = new Array();
            instance.Groups[mid].push(shape);
        },

        Groups: function () {
            if (instance)
                return instance.Groups;
            else
                return {};
        }
    };
})();
