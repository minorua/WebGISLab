"use strict";

// olapp.js
// (C) 2015 Minoru Akagi | MIT License
// https://github.com/minorua/WebGISLab

/*
olapp - An OpenLayers application

.core             - Core module.
.core.project     - Project management module.
.gui              - GUI module.
.map              - An object of ol.Map. Initialized in olapp.init().
.plugin           - Plugin module.
.project          - An object of olapp.Project. Current project.
.source           - Data source management module. A souce class is a subclass based on olapp.source.Base.
.tools            - An object. Key is a function/class/group name. Value is a function/class/group. A group is a sub-object.

.init()         - Initialize application.
.loadProject()  - Load a project.

.Project
.Source
*/
var olapp = {
  core: {},
  gui: {
    dialog: {}
  },
  source: {},
  plugin: {},
  tools: {}
};


(function () {
  var core = olapp.core,
      gui = olapp.gui,
      plugin = olapp.plugin,
      source = olapp.source,
      tools = olapp.tools;

  var map, mapLayers;

  // init()
  olapp.init = function () {
    core.init();
  };

  // loadProject()
  olapp.loadProject = function (project, callback) {
    core.project.load(project, callback);
  };

  // olapp.core
  core.wgs84Sphere = new ol.Sphere(6378137);

  core.init = function () {
    map = new ol.Map({
      controls: ol.control.defaults({
        attributionOptions: ({
          collapsible: false
        })
      }),
      target: 'map'
    });
    olapp.map = map;

    core.project.init();
    gui.init(map);
  };

  var attrs = {};
  core.getAttribution = function (html) {
    if (attrs[html] === undefined) {
      attrs[html] = new ol.Attribution({html: html});
    }
    return attrs[html];
  };

  // Load a script if not loaded yet
  core.loadScript = function (url, callback) {
    if ($('script[src="' + url + '"]').length) {
      console.log('Already loaded:', url);
      if (callback) callback();
      return;
    }

    var s = document.createElement('script');
    s.type = 'text/javascript';
    if (callback) s.onload = callback;
    s.src = url;
    document.getElementsByTagName('head')[0].appendChild(s);
  };

  // Load multiple scripts sequentially
  core.loadScripts = function (urls, callback) {
    if (urls.length) {
      core.loadScript(urls[0], function () {
        core.loadScripts(urls.slice(1), callback);
      });
    }
    else {  // No script to be loaded remains
      if (callback) callback();
    }
  };

  core.loadLayerFromFile = function (file) {
    if (!olapp.project) alert('No project');   // TODO: assert

    var reader = new FileReader();
    reader.onload = function (event) {
      var format = file.name.split('.').pop();
      var layer = core.loadText(reader.result, file.name, format);
      if (layer) {
        layer.set('title', file.name);
        core.project.addLayer(layer);
        map.getView().fit(layer.getSource().getExtent(), map.getSize());
      }
      else {
        alert('Unknown format file: ' + file.name);
      }
    }
    reader.readAsText(file, 'UTF-8');
  };

  core.loadText = function (text, format) {
    var format2formatConstructors = {
      'geojson': [ol.format.GeoJSON],
      'gpx': [ol.format.GPX],
      'kml': [ol.format.KML],
      'json': [ol.format.GeoJSON, ol.format.TopoJSON]
    };

    var formatConstructors = format2formatConstructors[format.toLowerCase()];
    if (!formatConstructors) formatConstructors = [
      ol.format.GeoJSON,
      ol.format.GPX,
      ol.format.IGC,
      ol.format.KML,
      ol.format.TopoJSON
    ];

    return core._loadText(text, formatConstructors);
  };

  core._loadText = function (text, formatConstructors) {
    var transform = core.transformFromWgs84;

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
        style: core.styleFunction
      });

      return layer;
    }
    return null;
  };

  var _canvasImageUrl;

  core.saveMapImage = function (filename) { //, width, height) {
    var saveBlob = function (blob) {
      if (window.navigator.msSaveBlob !== undefined) {  // ie
        window.navigator.msSaveBlob(blob, filename);
      }
      else {
        // create object url
        if (_canvasImageUrl) URL.revokeObjectURL(_canvasImageUrl);
        _canvasImageUrl = URL.createObjectURL(blob);

        // a link to save the image
        var e = document.createElement('a');
        e.download = filename;
        e.id = 'save_link';
        e.innerHTML = 'Save';
        e.href = _canvasImageUrl;
        e.style.display = 'none';
        $('body').append(e);

        bootbox.confirm('Are you sure you want to save the map canvas image?', function (result) {
          var link = $('#save_link');
          if (result) link.get(0).click();
          link.remove();
        });
      }
    };

    var canvas = $('#map canvas').get(0);
    try {
      if (canvas.toBlob !== undefined) {
        canvas.toBlob(saveBlob);
      }
      else {    // !HTMLCanvasElement.prototype.toBlob
        // https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement.toBlob
        var binStr = atob(canvas.toDataURL('image/png').split(',')[1]),
            len = binStr.length,
            arr = new Uint8Array(len);
        for (var i = 0; i < len; i++) {
          arr[i] = binStr.charCodeAt(i);
        }
        saveBlob(new Blob([arr], {type: 'image/png'}));
      }
    }
    catch (e) {
      var msgSuffix = '';
      if (e instanceof DOMException) msgSuffix = "<br><br>Probably, at least one layer that doesn't permit cross-origin access has been rendered to the map canvas.";
      bootbox.dialog({
        title: 'Failed to save the map image',
        message: e.message + msgSuffix,
        buttons: {
          close: {
            label: 'Close',
            callback: function () {}
          }
        }
      });
    }
  };

  core.styleFunction = function (feature, resolution) {
    var featureStyleFunction = feature.getStyleFunction();
    if (featureStyleFunction) {
      return featureStyleFunction.call(feature, resolution);
    } else {
      return olapp.defaultStyle[feature.getGeometry().getType()];
    }
  };

  core.urlParams = function () {
    var p, vars = {};
    var params = window.location.search.substring(1).split('&').concat(window.location.hash.substring(1).split('&'));
    params.forEach(function (param) {
      p = param.split('=');
      vars[p[0]] = p[1];
    });
    return vars;
  };


  // olapp.core.project - Project management module
  core.project = {

    init: function () {
      olapp.project = null;
      mapLayers = {};
    },

    // Add a layer to current project, map and layer list
    addLayer: function (layer) {
      olapp.project.addLayer(layer);    // layer.id is set
      mapLayers[layer.get('id')] = layer;
      map.addLayer(layer);
      gui.addLayer(layer);
    },

    // Remove a layer from current project, map and layer list
    removeLayer: function (layerId) {
      var layer = mapLayers[layerId];
      olapp.project.removeLayer(layer);
      map.removeLayer(layer);
      gui.removeLayer(layerId);
      delete mapLayers[layerId];
    },

    clear: function () {
      core.project.init();
      map.getLayers().clear();
      gui.clearLayerList();
    },

    _loadCallback: null,

    _loadingLayers: {},

    _loadingScripts: {},    // script elements to load layer source data

    _scriptElement: null,   // script element to load a project

    // Load a project
    //   prj: olapp.Project object, string (URL), File or Object (JSON).
    //   callback: Callback function. If specified, called when the code to load a project has been executed.
    load: function (prj, callback) {
      if (typeof prj == 'string') {
        // Remove project script element if exists
        var head = document.getElementsByTagName('head')[0];
        if (core.project._scriptElement) head.removeChild(core.project._scriptElement);
        core.project._scriptElement = null;

        var s = document.createElement('script');
        s.type = 'text/javascript';
        s.src = prj;
        head.appendChild(s);
        core.project._scriptElement = s;

        // olapp.loadProject() will be called from the project file again.
        core.project._loadCallback = callback;
        return;
      }
      else if (prj instanceof File) {
        var reader = new FileReader();
        reader.onload = function (event) {
          eval(reader.result);
          // TODO: status message
        }
        reader.readAsText(prj, 'UTF-8');
        return;
      }
      else if (!(prj instanceof olapp.Project)) {
        // TODO: load project in JSON format
        // prj = new olapp.Project
      }

      // Call this when project has been loaded
      var projectLoaded = function () {
        if (callback) callback();
        else if (core.project._loadCallback) core.project._loadCallback();
        core.project._loadCallback = null;
      };

      // prj is an instance of olapp.Project
      if (prj.plugins.length > 0) {
        // Load plugins
        plugin.load(prj.plugins, function () {
          // Set the project to the application after the plugins are loaded.
          core.project.set(prj);
          projectLoaded();
        });
        return;
      }

      core.project.set(prj);
      projectLoaded();
    },

    set: function (project) {
      // Clear the current project
      core.project.clear();

      olapp.project = project;
      if (project.init !== undefined) project.init(project);
      gui.setProjectTitle(project.title);
      map.setView(project.view);

      // Load layers
      if (project.layers !== undefined) {
        project.layers.forEach(function (lyr) {
          // Hold source and layer (id)
          var layerOptions = {
            olapp: {
              source: lyr.source,
              layer: lyr.layer
            }
          };
          $.extend(layerOptions, lyr.options);

          // Create a layer
          var layer;
          if (lyr.source == 'Custom') {
            layer = project.customLayers[lyr.layer](project, layerOptions);
          }
          else if(lyr.source == 'Text') {
            // TODO:
          }
          else {
            layer = olapp.source[lyr.source].createLayer(lyr.layer, layerOptions);
          }

          if (layer) project.addLayer(layer);
          else console.log('Failed to load layer: ', lyr);
        });
      }

      var projection = project.view.getProjection();
      core.transformToWgs84 = ol.proj.getTransform(projection, 'EPSG:4326');
      core.transformFromWgs84 = ol.proj.getTransform('EPSG:4326', projection);

      var urlParams = olapp.core.urlParams();
      if (urlParams.lat !== undefined && urlParams.lon !== undefined) {
        var lonLat = [parseFloat(urlParams.lon), parseFloat(urlParams.lat)];
        if (!isNaN(lonLat[0]) && !isNaN(lonLat[1])) project.view.setCenter(core.transformFromWgs84(lonLat));
      }
      if (urlParams.z !== undefined) {
        var zoom = parseInt(urlParams.z);
        if (!isNaN(zoom)) project.view.setZoom(zoom);
      }

      // Register map layers
      project.mapLayers.forEach(function (layer) {
        mapLayers[layer.get('id')] = layer;
      });

      // Add layers to map and layer list
      project.mapLayers.forEach(function (layer) {
        map.addLayer(layer);
        gui.addLayer(layer);
      });
    },

    loadLayerSource: function (layer, url) {
      if (core.project._loadingLayers[url] !== undefined) {
        // already loading
        core.project._loadingLayers[url].push(layer);
      }
      else {
        // Add script element to load layer source data
        var s = document.createElement('script');
        s.type = 'text/javascript';
        s.src = url;
        document.getElementsByTagName('head')[0].appendChild(s);

        core.project._loadingLayers[url] = [layer];
        core.project._loadingScripts[url] = s;
      }
    },

    setLayerSource: function (url, source) {
      if (core.project._loadingLayers[url] === undefined) return;

      if (typeof source == 'function') source = source();
      core.project._loadingLayers[url].forEach(function (layer) {
        layer.setSource(source);
      });
      delete core.project._loadingLayers[url];

      // Remove the script element from DOM
      $(core.project._loadingScripts[url]).remove();
      delete core.project._loadingScripts[url];
    },

    saveToFile: function () {
      core.loadScript('js/FileSaver.min.js', function () {
        var blob = new Blob([olapp.project.toString()], {type: 'text/plain;charset=utf-8'});
        saveAs(blob, "project.js");
      });
    },

    saveToStorage: function () {
    }

  };


  // olapp.gui
  gui.init = function (map) {
    gui._originalTitle = document.title;

    // menu bar
    $('#prj_new').click(function () {
      core.project.load(new olapp.Project());
    });

    $('#prj_open').click(function () {
    });

    $('#prj_save').click(function () {
      bootbox.dialog({
        title: 'Save Project',
        message: 'Select file or local storage.',
        buttons: {
          file: {
            label: 'Save To File',
            className: "btn-primary",
            callback: function () {
              core.project.saveToFile();
            }
          },
          storage: {
            label: 'Save To Local Storage',
            className: "btn-default",
            callback: function () {}
          },
          cancel: {
            label: 'Cancel',
            className: "btn-default",
            callback: function () {}
          }
        }
      });
    });

    $('#prj_properties').click(function () {
      var project = olapp.project;
      var html =
'<table class="prj-properties">' +
'<tr><td>Title</td><td>' + project.title + '</td></tr>' +
'<tr><td>CRS</td><td>' + project.view.getProjection().getCode() + '</td></tr>' +
'</table>';
      bootbox.dialog({
        title: 'Project properties',
        message: html,
        buttons: {
          close: {
            label: 'Close',
            callback: function () {}
          }
        }
      });
    });

    $('#print').click(function () {
    });

    $('#save_image').click(function () {
      core.saveMapImage('mapimage.png');
    });

    // layer list panel
    $('#trigger').click(function () {
      $('#slider').toggle('slide', 'fast');
    });

    $(window).keydown(function (e) {
      if (e.keyCode == 27) {
        if ($('#trigger').hasClass('active')) {
          $('#trigger').removeClass('active');
          $('#slider').toggle('slide', 'fast');
        }
      }
    });

    // layer list
    $('#layer_list').sortable({
      axis: 'y',
      stop: function (event, ui) {
        gui.updateLayerOrder();
      }
    });

    // Initialize dialogs
    for (var k in gui.dialog) {
      gui.dialog[k].init();
    }

    map.on('pointermove', function (evt) {
      if (evt.dragging) return;
      var pixel = map.getEventPixel(evt.originalEvent);
      gui.displayFeatureInfo(pixel);
    });

    map.on('click', function (evt) {
      var pt = map.getEventCoordinate(evt.originalEvent);
      console.log('Clicked', pt, core.transformToWgs84(pt));
      gui.displayFeatureInfo(evt.pixel);
    });

    map.on('moveend', function (evt) {
      var view = map.getView();
      var center = core.transformToWgs84(view.getCenter());
      window.location.hash = '#lat=' + center[1].toFixed(6) + '&lon=' + center[0].toFixed(6) + '&z=' + view.getZoom();
    });

    // Accept file drop
    $(document).on('dragover', function (e) {
      e.preventDefault();
    });

    $(document).on('drop', function (e) {
      e.stopPropagation();
      e.preventDefault();

      var files = e.originalEvent.dataTransfer.files;
      if (files.length == 1 && files[0].name.split('.').pop().toLowerCase() == 'js') {
        core.project.load(files[0]);
      }
      else {
        for (var i = 0; i < files.length; i++) {
          core.loadLayerFromFile(files[i]);
        }
      }
    });

    // search
    $('form[role="search"]').submit(function (event) {
      var q = $('#search').val();
      if (q) tools.geocoding.Nominatim.search(q);
      event.preventDefault();
    });
  };

  // Add a layer to layer list.
  gui.addLayer = function (layer) {
    var checked = (layer.getVisible()) ? ' checked' : '';
    var html =
'<div class="list-group-item" id="' + layer.get('id') + '">' +
'  <input type="checkbox"' + checked + '>' + layer.get('title') +
'  <a href="#" class="btn" style="float:right; padding:2px;" title="Expand/Collapse layer panel">' +
'    <span class="glyphicon glyphicon-chevron-down"></span>' +
'  </a>' +
'</div>';

    var item = $('#layer_list').prepend(html).find('.list-group-item').first();
    item.click(function (event) {
      $('#layer_list .list-group-item.active').removeClass('active');
      $(event.target).addClass('active');
    });
    item.children(':checkbox').change(function () {
      var layer = mapLayers[$(this).parent().attr('id')];
      var visible = $(this).is(':checked');
      layer.setVisible(visible);
    });

    var switchExpansion = function (e) {
      e.stopPropagation();

      var layerId = item.attr('id');
      $('#layer_list .glyphicon-chevron-up').removeClass('glyphicon-chevron-up').addClass('glyphicon-chevron-down');
      $('#layer_list .layer-sub-container').slideUp('fast', function () {
        $(this).remove();
      });

      if ($(this).parent().find('.layer-sub-container').length == 0) {
        $(this).find('span').removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-up');

        var html =
'<div class="layer-sub-container">' +
'  <div class="layer-button-container">' +
'    <button class="btn btn-zoomtolayer" title="Zoom to layer extent"><span class="glyphicon glyphicon-zoom-in"></span></button>' +
'    <button class="btn btn-attrtable" title="Show attribute table"><span class="glyphicon glyphicon-list-alt"></span></button>' +
'    <button class="btn btn-removelayer" title="Remove layer"><span class="glyphicon glyphicon-trash"></span></button>' +
'  </div><div>' +
'    <div style="float:left;">' +
'      <div class="opacity-slider" title="Opacity"></div>' +
'    </div><div style="float:right;">' +
'      <a href="#" class="btn btn-blendmode" title="Multipy blending mode"><span class="glyphicon glyphicon-tint"></span></a>' +
'    </div>' +
'  </div>' +
'</div>';

        item.append(html);

        if (mapLayers[layerId].get('blendMode') == 'multiply') {
          item.find('.btn-blendmode span').addClass('active');
        }

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

        item.find('.layer-button-container .btn').click(function () {
          if ($(this).hasClass('btn-removelayer')) {
            bootbox.confirm("Are you sure you want to remove this layer?", function(result) {
              if (result) olapp.core.project.removeLayer(layerId);
            });
          }
          else if ($(this).hasClass('btn-zoomtolayer')) {
          }
          else {    // btn-attrtable
          }
        });

        item.find('.btn-blendmode').click(function (e) {
          e.stopPropagation();

          var blendMode = (mapLayers[layerId].get('blendMode') == 'source-over') ? 'multiply' : 'source-over';
          mapLayers[layerId].set('blendMode', blendMode);

          var target = $(this);
          if (target.prop('tagName') == 'A') target = target.children();
          if (blendMode == 'multiply') target.addClass('active');
          else target.removeClass('active');

          map.render();
        });

        item.find('.layer-sub-container').slideDown('fast');
      }
    };
    item.children('.btn').click(switchExpansion);
    item.dblclick(switchExpansion);
  };

  // Remove a layer from layer list
  gui.removeLayer = function (layerId) {
    $('#' + layerId).remove();
  };

  gui.clearLayerList = function () {
    $('#layer_list').html('');
  };

  // TODO: layerOrderChanged
  gui.updateLayerOrder = function () {
    var project = olapp.project;
    project.mapLayers = [];

    var layers = map.getLayers();
    layers.clear();

    $('#layer_list .list-group-item').each(function (index) {
      var layer = mapLayers[$(this).attr('id')];
      layers.insertAt(0, layer);
      project.mapLayers.unshift(layer);
    });
  };

  gui.displayFeatureInfo = function (pixel) {
    var html = '';
    var features = [];
    map.forEachFeatureAtPixel(pixel, function (feature, layer) {
      features.push(feature);
    });
    if (features.length > 0) {
      var info = [];
      var attrs = features[0].values_;
      for (var name in attrs) {
        if (typeof attrs[name] != 'object') html += name + ': ' + attrs[name] + '<br>';
      }
      if (features.length > 1) html += ' and other ' + (features.length - 1) + ' feature(s)';
    }
    $('#info').html(html || '&nbsp;');
  };

  gui.setProjectTitle = function (title) {
    document.title = gui._originalTitle + (title ? ' - ' + title : '');
  };

  // olapp.gui.dialog.addLayer
  var addLayerDialog = {

    groupListInitialized: false,

    init: function () {
      $('#dlg_addlayer').on('show.bs.modal', function () {
        var groupList = $('#addlg_group_list');

        if (!addLayerDialog.groupListInitialized) {
          // Initialize and populate group list
          groupList.html('');

          source.groupNames().forEach(function (group) {
            var subListId = 'addlg_sub_list_' + group.split(' ').join('_');

            // Add group item
            var html =
'<li class="list-group-item">' +
'  <a class="btn accordion-toggle" style="float:right; padding:2px;" data-toggle="collapse" data-parent="#addlg_group_list" href="#' + subListId + '">' +
'    <span class="glyphicon glyphicon-chevron-down"></span>' +
'  </a>' +
'  <span>' + group + '</span>' +
'  <div class="panel-collapse collapse in" id="' + subListId + '">' +
'    <ul class="list-group"></ul>' +
'  </div>' +
'</li>';

            groupList.append(html);

            // Populate sub source lists
            source.sourceNames(group).forEach(function (sourceName) {
              var src = source.get(sourceName);
              // Add sub list item
              var list = $('#' + subListId).find('.list-group');
              // Append source item to the group (sourceName is class name and src.name is display name)
              list.append('<li class="list-group-item"><span style="display: none;">' + sourceName + '</span>' + src.name + '</li>');
            });
          });

          // item selection and layer list update
          groupList.children().click(function (event) {
            if ($(event.target).hasClass('btn') || $(event.target).hasClass('glyphicon')) return;
            groupList.find('.active').removeClass('active');
            $(this).addClass('active');
            $(this).find('.list-group-item').addClass('active');
            addLayerDialog.groupSelectionChanged($(this).children('span').text());
          }).find('.list-group-item').click(function (event) {
            event.stopPropagation();
            groupList.find('.active').removeClass('active');
            $(this).addClass('active');
            var group = $(this).parent().parent().parent().children('span').text();
            addLayerDialog.groupSelectionChanged(group, $(this).children('span').text());
          });

          groupList.append('<li class="list-group-item"><span>File</span></li>');

          // toggle button style
          $('#addlg_group_list').find('.collapse').on('hide.bs.collapse', function () {
            $(this).parent().find('.accordion-toggle').html('<span class="glyphicon glyphicon-chevron-down"></span>');
          }).on('show.bs.collapse', function () {
            $(this).parent().find('.accordion-toggle').html('<span class="glyphicon glyphicon-chevron-up"></span>');
          }).collapse('hide');

          addLayerDialog.groupListInitialized = true;
        }
      });
    },

    groupSelectionChanged: function (groupName, sourceName) {
      // Populate layer list
      var list = $('#addlg_layer_list');
      list.html('');

      var appendItem = function (sourceName, item) {
        var html =
'<li class="list-group-item">' +
'  <button type="button" class="btn btn-primary" style="float:right; padding:0px 8px;">Add</button>' +
'  <span style="display: none;">' + sourceName + '/' + item.id + '</span>' + item.name +
'</li>';

        list.append(html);
      };

      if (sourceName === undefined) {
        source.sourceNames(groupName).forEach(function (sourceName) {
          source.get(sourceName).list().forEach(function (item) {
            appendItem(sourceName, item);
          });
        });
      }
      else {
        source.get(sourceName).list().forEach(function (item) {
          appendItem(sourceName, item);
        });
      }
      list.find('button').click(function () {
        var srcname_id = $(this).parent().children('span').text().split('/');
        // Hold source and layer (id)
        var layerOptions = {
          olapp: {
            source: srcname_id[0],
            layer: srcname_id[1]
          }
        };
        var layer = source.get(srcname_id[0]).createLayer(srcname_id[1], layerOptions);
        core.project.addLayer(layer);
        // TODO: status message
      });
    }

  };
  gui.dialog.addLayer = addLayerDialog;


  // olapp.gui.dialog.measure
  gui.dialog.measure = {

    init: function () {
      var measure = olapp.tools.measure;
      var startMeasure = function () {
        measure.startMeasure($('#measure_area').prop('checked') ? 'Polygon' : 'LineString', function () {
          $('#measure_redo,#measure_fin').removeClass('disabled');
        }, function () {
          $('#measure_redo,#measure_fin').addClass('disabled');
        });
      };
      var stopMeasure = function () {
        measure.stopMeasure();
        $('#measure_redo,#measure_fin').addClass('disabled');
      };
      var restartMeasure = function () {
        stopMeasure();
        startMeasure();
      };

      // show/hide measure tool dialog
      $('#navbar a[data-target="#dlg_measure"]').click(function () {
        $('#dlg_measure').toggle();
        if ($('#dlg_measure').is(':visible')) {
          $('#dlg_measure').css({
            'left': 'auto',
            'right': '15px',
            'top': '65px'
          });
          startMeasure();
        }
        else {
          stopMeasure();
        }
      });

      var dlg = $('#dlg_measure').draggable({handle: ".dlg-header"});
      dlg.find('.close').click(function () {
        $('#dlg_measure').hide();
          stopMeasure();
      });
      dlg.find('input').change(restartMeasure);

      $('#measure_redo').addClass('disabled').click(function () {
        this.blur();
        if (!$(this).hasClass('disabled')) olapp.tools.measure.draw.removeLastPoint();
      });
      $('#measure_fin').addClass('disabled').click(function () {
        this.blur();
        if (!$(this).hasClass('disabled')) olapp.tools.measure.draw.finishDrawing();
      });
      $('#measure_clear').click(function () {
        this.blur();
        restartMeasure();
      });
    }

  };


  // olapp.source
  var sources = {};
  var sourceGroups = {};

  source.register = function (group, name, constructor) {
    if (sourceGroups[group] === undefined) sourceGroups[group] = {};
    sourceGroups[group][name] = constructor;
    sources[name] = constructor;
  };

  source.get = function (name) {
    if (source[name] === undefined) return null;
    return source[name];
  };

  source.groupNames = function () {
    return Object.keys(sourceGroups);
  };

  // group: Group name. If specified, returns sources in the group. Otherwise, returns all registered sources.
  source.sourceNames = function (group) {
    if (group !== undefined) return Object.keys(sourceGroups[group]);

    var names = [];
    source.groupNames().forEach(function (group) {
      Array.prototype.push.apply(names, source.sourceNames(group));
    });
    return names;
  };


  // olapp.plugin
  plugin.plugins = {};
  plugin._loadingSets = [];

  // Add a plugin to the application
  // register() is called from end of a plugin code, whereas load() is called from project/gui.
  plugin.register = function (pluginPath, module) {
    // Register and initialize the plugin
    plugin.plugins[pluginPath] = module;
    if (module.init !== undefined) module.init();

    // Call callback function
    plugin._loadingSets.forEach(function (pluginSet) {
      var index = pluginSet.plugins.indexOf(pluginPath);
      if (index !== -1) {
        pluginSet.plugins.splice(index, 1);
        if (pluginSet.plugins.length == 0 && pluginSet.callback) pluginSet.callback();
      }
    });

    // Remove completely loaded plugin set from the array
    for (var i = plugin._loadingSets.length - 1; i >= 0; i--) {
      if (plugin._loadingSets[i].plugins.length == 0) plugin._loadingSets.splice(i, 1);
    }
  };

  // Load a plugin/plugins
  // pluginPaths: a plugin path string or an array of plugin paths.
  // callback: callback is called once when all the plugins have been loaded.
  plugin.load = function (pluginPaths, callback) {
    if (typeof pluginPaths == 'string') pluginPaths = [pluginPaths];

    // add scripts
    var head = document.getElementsByTagName('head')[0];
    var loadingPlugins = [];
    pluginPaths.forEach(function (pluginPath) {
      if (pluginPath in plugin.plugins) return;   // already loaded

      var s = document.createElement('script');
      s.type = 'text/javascript';
      s.src = 'plugins/' + pluginPath;
      head.appendChild(s);
      loadingPlugins.push(pluginPath);
    });

    if (loadingPlugins.length == 0) {
      if (callback) callback();
    }
    else {
      plugin._loadingSets.push({
        plugins: loadingPlugins,
        callback: callback
      });
    }
  };

})();


