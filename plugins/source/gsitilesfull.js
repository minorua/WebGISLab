// gsitilesfull.js
// (C) 2015 Minoru Akagi | MIT License
// https://github.com/minorua/WebGISLab
// Dependencies: jQuery, OpenLayers 3

(function () {
  var plugin = {
    name: 'GSITiles (Full)',
    path: 'source/gsitilesfull.js',
    type: 'source',
    description: ''
  };
  // gsi-cyberjapan/layers-dot-txt-spec
  // https://github.com/gsi-cyberjapan/layers-dot-txt-spec/blob/master/list.md

  var attr = "<a href='http://maps.gsi.go.jp/development/ichiran.html' target='_blank'>地理院タイル</a>";

  function parseLayerGroup(layerGroup, titlePrefix) {
    var layers = [];
    layerGroup.entries.forEach(function (entry) {
      var title = (titlePrefix || '') + entry.title;
      if (entry.type == 'LayerGroup') {
        Array.prototype.push.apply(layers, parseLayerGroup(entry, title + '/'));
      }
      else {
        entry.name = title;
        layers.push(entry);
      }
    });
    return layers;
  }

  /* olapp.source['GSITiles n'] */
  var prms = [];
  [1, 2, 3, 4].forEach(function (index) {
    var sourceName = 'GSITiles ' + index;
    var url = 'https://raw.githubusercontent.com/gsi-cyberjapan/gsimaps/gh-pages/layers_txt/layers' + index + '.txt';
    prms.push($.getJSON(url).then(function (data) {
      var layers = parseLayerGroup(data.layers[0]);

      olapp.source[sourceName] = new olapp.Source('GSI (' + data.layers[0].title + ')', layers);
      olapp.source[sourceName].createLayer = function (id, layerOptions) {
        var lyr = this.getLayerById(id);
        if (!lyr) return null;

        var destProj = olapp.project.view.getProjection(),
            extentJp = ol.proj.transformExtent([122.7, 20.4, 154.8, 45.6], 'EPSG:4326', destProj);

        // TODO: attribution from the entry

        // source options
        var options = {
          attributions: [olapp.core.getAttribution(attr)],
          crossOrigin: 'anonymous',
          projection: 'EPSG:3857',
          tileGrid: ol.tilegrid.createXYZ({
            minZoom: lyr.minZoom || 0,
            maxZoom: lyr.maxZoom || 18    //
          }),
          url: lyr.url
        };
        var source = new ol.source.XYZ(options);

        // Create a layer
        options = {
          extent: extentJp,
          source: source,
          title: lyr.title
        };
        if (lyr.minZoom !== undefined) {
          options.maxResolution = olapp.tools.projection.resolutionFromZoomLevel(lyr.minZoom - 0.1);
        }
        return new ol.layer.Tile($.extend(options, layerOptions));
      };
      // Register this source
      olapp.source.register('Tiled Map', sourceName, olapp.source[sourceName]);
    }));
  });
  $.when.apply(this, prms).then(function () {
    // Register this plugin after all the sources have been registered.
    olapp.plugin.register(plugin.path, plugin);
  });
})();
