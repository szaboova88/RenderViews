function MyRenderer(domQuery)
{
    var self = BasicThreeRenderer(domQuery);
    self.shadowMapEnabled = true;
    return self;
}