// olapp.Project

// Constructor
//   params
//     - options
//       title: Title of project. Required.
//       description: Description of project.
//       view: An ol.View object. View for the map. Required.
//       plugins: Array of paths of plugins to load.
//       init: function (project). A function to initialize project. Required.
//         - project: project-self.
olapp.Project = function (options) {
  options = options || {};
  // for (var k in options) { this[k] = options[k]; }
  this.title = options.title || '';
  this.description = options.description || '';
  this.view = options.view;
  if (this.view === undefined) this.view = new ol.View();

  this.plugins = options.plugins || [];
  this.init = options.init;
  this.layers = options.layers || [];
  this.customLayers = options.customLayers || {};

  this._lastLayerId = this.layers.length - 1;
  this.mapLayers = [];
};

olapp.Project.prototype = {

  constructor: olapp.Project,

  addLayer: function (layer) {
    if (layer.get('title') === undefined) layer.set('title', 'no title');
    if (layer.get('blendMode') === undefined) layer.set('blendMode', 'source-over');

    layer.on('precompose', function (evt) {
      evt.context.globalCompositeOperation = this.get('blendMode');
    });
    layer.on('postcompose', function (evt) {
      evt.context.globalCompositeOperation = 'source-over';
    });

    layer.set('id', this.getNextLayerId());
    this.mapLayers.push(layer);
  },

  removeLayer: function (layer) {
    var index = this.mapLayers.indexOf(layer);
    if (index !== -1) this.mapLayers.splice(index, 1);
  },

  getNextLayerId: function () {
    this._lastLayerId++;
    return 'L' + this._lastLayerId;
  },

  layerIds: function () {
    var ids = [];
    this.mapLayers.forEach(function (layer) {
      ids.push(layer.get('id'));
    });
    return ids;
  },

  layerProperties: function () {
    var prop = {};
    this.mapLayers.forEach(function (layer) {
      prop[layer.get('id')] = {
        visible: layer.getVisible(),
        opacity: layer.getOpacity(),
        blendMode: layer.get('blendMode'),
        title: layer.get('title')
      };
    });
    return prop;
  },

  toJSON: function () {
  },

  toString: function () {
    function quote_escape(text) {
      return '"' + text.split('"').join('\\"') + '"';
    }

    var projection = this.view.getProjection().getCode();
    var center = this.view.getCenter() || [0, 0];
    var maxZoom = parseInt(olapp.tools.projection.zoomLevelFromResolution(this.view.minResolution_));
    var zoom = this.view.getZoom();
    var initFuncStr = (this.init) ? this.init.toString() : 'undefined';

    var layers = [];
    this.mapLayers.forEach(function (layer) {
      var properties = {
        options: {
          visible: layer.getVisible(),
          opacity: layer.getOpacity(),
          blendMode: layer.get('blendMode'),
          title: layer.get('title')
        }
      };
      layers.push($.extend(properties, layer.get('olapp')));
    });

    var content = [
'olapp.loadProject(new olapp.Project({',
'  title: ' + quote_escape(this.title) + ',',
'  description: ' + quote_escape(this.description) + ',',
'  view: new ol.View({',
'    projection: ' + quote_escape(projection) + ',',
'    center: ' + JSON.stringify(center) + ',',
'    maxZoom: ' + maxZoom + ',',
'    zoom: ' + zoom,
'  }),',
'  plugins: ' + JSON.stringify(this.plugins) + ',',
'  init: ' + initFuncStr + ',',
'  layers: ' + JSON.stringify(layers),
'}));',
''];
    return content.join('\n');
  }

};


