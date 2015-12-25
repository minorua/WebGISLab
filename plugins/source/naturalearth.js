// naturalearth.js
// (C) 2015 Minoru Akagi | MIT License
// https://github.com/minorua/WebGISLab
// Dependencies: jQuery, OpenLayers 3

// Natural Earth
// http://www.naturalearthdata.com/

(function () {
  var plugin = {
    name: 'Natural Earth',
    path: 'source/naturalearth.js',
    type: 'source',
    description: 'Adds olapp.source.NaturalEarth'
  };

  var layers = [
    {
      id: 'cl',
      title: 'Coastline',
      filename: 'ne_110m_coastline.js'
    },
    {
      id: 'la',
      title: 'Land',
      filename: 'ne_110m_land.js'
    },
    {
      id: 'oc',
      title: 'Ocean',
      filename: 'ne_110m_ocean.js'
    },
    {
      id: 'g10',
      title: 'Graticules 10',
      filename: 'ne_110m_graticules_10.js'
    }
  ];

  /* olapp.source.NaturalEarth */
  olapp.source.NaturalEarth = new olapp.Source('Natural Earth (1:110m)', layers);
  olapp.source.NaturalEarth.createLayer = function (id, layerOptions) {
    var lyr = this.getLayerById(id);
    if (!lyr) return null;

    var options = {
      style: olapp.core.createStyleFunction(),
      title: lyr.title
    };
    var layer = new ol.layer.Vector($.extend(options, layerOptions));
    var url = 'files/ne/' + lyr.filename;
    olapp.core.project.loadLayerSource(layer, url);
    return layer;
  };

  // register this source
  olapp.source.register('Natural Earth', 'NaturalEarth', olapp.source.NaturalEarth);

  // register this plugin
  olapp.plugin.register(plugin.path, plugin);
})();
