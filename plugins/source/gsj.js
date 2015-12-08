// gsj.js
// (C) 2015 Minoru Akagi | MIT License
// https://github.com/minorua/WebGISLab
// Dependencies: jQuery, OpenLayers 3

(function () {
  var plugin = {
    name: 'GSJ',
    path: 'source/gsj.js',
    type: 'source',
    description: 'Adds olapp.source.GSJ'
  };
  // Seamless Digital Geological Map of Japan (1:200,000)
  // https://gbank.gsj.jp/seamless/

  var layers = [
    {
      id: 'g',
      name: 'シームレス地質図 (詳細版)',
      matrixSet: 'g_set'
    }
  ];

  /* olapp.source.GSJ */
  olapp.source.GSJ = new olapp.Source('GSJ', layers);
  olapp.source.GSJ.createLayer = function (id, layerOptions) {
    var lyr = this.getLayerById(id);
    if (!lyr) return null;

    var options = {
      title: lyr.name
    };
    var gsjlayer = new ol.layer.Tile($.extend(options, layerOptions));

    var url = 'https://gbank.gsj.jp/seamless/tilemap/detailed/WMTSCapabilities.xml';
    $.ajax(url).then(function(response) {
      var parser = new ol.format.WMTSCapabilities();
      var result = parser.read(response);
      var options = ol.source.WMTS.optionsFromCapabilities(result, {
        layer: id,
        matrixSet: lyr.matrixSet,
        requestEncoding: 'REST'
      });
      options.crossOrigin = 'anonymous';

      var attr = "<a href='https://gbank.gsj.jp/seamless/' target='_blank'>シームレス地質図</a>";
      options.attributions = [olapp.core.getAttribution(attr)];

      gsjlayer.setSource(new ol.source.WMTS(options));
    });
    return gsjlayer;
  };

  // register this source
  olapp.source.register('Tiled Map', 'GSJ', olapp.source.GSJ);

  // register this plugin
  olapp.plugin.register(plugin.path, plugin);
})();
