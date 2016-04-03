'use strict'
var SeedWidgets = {
    Instances: ko.observableArray(),

    CreateSeed: function (data) {
        var result = window[data.Type](data.ID, data.Type.substring(0, data.Type.length - 4), data.Axiom, data.Position);    //creates a rule of the given type
        this.Instances.push(result);
        return result;
    },

    InstanceTemplate: function (seedInstance) {
        return seedInstance.SeedType() + "Template";
    },

    GetById: function (id) {
        var result = ko.utils.arrayFilter(this.Instances(), function (item) {
            return item.ID == id;
        }); //we return the first (and only) element of the array
        if (result.length > 0)
            return result[0];
        else
            return null;
    },

    RefreshView: function (elements) {
        var a = $("#seedsAccordion").accordion("option", "active");
        $("#seedsAccordion").accordion("refresh").accordion("option", "active", a); //kind of a bug fix, as the accordion was wrongly opening active-1
    }
}

function SeedAxiom(id, type, axiom, position) {
    this.ID = id; //A unique ID of the seed
    this.Name = ko.observable("Seed " + id); //String name of the seed
    this.Axiom = ko.observable(axiom); //what semantics it has (the axiom symbol for now)
    this.X = ko.observable(position.X); //position of the seed
    this.Y = ko.observable(position.Y);
    this.Z = ko.observable(position.Z);
    this.SeedType = ko.observable(type); 
    this.Enabled_bool = ko.observable(true); //this is the boolean variant of the Enabled flag. It stores the boolean data.
    //here is the string variant of the Enabled flag. It is computed based on the boolean version.
    this.Enabled = ko.computed({
        read: function () {
            return this.Enabled_bool() ? "ON" : "OFF";
        },
        write: function (value) {
            switch (value.toString().toLowerCase()) {
                case "on": case "true":
                    this.Enabled_bool(true); break;
                case "off": case "false":
                    this.Enabled_bool(false); break;
            }
        },
        owner: this
    });

    this.Name.subscribe(function (newVal) {
        PlayBlip();
        ws.publish("updateSeed", { ID: Math.abs(this.ID), Type: this.SeedType(), Attr: "Name", Value: newVal });
    }, this);

    this.Axiom.subscribe(function (newVal) {
        PlayBlip();
        ws.publish("updateSeed", { ID: Math.abs(this.ID), Type: this.SeedType(), Attr: "Axiom", Value: newVal });
    }, this);
    
    this.X.subscribe(function (newVal) {
        PlayBlip();
        ws.publish("updateSeed", { ID: Math.abs(this.ID), Type: this.SeedType(), Attr: "X", Value: newVal });
    }, this);
        
    this.Y.subscribe(function (newVal) {
        PlayBlip();
        ws.publish("updateSeed", { ID: Math.abs(this.ID), Type: this.SeedType(), Attr: "Y", Value: newVal });
    }, this);
    
    this.Z.subscribe(function (newVal) {
        PlayBlip();
        ws.publish("updateSeed", { ID: Math.abs(this.ID), Type: this.SeedType(), Attr: "Z", Value: newVal });
    }, this);
    
    this.RemoveClick = function (data, event) {
        event.stopPropagation();
        PlayBlip();
        ws.publish("removeSeed", { ID: Math.abs(this.ID), Type: this.SeedType() });
    }

    this.EnableClick = function (data, event) {
        event.stopPropagation();
        PlayBlip();
        ws.publish("updateSeed", { ID: Math.abs(this.ID), Type: this.SeedType(), Attr: "Enabled", Value: !this.Enabled_bool()});
    }

    this.Shapes = ko.observableArray();//.extend({ rateLimit: 100, method: "notifyWhenChangesStop" });
    this.shapeIndexes = [];

    this.GetShapeIndex = function(id)
    {
        if (id in this.shapeIndexes)
            return this.shapeIndexes[id];
        else
            return -1;
    }

    this.GetShape = function(id) {
        if (id in this.shapeIndexes)
            return this.Shapes()[this.shapeIndexes[id]];
        else
            return null;
    }

    this.AddShape = function(node) {
        var i = this.GetShapeIndex(node.ID);
        var sn = new ShapeNode(node, this.ID);
        if (i >= 0)
            this.Shapes()[i] = sn;
        else {
            this.shapeIndexes[node.ID] = this.Shapes().length;
            this.Shapes.push(sn);
        }

        return sn;
    }

    this.ClearAllShapes = function()
    {
        this.shapeIndexes = [];
        this.Shapes.removeAll();
    }

    this.GetParentShape = function(shapenode){
        return this.GetShape(shapenode.relations.parent);
    }

    this.GetChildrenShapes = function(shapenode)
    {
        var result = [];
        var array = shapenode.relations.children;
        for (i = 0; i < array.length; i++){
            result.push(this.GetShape(array[i]));
        }
        return result;
    }

    //this.FeedingShapes = function(active)
    //{
    //    if (active)
    //        this.Shapes.pause();
    //    else
    //        this.Shapes.resumeAndNotify();
    //}
}

