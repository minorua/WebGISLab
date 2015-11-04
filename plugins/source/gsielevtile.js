// gsielevtile.js
// (C) 2015 Minoru Akagi | MIT License
// https://github.com/minorua/WebGISLab

(function () {
  var plugin = {
    name: 'GSIElevTile',
    path: 'source/gsielevtile.js',
    type: 'source',
    description: 'Adds ol.source.GSIElevTile and olapp.source.GSIElevTile.'
  };

  var defaultColorMap = {
    'relief': [
      [ -50,   0,   0, 205],
      [   0,   0, 191, 191],
      [ 0.1,  57, 151, 105],
      [ 100, 117, 194,  93],
      [ 200, 230, 230, 128],
      [ 500, 202, 158,  75],
      [1000, 214, 187,  98],
      [2000, 185, 154, 100],
      [3000, 220, 220, 220],
      [3800, 250, 250, 250]
    ],
    'slope': [
      [ 0,  43, 131, 186],
      [10, 145, 203, 168],
      [20, 221, 241, 180],
      [30, 254, 222, 153],
      [40, 245, 144,  83],
      [50, 215,  25,  28],
      [90,   0,   0,   0]
    ]
  };

  /*
  ol.source.GSIElevTile
    inherits from ol.source.XYZ

  options
    mode: 'relief' or 'slope'. Default is 'relief'.
    colorMap: Optional. A color map.
    colorInterpolation: 'discrete' or 'linear'. Default is 'discrete'.
  */
  ol.source.GSIElevTile = function (options) {
    ol.source.XYZ.call(this, options);

    var mode = options.mode;
    if (mode != 'slope') mode = 'relief';

    var colorMap = options.colorMap || defaultColorMap[mode],
        colorMapLength = colorMap.length;
    var colorInterpolation = (options.colorInterpolation == 'linear') ? 1 : 0;  // 0: discrete, 1: linear

    // Get color for passed value from the color map.
    var lastColorIndex = 0;
    var getColor = function (val, startIndex) {
      // Start look-up from last color index - 1 if startIndex not specified.
      // For quick look-up. Not completely accurate.
      var i = Math.max(1, (startIndex !== undefined) ? startIndex : lastColorIndex - 1);
      for (; i < colorMapLength; i++) {
        if (val < colorMap[i][0]) {
          var c0 = colorMap[i - 1],
              c1 = colorMap[i],
              p = (val - c0[0]) / (c1[0] - c0[0]);

          lastColorIndex = i - 1;

          if (colorInterpolation == 0) return [c1[1], c1[2], c1[3]];    // discrete

          // linear interpolation
          return [
            Math.min(255, (c1[1] - c0[1]) * p + c0[1]),
            Math.min(255, (c1[2] - c0[2]) * p + c0[2]),
            Math.min(255, (c1[3] - c0[3]) * p + c0[3])
          ];
        }
      }
      lastColorIndex = 0;
      return [0, 0, 0];

      // an old function for elevation
      return [
        Math.min(parseInt(255 * val / 2000), 255),        // red
        Math.min(255 - parseInt(255 * val / 2000), 255),  // green
        Math.min(200 - parseInt(200 * val / 2000), 255)   // blue
      ];
    };

    var render;
    if (mode == 'slope') {
      // Create a color map (integer key from 0 to 90).
      var slopeColorMap = [];
      for (var i = 0; i <= 90; i++) {
        slopeColorMap.push(getColor(i, 0));
      }

      var R = 6378137;
      var TSIZE1 = Math.PI * R;   // 20037508.342789244
      var transform = ol.proj.getTransform('EPSG:3857', 'EPSG:4326');

      // arc length between two latitudes (lat1 > lat0)
      var deg2length = Math.PI / 180 * R;
      var meridianArcLength = function (lat1, lat0) {
        // spherical (experimental)
        return (lat1 - lat0) * deg2length;    // Math.PI * (lat1 - lat0) * R / 180
      };

      var deg2rad = Math.PI / 180;
      var parallelRadius = function (lat) {
        // spherical (experimental)
        return R * Math.cos(lat * deg2rad);
      };

      // Function to calculate slope angle
      //   3 x 3 window (w)
      //     0 1 2
      //     3 4 5
      //     6 7 8
      //   refs. https://github.com/OSGeo/gdal/blob/2.0/gdal/apps/gdaldem.cpp
      var rad2deg = 180 / Math.PI;
      var slopeFunc = function (w, ewres, nsres) {
        var dx = ((w[0] + 2 * w[3] + w[6]) - (w[2] + 2 * w[5] + w[8])) / ewres,
            dy = ((w[6] + 2 * w[7] + w[8]) - (w[0] + 2 * w[1] + w[2])) / nsres;
        return Math.atan(Math.sqrt(dx * dx + dy * dy) / 8) * rad2deg;
      };

      render = function (canvas, data, url) {
        var context = canvas.getContext('2d');
        var pixel = context.createImageData(1, 1);
        var d  = pixel.data;
        d[3] = 255;   // alpha

        // Get zoom level, x and y from url
        //  url example: http://cyberjapandata.gsi.go.jp/xyz/dem/{z}/{x}/{y}.txt
        var names = url.split('/'),
            my = parseInt(names.pop().split('.')[0]),
            mx = names.pop(),
            zoom = parseInt(names.pop());

        var tileSize = TSIZE1 / Math.pow(2, zoom - 1),   // in meters (Spherical Mercator)
            tileRes = tileSize / 256,
            tileUpperY = TSIZE1 - my * tileSize,
            xpixels = 256 * Math.pow(2, zoom);           // world width in pixels

        // latitude at y (pixel) in this tile
        var getLatitude = function (y) {
          var lonLat = transform([0, tileUpperY - y * tileRes]);
          return lonLat[1];
        };

        // Calculate xres and yres
        var x, y,
            xres = [],  // n=256
            yres = [];  // n=255
        var lat0, lat1 = getLatitude(0.5);        // lat at the top line
        for (y = 0; y < 255; y++) {
          lat0 = lat1;
          lat1 = getLatitude(y + 1.5);        // lat at the next line
          yres.push(meridianArcLength(lat0, lat1));      // arc length between lat0 and lat1
          xres.push(2 * Math.PI * parallelRadius(lat0) / xpixels);    // arc length on parallel
        }
        xres.push(2 * Math.PI * parallelRadius(lat1) / xpixels);

        var lines = data.split('\n'), vals = [], z = [];
        for (y = 0; y < 256; y++) {
          vals = lines[y].split(',');
          for (x = 0; x < 256; x++) {
            vals[x] = parseFloat(vals[x]);    // 'e' -> 0
          }
          z.push(vals);
        }

        var drawFunc = function (x, y, slope) {
          var rgb = slopeColorMap[parseInt(slope)];
          if (rgb !== undefined) {
            d[0] = rgb[0];
            d[1] = rgb[1];
            d[2] = rgb[2];
            context.putImageData(pixel, x, y);
          } else {
            console.log('Wrong slope value:', x, y, slope);
          }
        };

        var w, ewres, nsres;
        var line0, line1, line2;
        for (y = 1; y < 255; y++) {
          line0 = z[y - 1]; line1 = z[y]; line2 = z[y + 1];
          for (x = 1; x < 255; x++) {
            w = [line0[x - 1], line0[x], line0[x + 1],
                 line1[x - 1], line1[x], line1[x + 1],
                 line2[x - 1], line2[x], line2[x + 1]];
            ewres = xres[y];
            nsres = (yres[y - 1] + yres[y]) / 2;
            drawFunc(x, y, slopeFunc(w, ewres, nsres));
          }
        }

        // Compute edges
        for (x = 1; x < 255; x++) {
          y = 0;
          line0 = line1 = z[y]; line2 = z[y + 1];
          w = [line0[x - 1], line0[x], line0[x + 1],
               line1[x - 1], line1[x], line1[x + 1],
               line2[x - 1], line2[x], line2[x + 1]];
          ewres = xres[y];
          nsres = yres[y] / 2;
          drawFunc(x, y, slopeFunc(w, ewres, nsres));

          y = 255;
          line0 = z[y - 1]; line1 = line2 = z[y];
          w = [line0[x - 1], line0[x], line0[x + 1],
               line1[x - 1], line1[x], line1[x + 1],
               line2[x - 1], line2[x], line2[x + 1]];
          ewres = xres[y];
          nsres = yres[y - 1] / 2;
          drawFunc(x, y, slopeFunc(w, ewres, nsres));
        }

        for (y = 1; y < 255; y++) {
          line0 = z[y - 1]; line1 = z[y]; line2 = z[y + 1];
          x = 0;
          w = [line0[x], line0[x], line0[x + 1],
               line1[x], line1[x], line1[x + 1],
               line2[x], line2[x], line2[x + 1]];
          ewres = xres[y] / 2;
          nsres = (yres[y - 1] + yres[y]) / 2;
          drawFunc(x, y, slopeFunc(w, ewres, nsres));

          x = 255;
          w = [line0[x - 1], line0[x], line0[x],
               line1[x - 1], line1[x], line1[x],
               line2[x - 1], line2[x], line2[x]];
          ewres = xres[y] / 2;
          nsres = (yres[y - 1] + yres[y]) / 2;
          drawFunc(x, y, slopeFunc(w, ewres, nsres));
        }

        // Compute four corners
        y = 0;
        line0 = line1 = z[y]; line2 = z[y + 1];
        ewres = xres[y] / 2;
        nsres = yres[y] / 2;

        x = 0;
        w = [line0[x], line0[x], line0[x + 1],
             line1[x], line1[x], line1[x + 1],
             line2[x], line2[x], line2[x + 1]];
        drawFunc(x, y, slopeFunc(w, ewres, nsres));

        x = 255;
        w = [line0[x - 1], line0[x], line0[x],
             line1[x - 1], line1[x], line1[x],
             line2[x - 1], line2[x], line2[x]];
        drawFunc(x, y, slopeFunc(w, ewres, nsres));

        y = 255;
        line0 = z[y - 1]; line1 = line2 = z[y];
        ewres = xres[y - 1] / 2;
        nsres = yres[y - 1] / 2;

        x = 0;
        w = [line0[x], line0[x], line0[x + 1],
             line1[x], line1[x], line1[x + 1],
             line2[x], line2[x], line2[x + 1]];
        drawFunc(x, y, slopeFunc(w, ewres, nsres));

        x = 255;
        w = [line0[x - 1], line0[x], line0[x],
             line1[x - 1], line1[x], line1[x],
             line2[x - 1], line2[x], line2[x]];
        drawFunc(x, y, slopeFunc(w, ewres, nsres));
      };
    } else {  // mode == 'relief'
      render = function (canvas, data, url) {
        var context = canvas.getContext('2d');
        var pixel = context.createImageData(1, 1);
        var d  = pixel.data;
        d[3] = 255;   // alpha

        var lines = data.split('\n'), x, y, vals, rgb;
        for (y = 0; y < 256; y++) {
          vals = lines[y].split(',');
          lastColorIndex = 0;
          for (x = 0; x < 256; x++) {
            rgb = getColor(parseFloat(vals[x]) || 0);   // 'e' -> 0
            d[0] = rgb[0];
            d[1] = rgb[1];
            d[2] = rgb[2];
            context.putImageData(pixel, x, y);
          }
        }
      };
    }

    this.setTileLoadFunction(function (imageTile, src) {
      var canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;

      $.ajax({
        url: src,
        success: function (data) {
          render(canvas, data, src);
          imageTile.getImage().src = canvas.toDataURL();
        }
      });
    });
  };

  ol.source.GSIElevTile.prototype = Object.create(ol.source.XYZ.prototype);
  ol.source.GSIElevTile.prototype.constructor = ol.source.GSIElevTile;


  if (typeof olapp !== 'undefined') {
    var layerIds = ['relief', 'slope'];
    var layers = {
      'relief': {
        name: '段彩図 (標高タイル)',
        zmin: 0,
        zmax: 14
      },
      'slope': {
        name: '傾斜区分図 (標高タイル)',
        zmin: 0,
        zmax: 14
      }
    };

    /*
    olapp.Source.GSIElevTile
      inherits from olapp.Source.Base
    */
    olapp.Source.GSIElevTile = function () {
      olapp.Source.Base.call(this);
    };

    olapp.Source.GSIElevTile.prototype = Object.create(olapp.Source.Base.prototype);
    olapp.Source.GSIElevTile.prototype.constructor = olapp.Source.Base;

    olapp.Source.GSIElevTile.prototype.list = function () {
      var listItems = [];
      layerIds.forEach(function (subId) {
        listItems.push('<li>' + layers[subId].name  + '</li>');
      });
      return listItems;
    };

    olapp.Source.GSIElevTile.prototype.createLayer = function (subId) {
      if (layerIds.indexOf(subId) === -1) return null;

      var lyr = layers[subId];
      var options = {
        attributions: [
          new ol.Attribution({
            html: "<a href='http://maps.gsi.go.jp/development/ichiran.html' target='_blank'>地理院タイル</a>"
          })
        ],
        mode: subId,
        projection: 'EPSG:3857',
        tileGrid: ol.tilegrid.createXYZ({
          minZoom: lyr.zmin,
          maxZoom: lyr.zmax
        }),
        url: 'http://cyberjapandata.gsi.go.jp/xyz/dem/{z}/{x}/{y}.txt'
      };

      var layer = new ol.layer.Tile({
        source: new ol.source.GSIElevTile(options)
      });
      layer.title = layers[subId].name;
      return layer;
    };

    // register this data source
    olapp.source.GSIElevTile = olapp.Source.GSIElevTile;

    // register this plugin
    olapp.plugin.addPlugin(plugin.path, plugin);
  }
})();
