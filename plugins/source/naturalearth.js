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

  var layerIds = ['cl', 'la', 'oc', 'g10'];
  var layers = {
    'cl': {
      name: 'Coastline',
      filename: 'ne_110m_coastline.js'
    },
    'la': {
      name: 'Land',
      filename: 'ne_110m_land.js'
    },
    'oc': {
      name: 'Ocean',
      filename: 'ne_110m_ocean.js'
    },
    'g10': {
      name: 'Graticules 10',
      filename: 'ne_110m_graticules_10.js'
    }
  };

  /*
  olapp.source.NaturalEarth
    inherits from olapp.source.Base
  */
  olapp.source.NaturalEarth = function () {
    olapp.source.Base.call(this);
    this.name = 'Natural Earth (1:110m)';
  };

  ol.inherits(olapp.source.NaturalEarth, olapp.source.Base);

  olapp.source.NaturalEarth.prototype.list = function () {
    var listItems = [];
    layerIds.forEach(function (id) {
      listItems.push({
        id: id,
        name: layers[id].name
      });
    });
    return listItems;
  };

  olapp.source.NaturalEarth.prototype.createLayer = function (id, layerOptions) {
    if (layerIds.indexOf(id) === -1) return null;

    var layer = new ol.layer.Vector({
      style: olapp.core.styleFunction
    });
    layer.title = layers[id].name;

    var url = 'files/ne/' + layers[id].filename;
    olapp.core.project.loadLayerSource(layer, url);

    return layer;
  };

  // register this source
  olapp.source.register('Natural Earth', 'NaturalEarth', olapp.source.NaturalEarth);

  // register this plugin
  olapp.plugin.register(plugin.path, plugin);
})();
