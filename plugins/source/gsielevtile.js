// gsielevtile.js
// (C) 2015 Minoru Akagi | MIT License
// https://github.com/minorua/WebGISLab
// Dependencies: jQuery, OpenLayers 3

olapp.core.loadScript('plugins/ol/gsielevtile.js', function () {
  var plugin = {
    name: 'GSIElevTile',
    path: 'source/gsielevtile.js',
    type: 'source',
    description: 'Adds olapp.source.GSIElevTile.'
  };

  var layerIds = ['hillshade', 'relief', 'slope', 'relief_low', 'heyja'];
  var layers = {
    'hillshade': {      // TODO: implement
      name: '陰影図 (標高タイル)',
      zmin: 0,
      zmax: 14
    },
    'relief': {
      name: '段彩図 (標高タイル)',
      zmin: 0,
      zmax: 14
    },
    'slope': {
      name: '傾斜区分図 (標高タイル) (z>=10)',
      zmin: 10,
      zmax: 14
    },
    'relief_low': {     // TODO: implement (-10m～30m)
      name: '低標高向けカラー標高図 (標高タイル)',
      zmin: 0,
      zmax: 14
    },
    'heyja': {     // TODO: implement (傾斜が一定以上の部分を塗りつぶす)
      name: '傾斜地塗りつぶし図 (標高タイル)',
      zmin: 0,
      zmax: 10     //
    }
  };

  /* olapp.source.GSIElevTile */
  olapp.source.GSIElevTile = new olapp.Source('GSI Elevation Tile', layerIds, layers);
  olapp.source.GSIElevTile.createLayer = function (id, layerOptions) {
    if (layerIds.indexOf(id) === -1) return null;

    var lyr = layers[id];
    var attr = "<a href='http://maps.gsi.go.jp/development/ichiran.html' target='_blank'>地理院タイル</a>";

    // source options
    var options = {
      attributions: [olapp.core.getAttribution(attr)],
      mode: id,
      projection: 'EPSG:3857',
      tileGrid: ol.tilegrid.createXYZ({
        minZoom: lyr.zmin,
        maxZoom: lyr.zmax
      }),
      url: 'http://cyberjapandata.gsi.go.jp/xyz/dem/{z}/{x}/{y}.txt'
    };

    // layer options
    var destProj = olapp.project.view.getProjection(),
        extentJp = ol.proj.transformExtent([122.7, 20.4, 154.8, 45.6], 'EPSG:4326', destProj);
    options = {
      extent: extentJp,
      source: new ol.source.GSIElevTile(options),
      title: layers[id].name
    };
    if (lyr.zmin > 2) options.maxResolution = olapp.tools.projection.resolutionFromZoomLevel(lyr.zmin - 0.1);

    return new ol.layer.Tile($.extend(options, layerOptions));
  };

  // register this source
  olapp.source.register('Tiled Map', 'GSIElevTile', olapp.source.GSIElevTile);

  // register this plugin
  olapp.plugin.register(plugin.path, plugin);
});