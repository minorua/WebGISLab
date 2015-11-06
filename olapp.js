"use strict";

// olapp.js
// (C) 2015 Minoru Akagi | MIT License
// https://github.com/minorua/WebGISLab

/*
olapp - An OpenLayers application

.core             - Core module.
.core.attribution - Attribution management module.
.core.project     - Project management module.
.gui              - GUI module.
.map              - An object of ol.Map. Initialized in olapp.init().
.plugin           - Plugin module.
.project          - An object of olapp.Project. Current project.
.source           - An object. Key is a data source ID and value is a subclass based on olapp.source.Base.
.tools            - An object. Key is a function/class/group name. Value is a function/class/group. A group is a sub-object.

.init()         - Initialize application.
.loadProject()  - Load a project.

.Project
.source.Base
*/
var olapp = {
  core: {},
  source: {},
  gui: {
    dialog: {}
  },
  plugin: {},
  tools: {}
};


(function () {
  var core = olapp.core,
      gui = olapp.gui,
      plugin = olapp.plugin,
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
  core.init = function () {
    map = new ol.Map({
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
    olapp.map = map;

    core.project.init();
    gui.init(map);
  };

  core.loadLayerFromFile = function (file) {
    if (!olapp.project) alert('No project');   // TODO: assert

    var reader = new FileReader();
    reader.onload = function (event) {
      var format = file.name.split('.').pop();
      var layer = core.loadText(reader.result, file.name, format);
      if (layer) {
        layer.title = file.name;
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
        style: core.styleFunction
      });

      return layer;
    }
    return null;
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


  // olapp.core.attribution - Attribution management module
  core.attribution = {

    _attr: {},

    getAttribution: function (html) {
      if (core.attribution._attr[html] === undefined) {
        core.attribution._attr[html] = new ol.Attribution({html: html});
      }
      return core.attribution._attr[html];
    }

  };


  // olapp.core.project - Project management module
  core.project = {

    init: function () {
      olapp.project = null;
      core.project._lastElemId = -1;
      mapLayers = {};
    },

    // Add a layer to current project.
    // The layer is added also to map and layer list.
    addLayer: function (layer) {
      // TODO: assert(olapp.project)
      layer.elemId = core.project.getNextLayerElemId();
      mapLayers[layer.elemId] = layer;
      olapp.project.mapLayers.push(layer);
      map.addLayer(layer);
      gui.addLayer(layer);
    },

    clear: function () {
      core.project.init();
      map.getLayers().clear();
      gui.clearLayerList();
    },

    getNextLayerElemId: function () {
      core.project._lastElemId++;
      return 'L' + core.project._lastElemId;
    },

    _loadCallback: null,

    _loadingLayers: {},

    _scriptElement: null,

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

        /* Not works with file://
        $('head').append(s);
        $.getScript(prj, function () {
          olapp.gui.status("Have been loaded '" + prj + "'");
        }); */

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
        plugin.loadPlugins(prj.plugins, function () {
          // Initialize project after plugins are loaded.
          if (prj.init !== undefined) prj.init(prj);
          core.project.setProject(prj);
          projectLoaded();
        });
        return;
      }

      if (prj.init !== undefined) prj.init(prj);
      core.project.setProject(prj);
      projectLoaded();
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
      }
    },

    setLayerSource: function (url, source) {
      if (core.project._loadingLayers[url] === undefined) return;

      if (typeof source == 'function') source = source();
      core.project._loadingLayers[url].forEach(function (layer) {
        layer.setSource(source);
      });
      delete core.project._loadingLayers[url];
    },

    setProject: function (project) {
      // Clear the current project
      core.project.clear();

      olapp.project = project;
      gui.setProjectTitle(project.title);

      // Add layers to map and layer list
      project.mapLayers.forEach(function (layer) {
        layer.elemId = core.project.getNextLayerElemId();
        mapLayers[layer.elemId] = layer;
        map.addLayer(layer);
        gui.addLayer(layer);
      });
    }

  };


  // olapp.gui
  gui.init = function (map) {
    gui._originalTitle = document.title;

    // layer list panel
    $('#slider').slideReveal({
      push: false,
      top: 50,    // TODO: const NAVBAR_HEIGHT = 50;
      trigger: $('#trigger'),
      hidden: function(slider, trigger){
        // Need to remove pushed style manually when the panel is closed with ESC key.
        $('#trigger').removeClass('active');
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
      gui.displayFeatureInfo(evt.pixel);
    });

    map.getView().on('change:resolution', function (evt) {
      var z = map.getView().getZoom();
      console.log('z: ' + z);
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
'<div class="list-group-item" id="' + layer.elemId + '">' +
'  <input type="checkbox"' + checked + '>' + layer.title +
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
'    <button class="btn" title="Zoom to layer extent"><span class="glyphicon glyphicon-zoom-in"></span></button>' +
'    <button class="btn" title="Show attribute table"><span class="glyphicon glyphicon-list-alt"></span></button>' +
'    <button class="btn" title="Remove layer"><span class="glyphicon glyphicon-trash"></span></button>' +
'  </div><div>' +
'    <div style="float:left;">' +
'      <div class="opacity-slider"></div>' +
'    </div><div style="float:right;">' +
'      <a href="#" class="btn btn-blendmode" title="Multipy blending mode"><span class="glyphicon glyphicon-tint"></span></a>' +
'    </div>' +
'  </div>' +
'</div>';

        item.append(html);

        if (mapLayers[layerId].blendMode == 'multiply') {
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
        item.find('.layer-sub-container').slideDown('fast');
        item.find('.layer-sub-container').find('.btn-blendmode').click(function (e) {
          e.stopPropagation();

          var blendMode = (mapLayers[layerId].blendMode == 'source-over') ? 'multiply' : 'source-over';
          mapLayers[layerId].blendMode = blendMode;

          var target = $(this);
          if (target.prop('tagName') == 'A') target = target.children();
          if (blendMode == 'multiply') target.addClass('active');
          else target.removeClass('active');

          map.render();
        });
      }
    };
    item.children('.btn').click(switchExpansion);
    item.dblclick(switchExpansion);
  };

  // Remove a layer from layer list.
  gui.removeLayer = function (id) {
    // TODO
  };

  gui.clearLayerList = function () {
    $('#layer_list').html('');
  };

  gui.updateLayerOrder = function () {
    // TODO: update layer order in project.mapLayers
    var layers = map.getLayers();
    layers.clear();
    $('#layer_list .list-group-item').each(function (index) {
      var id = $(this).attr('id');
      layers.insertAt(0, mapLayers[id]);
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
  var dataSources = {};
  var addLayerDialog = {

    init: function () {
      $('#dlg_addlayer').on('show.bs.modal', function () {
        var groupList = $('#addlg_group_list');
        var list;
        if (Object.keys(dataSources).length == 0) {
          // Initialize group list
          groupList.find('.list-group').html('');

          for (var src in olapp.source) {
            if (src == 'Base') continue;

            var source = new olapp.source[src];
            var subListId = 'addlg_sub_list_' + source.group.split(' ').join('_');
            if (dataSources[source.group] === undefined) {
              dataSources[source.group] = {};

              // Add group item
              var html =
'<li class="list-group-item">' +
'  <span>' + source.group + '</span>' +
'  <a class="btn accordion-toggle" style="float:right; padding:2px;" data-toggle="collapse" data-parent="#addlg_group_list" href="#' + subListId + '">' +
'    <span class="glyphicon glyphicon-chevron-down"></span>' +
'  </a>' +
'  <div class="panel-collapse collapse in" id="' + subListId + '">' +
'    <ul class="list-group"></ul>' +
'  </div>' +
'</li>';

              groupList.append(html);
            }
            dataSources[source.group][src] = source;

            // Add sub list item
            list = $('#' + subListId).find('.list-group');
            list.append('<li class="list-group-item"><span style="display: none;">' + src + '</span>' + source.name + '</li>');
          }

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
        }
      });
    },

    groupSelectionChanged: function (group, subGroup) {
      // Populate layer list
      var list = $('#addlg_layer_list');
      list.html('');
      if (dataSources[group] === undefined) return;

      var appendItem = function (subGroup, item) {
        var html =
'<li class="list-group-item">' +
'  <span style="display: none;">' + subGroup + '/' + item.id + '</span>' + item.name +
'  <button type="button" class="btn btn-primary" style="float:right; padding:0px 8px;">Add</button>' +
'</li>';

        list.append(html);
      };

      if (subGroup === undefined) {
        for (subGroup in dataSources[group]) {
          dataSources[group][subGroup].list().forEach(function (item) {
            appendItem(subGroup, item);
          });
        }
      }
      else {
        dataSources[group][subGroup].list().forEach(function (item) {
          appendItem(subGroup, item);
        });
      }
      list.find('button').click(function () {
        var subgroup_id = $(this).parent().children('span').text().split('/');
        var layer = dataSources[group][subgroup_id[0]].createLayer(subgroup_id[1]);
        core.project.addLayer(layer);
        // TODO: status message
      });
    }

  };
  gui.dialog.addLayer = addLayerDialog;


  // olapp.plugin
  plugin.plugins = {};
  plugin._loadingPluginSets = [];

  // Add a plugin to the application
  // addPlugin() is called from end of a plugin code, whereas loadPlugin() is called from project/gui.
  plugin.addPlugin = function (pluginPath, module) {
    // Register and initialize the plugin
    plugin.plugins[pluginPath] = module;
    if (module.init !== undefined) module.init();

    // Call callback function
    plugin._loadingPluginSets.forEach(function (pluginSet) {
      var index = pluginSet.plugins.indexOf(pluginPath);
      if (index !== -1) {
        pluginSet.plugins.splice(index, 1);
        if (pluginSet.plugins.length == 0 && pluginSet.callback) pluginSet.callback();
      }
    });

    // Remove completely loaded plugin set from the array
    for (var i = plugin._loadingPluginSets.length - 1; i >= 0; i--) {
      if (plugin._loadingPluginSets[i].plugins.length == 0) plugin._loadingPluginSets.splice(i, 1);
    }
  };

  // Load a plugin
  plugin.loadPlugin = function (pluginPath, callback) {
    plugin.loadPlugins([pluginPath], callback);
  };

  // Load plugins
  // callback is called once when all the plugins have been loaded.
  plugin.loadPlugins = function (pluginPaths, callback) {
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

    plugin._loadingPluginSets.push({
      plugins: loadingPlugins,
      callback: callback
    });
  };

})();

// TODO: move to below tools
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


// olapp.Project

// Constructor
//   params
//     - options
//       title: Title of project.
//       description: Description of project.
//       plugins: Array of paths of plugins to load.
//       init: function (project). A function to initialize project.
//         - project: project-self.
olapp.Project = function (options) {
  // for (var k in options) { this[k] = options[k]; }
  this.title = options.title || '';
  this.description = options.description || '';
  this.plugins = options.plugins || [];
  this.init = options.init;

  this.mapLayers = [];
};

olapp.Project.prototype = {

  constructor: olapp.Project,

  addLayer: function (layer) {
    if (layer.title === undefined) layer.title = 'no title';
    if (layer.blendMode === undefined) layer.blendMode = 'source-over';

    layer.on('precompose', function (evt) {
      evt.context.globalCompositeOperation = this.blendMode;
    });
    layer.on('postcompose', function (evt) {
      evt.context.globalCompositeOperation = 'source-over';
    });

    this.mapLayers.push(layer);
  },

  removeLayer: function (layer) {
    // TODO
  },

  toJSON: function () {
    // TODO:
  }

};


// olapp.source
olapp.source = {};

/*
olapp.source.Base

.list()             - Get layer list in HTML.
.createLayer(subId) - Create a layer from a sub-source identified by id.
*/
olapp.source.Base = function () {};

olapp.source.Base.prototype = {

  constructor: olapp.source.Base,

  list: function () {},

  createLayer: function (id, layerOptions) {}

};


// projection
olapp.tools.projection = {};

// Get resolution from general tile zoom level
olapp.tools.projection.resolutionFromZoomLevel = function (zoom) {
  var TILE_SIZE = 256,
      TSIZE1 = 20037508.342789244;
  return TSIZE1 / Math.pow(2, zoom - 1) / TILE_SIZE;
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
            var target = ol.proj.transform([lon, lat], 'EPSG:4326', 'EPSG:3857');
            olapp.map.getView().setCenter(target);
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


olapp.createDefaultProject = function () {
  return new olapp.Project({
    title: 'Default project',
    description: 'This project is default project, which has GSI tile layers.',
    plugins: ['source/naturalearth.js', 'source/gsitiles.js'],
    init: function (project) {
      // GSI Tiles (source/gsitiles.js)
      var gsitiles = new olapp.source.GSITiles;
      project.addLayer(gsitiles.createLayer('std'));                        // 標準地図
      project.addLayer(gsitiles.createLayer('relief', {visible: false}));   // 色別標高図
      project.addLayer(gsitiles.createLayer('ort', {visible: false}));      // 写真

      // Natural Earth data
      var ne = new olapp.source.NaturalEarth;
      project.addLayer(ne.createLayer('cl'));       // Coastline
    }
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