function SeedsLogic(ws) {

    //http://stackoverflow.com/questions/10834796/validate-that-a-string-is-a-positive-integer
    var isNormalInteger = function (str) {
        var n = ~~Number(str);
        return String(n) === str && n >= 0;
    }

    var transformID = function (msg)
    {
        if (msg.hasOwnProperty("ID"))
            msg.ID = -msg.ID;
        else if (msg.hasOwnProperty("SeedID"))
            msg.SeedID = -msg.SeedID;
        else if (isNormalInteger(msg))
            msg = "-".concat(msg);
        else if (msg % 1 === 0) //isInteger check (http://www.2ality.com/2014/05/is-integer.html)
            msg = -msg;
        return msg;
    };

    ws.on("seedCreated", function (msg) {
        msg = transformID(msg);
        SeedWidgets.CreateSeed(msg);
        PlayBlap();
    });

    ws.on("seedUpdated", function (msg) {
        msg = transformID(msg);
        var seed = Widgets.Seeds.GetById(msg.ID);
        if (seed) {
            if (msg.Attr == "SeedType") {
                //SeedWidgets.RecreateSeed(rule, msg.Value + "Seed");
                return;
            }
            else {
                if (seed.hasOwnProperty(msg.Attr)) {
                    seed[msg.Attr](msg.Value);
                    return;
                }
                else {
                    ws.publish("seedError", { ID: msg.ID });
                }
            }
            PlayBlap();
        }
    });

    /*
    ws.on("seedMesh", function (msg) {
        onUpdateAxiom("Axiom" + msg.ID, msg.Triangles);
    });    
    */
    ws.on("seedMeshClear", function(msg)
    {
        msg = transformID(msg);
        var seed = SeedWidgets.GetById(parseInt(msg));
        if (seed)
            seed.ClearAllShapes();
    });

    ws.on("seedMeshLeafs", function (msg) {
        msg = transformID(msg);
        var seed = SeedWidgets.GetById(msg.SeedID);
        if (seed) {
            for (var item in msg.Shapes)
                seed.AddShape(msg.Shapes[item]);
            PlayBlap();
        }
    });
    
    ws.on("seedMeshNodes", function (msg) {
        msg = transformID(msg);
        var seed = SeedWidgets.GetById(msg.SeedID);
        if (seed) {
            for (var item in msg.Shapes)
                seed.AddShape(msg.Shapes[item]);
            PlayBlap();
        }
    });

    ws.on("seedRemoved", function (msg) {
        msg = transformID(msg);
        //onRemoveAxiom("Axiom" + msg);
        var seed = SeedWidgets.GetById(msg);
        if (seed) {
            seed.ClearAllShapes();
            SeedWidgets.Instances.remove(seed);
            PlayBlap();
        }
    });
}
