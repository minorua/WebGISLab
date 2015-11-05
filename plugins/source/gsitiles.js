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
  var layerIds = ['std', 'pale', 'blank', 'english', 'relief', 'ort', 'gazo1', 'gazo2', 'gazo3', 'gazo4', 'ort_old10', 'ort_USA10', 'airphoto'];
  var layers = {
    'std': {
      name: '標準地図',
      format: 'png',
      zmin: 2,
      zmax: 18
    },
    'pale': {
      name: '淡色地図',
      format: 'png',
      zmin: 12,
      zmax: 18
    },
    'blank': {
      name: '白地図',
      format: 'png',
      zmin: 5,
      zmax: 14
    },
    'english': {
      name: 'English',
      format: 'png',
      zmin: 5,
      zmax: 11
    },
    'relief': {
      name: '色別標高図',
      format: 'png',
      zmin: 5,
      zmax: 15
    },
    'ort': {
      name: '写真',
      format: 'jpg',
      zmin: 2,
      zmax: 18
    },
    'gazo1': {
      name: '国土画像情報（第一期：1974～1978年撮影）',
      format: 'jpg',
      zmin: 10,
      zmax: 17
    },
    'gazo2': {
      name: '国土画像情報（第二期：1979～1983年撮影）',
      format: 'jpg',
      zmin: 15,
      zmax: 17
    },
    'gazo3': {
      name: '国土画像情報（第三期：1984～1986年撮影）',
      format: 'jpg',
      zmin: 15,
      zmax: 17
    },
    'gazo4': {
      name: '国土画像情報（第四期：1988～1990年撮影）',
      format: 'jpg',
      zmin: 15,
      zmax: 17
    },
    'ort_old10': {
      name: '空中写真（1961～1964年）',
      format: 'png',
      zmin: 15,
      zmax: 17
    },
    'ort_USA10': {
      name: '空中写真（1945～1950年）',
      format: 'png',
      zmin: 15,
      zmax: 17
    },
    'airphoto': {
      name: '簡易空中写真（2004年～）',
      format: 'png',
      zmin: 5,
      zmax: 18
    }
  };

  var attributions = [
    new ol.Attribution({
      html: "<a href='http://maps.gsi.go.jp/development/ichiran.html' target='_blank'>地理院タイル</a>"
    })
  ];

  /*
  olapp.source.GSITiles
    inherits from olapp.source.Base
  */
  olapp.source.GSITiles = function () {
    olapp.source.Base.call(this);
    this.name = 'GSI Tiles';
    this.group = 'Tile';
  };

  olapp.source.GSITiles.prototype = Object.create(olapp.source.Base.prototype);
  olapp.source.GSITiles.prototype.constructor = olapp.source.Base;

  olapp.source.GSITiles.prototype.list = function () {
    var listItems = [];
    layerIds.forEach(function (id) {
      listItems.push({
        id: id,
        name: layers[id].name
      });
    });
    return listItems;
  };

  olapp.source.GSITiles.prototype.createLayer = function (id, layerOptions) {
    if (layerIds.indexOf(id) === -1) return null;

    var lyr = layers[id],
        url = 'http://cyberjapandata.gsi.go.jp/xyz/' + id + '/{z}/{x}/{y}.' + lyr.format;

    var options = {
      attributions: attributions,
      projection: 'EPSG:3857',
      tileGrid: ol.tilegrid.createXYZ({
        minZoom: lyr.zmin,
        maxZoom: lyr.zmax
      }),
      url: url
    };
    if (lyr.zmin > 2) options.maxResolution = olapp.tools.projection.resolutionFromZoomLevel(lyr.zmin - 0.1);

    var layer = new ol.layer.Tile($.extend({
      source: new ol.source.XYZ(options)
    }, layerOptions));
    layer.title = layers[id].name;
    return layer;
  };

  // register this plugin
  olapp.plugin.addPlugin(plugin.path, plugin);
})();
