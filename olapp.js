"use strict";

// olapp.js
// (C) 2015 Minoru Akagi | MIT License
// https://github.com/minorua/WebGISLab

/*
olapp - An OpenLayers application

.core             - Core module.
.core.crs         - CRS management module.
.core.project     - Project management module.
.gui              - GUI module.
.map              - An object of ol.Map. Initialized in olapp.init().
.plugin           - Plugin module.
.project          - An object of olapp.Project. Current project.
.source           - Data source management module. A souce class is a subclass based on olapp.source.Base.
.tools            - An object. Key is a function/class/group name. Value is a function/class/group. A group is a sub-object.

.init()             - Initialize application.
.loadProject()      - Load a project.
.defineProjection() - Define a projection.

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

  olapp.init = function (mapOptions) {
    core.init(mapOptions);
    gui.init(map);

    if (olapp.projectToLoad) {
      olapp.loadProject(olapp.projectToLoad.project).then(function () {
        olapp.projectToLoad.deferred.resolve();
        delete olapp.projectToLoad;
      });
    }
    else {
      // If project parameter is specified in URL, load the file.
      // Otherwise, load default project.
      var projectName = core.urlParams()['project'];
      if (projectName) {
        // Check that the project name is safe.
        if (projectName.indexOf('..') !== -1) {
          alert('Specified project name is wrong.');
        }
        else {
          olapp.loadProject('files/' + projectName + '.js');
        }
      }
      else {
        olapp.loadProject(olapp.createDefaultProject());
      }
    }
  };

  olapp.loadProject = function (project) {
    if (olapp.map) return core.project.load(project);

    // Project will be loaded after initialization
    if (olapp.projectToLoad) olapp.projectToLoad.deferred.reject();
    var d = $.Deferred();
    olapp.projectToLoad = {project: project, deferred: d};
    return d.promise();
  };

  olapp.defineProjection = function (name, proj4Str) {
    core.crs.define(name, proj4Str);
  };

  // olapp.core
  core.wgs84Sphere = new ol.Sphere(6378137);

  core.init = function (mapOptions) {
    var opt = mapOptions || {};
    opt.target = opt.target || 'map';
    opt.controls = opt.controls || ol.control.defaults({
      attributionOptions: ({
        collapsible: false
      })
    });

    map = new ol.Map(opt);
    olapp.map = map;

    core.project.init();
  };

  var attrs = {};
  core.getAttribution = function (html) {
    if (attrs[html] === undefined) {
      attrs[html] = new ol.Attribution({html: html});
    }
    return attrs[html];
  };

  // Load a script if not loaded yet
  core.loadScript = function (url) {    // TODO: statusMessage
    var d = $.Deferred();
    var sel = $('script[src="' + url + '"]');
    if (sel.length) {
      console.log('Already loaded:', url);
      return d.resolve(sel.get(0)).promise();
    }

    var s = document.createElement('script');
    s.type = 'text/javascript';
    s.onload = function () { d.resolve(s); };
    s.src = url;
    document.getElementsByTagName('head')[0].appendChild(s);
    return d.promise();
  };

  // Load multiple scripts
  core.loadScripts = function (urls, onebyone) {
    if (onebyone) {
      var d = $.Deferred();
      core.loadScript(urls[0]).then(function () {
        urls = urls.slice(1);
        if (urls.length == 0) d.resolve();
        else {
          core.loadScripts(urls, true).then(function () {
            d.resolve();
          });
        }
      });
      return d.promise();
    }
    else {
      var loads = [];
      for (var i = 0; i < urls.length; i++) {
        loads.push(core.loadScript(urls[i]));
      }
      return $.when.apply(this, loads);
    }
  };

  core.loadLayerFromFile = function (file) {
    if (!olapp.project) {
      console.log('No project');
      return;
    }
    var msg = gui.status.showMessage('Loading ' + file.name + '...');

    var reader = new FileReader();
    reader.onload = function (event) {
      var layer = core.createLayer(reader.result, file.name);
      if (layer) {
        layer.set('title', file.name);
        core.project.addLayer(layer);
        map.getView().fit(layer.getSource().getExtent(), map.getSize());
      }
      else {
        alert('Unknown format file: ' + file.name);
      }
      msg.remove();
    }
    reader.readAsText(file, 'UTF-8');
  };

  core.createLayer = function (source, filename, style, format) {    // TODO: layerOptions
    var ext = filename.split('#')[0].split('.').pop().toLowerCase();
    if (format === undefined) format = ext;

    var src = core.loadSource(source, format);
    var id = filename || '';
    if (id.indexOf('#') === -1) id += '#' + parseInt($.now() / 1000).toString(16);

    if (style === undefined) style = {color: tinycolor.random().toRgbString()};

    var styleFunc = core.createStyleFunction(style.color, style.width, style.fillColor);
    var layer = new ol.layer.Vector({
      source: src,
      style: styleFunc,
      olapp: {
        source: (ext.indexOf('json') !== -1) ? 'JSON' : 'Text',
        layer: id,
        data: source,
        style: style
      }
    });

    if (style.override) {
      // Set style to features
      var features = src.getFeatures();
      for (var i = 0, l = features.length; i < l; i++) {
        features[i].setStyle(styleFunc(features[i]));
      }
    }
    return layer;
  };

  core.loadSource = function (source, format) {
    var format2formatConstructors = {
      'geojson': [ol.format.GeoJSON],
      'gpx': [ol.format.GPX],
      'kml': [ol.format.KML],
      'json': [ol.format.GeoJSON, ol.format.TopoJSON]
    };

    format = format || '';
    var formatConstructors = format2formatConstructors[format.toLowerCase()];
    if (!formatConstructors) {
      formatConstructors = [
        ol.format.GeoJSON,
        ol.format.GPX,
        ol.format.IGC,
        ol.format.KML,
        ol.format.TopoJSON
      ];
    }
    return core._loadSource(source, formatConstructors);
  };

  core._loadSource = function (source, formatConstructors) {
    var transform = core.transformFromWgs84;

    for (var i = 0; i < formatConstructors.length; i++) {
      var format = new formatConstructors[i]();
      var features = [];
      try {
        features = format.readFeatures(source);
      } catch (e) {
        continue;
      }
      if (features.length == 0) continue;

      features.forEach(function (feature) {
        var geometry = feature.getGeometry();
        if (geometry) geometry.applyTransform(transform);
      });

      return new ol.source.Vector({
        features: features
      });
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

  core.urlParams = function () {
    var p, vars = {};
    var params = window.location.search.substring(1).split('&').concat(window.location.hash.substring(1).split('&'));
    params.forEach(function (param) {
      p = param.split('=');
      vars[p[0]] = p[1];
    });
    return vars;
  };

  // Create a style function
  // strokeColor: If not specified, use a random color.
  // strokeWidth: Default is 1.
  // fillColor: If null, no fill style. If not specified, use translucent color of strokeColor.
  core.createStyleFunction = function (strokeColor, strokeWidth, fillColor) {
    if (strokeColor === undefined) {
      strokeColor = tinycolor.random().toRgbString();
    }
    if (strokeWidth === undefined) strokeWidth = 1;
    if (fillColor === undefined) fillColor = tinycolor(strokeColor).setAlpha(0.5).toRgbString();

    var strokeStyle, fillStyle;
    strokeStyle = new ol.style.Stroke({
      color: strokeColor,
      width: strokeWidth
    });

    if (fillColor !== null) {
      fillStyle = new ol.style.Fill({
        color: fillColor
      });
    }
    var style = {
      Point: [new ol.style.Style({
        image: new ol.style.Circle({
          stroke: strokeStyle,
          fill: fillStyle,
          radius: 5
        })
      })],
      LineString: [new ol.style.Style({
        stroke: strokeStyle
      })],
      Polygon: [new ol.style.Style({
        stroke: strokeStyle,
        fill: fillStyle
      })]
    };
    style.MultiPoint = style.Point;
    style.MultiLineString = style.LineString;
    style.MultiPolygon = style.Polygon;

    return function (feature, resolution) {
      return style[feature.getGeometry().getType()];
    };
  };

  // olapp.core.crs - CRS management module
  core.crs = {

    definedCRSs: {},

    define: function (name, proj4Str) {
      proj4.defs(name, proj4Str);
      core.crs.definedCRSs[name] = proj4Str;
    },

    isDefined: function (name) {
      return (name in core.crs.definedCRSs || name == 'EPSG:3857' || name == 'EPSG:4326');
    },

    getDefinition: function (name) {
      var d = $.Deferred();
      if (name in core.crs.definedCRSs) {
        var obj = {
          proj: core.crs.definedCRSs[name]
        };
        return d.resolve(obj).promise();
      }
      else if (name.indexOf('EPSG:') === 0) {
        var code = parseInt(name.substr(5));
        if (code == 3857 || code == 4326) return d.resolve(null).promise();  // TODO:
        else {
          var msg = gui.status.showMessage('Loading EPSG code list...');
          core.loadScript('js/epsg.js').always(msg.remove).then(function () {
            for (var i = 0, l = olapp.epsgList.length; i < l; i++) {
              if (olapp.epsgList[i].code == code) {
                d.resolve(olapp.epsgList[i]);
                return;
              }
            }
            d.reject();
          });
          return d.promise();
        }
      }
      return d.reject().promise();
    }

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

    _loadDeferred: null,

    _loadingLayers: {},

    _loadingScripts: {},    // script elements to load layer source data

    _scriptElement: null,   // script element of a project

    // Load a project
    //   prj: olapp.Project object, string (URL), File or Object (JSON).
    // Returns a deferred object which is resolved when the project has been loaded to application.
    load: function (prj) {
      var d = core.project._loadDeferred;
      if (prj instanceof olapp.Project) {
        var msg = gui.status.showMessage('Loading Project...');

        // Load and initialize plugins, and then set the project.
        if (!d) d = $.Deferred();
        plugin.load(prj.plugins).then(function () {
          core.project.set(prj);
          core.project._loadDeferred = null;

          msg.remove();
          gui.status.showMessage('Project has been loaded.', 1);

          d.resolve();
        });
        return d.promise();
      }
      else {
        if (d) {
          console.log('Another project starts to load before previous one finishes loading.');
          d.reject();
        }

        // Remove project script element if exists
        var head = document.getElementsByTagName('head')[0];
        if (core.project._scriptElement) head.removeChild(core.project._scriptElement);
        core.project._scriptElement = null;

        if (typeof prj == 'string') {
          // Load a project script
          var msg = gui.status.showMessage('Fetching Project...');
          core.loadScript(prj).always(msg.remove).then(function (elem) {
            core.project._scriptElement = elem;
          });
        }
        else if (prj instanceof File) {
          // Remove hash to respect view position/zoom in the project to load
          window.location.replace('#');

          var reader = new FileReader();
          reader.onload = function (event) {
            eval(reader.result);
          }
          reader.readAsText(prj, 'UTF-8');
        }

        d = core.project._loadDeferred = $.Deferred();
        return d.promise();
      }
    },

    set: function (project) {
      // Clear the current project
      core.project.clear();

      olapp.project = project;
      if (project.init !== undefined) project.init(project);
      gui.setProjectTitle(project.title);
      map.setView(project.view);

      var projection = project.view.getProjection();
      core.transformToWgs84 = ol.proj.getTransform(projection, 'EPSG:4326');
      core.transformFromWgs84 = ol.proj.getTransform('EPSG:4326', projection);

      // Load layers
      if (project.layers !== undefined) {
        project.layers.forEach(function (lyr) {
          // Hold source and layer (id)
          var layerOptions = {
            olapp: {
              source: lyr.source,
              layer: lyr.layer,
              style: lyr.style
            }
          };
          $.extend(layerOptions, lyr.options);

          // Create a layer
          var layer;
          if (lyr.source == 'Custom') {
            layer = project.customLayers[lyr.layer](project, layerOptions);
          }
          else if(lyr.source == 'JSON' || lyr.source == 'Text') {
            layer = core.createLayer(project.sources[lyr.layer].data, lyr.layer, lyr.style);
            for (var k in lyr.options) {
              layer.set(k, lyr.options[k]);
            }
          }
          else {
            layer = olapp.source[lyr.source].createLayer(lyr.layer, layerOptions);
          }

          if (layer) project.addLayer(layer);
          else console.log('Failed to load layer: ', lyr);
        });
      }

      // Set position and zoom
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

      core.project._loadingLayers[url].forEach(function (layer) {
        var src = (typeof source == 'function') ? source() : source;
        var style = layer.get('olapp').style;
        if (style !== undefined) {
          // Set style to features
          var styleFunc = core.createStyleFunction(style.color, style.width, style.fillColor);
          var features = src.getFeatures();
          for (var i = 0, l = features.length; i < l; i++) {
            features[i].setStyle(styleFunc(features[i]));
          }
        }
        layer.setSource(src);
      });
      delete core.project._loadingLayers[url];

      // Remove the script element from DOM
      $(core.project._loadingScripts[url]).remove();
      delete core.project._loadingScripts[url];
    },

    saveToFile: function () {
      core.loadScript('lib/FileSaver.js/FileSaver.min.js').then(function () {
        var blob = new Blob([olapp.project.toString()], {type: 'text/plain;charset=utf-8'});
        saveAs(blob, "project.js");
      });
    },

    saveToStorage: function () {
    },

    setCRS: function (crsName) {

      function updateProject() {
        // transform center coordinates
        var view = olapp.project.view;
        var currentCRS = view.getProjection().getCode();

        olapp.project.view = new ol.View({
          projection: crsName,
          center: ol.proj.transform(view.getCenter(), currentCRS, crsName),
          zoom: view.getZoom(),
          maxZoom: parseInt(tools.projection.zoomLevelFromResolution(view.minResolution_))
        });

        var projectStr = olapp.project.toString();
        console.log('CRS has been changed.', projectStr);
        eval(projectStr);
        // TODO: remove project parameter from URL
      }

      if (core.crs.isDefined(crsName)) updateProject();
      else {
        core.crs.getDefinition(crsName).then(function (obj) {
          if (obj && obj.proj) olapp.defineProjection(crsName, obj.proj);
          else console.log('Cannot get projection definition.');
          updateProject();
        }, function () {});
      }
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
      alert('Not implemented yet');
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
      gui.dialog.project.show();
    });

    $('#print').click(function () {
      alert('Not implemented yet');
    });

    $('#save_image').click(function () {
      core.saveMapImage('mapimage.png');
    });

    $('#clone_app').click(function () {
      plugin.load(['export/clone.js']).then(function () {
        plugin.plugins['export/clone.js'].run();
      });
    });

    // layer list panel
    $('#trigger').click(function () {
      $('#slider').toggle('slide', 'fast');
    });

    $(window).keydown(function (e) {
      if (e.keyCode == 27) {    // escape
        if ($('#trigger').hasClass('active')) {
          $('#trigger').removeClass('active');
          $('#slider').toggle('slide', 'fast');
        }
      }
    });

    // layer list
    var layerList = $('#layer_list');
    if (layerList.length) {
      layerList.sortable({
        axis: 'y',
        stop: function (event, ui) {
          gui.layerOrderChanged();
        }
      });
    }

    // Initialize dialogs
    for (var k in gui.dialog) {
      gui.dialog[k].init();
    }

    map.on('click', function (evt) {
      var pt = map.getEventCoordinate(evt.originalEvent);
      console.log('Clicked', pt, core.transformToWgs84(pt));
      gui.displayFeatureInfo(evt.pixel);
    });

    map.on('moveend', function (evt) {
      var view = map.getView();
      var center = core.transformToWgs84(view.getCenter());
      var crs = view.getProjection().getCode();

      var hash = '#';
      if (crs != 'EPSG:3857') hash += 'crs=' + crs + '&';
      hash += 'z=' + view.getZoom() + '&lat=' + center[1].toFixed(6) + '&lon=' + center[0].toFixed(6);
      window.location.replace(hash);
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
          var ext = files[i].name.split('.').pop().toLowerCase();
          if (ext != 'jpeg' && ext != 'jpg') {    // TODO: olapp: file drop event listeners
            core.loadLayerFromFile(files[i]);
          }
        }
      }
    });

    // search
    $('#searchform').submit(function (event) {
      var box = $('#searchbox');
      if (box.is(':visible')) {
        var q = box.val();
        if (q) tools.geocoding.Nominatim.search(q);
        if (window.innerWidth < 450) box.hide();
      }
      else {
        box.show();
        box.focus();
      }
      event.preventDefault();
    });

    // map links
    olapp.tools.mapLinks.init(document.getElementById('maplinks'));
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

      var layerId = item.attr('id'),
          layer = mapLayers[layerId];
      $('#layer_list .glyphicon-chevron-up').removeClass('glyphicon-chevron-up').addClass('glyphicon-chevron-down');
      $('#layer_list .layer-sub-container').slideUp('fast', function () {
        $(this).remove();
      });

      if ($(this).parent().find('.layer-sub-container').length == 0) {
        $(this).find('span').removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-up');

        // buttons and slider
        var extent = layer.getExtent();
        if (extent === undefined && layer.getSource) {
          var source = layer.getSource();
          if (source && source.getExtent) extent = source.getExtent();
        }

        var hasButtons = [(extent !== undefined), false, true, true];
        var emptyButton = '<button class="btn btn-default btn-empty disabled"></button>';
        var html =
'<div class="layer-sub-container">' +
'  <div>' +
'    <button class="btn btn-default btn-zoomtolayer' + (hasButtons[0] ? '' : ' disabled') + '" title="Zoom to layer extent"><span class="glyphicon glyphicon-zoom-in"></span></button>' +
'    <button class="btn btn-default btn-attrtable' + (hasButtons[1] ? '' : ' disabled') + '" title="Show attribute table"><span class="glyphicon glyphicon-list-alt"></span></button>' +
'    <button class="btn btn-default btn-properties' + (hasButtons[2] ? '' : ' disabled') + '" title="Properties"><span class="glyphicon glyphicon-cog"></span></button>' +
'    <button class="btn btn-default btn-removelayer' + (hasButtons[3] ? '' : ' disabled') + '" title="Remove layer"><span class="glyphicon glyphicon-trash"></span></button>' +
'  </div>' +
'  <div class="opacity-slider" title="Opacity"></div>' +
'  <div><a href="#" class="btn btn-default btn-blendmode" title="Multipy blending mode"><span class="glyphicon glyphicon-tint"></span></a></div>' +
'</div>';

        item.append(html);

        if (layer.get('blendMode') == 'multiply') {
          item.find('.btn-blendmode span').addClass('active');
        }

        item.find('.opacity-slider').slider({
          change: function (event, ui) {
            var opacity = ui.value / 100;
            layer.setOpacity(opacity);
          },
          slide: function (event, ui) {
            var opacity = ui.value / 100;
            layer.setOpacity(opacity);
          },
          value: layer.getOpacity() * 100
        });

        item.find('.layer-sub-container button').click(function (e) {
          e.stopPropagation();
          e.preventDefault();

          var button = $(this);
          button.parent().find('.active').removeClass('active');
          if (button.hasClass('btn-properties')) {
            gui.dialog.layerProperties.show(layer);
          }
          else if (button.hasClass('btn-removelayer')) {
            bootbox.confirm("Are you sure you want to remove this layer?", function(result) {
              if (result) olapp.core.project.removeLayer(layerId);
            });
          }
          else if (button.hasClass('btn-zoomtolayer')) {
            var extent = layer.getExtent();
            if (!extent && layer.getSource()) extent = layer.getSource().getExtent();
            if (extent) map.getView().fit(extent, map.getSize());
          }
          else {    // btn-attrtable
            alert('Not implemented yet');
          }
        });

        item.find('.btn-blendmode').click(function (e) {
          e.stopPropagation();

          var blendMode = (layer.get('blendMode') == 'source-over') ? 'multiply' : 'source-over';
          layer.set('blendMode', blendMode);

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

  gui.layerOrderChanged = function () {
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
    if (html) $('#info').html(html).show();
    else $('#info').hide();
  };

  gui.setProjectTitle = function (title) {
    document.title = gui._originalTitle + (title ? ' - ' + title : '');
  };


  // olapp.gui.dialog.project
  gui.dialog.project = {

    _initialized: false,

    init: function () {},

    ok: function () {
      var body = $('#dlg_project').find('.modal-body');

      var project = olapp.project;
      project.title = body.find('input[name=title]').val();
      project.description = body.find('textarea[name=desc]').val();

      if (body.find('input[name=crs][value=epsg]').prop('checked')) {
        var code = 'EPSG:' + body.find('input[name=epsg]').val();
        if (code != project.view.getProjection().getCode()) {
          core.crs.getDefinition(code).then(function (obj) {
            bootbox.confirm('Are you sure you want to change the CRS to "' + obj.title + '" (' + code + ') ?', function(result) {
              if (result) {
                core.project.setCRS(code);
                $('#dlg_project').modal('hide');
              }
            });
          }, function () {
            bootbox.alert('Invalid CRS "' + code + '". Cannot apply it to the project.');
          });
          return;
        }
      }
      else {
        var prj = body.find('input[name=proj4]').val();
        if (prj) {
          if (project.view.getProjection().getCode() !== 'custom' || prj !== core.crs.definedCRSs['custom']) {
            core.crs.define('custom', prj);
            core.project.setCRS('custom');
          }
        }
        else {
          bootbox.alert('Empty Proj4 string.');
          return;
        }
      }
      $('#dlg_project').modal('hide');
    },

    show: function () {
      var project = olapp.project;
      var dlg = $('#dlg_project');
      var body = dlg.find('.modal-body');

      if (!this._initialized) {
        $('#dlg_project').find('.modal-footer .btn-primary').click(function () {
          gui.dialog.project.ok();
        });

        body.find('button').click(function () {
          var msg = gui.status.showMessage('Loading EPSG code list...');
          core.loadScript('js/epsg.js').always(msg.remove).then(function () {
            var container = $('<div />');
            var html =
'<div class="input-group">' +
'  <span class="input-group-addon glyphicon glyphicon-search"></span>' +
'  <input type="text" class="form-control">' +
'</div>';
            var filterBox = $(html).appendTo(container);

            var list = $('<ul class="list-group epsg-list" />').css({
              'overflow-y': 'scroll',
              'height': '200px'
            }).appendTo(container);
            olapp.epsgList.forEach(function (crs) {
              list.append('<li class="list-group-item">[EPSG:' + crs.code + '] ' + crs.title + '</li>')
            });
            list.children().click(function () {
              list.find('.active').removeClass('active');
              $(this).addClass('active');
            });

            filterBox.find('input').on('change keyup', function () {
              var filter = $(this).val().toLowerCase();
              list.children().each(function (index) {
                if ($(this).html().toLowerCase().indexOf(filter) !== -1) $(this).show();
                else $(this).hide();
              });
            });

            bootbox.dialog({
              title: 'EPSG Code List',
              message: container,
              buttons: {
                ok: {
                  label: 'OK',
                  className: "btn-primary",
                  callback: function (e) {
                    var item = list.children('.active');
                    if (item.length == 0) {
                      bootbox.alert('Select an EPSG code.');
                      e.preventDefault();
                    }
                    else {
                      body.find('input[name=epsg]').val(item.html().substr(1).split(']')[0].split(':')[1]);
                    }
                  }
                },
                cancel: {
                  label: 'Cancel',
                  className: "btn-default",
                  callback: function () {}
                }
              }
            });
          });
        });
        body.children('form').submit(function (e) {
          e.preventDefault();
          gui.dialog.project.ok();
        });
        this._initialized = true;
      }

      body.find('input[name=title]').val(project.title);
      body.find('textarea[name=desc]').val(project.description);

      var crs = project.view.getProjection().getCode();
      if (crs.substr(0, 5) == 'EPSG:') {
        body.find('input[name=crs][value=epsg]').prop('checked', true);
        body.find('input[name=epsg]').val(crs.substr(5));
      }
      else {
        body.find('input[name=crs][value=proj4]').prop('checked', true);
        body.find('input[name=proj4]').val(core.crs.definedCRSs[crs]);
      }
      dlg.modal('show');
    }

  };


  // olapp.gui.dialog.addLayer
  gui.dialog.addLayer = {

    groupListInitialized: false,

    init: function () {
      var dialog = this;

      $('#dlg_addlayer').on('show.bs.modal', function () {
        var groupList = $('#addlg_group_list');

        if (!dialog.groupListInitialized) {
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
            dialog.groupSelectionChanged($(this).children('span').text());
          }).find('.list-group-item').click(function (event) {
            event.stopPropagation();
            groupList.find('.active').removeClass('active');
            $(this).addClass('active');
            var group = $(this).parent().parent().parent().children('span').text();
            dialog.groupSelectionChanged(group, $(this).children('span').text());
          });

          // toggle button style
          $('#addlg_group_list').find('.collapse').on('hide.bs.collapse', function () {
            $(this).parent().find('.accordion-toggle').html('<span class="glyphicon glyphicon-chevron-down"></span>');
          }).on('show.bs.collapse', function () {
            $(this).parent().find('.accordion-toggle').html('<span class="glyphicon glyphicon-chevron-up"></span>');
          }).collapse('hide');

          dialog.groupListInitialized = true;
        }
      });
    },

    groupSelectionChanged: function (groupName, sourceName) {
      // Populate layer list
      var list = $('#addlg_layer_list');
      list.html('');

      var addLayer = function (src, id) {
        // Hold source and layer (id)
        var layerOptions = {
          olapp: {
            source: src,
            layer: id
          }
        };
        var layer = source.get(src).createLayer(id, layerOptions);
        if (layer) {
          core.project.addLayer(layer);
          gui.status.showMessage('Layer "' + layer.title + '" has been added to the map.', 3000);
        }
        else gui.status.showMessage('Failed to create layer.', 3000);
      };

      function populateList(sourceName) {
        var src = source.get(sourceName);
        if (src.populateList !== undefined) {
          src.populateList(list);
        }
        else {
          src.layers.forEach(function (item) {
            var html =
'<li class="list-group-item">' +
'  <button type="button" class="btn btn-primary">Add</button>' +
'  <span style="display: none;">' + sourceName + '/' + item.id + '</span>' + item.name +
'</li>';
            $(html).appendTo(list).children('button').click(function () {
              var srcname_id = $(this).parent().children('span').text().split('/');
              addLayer(srcname_id[0], srcname_id[1]);
            });
          });
        }
      }

      if (sourceName === undefined) source.sourceNames(groupName).forEach(populateList);
      else populateList(sourceName);
    }

  };

  gui.dialog.layerProperties = {

    _initialized: false,

    _layer: null,

    init: function () {},

    show: function (layer) {
      if (!this._initialized) {
        $('#dlg_layerProperties').find('.modal-footer .btn-primary').click(function () {
          var lyr = gui.dialog.layerProperties._layer;
          if (lyr instanceof ol.layer.Vector) {
            var color = '#' + $('#lyr_color').val();
            var width = 1;
            var fillColor = tinycolor(color).setAlpha(0.5).toRgbString();

            var obj = lyr.get('olapp');
            obj.style = obj.style || {};
            obj.style.color = color;
            obj.style.width = width;
            obj.style.fillColor = fillColor;
            obj.style.override = true;

            // Set style to features
            var styleFunc = core.createStyleFunction(color, width, fillColor);
            var features = lyr.getSource().getFeatures();
            for (var i = 0, l = features.length; i < l; i++) {
              features[i].setStyle(styleFunc(features[i]));
            }
          }
          $('#dlg_layerProperties').modal('hide');
        });
        this._initialized = true;
      }

      this._layer = layer;
      var dlg = $('#dlg_layerProperties');
      dlg.find('.modal-title').html('Layer Properties - ' + layer.get('title'));

      var html =
'<h3>General</h3>' +
'<table>' +
'  <tr><td>Source</td><td>' + layer.get('olapp').source + '</td></tr>' +
'  <tr><td>Layer</td><td><div style="width: 450px; word-wrap: break-word;">' + layer.get('olapp').layer + '</div></td></tr>' +
'</table>';
      dlg.find('.modal-body').html(html);

      if (layer instanceof ol.layer.Vector && layer.getSource().getFeatures) {
        var style = layer.get('olapp').style || {};
        var color = style.color;
        if (color === undefined) {
          var styleFunc = layer.getStyleFunction();
          if (styleFunc) {
            var stroke = styleFunc(layer.getSource().getFeatures()[0])[0].getStroke();
            if (stroke) color = stroke.getColor();
          }
        }

        html =
'<h3>Style</h3>' +
'<table>' +
'  <tr><td>Color</td><td><input type="text" id="lyr_color" class="pick-a-color form-control"></td></tr>' +
'</table>';
        var obj = $(html);
        obj.find('input').val(color || '').pickAColor();
        dlg.find('.modal-body').append(obj);
      }
      dlg.modal('show');
    }

  };


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

      var dlg = $('#dlg_measure');
      if (dlg.length) {
        dlg.draggable({handle: ".dlg-header"});
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
    }

  };

  // olapp.gui.dialog.threejs
  gui.dialog.threejs = {

    init: function () {
      var threejs = function () {
        return plugin.plugins['3dviewer/threejs.js'];
      };
      $('#dlg_threejs').on('show.bs.modal', function () {
        $('#three_rotate').removeClass('active');
        plugin.load(['3dviewer/threejs.js']).then(function () {
          threejs().run();
        });
      });
      $('#dlg_threejs').on('hide.bs.modal', function () {
        threejs().stop();
      });

      // z exaggeration
      $('#three_zexag').find('li').click(function () {
        $('#three_zexag').find('button span').first().html($(this).text());
        threejs().setExaggeration(parseFloat($(this).text().replace('x', '')));
      });

      // automatic rotation
      $('#three_rotate').click(function () {
        threejs().rotate(!threejs().isRotating());
      });
      window.addEventListener('keyup', function (e) {
        if (e.keyCode == 82 && $('#dlg_threejs').is(':visible')) {    // R
          if (threejs().isRotating()) $('#three_rotate').addClass('active');
          else $('#three_rotate').removeClass('active');
        }
      });

      // save model
      $('#three_save').click(function () {
        bootbox.dialog({
          title: 'Save the model',
          message: 'Click save button to save the 3D model (.stl) and the map image (.png).',
          buttons: {
            save: {
              label: 'Save',
              className: "btn-primary",
              callback: function () {
                threejs().save();
              }
            },
            cancel: {
              label: 'Cancel',
              className: "btn-default",
              callback: function () {}
            }
          }
        });
      });
    }

  };


  // olapp.gui.status
  gui.status = {

    _lastMsgIndex: 0,

    clear: function (msg, fade) {
      var obj;
      if (msg === undefined) obj = $('#status').children();
      else if (typeof msg == 'object') obj = $('#' + msg.id);
      else obj = $('#' + msg);

      if (fade) {
        obj.fadeOut('normal', function () {
          $(this).remove();
        });
      }
      else {
        obj.remove();
      }
    },

    showMessage: function (html, millisec) {
      var msgId = 'status_' + (++this._lastMsgIndex);
      $('<div/>', {id: msgId}).html(html).appendTo($('#status'));
      if (millisec) {
        window.setTimeout(function () {
          gui.status.clear(msgId, true);
        }, millisec);
      }
      return {
        id: msgId,
        remove: function () {
          gui.status.clear(msgId);
        }
      };
    }

  };


  // olapp.source
  var sources = {};
  var sourceGroups = {};

  source.register = function (group, name, object) {
    if (sourceGroups[group] === undefined) sourceGroups[group] = {};
    sourceGroups[group][name] = object;
    sources[name] = object;
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

  // Load a plugin/plugins
  //   pluginPaths: a plugin path string or an array of plugin paths.
  // Returns a deferred object which is resolved when all the plugins have been loaded and initialized.
  plugin.load = function (pluginPaths) {
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

    var d = $.Deferred();
    if (loadingPlugins.length == 0) return d.resolve().promise();

    plugin._loadingSets.push({
      plugins: loadingPlugins,
      deferred: d
    });
    return d.promise();
  };

  // Register a plugin
  // register() is called from end of a plugin code, whereas load() is called from project/gui.
  plugin.register = function (pluginPath, module) {
    // Register and initialize the plugin
    plugin.plugins[pluginPath] = module;

    var resolve = function () {
      // Resolve deferred object if all the plugins in the set have been loaded and initialized.
      plugin._loadingSets.forEach(function (pluginSet) {
        var index = pluginSet.plugins.indexOf(pluginPath);
        if (index !== -1) {
          pluginSet.plugins.splice(index, 1);
          if (pluginSet.plugins.length == 0) pluginSet.deferred.resolve();
        }
      });

      // Remove completely loaded plugin-set from the array.
      for (var i = plugin._loadingSets.length - 1; i >= 0; i--) {
        if (plugin._loadingSets[i].plugins.length == 0) plugin._loadingSets.splice(i, 1);
      }
    };

    var d;
    if (module.init !== undefined) d = module.init();

    if (typeof d == 'object') d.then(resolve);
    else resolve();
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
  this.sources = options.sources || {};

  this._lastLayerId = this.layers.length - 1;
  this.mapLayers = [];
};

olapp.Project.prototype = {

  constructor: olapp.Project,

  addLayer: function (layer) {
    if (layer.get('title') === undefined) layer.set('title', 'no title');
    if (layer.get('blendMode') === undefined) layer.set('blendMode', 'source-over');

    var layers = (layer instanceof ol.layer.Group) ? layer.getLayers() : [layer];
    layers.forEach(function (lyr) {
      lyr.on('precompose', function (evt) {
        evt.context.globalCompositeOperation = layer.get('blendMode');
      });
      lyr.on('postcompose', function (evt) {
        evt.context.globalCompositeOperation = 'source-over';
      });
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
    function quote_escape(text, singleQuote) {
      text = text.replace(/\n/g, '\\n');
      if (singleQuote) return "'" + text.replace(/\'/g, "\\'") + "'";
      return '"' + text.replace(/\"/g, '\\"') + '"';
    }

    var projection = this.view.getProjection().getCode();
    var center = this.view.getCenter() || [0, 0];
    var maxZoom = parseInt(olapp.tools.projection.zoomLevelFromResolution(this.view.minResolution_));
    var zoom = this.view.getZoom();
    var enableRotation = (this.view.constraints_.rotation !== ol.RotationConstraint.disable);
    var initFuncStr = (this.init) ? this.init.toString() : 'undefined';

    var layers = [], sources = [];
    this.mapLayers.forEach(function (layer) {
      var properties = {
        options: {
          visible: layer.getVisible(),
          opacity: layer.getOpacity(),
          blendMode: layer.get('blendMode'),
          title: layer.get('title')
        }
      };
      var olappObj = layer.get('olapp');
      $.extend(properties, olappObj);
      delete properties.data;
      layers.push('\n    ' + JSON.stringify(properties));

      // source data
      var data = olappObj.data;
      if (layer instanceof ol.layer.Vector && data !== undefined) {
        var ext = olappObj.layer.split('#')[0].split('.').pop().toLowerCase();
        if (olappObj.source == 'JSON') {
          if (typeof data == 'string') data = JSON.parse(data);
          data = JSON.stringify(data);
        }
        else {
          data = quote_escape(data, true);    // enclose text in single quotes
        }
        data = '{format:' + quote_escape(ext) + ',data:' + data + '}';
        sources.push('\n    ' + quote_escape(properties.layer) + ':' + data);
      }
    });

    var customLayers = [];
    for (var layer in this.customLayers) {
      customLayers.push('\n    ' + layer + ': ' + this.customLayers[layer].toString());
    }

    var content = [
'olapp.loadProject(new olapp.Project({',
'  title: ' + quote_escape(this.title) + ',',
'  description: ' + quote_escape(this.description) + ',',
'  view: new ol.View({',
'    projection: ' + quote_escape(projection) + ',',
'    center: ' + JSON.stringify(center) + ',',
'    maxZoom: ' + maxZoom + ',',
'    zoom: ' + zoom + ',',
'    enableRotation: ' + enableRotation,
'  }),',
'  plugins: ' + JSON.stringify(this.plugins) + ',',
'  init: ' + initFuncStr + ',',
'  layers: [' + layers.join(','),
'  ],',
'  sources: {' + sources.join(','),
'  },',
'  customLayers: {' + customLayers.join(','),
'  }',
'}));',
''];

    if (projection != 'EPSG:3857') {
      content.unshift('olapp.defineProjection(' + quote_escape(projection) + ', ' +
                                                  quote_escape(olapp.core.crs.definedCRSs[projection]) + ');\n');
    }
    return content.join('\n');
  }

};


/*
olapp.Source

.createLayer should be overridden.
*/
// Constructor
//   name: source name
//   layers: List of layer items. Each item should have id and name properties.
//           Not used if populateList method is implemented.
olapp.Source = function (name, layers) {
  this.name = name;
  this.layers = layers || [];
};

