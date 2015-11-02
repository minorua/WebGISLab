olapp.project.load(function (project) {
  var resolutionFromZoomLevel = olapp.tools.projection.resolutionFromZoomLevel;

  // GSI tiles
  // http://maps.gsi.go.jp/development/
  var layer = new ol.layer.Tile({
    source: new ol.source.XYZ({
      attributions: [
        new ol.Attribution({
          html: "<a href='http://maps.gsi.go.jp/development/ichiran.html' target='_blank'>地理院タイル</a>"
        })
      ],
      projection: 'EPSG:3857',
      tileGrid: ol.tilegrid.createXYZ({
        minZoom: 2,
        maxZoom: 18
      }),
      url: 'http://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png'
    })
  });
  layer.title = '地理院地図 (標準地図)';
  project.addLayer(layer);

  layer = new ol.layer.Tile({
    source: new ol.source.XYZ({
      attributions: [
        new ol.Attribution({
          html: "<a href='http://maps.gsi.go.jp/development/ichiran.html' target='_blank'>地理院タイル</a>"
        })
      ],
      projection: 'EPSG:3857',
      tileGrid: ol.tilegrid.createXYZ({
        minZoom: 5,
        maxZoom: 15
      }),
      url: 'http://cyberjapandata.gsi.go.jp/xyz/relief/{z}/{x}/{y}.png'
    }),
    maxResolution: resolutionFromZoomLevel(5 - 0.1)
  });
  layer.setVisible(false);
  layer.title = '色別標高図';
  project.addLayer(layer);

  layer = new ol.layer.Tile({
    source: new ol.source.XYZ({
      attributions: [
        new ol.Attribution({
          html: "<a href='http://maps.gsi.go.jp/development/ichiran.html' target='_blank'>地理院タイル</a>"
        })
      ],
      projection: 'EPSG:3857',
      tileGrid: ol.tilegrid.createXYZ({
        minZoom: 2,
        maxZoom: 18
      }),
      url: 'http://cyberjapandata.gsi.go.jp/xyz/ort/{z}/{x}/{y}.jpg'
    })
  });
  layer.setVisible(false);
  layer.title = '写真';
  project.addLayer(layer);

  // EXPERIMENTAL vector tile - experimental_rdcl
  layer = new ol.layer.Vector({
    source: new ol.source.TileVector({
      attributions: [
        new ol.Attribution({
          html: "<a href='https://github.com/gsi-cyberjapan/vector-tile-experiment' target='_blank'>地理院提供実験(rdcl)</a>"
        })
      ],
      format: new ol.format.GeoJSON({defaultProjection: 'EPSG:4326'}),
      projection: 'EPSG:3857',
      tileGrid: ol.tilegrid.createXYZ({
        minZoom: 16,
        maxZoom: 16
      }),
      url: 'http://cyberjapandata.gsi.go.jp/xyz/experimental_rdcl/{z}/{x}/{y}.geojson'
    }),
    style: function(feature, resolution) {
      return [new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: 'orange', 
          width: 4
        })
      })];
    },
    maxResolution: resolutionFromZoomLevel(16 - 0.1)
  });
  layer.setVisible(false);
  layer.title = '道路中心線 (z>=16)';
  project.addLayer(layer);

  // EXPERIMENTAL vector tile - experimental_fgd
  var styleMap = {
    'Cstline':  {c: "#33f", w: 2},   // #00f, 2
    'WStrL':    {c: "#88f", w: 1},   // #77f, 1
    'WL':       {c: "#9cf", w: 1},   // #00f, 2
    'RdEdg':    {c: "#888", w: 1},   // #777, 2
    'RdCompt':  {c: "#aaa", w: 1},   // #aaa, 1
    'RailCL':   {c: "#777", w: 3},   // #7f7, 2
    'SBBdry':   {c: "#fbb", w: 2},   // #fbb, 2 + //TODO: dashArray:"5,5"
    'CommBdry': {c: "#f77", w: 2},   // #f77, 2 + //TODO: dashArray:"10,10"
    'AdmBdry':  {c: "#f77", w: 4}    // #f77, 4 + //TODO: dashArray:"10,10"
  };

  var featureStyleFunction = function (feature, resolution) {
    if (feature.values_['vis'] == '非表示') return [];

    var geomType = feature.getGeometry().getType();
    if (geomType == 'LineString') {
      var className = feature.values_['class'],
          s = styleMap[className];
      if (s === undefined) {
        if (className == 'Cntr') {
          s = {c: "#b95", w: 1};     // #ca5, 2
          if (feature.values_['alti'] % 50 == 0) s.w = 2;
        }
        if (className == 'BldL') {
          s = {c: '#e72'};           // #f72, opacity:0.5,lineCap:"butt"
          s.w = (feature.values_['type'] == '堅ろう建物') ? 2 : 1;
        }
      }

      if (s !== undefined) {
        return [new ol.style.Style({
            stroke: new ol.style.Stroke({
              color: s.c,
              width: s.w
              // + opacity: 0.5, lineCap: "butt"
            })
          })];
      }
    }

    // TODO: Point style is not implemented yet.
    return olapp.defaultStyle[geomType];
  };

  layer = new ol.layer.Vector({
    source: new ol.source.TileVector({
      attributions: [
        new ol.Attribution({
          html: "<a href='https://github.com/gsi-cyberjapan/experimental_fgd' target='_blank'>地理院提供実験(fgd)</a>"
        })
      ],
      format: new ol.format.GeoJSON({defaultProjection: 'EPSG:4326'}),
      projection: 'EPSG:3857',
      tileGrid: ol.tilegrid.createXYZ({
        minZoom: 18,
        maxZoom: 18
      }),
      url: 'http://cyberjapandata.gsi.go.jp/xyz/experimental_fgd/{z}/{x}/{y}.geojson'
    }),
    style: featureStyleFunction,
    maxResolution: resolutionFromZoomLevel(18 - 0.1)
  });
  layer.setVisible(false);
  layer.title = '基盤地図情報（基本項目）(z>=18)';
  project.addLayer(layer);

  // EXPERIMENTAL GSI elevation tile
  layer = new ol.layer.Tile({
    source: new ol.source.CSVElevTile({
      attributions: [
        new ol.Attribution({
          html: "<a href='http://maps.gsi.go.jp/development/ichiran.html' target='_blank'>地理院タイル</a>"
        })
      ],
      mode: 'relief',
      projection: 'EPSG:3857',
      tileGrid: ol.tilegrid.createXYZ({
        minZoom: 0,
        maxZoom: 14
      }),
      url: 'http://cyberjapandata.gsi.go.jp/xyz/dem/{z}/{x}/{y}.txt'
    })
  });
  layer.setVisible(false);
  layer.title = '段彩図 (標高タイル)';
  project.addLayer(layer);

  layer = new ol.layer.Tile({
    source: new ol.source.CSVElevTile({
      attributions: [
        new ol.Attribution({
          html: "<a href='http://maps.gsi.go.jp/development/ichiran.html' target='_blank'>地理院タイル</a>"
        })
      ],
      mode: 'slope',
      projection: 'EPSG:3857',
      tileGrid: ol.tilegrid.createXYZ({
        minZoom: 0,
        maxZoom: 14
      }),
      url: 'http://cyberjapandata.gsi.go.jp/xyz/dem/{z}/{x}/{y}.txt'
    })
  });
  layer.setVisible(false);
  layer.title = '傾斜区分図 (標高タイル)';
  project.addLayer(layer);

  // Seamless Digital Geological Map of Japan (1:200,000)
  var url = 'https://gbank.gsj.jp/seamless/tilemap/detailed/WMTSCapabilities.xml';
  $.ajax(url).then(function(response) {
    var parser = new ol.format.WMTSCapabilities();
    var result = parser.read(response);
    var options = ol.source.WMTS.optionsFromCapabilities(result, {
      layer: 'g',
      matrixSet: 'g_set',
      requestEncoding: 'REST'
    });
    var layer = new ol.layer.Tile({
      opacity: 1,
      source: new ol.source.WMTS(options)
    });
    layer.getSource().setAttributions([
      new ol.Attribution({
        html: "<a href='https://gbank.gsj.jp/seamless/' target='_blank'>シームレス地質図</a>"
      })
    ]);
    layer.setVisible(false);
    layer.title = 'シームレス地質図 (詳細版)';
    project.addLayer(layer);
  });
});
