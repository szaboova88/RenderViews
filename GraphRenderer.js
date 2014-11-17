function GraphRenderer(domQuery) { //for a whole window call with domQuery "<body>"
    //inherit the base class
    var self = AbstractRenderer(domQuery);
    self.initialized = false;
    self.IsInitialized = function () {
        if (!self.initialized) {
            self.initialized = true;
            return false;
        }
        else
            return true;
    }
    
    self.initCalls.push(function () {
        window.console&&console.log('Just loaded');
        $(domQuery).text("Just loaded the graph renderer.");
    });
    
    return self;
}