/*
olapp.Source

.list()          - Get layer list in HTML.
.createLayer(id) - Create a layer with a source identified by id.
*/
olapp.Source = function (name, layerIds, layers) {
  this.name = name;
  this.layerIds = layerIds || [];
  this.layers = layers || {};
};

olapp.Source.prototype = {

  constructor: olapp.Source,

  list: function () {
    var listItems = [];
    this.layerIds.forEach(function (id) {
      listItems.push({
        id: id,
        name: this.layers[id].name
      });
    }, this);
    return listItems;
  },

  createLayer: function (id, layerOptions) {
    console.log(this.name, 'createLayer method is not implemented');
    return null;
  }

};

// geometry
olapp.tools.geom = {};

olapp.tools.geom.formatLength = function(line) {
  var core = olapp.core;
  var length = 0;
  var coordinates = line.getCoordinates();
  for (var i = 0, ii = coordinates.length - 1; i < ii; ++i) {
    var c1 = core.transformToWgs84(coordinates[i]);
    var c2 = core.transformToWgs84(coordinates[i + 1]);
    length += core.wgs84Sphere.haversineDistance(c1, c2);
  }

  if (length > 1000) {
    return (Math.round(length) / 1000) + ' km';
  } else {
    return (Math.round(length)) + ' m';
  }
};

