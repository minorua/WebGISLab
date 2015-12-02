// threejs.js
// (C) 2015 Minoru Akagi | MIT License
// https://github.com/minorua/WebGISLab
// Dependencies: jQuery

(function () {
  var plugin = {
    name: '3D viewer (three.js)',
    path: '3dviewer/threejs.js',
    type: '3dviewer',
    description: ''
  };

  plugin.init = function () {
    var scripts = [
      'lib/threejs/three.min.js',
      'lib/Qgis2threejs/Qgis2threejs.js',
      'lib/threejs/controls/OrbitControls.js',
      'js/demtile/gsielevtile.js'
    ];
    return olapp.core.loadScripts(scripts, true);
  };

  plugin.run = function () {
    var view = olapp.map.getView();
    var projection = view.getProjection().getCode();
    if (view.getRotation()) {
      alert('3D viewer: Map rotation is not supported.');
      return;
    }

    var container = document.getElementById('webgl');
    var canvasWidth = parseInt(window.innerWidth * 0.9),
        canvasHeight = parseInt((window.innerHeight - 70) * 0.85);
    $(container).width(canvasWidth).height(canvasHeight).html('');
    $('#dlg_threejs .modal-dialog').css('width', (canvasWidth + 30) + 'px');

    var view = olapp.map.getView();
    var extent = view.calculateExtent(olapp.map.getSize());
    var center = olapp.core.transformToWgs84(view.getCenter());
    var scaleFactor = 1;
    if (projection == 'EPSG:3857') {
      scaleFactor = 1 / Math.cos(ol.math.toRadians(center[1]));
    }

    var planeWidth = 250 / scaleFactor;
    var zExaggeration = 1.5;

    var project = new Q3D.Project({
      baseExtent: extent,
      rotation: 0,                      //
      wgs84Center: {lat: center[1], lon: center[0]},
      crs: projection,
      proj: projection,   //
      title: '',
      width: planeWidth,
      zShift: 0,
      zExaggeration: zExaggeration * scaleFactor
    });

    // map canvas image
    var mapCanvas = $('#map canvas').get(0);
    project.images[0] = {
      width: mapCanvas.width,
      height: mapCanvas.height,
      data: mapCanvas.toDataURL('image/png')
    };

    // DEM layer
    var lyr = project.addLayer(new Q3D.DEMLayer({
      type: 'dem',
      name: 'GSI Elevation Tile',
      m: [{i: 0, type: 1, ds: 1}],
      shading: true,
      q: 1
    }));

    var demWidth = 256,
        demHeight = parseInt(demWidth * mapCanvas.height / mapCanvas.width);
    var bl = lyr.addBlock({
      width: demWidth,
      height: demHeight,
      plane: {
        width: planeWidth,
        offsetX: 0,
        offsetY: 0,
        height: planeWidth * mapCanvas.height / mapCanvas.width
      },
      m: 0,
      sides: true
    }, false);

    var dem = new olapp.demProvider.GSIElevTile();
    dem.readBlock(extent, demWidth, demHeight, projection).then(function (data) {
      // max and min value
      var max = min = data[0], val;
      for (var i = 0, l = data.length; i < l; i++) {
        val = data[i];
        if (max < val) max = val;
        if (min > val) min = val;
      }
      lyr.stats = {
        max: max,
        min: min
      };

      var scale = project.zScale,
          shift = -min;
      project.origin.z = -shift;
      for (var i = 0, l = data.length; i < l; i++) {
        data[i] = (data[i] + shift) * scale;
      }
      bl.data = data;

      var options = Q3D.Options;
      options.bgcolor = 0xeeeeff;

      // Q3D application
      var app = Q3D.application;
      app.init(container);
      app.loadProject(project);

      // overrides
      app.showQueryResult = function (point, layerId, featureId) {
        // clicked coordinates
        var pt = app.project.toMapCoordinates(point.x, point.y, point.z);
        $('#threejs_info').html('Elevation: ' + pt.z.toFixed(2)).show();
      };
      app.closePopup = function () {
        $('#threejs_info').hide();
      };

      app.addEventListeners();
      app.start();
    });
  };

  plugin.stop = function () {
    Q3D.application.pause();
  };

  plugin.isRotating = function () {
    return Q3D.application.controls.autoRotate;
  };

  plugin.rotate = function (active) {
    Q3D.application.controls.autoRotate = active;
  };

  plugin.save = function () {
    Q3D.application.pause();

    var project = Q3D.application.project;
    var demLayer = project.layers[0];
    demLayer.rebuild = function (exportMode) {
      Q3D.Options.exportMode = exportMode;

      this.objectGroup = new THREE.Group();
      this.build();
      this.objectGroup.updateMatrixWorld();   //
    };
    demLayer.rebuild(true);

    var scripts = ['lib/threejs/exporters/STLBinaryExporter.js', 'lib/FileSaver.js/FileSaver.min.js'];
    olapp.core.loadScripts(scripts).then(function () {
      var exporter = new THREE.STLBinaryExporter();
      var stlData = exporter.parse(demLayer.objectGroup).buffer;
      saveAs(new Blob([stlData]), "terrain.stl");

      /*
      // TODO: FIXME
      // With Chrome, two terrain.png files are saved.
      //   ref. https://github.com/eligrey/FileSaver.js/issues/165
      // Note: Map canvas image can be saved from Project menu.
      var image = project.images[0];
      var binStr = atob(image.data.split(',')[1]),
          len = binStr.length,
          imgData = new Uint8Array(len);
      for (var i = 0; i < len; i++) {
        imgData[i] = binStr.charCodeAt(i);
      }
      saveAs(new Blob([imgData]), "terrain.png");
      */

      Q3D.application.start();
    });
  };

  olapp.plugin.register(plugin.path, plugin);
})();
