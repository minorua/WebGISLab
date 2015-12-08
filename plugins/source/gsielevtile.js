// gsielevtile.js
// (C) 2015 Minoru Akagi | MIT License
// https://github.com/minorua/WebGISLab
// Dependencies: jQuery, OpenLayers 3

olapp.core.loadScript('js/source/gsielevtile.js').then(function () {
  var plugin = {
    name: 'GSIElevTile',
    path: 'source/gsielevtile.js',
    type: 'source',
    description: 'Adds olapp.source.GSIElevTile.'
  };

  var layers = [
    {
      id: 'hillshade',
      name: '陰影図 (標高タイル)',
      zmin: 0,
      zmax: 14
    },
    {
      id: 'relief',
      name: '段彩図 (標高タイル)',
      zmin: 0,
      zmax: 14
    },
    {
      id: 'relief_low',
      name: '低標高向けカラー標高図 (標高タイル)',
      zmin: 0,
      zmax: 14
    },
    {
      id: 'slope',
      name: '傾斜区分図 (標高タイル. z>=10)',
      zmin: 10,
      zmax: 14
    },
    {
      id: 'slope_steep',
      name: '急傾斜地図 (標高タイル. z>=10)',
      zmin: 10,
      zmax: 14
    }
  ];

  /* olapp.source.GSIElevTile */
  olapp.source.GSIElevTile = new olapp.Source('GSI Elevation Tile', layers);
  olapp.source.GSIElevTile.createLayer = function (id, layerOptions) {
    var lyr = this.getLayerById(id);
    if (!lyr) return null;

    var attr = "<a href='http://maps.gsi.go.jp/development/ichiran.html' target='_blank'>地理院タイル</a>";
    var mode = id.split('_')[0];
    var colorMap, colorInterpolation;

    if (id == 'relief_low') {
      colorMap = [
        [  -5, 255,   0, 196],
        [   0, 115,   0, 255],
        [   0, 234, 246, 253],
        [0.01, 234, 246, 253],
        [0.01,  50,   0, 255],
        [ 0.5, 115, 178, 255],
        [   1, 114, 212, 254],
        [  10,  71, 234,   0],
        [  10,  50,  50,  50]
      ];
      colorInterpolation = 'linear';
    }
    else if (id == 'slope_steep') {
      colorMap = [
        [ 30, 255, 255,   0],
        [ 40, 255,   0,   0],
        [ 50, 139,  69,  19],
        [ 90,   0,   0,   0]
      ];
    }

    // source options
    var options = {
      attributions: [olapp.core.getAttribution(attr)],
      mode: mode,
      colorMap: colorMap,
      colorInterpolation: colorInterpolation,
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
      title: lyr.name
    };
    if (lyr.zmin > 2) options.maxResolution = olapp.tools.projection.resolutionFromZoomLevel(lyr.zmin - 0.1);

    return new ol.layer.Tile($.extend(options, layerOptions));
  };

  // register this source
  olapp.source.register('Tiled Map', 'GSIElevTile', olapp.source.GSIElevTile);

  // register this plugin
  olapp.plugin.register(plugin.path, plugin);
});