function GraphRenderer(domQuery) { //for a whole window call with domQuery "<body>"
    //inherit the base class
    var self = AbstractRenderer(domQuery);
    
    self.basicThreeRenderer = new BasicThreeRenderer(domQuery);

    self.IsInitialized = function () {
        return true;
    }
    
    self.initCalls.push(function () {
        window.console&&console.log('Just loaded');
    });
    
    return self;
}
