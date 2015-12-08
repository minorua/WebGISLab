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
'  <button type="button" class="btn btn-primary">Add</button>' + layers[0].name +
'</li>';
  layers[0].listItem = $(html);

  /* olapp.source.Gist */
  olapp.source.Gist = new olapp.Source('Gist', layers);
  olapp.source.Gist.createLayer = function (id, layerOptions) {
    var url;
    if (id != 'new') url = id;
    else {
      url = window.prompt('Input Raw Gist URL (https://gist.githubusercontent.com/...)');
      if (!url) return null;
      if (url.indexOf('https://gist.githubusercontent.com/') !== 0) {
        alert('Invalid URL');
        return null
      }
    }
    var filename = url.split('/').pop();
    var options = {
      style: olapp.core.createStyleFunction(),
      title: filename
    };
    var layer = new ol.layer.Vector($.extend(options, layerOptions));

    $.get(url).then(function (data) {
      var source = olapp.core.loadText(data);
      if (source) {
        layer.setSource(source);
        layer.get('olapp').layer = url;
        // TODO: store to local storage as a recently used Gist file
      }
      else {
        bootbox.alert('Failed to create a layer from the Gist file.');
        olapp.project.removeLayer(layer.get('id'));
      }
    }, function () {
      bootbox.alert('Failed to download Gist file.');
      olapp.core.project.removeLayer(layer.get('id'));
    });
    return layer;
  };

  // event handler
  layers[0].listItem.children('button').click(function () {
    var layerOptions = {
      olapp: {
        source: sourceName
      }
    };
    var layer = olapp.source.Gist.createLayer(layers[0].id, layerOptions);
    if (layer) olapp.core.project.addLayer(layer);
  });

  // register this source
  olapp.source.register('File', sourceName, olapp.source.Gist);

  // register this plugin
  olapp.plugin.register(plugin.path, plugin);
})();
