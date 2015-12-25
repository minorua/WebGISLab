// gsitiles.js
// (C) 2015 Minoru Akagi | MIT License
// https://github.com/minorua/WebGISLab
// Dependencies: jQuery, OpenLayers 3

(function () {
  var plugin = {
    name: 'GSITiles',
    path: 'source/gsitiles.js',
    type: 'source',
    description: 'Adds olapp.source.GSITiles'
  };
  // GSI Tiles
  // http://maps.gsi.go.jp/development/
  var layers = [
    {
      id: 'std',
      title: '標準地図',
      format: 'png',
      zmin: 2,
      zmax: 18,
      zminJp: 9
    },
    {
      id: 'pale',
      title: '淡色地図',
      format: 'png',
      zmin: 12,
      zmax: 18
    },
    {
      id: 'blank',
      title: '白地図',
      format: 'png',
      zmin: 5,
      zmax: 14
    },
    {
      id: 'english',
      title: 'English',
      format: 'png',
      zmin: 5,
      zmax: 11
    },
    {
      id: 'relief',
      title: '色別標高図',
      format: 'png',
      zmin: 5,
      zmax: 15
    },
    {
      id: 'ort',
      title: '写真',
      format: 'jpg',
      zmin: 2,
      zmax: 18,
      zminJp: 5
    },
    {
      id: 'gazo1',
      title: '国土画像情報（第一期：1974～1978年撮影）',
      format: 'jpg',
      zmin: 10,
      zmax: 17
    },
    {
      id: 'gazo2',
      title: '国土画像情報（第二期：1979～1983年撮影）',
      format: 'jpg',
      zmin: 15,
      zmax: 17
    },
    {
      id: 'gazo3',
      title: '国土画像情報（第三期：1984～1986年撮影）',
      format: 'jpg',
      zmin: 15,
      zmax: 17
    },
    {
      id: 'gazo4',
      title: '国土画像情報（第四期：1988～1990年撮影）',
      format: 'jpg',
      zmin: 15,
      zmax: 17
    },
    {
      id: 'ort_old10',
      title: '空中写真（1961～1964年）',
      format: 'png',
      zmin: 15,
      zmax: 17
    },
    {
      id: 'ort_USA10',
      title: '空中写真（1945～1950年）',
      format: 'png',
      zmin: 15,
      zmax: 17
    },
    {
      id: 'airphoto',
      title: '簡易空中写真（2004年～）',
      format: 'png',
      zmin: 5,
      zmax: 18
    }
  ];

  var attr = "<a href='http://maps.gsi.go.jp/development/ichiran.html' target='_blank'>地理院タイル</a>";

  /* olapp.source.GSITiles */
  olapp.source.GSITiles = new olapp.Source('GSI Tiles', layers);
  olapp.source.GSITiles.createLayer = function (id, layerOptions) {
    var lyr = this.getLayerById(id);
    if (!lyr) return null;

    var url = 'http://cyberjapandata.gsi.go.jp/xyz/' + id + '/{z}/{x}/{y}.' + lyr.format,
        destProj = olapp.project.view.getProjection(),
        extentJp = ol.proj.transformExtent([122.7, 20.4, 154.8, 45.6], 'EPSG:4326', destProj);

    // source options
    var options = {
      attributions: [olapp.core.getAttribution(attr)],
      crossOrigin: 'anonymous',
      projection: 'EPSG:3857',
      tileGrid: ol.tilegrid.createXYZ({
        minZoom: lyr.zmin,
        maxZoom: lyr.zmax
      }),
      url: url
    };

    var source = new ol.source.XYZ(options);

    // layer options

    // "std" and "ort" maps have world wide tiles in small zoom levels.
    if (lyr.zminJp !== undefined) {
      // options for worldwide map
      var options1 = {
        source: source,
        minResolution: olapp.tools.projection.resolutionFromZoomLevel(lyr.zminJp - 0.1)
      };
      // options for Japanese map
      var options2 = {
        extent: extentJp,
        source: source,
        maxResolution: olapp.tools.projection.resolutionFromZoomLevel(lyr.zminJp - 0.1)
      };

      // Create two layers and a layer group that binds the layers
      options = {
        layers: [new ol.layer.Tile(options1), new ol.layer.Tile(options2)],
        title: lyr.title
      };
      return new ol.layer.Group($.extend(options, layerOptions));
    }
    else {
      // Create a layer
      options = {
        extent: extentJp,
        maxResolution: olapp.tools.projection.resolutionFromZoomLevel(lyr.zmin - 0.1),
        source: source,
        title: lyr.title
      };
      return new ol.layer.Tile($.extend(options, layerOptions));
    }
  };

  // register this source
  olapp.source.register('Tiled Map', 'GSITiles', olapp.source.GSITiles);

  // register this plugin
  olapp.plugin.register(plugin.path, plugin);
})();