olapp.tools.geom.formatArea = function(polygon) {
  var geom = polygon.clone();
  geom.applyTransform(olapp.core.transformToWgs84);
  var coordinates = geom.getLinearRing(0).getCoordinates();
  var area = Math.abs(olapp.core.wgs84Sphere.geodesicArea(coordinates));
  if (area > 1000000) {
    return (Math.round(area / 1000000 * 1000) / 1000) + ' km<sup>2</sup>';
  } else {
    return (Math.round(area)) + ' m<sup>2</sup>';
  }
};


// projection
olapp.tools.projection = {};

// Get resolution from general tile zoom level
olapp.tools.projection.resolutionFromZoomLevel = function (zoom) {
  var TILE_SIZE = 256,
      TSIZE1 = 20037508.342789244;
  return TSIZE1 / Math.pow(2, zoom - 1) / TILE_SIZE;
};

olapp.tools.projection.zoomLevelFromResolution = function (resolution) {
  var TILE_SIZE = 256,
      TSIZE1 = 20037508.342789244;
  return Math.LOG2E * Math.log(TSIZE1 / resolution / TILE_SIZE) + 1;
};


// olapp.tools.measure
olapp.tools.measure = {

  draw: null,
  layer: null,         // vector layer that has traverse lines and/or polygons
  tooltipElem: null,
  tooltip: null,       // current tooltip
  tooltips: [],

  startMeasure: function (geomType, callbackDrawStart, callbackDrawEnd) {
    this.layer = this.createMeasureLayer();
    olapp.map.addLayer(this.layer);

    this.draw = this.createInteraction(geomType, this.layer);
    olapp.map.addInteraction(this.draw);

    var listener = null;
    this.draw.on('drawstart', function(evt) {
      if (callbackDrawStart) callbackDrawStart();

      this.addMeasureTooltip();
      listener = evt.feature.getGeometry().on('change', function(evt) {
        var geom = evt.target;
        var output;
        if (geom instanceof ol.geom.Polygon) {
          output = olapp.tools.geom.formatArea(geom);
        } else if (geom instanceof ol.geom.LineString) {
          output = olapp.tools.geom.formatLength(geom);
        }
        this.tooltipElem.innerHTML = output;
        this.tooltip.setPosition(geom.getLastCoordinate());
      }, this);
    }, this);

    this.draw.on('drawend', function(evt) {
      if (callbackDrawEnd) callbackDrawEnd();

      this.tooltipElem.className = 'tooltip tooltip-static';
      var geom = evt.feature.getGeometry();
      if (geom instanceof ol.geom.Polygon) {
        this.tooltip.setPosition(geom.getInteriorPoint().getCoordinates());
      }
      this.tooltip.setOffset([0, -7]);

      ol.Observable.unByKey(listener);
    }, this);

    $('#map').css('cursor', 'crosshair');
  },

  stopMeasure: function () {
    $('#map').css('cursor', 'auto');

    olapp.map.removeLayer(this.layer);
    this.layer = null;

    olapp.map.removeInteraction(this.draw);
    this.draw = null;

    this.tooltips.forEach(function (tooltip) {
      olapp.map.removeOverlay(tooltip);
    });
    this.tooltips = [];
  },

  addMeasureTooltip: function () {
    this.tooltipElem = document.createElement('div');
    this.tooltipElem.className = 'tooltip tooltip-measure';
    this.tooltip = new ol.Overlay({
      element: this.tooltipElem,
      offset: [0, -15],
      positioning: 'bottom-center'
    });
    olapp.map.addOverlay(this.tooltip);
    this.tooltips.push(this.tooltip);
  },

  createMeasureLayer: function () {
    return new ol.layer.Vector({
      source: new ol.source.Vector(),
      style: new ol.style.Style({
        fill: new ol.style.Fill({
          color: 'rgba(255, 255, 255, 0.2)'
        }),
        stroke: new ol.style.Stroke({
          color: '#ffcc33',
          width: 2
        }),
        image: new ol.style.Circle({
          radius: 7,
          fill: new ol.style.Fill({
            color: '#ffcc33'
          })
        })
      })
    });
  },

  createInteraction: function (geomType, measureLayer) {
    var options = {
      fill: new ol.style.Fill({
        color: 'rgba(255, 255, 255, 0.2)'
      }),
      stroke: new ol.style.Stroke({
        color: 'rgba(0, 0, 0, 0.5)',
        lineDash: [10, 10],
        width: 2
      })
    };
    var isTouchDevice = ('ontouchstart' in window);
    if (isTouchDevice) {
      options.image = new ol.style.RegularShape({
        stroke: new ol.style.Stroke({
          color: '#000',
          width: 1
        }),
        points: 4,
        radius: 6,
        radius2: 0
      });
    }
    return new ol.interaction.Draw({
      source: measureLayer.getSource(),
      type: geomType,
      style: new ol.style.Style(options)
    });
  }

};


