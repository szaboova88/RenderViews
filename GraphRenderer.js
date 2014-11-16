function GraphRenderer(domQuery) { //for a whole window call with domQuery "<body>"
    //inherit the base class
    var self = AbstractRenderer(domQuery);

    self.IsInitialized = function () {
        alert('Just loaded');
        return false;
    }
    
    return self;
}
