'use strict'
function ShapeNode(node, sid) {
    //ID of the shape
    this.id = node.ID;

    //Lock ID for the shape
    this.lockId = node.LockID;

    //The basic relations in the derivation tree:     
    //   parent    - parent ID (shape which was used to derive this one)
    //   rule      - rule ID which was used to derive this shape
    //   children  - array of children IDs (shapes which have been derived from this shape)
    //   seed      - seed ID
    this.relations = {
        parent: node.ParentID,
        rule: node.RuleID,        
        children: node.ChildrenIDs,
        seed: sid,
        IsLeaf: function () {
            return this.children.length == 0;
        }
    };
    if (node.RuleName)
        this.relations.ruleName = node.RuleName;
    
    if (node.Geometry) {
        //The geometry, materials and textures of the shape:    
        //    geometry    - an array of indexed triangle fans + a map of indexes to 3D positions (world coordinates)
        //    pivot       - pivot point of the geometry (in world coordinates)
        //    material    - ambient and diffuse material colors in RGB
        this.appearance = {
            geometry: node.Geometry,
            //pivot: node.Pivot,
            transformation: node.TransformationMatrix,
            material: node.MaterialID
        }
    }
    else {
        this.appearance = {
            primitive: node.GeometricPrimitive,
            transformation: node.TransformationMatrix,
            material: node.MaterialID
        }
    }

    //Semantic attributes of the shape which describe its qualities and quantities
    //    symbol     - the string symbol used for matching and derivation (will be probably abandoned in 2015)
    //    attributes - a map of attribute names and values (of arbitrary types)
    this.semantics = {
        symbol: ""
    }
    if (node.Semantics) {
        if ((node.Semantics.at)&&(Object.keys(node.Semantics.at).length > 0))
            this.semantics.attributes = node.Semantics.at;
        if ((node.Semantics.ta)&&(node.Semantics.ta.length > 0))
            this.semantics.tags = node.Semantics.ta;
        if ((node.Semantics.go)&&(Object.keys(node.Semantics.go).length > 0))
            this.semantics.goals = node.Semantics.go;
    }

    //Kinetic relations span a directed tree over the leaf shapes. It represents the kinetic skeleton of the model.
    //    parent    - kinetic parent of the shape (previous bone)
    //    children  - kinetic children of the shape (next bones)
    //    joint     - joint position (in world coordinates)
    this.kinetics = {
        parent: -1,
        children: [],
        joint: node.Joint
    }

    //Structures for interactive exploration of the views as knockout observables. Please subscribe to as many of these as possible.
    //    picked        - true when the mouse is over
    //    highlighted   - true when another element requested this shape to be highlighted (secondary selection, e.g. highlight all siblings of an element)
    //    selected      - true when the mouse has selected this shape (primary selection, e.g. one-click or rectangular selection)
    //    visible       - true when it should be rendered
    this.interaction = {
        picked: ko.observable(false),
        highlighted: ko.observable(false),
        selected: ko.observable(false),
        visible: ko.observable(this.relations.IsLeaf()),
        //draft of further properties, but this can be possibly handeled in a shader instead:
        opacity: ko.observable(1.0),
        saturation: ko.observable(1.0),
        deltaScale: ko.observable(1.0)
    }

    var self = this;

    //The user can lock paths or subtrees from 
    this.locking = {
        toRoot: ko.observable(false), //if true, the lock is activated from here to the root
        toChildren: ko.observable(false), //if true, the lock is activated from here to all children (up to the leafs)
        inherited: ko.observable(0), //number of inherited locks (it is considered being locked if the number > )0
    }

    this.locking.active = ko.computed(function () {
        return (self.locking.toRoot() || self.locking.toChildren() || (self.locking.inherited() > 0));
    });
    this.locking.control = ko.computed(function () {
        return (self.locking.toRoot() || self.locking.toChildren());
    });
    //?
    //this.DeltaTransformation = ko.observableArray([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

    //Propagation of locking
    this.locking.toRoot.subscribe(function (newValue) {
        var buffer = [];
        var seed = SeedWidgets.GetById(self.relations.seed);
        buffer.push(self.relations.parent);
        var offset = newValue ? +1 : -1;

        while (buffer.length > 0) {
            var pid = buffer.pop();
            var shape = seed.GetShape(pid);
            if (shape.relations.rule != "ROOT")
                buffer.push(shape.relations.parent);
            shape.locking.inherited(Math.max(0, shape.locking.inherited() + offset));
        }

        if (!newValue)
            self.locking.toChildren(false);        
    });

    this.locking.toChildren.subscribe(function (newValue) {
        var buffer = [];
        var seed = SeedWidgets.GetById(self.relations.seed);
        for (var i = 0; i < self.relations.children.length; ++i)
            buffer.push(self.relations.children[i]);
        var offset = newValue ? +1 : -1;

        while (buffer.length > 0) {
            var pid = buffer.pop();
            var shape = seed.GetShape(pid);
            for (var i = 0; i < shape.relations.children.length; ++i)
                buffer.push(shape.relations.children[i]);
            shape.locking.inherited(Math.max(0, shape.locking.inherited() + offset));
        }

        if (newValue)
            self.locking.toRoot(true);
    });
}
