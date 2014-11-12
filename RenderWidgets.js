var RenderWidgets = {
    Instances: ko.observableArray(),

    AddRenderer: function (renderer) {
        this.Instances.push(renderer);
    },

    InitializeAll: function()
    {
        ko.utils.arrayForEach(this.Instances(), function (item) {
            if (!item.IsInitialized())
                item.Init();//.apply(item);
        });
    },

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