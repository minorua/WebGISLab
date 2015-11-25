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
  };

  plugin.run = function () {
    var view = olapp.map.getView();
    var crs = view.getProjection().getCode();
    if (view.getRotation()) {
      alert('3D viewer: Map rotation is not supported.');
      return;
    }
    if (crs != 'EPSG:3857') {
      alert('3D viewer: Reprojection is not supported.');
      return;
    }

    var scripts = [
      'js/threejs/three.min.js',
      'js/Qgis2threejs/Qgis2threejs.js',
      'js/threejs/controls/OrbitControls.js',
      'js/olapp/demtile/gsielevtile.js'
    ];
    olapp.core.loadScripts(scripts, function () {
      var container = document.getElementById('webgl');
      var canvasWidth = parseInt(window.innerWidth * 0.9),
          canvasHeight = parseInt((window.innerHeight - 70) * 0.9);
      $(container).width(canvasWidth).height(canvasHeight).html('');
      $('#dlg_threejs .modal-dialog').css('width', (canvasWidth + 30) + 'px');

      var view = olapp.map.getView();
      var extent = view.calculateExtent(olapp.map.getSize());
      var planeWidth = 200;
      var zExaggeration = 1.5;

      var project = new Q3D.Project({
        baseExtent: extent,
        rotation: 0,                      //
        wgs84Center: {lat: 0, lon: 0},    //
        crs: view.getProjection().getCode(),
        proj: '',                         //
        title: '',
        width: planeWidth,
        zShift: 0,
        zExaggeration: zExaggeration
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
      dem.readBlock(extent, demWidth, demHeight).then(function (data) {
        var scale = planeWidth / (extent[2] - extent[0]) * zExaggeration;   // TODO: scale factor (mercator) * exag.
        var max = min = data[0], val;
        for (var i = 0, l = data.length; i < l; i++) {
          val = data[i];
          if (max > val) max = val;
          if (min < val) min = val;
          data[i] *= scale;
        }
        bl.data = data;

        lyr.stats = {
          max: max,
          min: min
        };

        var options = Q3D.Options;
        options.bgcolor = 0xeeeeff;

        var app = Q3D.application;
        app.init(container);
        app.loadProject(project);

        app.addEventListeners();
        app.start();
      });
    });
  };

  plugin.stop = function () {
    Q3D.application.pause();
  };

  olapp.plugin.register(plugin.path, plugin);
})();