olapp.Source.prototype = {

  constructor: olapp.Source,

  getLayerById: function (id) {
    for (var i = 0, l = this.layers.length; i < l; i++) {
      if (this.layers[i].id === id) return this.layers[i];
    }
    return undefined;
  },

  // Create a layer with a source identified by id.
  createLayer: function (id, layerOptions) {
    console.log(this.name, 'createLayer method is not implemented');
    return null;
  },

  // Implement this method if the source uses custom function to generate list items
  populateList: undefined

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


// olapp.tools.mapLinks settings
olapp.tools.mapLinks = {

  links: [
    {name: 'GSI Maps', url: 'http://maps.gsi.go.jp/#{z}/{lat}/{lon}'},
    {name: 'Google Maps', url: 'https://www.google.com/maps/@{lat},{lon},{z}z'},
    null,
    {name: 'Weather', links: [
      {name: 'Weather Radar (Yahoo!地図)', url: 'http://map.yahoo.co.jp/maps?layer=weather&v=3&z={z}&lat={lat}&lon={lon}'}
    ]},
    {name: 'Geology', links: [
      {name: 'Seamless Digital Geological Map', url: 'https://gbank.gsj.jp/seamless/seamless2015/2d/?center={lat},{lon}&z={z}&type=detailed'}
    ]}
  ],

  getUrlByName: function (name) {
    function find(links, name) {
      for (var i = 0; i < links.length; i++) {
        var link = links[i];
        if (link === null) continue;
        if (link.url !== undefined) {
          if (link.name == name) return link.url;
        }
        else if (link.links !== undefined) {
          var url = find(link.links, name);
          if (url !== undefined) return url;
        }
      }
      return undefined;
    }
    return find(this.links, name);
  },

  init: function (listElem) {
    if (Object.keys(this.links).length == 0) return;

    function populateSubMenu(links, parentElem) {
      var parent = $(parentElem);
      links.forEach(function (link) {
        if (link === null) parent.append('<li role="separator" class="divider"></li>');
        else if (link.url !== undefined) {
          $('<li><a href="#">' + link.name + '</a></li>').click(function () {
            var view = olapp.map.getView();
            var center = olapp.core.transformToWgs84(view.getCenter());
            var url = olapp.tools.mapLinks.getUrlByName($(this).children('a').text());
            url = url.replace('{lat}', center[1]).replace('{lon}', center[0]).replace('{z}', view.getZoom());
            window.open(url);
          }).appendTo(parentElem);
        }
        else if (link.links !== undefined) {
          var listElem = document.createElement('ul');
          listElem.className = 'dropdown-menu';

          $('<li class="dropdown-submenu"><a href="#">' + link.name + '</a></li>').append(listElem).appendTo(parent);

          populateSubMenu(link.links, listElem);
        }
      });
    }
    populateSubMenu(this.links, listElem);

    // touch device support
    $('#navbar .dropdown-submenu>a').click(function (e) {
      e.stopPropagation();
      e.preventDefault();
      $(this).next('ul').show();
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


olapp.createDefaultProject = function () {
  return new olapp.Project({
    title: 'Default project',
    description: 'This is default project.',
    view: new ol.View({
      projection: 'EPSG:3857',
      center: ol.proj.transform([138.7, 35.4], 'EPSG:4326', 'EPSG:3857'),
      maxZoom: 18,
      zoom: 5
    }),
    plugins: ['source/naturalearth.js', 'source/gsitiles.js', 'source/gist.js', 'import/photo.js'],
    layers: [   // from bottom to top
      {source: 'GSITiles', layer: 'std'},                                // 標準地図
      {source: 'GSITiles', layer: 'relief', options: {visible: false}},  // 色別標高図
      {source: 'GSITiles', layer: 'ort', options: {visible: false}},     // 写真
      {source: 'NaturalEarth', layer: 'cl', options: {visible: false}}   // Coastline
    ]
  });
};


// Initialize olapp application if not initialized yet
$(function () {
  if (olapp.map === undefined) olapp.init();
});
