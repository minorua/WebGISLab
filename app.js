var mapLayers = {};
var vectorTileLayers = [];

// left panel
$('#slider').slideReveal({
  push: false,
  top: 50,
  trigger: $('#trigger'),
  hidden: function(slider, trigger){
    // Need to remove pushed style manually when the panel is closed with ESC key.
    $('#trigger').removeClass('active');
  }
});

var defaultStyle = {
  'Point': [new ol.style.Style({
    image: new ol.style.Circle({
      fill: new ol.style.Fill({
        color: 'rgba(255,255,0,0.5)'
      }),
      radius: 5,
      stroke: new ol.style.Stroke({
        color: '#ff0',
        width: 1
      })
    })
  })],
  'LineString': [new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: '#f00',
      width: 3
    })
  })],
  'Polygon': [new ol.style.Style({
    fill: new ol.style.Fill({
      color: 'rgba(0,255,255,0.5)'
    }),
    stroke: new ol.style.Stroke({
      color: '#0ff',
      width: 1
    })
  })],
  'MultiPoint': [new ol.style.Style({
    image: new ol.style.Circle({
      fill: new ol.style.Fill({
        color: 'rgba(255,0,255,0.5)'
      }),
      radius: 5,
      stroke: new ol.style.Stroke({
        color: '#f0f',
        width: 1
      })
    })
  })],
  'MultiLineString': [new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: '#0f0',
      width: 3
    })
  })],
  'MultiPolygon': [new ol.style.Style({
    fill: new ol.style.Fill({
      color: 'rgba(0,0,255,0.5)'
    }),
    stroke: new ol.style.Stroke({
      color: '#00f',
      width: 1
    })
  })]
};

var styleFunction = function (feature, resolution) {
  var featureStyleFunction = feature.getStyleFunction();
  if (featureStyleFunction) {
    return featureStyleFunction.call(feature, resolution);
  } else {
    return defaultStyle[feature.getGeometry().getType()];
  }
};

var map = new ol.Map({
  controls: ol.control.defaults({
    attributionOptions: ({
      collapsible: false
    })
  }),
  renderer: ['canvas', 'dom'],    // dom
  target: 'map',
  view: new ol.View({
    projection: 'EPSG:3857',
    center: ol.proj.transform([138.7313889, 35.3622222], 'EPSG:4326', 'EPSG:3857'),
    maxZoom: 18,
    zoom: 5
  })
});

var getLayerById = function (id) {
  return (mapLayers[id] !== undefined) ? mapLayers[id] : null;
};

var updateLayerOrder = function () {
  var layers = map.getLayers();
  layers.clear();
  $('#layer_list .list-group-item').each(function (index) {
    var id = $(this).attr('id');
    layers.insertAt(0, mapLayers[id]);
  });
};

// layer list
$('#layer_list').sortable({
    stop: function (event, ui) {
      updateLayerOrder();
    }
  });

var getNextLayerId = (function () {
  var lastId = -1;
  return function() {
    lastId++;
    return 'L' + lastId;
  };
})();


// initial layers

// GSI tiles
// http://maps.gsi.go.jp/development/
var layer = new ol.layer.Tile({
  source: new ol.source.XYZ({
    attributions: [
      new ol.Attribution({
        html: "<a href='http://maps.gsi.go.jp/development/ichiran.html' target='_blank'>地理院タイル</a>"
      })
    ],
    url: 'http://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png',
    projection: 'EPSG:3857'
  })
});
layer.title = '地理院地図 (標準地図)';
addLayer(layer);

layer = new ol.layer.Tile({
  source: new ol.source.XYZ({
    attributions: [
      new ol.Attribution({
        html: "<a href='http://maps.gsi.go.jp/development/ichiran.html' target='_blank'>地理院タイル</a>"
      })
    ],
    url: 'http://cyberjapandata.gsi.go.jp/xyz/relief/{z}/{x}/{y}.png',
    projection: 'EPSG:3857'
  })
});
layer.setVisible(false);
layer.title = '色別標高図';
addLayer(layer);

layer = new ol.layer.Tile({
  source: new ol.source.XYZ({
    attributions: [
      new ol.Attribution({
        html: "<a href='http://maps.gsi.go.jp/development/ichiran.html' target='_blank'>地理院タイル</a>"
      })
    ],
    url: 'http://cyberjapandata.gsi.go.jp/xyz/ort/{z}/{x}/{y}.jpg',
    projection: 'EPSG:3857'
  })
});
layer.setVisible(false);
layer.title = '写真';
addLayer(layer);


