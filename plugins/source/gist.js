// gist.js
// (C) 2015 Minoru Akagi | MIT License
// https://github.com/minorua/WebGISLab
// Dependencies: jQuery, Bootstrap, OpenLayers 3

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
'  <div>Enter URL of Gist you want to fetch:</div>' +
'  <div class="input-group">' +
'    <input type="text" class="form-control" style="height:22px;" placeholder="https://gist.github.com/username/Gist_ID" title="Raw file URL (https://gist.githubusercontent.com/....) is also acceptable.">' +
'    <span class="input-group-btn">' +
'      <button type="button" class="btn btn-primary" style="height:22px;">Fetch</button>' +
'    </span>' +
'  </div>' +
'</li>';
  layers[0].listItem = $(html);

  var storage = {
    gists: function () {
      return JSON.parse(localStorage.gists || '[]');
    },
    // Store a Gist URL in local storage
    append: function (url, filename, description) {
      var gists = JSON.parse(localStorage.gists || '[]');
      var id = filename + '#' + parseInt($.now() / 1000).toString(16);
      var obj = {id: id, url: url, filename: filename, description: description};
      gists.push(obj);
      localStorage.gists = JSON.stringify(gists);
      return obj;
    },
    // Remove a Gist from local storage (In fact, set deleted flag)
    remove: function (id, _restore) {
      var gists = JSON.parse(localStorage.gists || '[]');
      for (var i = 0; i < gists.length; i++) {
        if (gists[i].id === id) {
          gists[i].deleted = !_restore;
          break;
        }
      }
      localStorage.gists = JSON.stringify(gists);
    },
    // Restore removed gist
    restore: function (id) {
      this.remove(id, true);
    },
    // Clean up stored Gists
    clean: function () {
      var gists = JSON.parse(localStorage.gists || '[]');
      for (var i = gists.length - 1; i >= 0; i--) {
        if (gists[i].deleted) gists.splice(i, 1);
      }
      localStorage.gists = JSON.stringify(gists);
    }
  };
  storage.clean();

  var tooltip = {
    remove: 'Remove this layer URL from local storage',
    restore: 'Restore this layer URL'
  };

  function appendItem(gist) {
    var html =
'<li class="list-group-item">' +
'  <button type="button" class="btn btn-default"></button>' +
'  <button type="button" class="btn btn-primary" title="Add this layer to map">Add</button>' + gist.filename +
'</li>';
    var obj = $(html).attr('title', gist.description || '');
    var icon = '<span class="glyphicon glyphicon-floppy-remove"></span>';
    obj.children('button.btn-default').attr('title', tooltip.remove).html(icon);
    obj.children('button').click(function () {
      if ($(this).hasClass('btn-primary')) {
        // Add layer
        var layerOptions = {
          title: gist.filename,
          olapp: {
            source: sourceName
          }
          // TODO: set description property
        };
        var layer = olapp.source.Gist.createLayer(gist.url, layerOptions);
        if (layer) olapp.core.project.addLayer(layer);
      }
      else {
        var remove = $(this).children('span').length > 0;
        $(this).html((remove) ? 'Restore' : icon).attr('title', (remove) ? tooltip.restore : tooltip.remove);
        $(this).parent().css('color', (remove) ? '#999' : '#000')
               .children('.btn-primary').css('display', (remove) ? 'none' : 'inline-block');
        if (remove) storage.remove(gist.id);
        else storage.restore(gist.id);
      }
    });
    layers.push({id: gist.url, name: gist.filename, listItem: obj});
    return obj;
  }

  function appendNewItem(url, filename, description) {
    var listItem = appendItem(storage.append(url, filename, description));
    layers[0].listItem.parent().append(listItem);
  }

  // Append stored Gists to layer list
  storage.gists().forEach(function (gist) {
    appendItem(gist);
  });

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
        olapp.core.project.removeLayer(layer.get('id'));
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

    if (url.indexOf('https://gist.github.com/') === 0) {
      // Get metadata of the Gist
      var gistId = url.split('/')[4];
      $.getJSON('https://api.github.com/gists/' + gistId).then(function (json) {
        if (!json.files) return;
        for (var file in json.files) {
          var f = json.files[file];
          appendNewItem(f.raw_url, f.filename, json.description);
        }
      }, function () {
        alert('Failed to download Gist metadata.');
      });
    }
    else if(url.indexOf('https://gist.githubusercontent.com/') === 0) {
      appendNewItem(url, url.split('/').pop());
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
