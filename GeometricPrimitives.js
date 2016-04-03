'use strict'
var GeometricPrimitives = (function () {
    //singleton pattern follows http://www.dofactory.com/javascript/singleton-design-pattern
    var instance;

    function createInstance() {
        var obj = {
            //by http://stackoverflow.com/questions/21462851/flip-normals-in-three-js-on-sphere
            Invert: function (geometry) {
                for (var i = 0; i < geometry.faces.length; i++) {

                    var face = geometry.faces[i];
                    var temp = face.a;
                    face.a = face.c;
                    face.c = temp;
                }

                //geometry.computeFaceNormals();
                //geometry.computeVertexNormals();

                var faceVertexUvs = geometry.faceVertexUvs[0];
                for (var i = 0; i < faceVertexUvs.length; i++) {

                    var temp = faceVertexUvs[i][0];
                    faceVertexUvs[i][0] = faceVertexUvs[i][2];
                    faceVertexUvs[i][2] = temp;
                }

                return geometry;
            },

            twoDextrude: {
                amount: 1.0,
                steps: 1,
                bevelEnabled: false,
                extrudePath: new THREE.LineCurve3(new THREE.Vector3(0.0, 0.0, -0.5), new THREE.Vector3(0.0, 0.0, 0.5))
            },

            rot90Z: new THREE.Matrix4().makeRotationZ(Math.PI * 0.5),

            archShape: new THREE.Shape(),     

            prismPts: [],
            prismShape: {},

            rot90Y: new THREE.Matrix4().makeRotationY(-Math.PI * 0.5),

            Get: function (name, direct) {
                if (direct) {
                    switch (name) {
                        case "Arch": return this.threeArchPrimitive; break;
                        case "Box": return this.threeBoxPrimitive; break;
                            //case "Circle": return new THREE.CircleGeometry(data.p["radius"], 36); break;
                        case "Circle": return this.threeCirclePrimitive; break;
                        case "Cone": return this.threeConePrimitive; break;
                        case "Cylinder": return this.threeCylinderPrimitive; break;
                            //case "Extrude":
                        case "Dodecahedron": return this.threeDodecahedronPrimitive; break;
                        case "Icosahedron": return this.threeIcosahedronPrimitive; break;
                            //case "Lathe":
                        case "Octahedron": return this.threeOctahedronPrimitive; break;
                            //case "Parametric":
                        case "Plane": return this.threePlanePrimitive; break;
                        case "Prism": return this.threePrismPrimitive; break;
                        case "Gable": return this.threeGablePrimitive; break;
                        case "PrismRing": return this.threePrismRingPrimitive; break;
                            //case "Polyhedron":
                        case "Ring": return this.threeRingPrimitive; break;
                            //case "Shape":
                        case "Sphere": return this.threeSpherePrimitive; break;
                            //case "Tetrahedron":
                            //case "Text":
                        case "Torus": return this.threeTorusPrimitive; break;
                            //case "TorusKnot":
                            //case "Tube":
                    }
                }
                else {
                    switch (name) {
                        case "Arch": return this.threeArchInversePrimitive; break;
                        case "Box": return this.threeBoxInversePrimitive; break;
                        case "Circle": return this.threeCircleInversePrimitive; break;
                        case "Cone": return this.threeConeInversePrimitive; break;
                        case "Cylinder": return this.threeCylinderInversePrimitive; break;
                        case "Dodecahedron": return this.threeDodecahedronInversePrimitive; break;
                        case "Icosahedron": return this.threeIcosahedronInversePrimitive; break;
                        case "Octahedron": return this.threeOctahedronInversePrimitive; break;
                        case "Plane": return this.threePlaneInversePrimitive; break;
                        case "Prism": return this.threePrismInversePrimitive; break;
                        case "Gable": return this.threeGableInversePrimitive; break;
                        case "PrismRing": return this.threePrismRingInversePrimitive; break;
                        case "Ring": return this.threeRingInversePrimitive; break;
                        case "Sphere": return this.threeSphereInversePrimitive; break;
                        case "Torus": return this.threeTorusInversePrimitive; break;
                    }
                }
            }
        };

        obj.archShape.moveTo(-0.5, -0.5);
        obj.archShape.absellipse(0, -0.5, 0.5, 1.0, Math.PI * 0, Math.PI, false);
        obj.archShape.lineTo(0.5, 0.5);
        obj.archShape.lineTo(-0.5, 0.5);
        obj.archShape.lineTo(-0.5, -0.5);
        //http://mrdoob.github.io/three.js/examples/webgl_geometry_shapes.html
        //http://www.thisiscarpentry.com/2012/01/06/circular-based-arches-part-1/
        //https://www.mixeelabs.com/creator/tutorial:-advanced-geometries/edit
        obj.threeArchPrimitive = new THREE.ExtrudeGeometry(obj.archShape, obj.twoDextrude);
        obj.threeArchInversePrimitive = obj.Invert(new THREE.ExtrudeGeometry(obj.archShape, obj.twoDextrude));
        obj.threeArchPrimitive.applyMatrix(obj.rot90Z);
        obj.threeArchInversePrimitive.applyMatrix(obj.rot90Z);
        obj.threeArchPrimitive.dynamic = false;
        obj.threeArchInversePrimitive.dynamic = false;

        obj.threeBoxPrimitive = new THREE.BoxGeometry(1, 1, 1);
        obj.threeBoxInversePrimitive = obj.Invert(new THREE.BoxGeometry(1, 1, 1));
        obj.threeBoxPrimitive.dynamic = false;
        obj.threeBoxInversePrimitive.dynamic = false;

        obj.threeSpherePrimitive = new THREE.SphereGeometry(0.5, 24, 24);
        obj.threeSphereInversePrimitive = obj.Invert(new THREE.SphereGeometry(0.5, 24, 24));
        obj.threeSpherePrimitive.dynamic = false;
        obj.threeSphereInversePrimitive.dynamic = false;

        obj.threeCylinderPrimitive = new THREE.CylinderGeometry(0.5, 0.5, 1.0, 36);
        obj.threeCylinderInversePrimitive = obj.Invert(new THREE.CylinderGeometry(0.5, 0.5, 1.0, 36));
        obj.threeCylinderPrimitive.dynamic = false;
        obj.threeCylinderInversePrimitive.dynamic = false;

        obj.threeCirclePrimitive = new THREE.CircleGeometry(0.5, 36);
        obj.threeCircleInversePrimitive = obj.Invert(new THREE.CircleGeometry(0.5, 36));
        obj.threeCirclePrimitive.dynamic = false;
        obj.threeCircleInversePrimitive.dynamic = false;

        obj.threeConePrimitive = new THREE.CylinderGeometry(0.0, 0.5, 1.0, 36);
        obj.threeConeInversePrimitive = obj.Invert(new THREE.CylinderGeometry(0.0, 0.5, 1.0, 36));
        obj.threeConePrimitive.dynamic = false;
        obj.threeConeInversePrimitive.dynamic = false;

        obj.threeDodecahedronPrimitive = new THREE.DodecahedronGeometry(0.5);
        obj.threeDodecahedronInversePrimitive = obj.Invert(new THREE.DodecahedronGeometry(0.5));
        obj.threeDodecahedronPrimitive.dynamic = false;
        obj.threeDodecahedronInversePrimitive.dynamic = false;

        obj.threeIcosahedronPrimitive = new THREE.IcosahedronGeometry(0.5);
        obj.threeIcosahedronInversePrimitive = obj.Invert(new THREE.IcosahedronGeometry(0.5));
        obj.threeIcosahedronPrimitive.dynammic = false;
        obj.threeIcosahedronInversePrimitive.dynamic = false;

        obj.threeOctahedronPrimitive = new THREE.OctahedronGeometry(0.5);
        obj.threeOctahedronInversePrimitive = obj.Invert(new THREE.OctahedronGeometry(0.5));
        obj.threeOctahedronPrimitive.dynamic = false;
        obj.threeOctahedronInversePrimitive.dynamic = false;

        obj.threePlanePrimitive = new THREE.PlaneGeometry(1, 1, 3, 3);
        obj.threePlaneInversePrimitive = obj.Invert(new THREE.PlaneGeometry(1, 1, 3, 3));
        obj.threePlanePrimitive.dynamic = false;
        obj.threePlaneInversePrimitive.dynamic = false;

        obj.prismPts.push(new THREE.Vector2(0.5, -0.5));
        obj.prismPts.push(new THREE.Vector2(0.5, 0.5));
        obj.prismPts.push(new THREE.Vector2(-0.5, 0.0));
        obj.prismShape = new THREE.Shape(obj.prismPts);
        obj.threePrismPrimitive = new THREE.ExtrudeGeometry(obj.prismShape, obj.twoDextrude);
        obj.threePrismInversePrimitive = obj.Invert(new THREE.ExtrudeGeometry(obj.prismShape, obj.twoDextrude));
        obj.threePrismPrimitive.dynamic = false;
        obj.threePrismInversePrimitive.dynamic = false;

        obj.threeGablePrimitive = new THREE.ExtrudeGeometry(obj.prismShape, obj.twoDextrude);
        obj.threeGableInversePrimitive = obj.Invert(new THREE.ExtrudeGeometry(obj.prismShape, obj.twoDextrude));
        obj.threeGablePrimitive.applyMatrix(obj.rot90Y);
        obj.threeGableInversePrimitive.applyMatrix(obj.rot90Y);
        obj.threeGablePrimitive.dynamic = false;
        obj.threeGableInversePrimitive.dynamic = false;

        obj.threeRingPrimitive = new THREE.RingGeometry(0.25, 0.5, 24, 24);
        obj.threeRingInversePrimitive = obj.Invert(new THREE.RingGeometry(1, 1, 24, 24));
        obj.threeRingPrimitive.dynamic = false;
        obj.threeRingInversePrimitive.dynamic = false;

        obj.threeTetrahedronPrimitive = new THREE.TetrahedronGeometry(0.5);
        obj.threeTetrahedronInversePrimitive = obj.Invert(new THREE.TetrahedronGeometry(0.5));
        obj.threeTetrahedronPrimitive.dynamic = false;
        obj.threeTetrahedronInversePrimitive.dynamic = false;

        obj.threeTorusPrimitive = new THREE.TorusGeometry(0.375, 0.125, 16, 36);
        obj.threeTorusInversePrimitive = obj.Invert(new THREE.TorusGeometry(0.375, 0.12, 16, 36));
        obj.threeTorusPrimitive.dynamic = false;
        obj.threeTorusInversePrimitive.dynamic = false;

        return obj;
    }

    //a modified getInstance, since this is actually a factory for geometric primitives implemented as a singleton
    return {
        Get: function (name, direct) {
            if (!instance) {
                instance = createInstance();
            }
            return instance.Get(name, direct);
        }
    };
})();