// geocoding
olapp.tools.geocoding = {};

// Nominatim
// https://nominatim.openstreetmap.org/
olapp.tools.geocoding.Nominatim = {

  // TODO: search(q, callback)
  search: function (q) {
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
            // TODO: callback(lon, lat);
            olapp.map.getView().setCenter(olapp.core.transformFromWgs84([lon, lat]));
            olapp.map.getView().setResolution(olapp.tools.projection.resolutionFromZoomLevel(15));
          }
        }
        else {
          alert("No search results for '" + q + "'.");
        }
      }
    });
  }

};


olapp.defaultStyle = {
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


olapp.createDefaultProject = function () {
  return new olapp.Project({
    title: 'Default project',
    description: 'This project is default project, which has GSI tile layers.',
    view: new ol.View({
      projection: 'EPSG:3857',
      center: ol.proj.transform([138.7, 35.4], 'EPSG:4326', 'EPSG:3857'),
      maxZoom: 18,
      zoom: 5
    }),
    plugins: ['source/naturalearth.js', 'source/gsitiles.js'],
    layers: [   // from bottom to top
      {source: 'GSITiles', layer: 'std'},                                // 標準地図
      {source: 'GSITiles', layer: 'relief', options: {visible: false}},  // 色別標高図
      {source: 'GSITiles', layer: 'ort', options: {visible: false}},     // 写真
      {source: 'NaturalEarth', layer: 'cl', options: {visible: false}}   // Coastline
    ]
  });
};


// Initialize olapp application
$(function () {
  olapp.init();

  // If project parameter is specified in URL, load the file.
  // Otherwise, load default project.
  var projectName = olapp.core.urlParams()['project'];
  if (projectName) {
    // Check that the project name is safe.
    if (projectName.indexOf('..') !== -1) {
      alert('Specified project name is wrong.');
    }
    else {
      // load the project
      olapp.loadProject('files/' + projectName + '.js');
    }
  }
  else {
    olapp.loadProject(olapp.createDefaultProject());
  }
});