// EXPERIMENTAL vector tile
// https://github.com/gsi-cyberjapan/vector-tile-experiment
layer = new ol.layer.Vector({
  source: new ol.source.TileVector({
    attributions: [
      new ol.Attribution({
        html: "<a href='http://maps.gsi.go.jp/development/ichiran.html' target='_blank'>地理院タイル</a>"
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
  }
});
layer.setVisible(false);
layer.title = '道路中心線 (z>=16)';
addLayer(layer);
vectorTileLayers.push(layer);

var displayFeatureInfo = function (pixel) {
  var features = [];
  map.forEachFeatureAtPixel(pixel, function (feature, layer) {
    features.push(feature);
  });
  if (features.length > 0) {
    var info = [];
    var i, ii;
    for (i = 0, ii = features.length; i < ii; ++i) {
      info.push(features[i].get('name'));
    }
    document.getElementById('info').innerHTML = info.join(', ') || '&nbsp';
  } else {
    document.getElementById('info').innerHTML = '&nbsp;';
  }
};

map.on('pointermove', function (evt) {
  if (evt.dragging) {
    return;
  }
  var pixel = map.getEventPixel(evt.originalEvent);
  displayFeatureInfo(pixel);
});

map.on('click', function (evt) {
  displayFeatureInfo(evt.pixel);
});

function updateVectorTileLayerVisibility() {
  // Zoom level range limit for vector tile layer rendering.
  // ol: Layer rendering (data fetching) isn't affected by zoom level range of tile grid?
  var z = map.getView().getZoom();
  vectorTileLayers.forEach(function (layer) {
    var zmin = 16;    // TODO: get from layer.tileGrid
    var visible = (z >= zmin && $('#' + layer.id + ' :checkbox').is(':checked'));
    layer.setVisible(visible);
  });
}

map.getView().on('change:resolution', function (evt) {
  var z = map.getView().getZoom();
  console.log('z: ' + z);

  updateVectorTileLayerVisibility();
});

updateVectorTileLayerVisibility();

function addLayer(layer) {
  if (layer.id === undefined) layer.id = getNextLayerId();
  if (layer.title === undefined) layer.title = 'no title';
  if (layer.blendMode === undefined) layer.blendMode = 'source-over';

  layer.on('precompose', function (evt) {
    evt.context.globalCompositeOperation = this.blendMode;
  });
  layer.on('postcompose', function (evt) {
    evt.context.globalCompositeOperation = 'source-over';
  });

  mapLayers[layer.id] = layer;
  map.addLayer(layer);

  var checked = (layer.getVisible()) ? ' checked' : '';
  var html = '<div class="list-group-item" id="' + layer.id + '"><input type="checkbox"' + checked + '>' + layer.title + '<a href="#" class="btn" style="float:right; padding:2px;" title="Actions"><span class="glyphicon glyphicon-chevron-down"></span></a></div>';
  var item = $('#layer_list').prepend(html).find('.list-group-item').first();
  item.click(function (event) {
    $('#layer_list .active').removeClass('active');
    $(event.target).addClass('active');
  });
  item.find(':checkbox').change(function () {
    var visible = $(this).is(':checked');
    var layerId = $(this).parent().attr('id'),
        layer = getLayerById(layerId);

    if (vectorTileLayers.indexOf(layer) === -1) layer.setVisible(visible);
    else updateVectorTileLayerVisibility();     // should consider zoom level
  });
  item.find('.btn').click(function () {
    var layerId = item.attr('id');
    $('#layer_list .glyphicon-chevron-up').removeClass('glyphicon-chevron-up').addClass('glyphicon-chevron-down');
    $('#layer_list .layer-sub-container').slideUp('fast', function () {
      $(this).remove();
    });

    if ($(this).parent().find('.layer-sub-container').length == 0) {
      $(this).find('span').removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-up');

      var html = '<div class="layer-sub-container">' +
                 '  <div class="layer-button-container">' +
                 '    <button class="btn" title="Zoom to layer extent"><span class="glyphicon glyphicon-zoom-in"></span></button>' +
                 '    <button class="btn" title="Show attribute table"><span class="glyphicon glyphicon-list-alt"></span></button>' +
                 '    <button class="btn" title="Remove layer"><span class="glyphicon glyphicon-trash"></span></button>' +
                 '  </div><div>' +
                 '    <div style="float:left;">' +
                 '      <div class="opacity-slider"></div>' +
                 '    </div><div style="float:right;">' +
                 '      <a href="#" class="btn" data-toggle="button" style="padding:2px;" title="Multipy blending mode"><span class="glyphicon glyphicon-tint"></span></a>' +
                 '    </div>' +
                 '  </div>' +
                 '</div>';
      item.append(html);
      item.find('.opacity-slider').slider({
        change: function (event, ui) {
          var opacity = ui.value / 100;
          mapLayers[layerId].setOpacity(opacity);
        },
        slide: function (event, ui) {
          var opacity = ui.value / 100;
          mapLayers[layerId].setOpacity(opacity);
        },
        value: mapLayers[layerId].getOpacity() * 100
      });
      item.find('.layer-sub-container').slideDown('fast');
      item.find('.layer-sub-container').find('.btn').last().click(function () {
        var blendMode = (mapLayers[layerId].blendMode == 'source-over') ? 'multiply' : 'source-over';
        mapLayers[layerId].blendMode = blendMode;

        $(this).removeClass('active');
        if (blendMode == 'multiply') $(this).addClass('active');

        map.render();
      });
    }
  });
}

function loadText(text, formatConstructors) {
  var transform = ol.proj.getTransform('EPSG:4326', 'EPSG:3857');

  for (var i = 0; i < formatConstructors.length; i++) {
    var format = new formatConstructors[i]();
    var features = [];
    try {
      features = format.readFeatures(text);
    } catch (e) {
      continue;
    }
    if (features.length == 0) continue;

    features.forEach(function (feature) {
      var geometry = feature.getGeometry();
      if (geometry) geometry.applyTransform(transform);
    });

    var source = new ol.source.Vector({
      features: features
    });

    var layer = new ol.layer.Vector({
      source: source,
      style: styleFunction
    });

    return layer;
  }
  return null;
}

function loadFile(file) {
  var ext2formatConstructors = {
    'gpx': [ol.format.GPX],
    'kml': [ol.format.KML],
    'json': [ol.format.GeoJSON, ol.format.TopoJSON]
  };

  var ext = file.name.split('.').pop().toLowerCase();
  var formatConstructors = ext2formatConstructors[ext];
  if (!formatConstructors) formatConstructors = [
    ol.format.GeoJSON,
    ol.format.GPX,
    ol.format.IGC,
    ol.format.KML,
    ol.format.TopoJSON
  ];

  var reader = new FileReader();
  reader.onload = function (event) {
    var layer = loadText(reader.result, formatConstructors);

    if (layer) {
      layer.title = file.name;
      addLayer(layer);

      map.getView().fit(layer.getSource().getExtent(), /** @type {ol.Size} */ (map.getSize()));
    }
    else {
      alert('Unknown format file: ' + file.name);
    }
  }
  reader.readAsText(file, 'UTF-8');
}

// accept file drop
$(document).on('dragover', function (e) {
  e.preventDefault();
});

$(document).on('drop', function (e) {
  e.stopPropagation();
  e.preventDefault();

  var files = e.originalEvent.dataTransfer.files;
  for (var i = 0; i < files.length; i++) {
    loadFile(files[i]);
  }
});

// search
// https://nominatim.openstreetmap.org/
$('form').submit(function (event) {
  var q = $('#search').val();
  if (q) {
    var url = 'http://nominatim.openstreetmap.org/search?format=json&json_callback=callback&limit=1&q=' + encodeURIComponent(q);
    $.ajax({
      type: 'GET',
      url: url,
      dataType: 'jsonp',
      jsonpCallback: 'callback',
      success: function(json){
        if (json.length) {
          var dispName = json[0].display_name,
              lon = parseFloat(json[0].lon),
              lat = parseFloat(json[0].lat),
              license = json[0].licence;
          if(confirm('Jump to ' + dispName + ' (' + lon + ', ' + lat + ') ?\n  Search result provided by Nominatim.')) {
            var target = ol.proj.transform([lon, lat], 'EPSG:4326', 'EPSG:3857');
            map.getView().setCenter(target);
            map.getView().setResolution(4.7773);    // zoom level 15
          }
        }
        else {
          alert("No search results for '" + q + "'.");
        }
      }
    });
  }
  event.preventDefault();
});
