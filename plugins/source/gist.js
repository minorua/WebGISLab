// gist.js
// (C) 2015 Minoru Akagi | MIT License
// https://github.com/minorua/WebGISLab
// Dependencies: jQuery, OpenLayers 3

(function () {
  var plugin = {
    name: 'Gist File',
    path: 'source/gist.js',
    type: 'source',
    description: 'Adds olapp.source.Gist'
  };

  var sourceName = 'Gist';
  var layers = [
    {
      id: 'new',
      name: 'New Gist File'
    }
  ];

  var html =
'<li class="list-group-item">' +
'  <label style="width: 100%;">Enter Gist URL:<br>' +
'    <input type="text" style="width: 100%; font-weight: normal;" title="Gist URL (https://gist.github.com/....) or raw file URL (https://gist.githubusercontent.com/....)">' +
'  </label>' +
'  <div style="text-align: right; height: 18px;"><button type="button" class="btn btn-primary">Fetch</button></div>' +
'</li>';
  layers[0].listItem = $(html);

  /* olapp.source.Gist */
  olapp.source.Gist = new olapp.Source('Gist', layers);
  olapp.source.Gist.createLayer = function (id, layerOptions) {
    var url = id;
    if(url.indexOf('https://gist.githubusercontent.com/') !== 0) {
      console.log('Invalid URL', url);
      return null;
    }

    var olappObj = (layerOptions || {}).olapp || {};
    var style = olappObj.style || {color: tinycolor.random().toRgbString()};
    var styleFunc = olapp.core.createStyleFunction(style.color, style.width, style.fillColor);
    var options = {
      style: styleFunc,
      title: url.split('/').pop()
    };
    var layer = new ol.layer.Vector($.extend(options, layerOptions));
    olappObj = layer.get('olapp');
    olappObj.layer = url;
    olappObj.style = style;

    $.get(url).then(function (data) {
      var source = olapp.core.loadSource(data);
      if (source) {
        layer.setSource(source);
      }
      else {
        bootbox.alert('Failed to create a layer from the Gist file.<br>' + url);
        olapp.project.removeLayer(layer.get('id'));
      }
    }, function () {
      bootbox.alert('Failed to download Gist file:<br>' + url);
      olapp.core.project.removeLayer(layer.get('id'));
    });
    return layer;
  };

  // event handler
  layers[0].listItem.find('button').click(function () {
    var url = layers[0].listItem.find('input').val();
    if (!url) return;

    var list = layers[0].listItem.parent();
    function appendItem(url, filename, description) {
      var html =
'<li class="list-group-item">' +
'  <button type="button" class="btn btn-default" title="Store this layer URL in local storage">' +
'   <span class="glyphicon glyphicon-floppy-disk"></span>' +
'  </button>' +
'  <button type="button" class="btn btn-primary">Add</button>' + filename +
'</li>';
      $(html).appendTo(list).children('button').click(function () {
        if ($(this).hasClass('btn-primary')) {  // Add
          var layerOptions = {
            title: filename,
            olapp: {
              source: sourceName
            }
            // TODO: set description property
          };
          var layer = olapp.source.Gist.createLayer(url, layerOptions);
          if (layer) olapp.core.project.addLayer(layer);
        }
        else {    // TODO: Store URL in local storage
          // glyphicon-floppy-saved
          // glyphicon-floppy-remove
        }
      });
    }

    if (url.indexOf('https://gist.github.com/') === 0) {
      // Get metadata of the Gist
      var gistId = url.split('/')[4];
      $.getJSON('https://api.github.com/gists/' + gistId).then(function (json) {
        if (!json.files) return;
        for (var file in json.files) {
          var f = json.files[file];
          appendItem(f.raw_url, f.filename, json.description);
        }
      }, function () {
        alert('Failed to download Gist metadata.');
      });
    }
    else if(url.indexOf('https://gist.githubusercontent.com/') === 0) {
      appendItem(url, url.split('/').pop());
    }
    else {
      alert('Invalid URL');
      return;
    }
  });

  // register this source
  olapp.source.register('File', sourceName, olapp.source.Gist);

  // register this plugin
  olapp.plugin.register(plugin.path, plugin);
})();
