// gsielevtile.js
// ol.source.GSIElevTile
//     A subclass of ol.source.XYZ to generate tile images from GSI Elevation Tile and provide them to a tile layer.
//
// (C) 2015 Minoru Akagi | MIT License
// https://github.com/minorua/WebGISLab
// Dependencies: jQuery, OpenLayers 3

(function () {
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

    var mode = options.mode || 'relief';
    var colorMap = options.colorMap || defaultColorMap[mode];
    var colorInterpolation = (options.colorInterpolation == 'linear') ? 1 : 0;  // 0: discrete, 1: linear

    this.setup(mode, colorMap, colorInterpolation);
  };

  ol.inherits(ol.source.GSIElevTile, ol.source.XYZ);

  // Get color for passed value from the color map.
  ol.source.GSIElevTile.prototype.getColor = function (val, startIndex) {
    if (val < this.colorMap[0][0]) return undefined;

    for (var i = Math.max(1, startIndex || 0), l = this.colorMap.length; i < l; i++) {
      if (val < this.colorMap[i][0]) {
        if (this.colorInterpolation == 0) return this._getColorDiscrete(i - 1);
        return this._getColorLinear(i - 1, i, val);
      }
    }
    return this._getColorDiscrete(i - 1);
  };

  ol.source.GSIElevTile.prototype._getColorDiscrete = function (index) {
    var c = this.colorMap[index];
    return {
      r: parseInt(c[1]),
      g: parseInt(c[2]),
      b: parseInt(c[3]),
      index: index
    };
  };

  ol.source.GSIElevTile.prototype._getColorLinear = function (index0, index1, value) {
    var c0 = this.colorMap[index0],
        c1 = this.colorMap[index1],
        p = (value - c0[0]) / (c1[0] - c0[0]);
    return {
      r: Math.min(255, parseInt((c1[1] - c0[1]) * p + c0[1])),
      g: Math.min(255, parseInt((c1[2] - c0[2]) * p + c0[2])),
      b: Math.min(255, parseInt((c1[3] - c0[3]) * p + c0[3])),
      index: index0
    };
  };

  ol.source.GSIElevTile.prototype.setup = function (mode, colorMap, colorInterpolation) {
    this.mode = mode;
    this.colorMap = colorMap;
    this.colorInterpolation = colorInterpolation;

    var scope = this;
    if (mode == 'relief') {
      this.render = function (canvas, data, url) {
        var context = canvas.getContext('2d');
        var pixel = context.createImageData(1, 1);
        var d  = pixel.data;
        d[3] = 255;   // alpha

        var lines = data.split('\n'), x, y, vals, lastColorIndex, color;
        for (y = 0; y < 256; y++) {
          vals = lines[y].split(',');
          lastColorIndex = 0;
          for (x = 0; x < 256; x++) {
            // Start look-up from last color index - 1.
            // For quick look-up. Not completely accurate.
            color = scope.getColor(parseFloat(vals[x]) || 0, --lastColorIndex);   // 'e' -> 0
            if (color !== undefined) {
              d[0] = color.r;
              d[1] = color.g;
              d[2] = color.b;
              context.putImageData(pixel, x, y);
              lastColorIndex = color.index;
            }
          }
        }
      };
    }
    else {
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

      var myColorMap = [], winFunc;
      // 3 x 3 window (w)
      //  0 1 2
      //  3 4 5
      //  6 7 8
      if (mode == 'slope') {
        // Create a color map (integer key from 0 to 90).
        for (var i = 0; i <= 90; i++) {
          myColorMap.push(this.getColor(i, 0));
        }

        var rad2deg = 180 / Math.PI;
        // ref. https://github.com/OSGeo/gdal/blob/2.0/gdal/apps/gdaldem.cpp#L644
        winFunc = function (w, ewres, nsres) {
          var x = ((w[0] + 2 * w[3] + w[6]) - (w[2] + 2 * w[5] + w[8])) / ewres,
              y = ((w[6] + 2 * w[7] + w[8]) - (w[0] + 2 * w[1] + w[2])) / nsres;
          return Math.atan(Math.sqrt(x * x + y * y) / 8) * rad2deg;
        };
      }
      else if (mode == 'hillshade') {
        if (colorMap === undefined) {
          for (var i = 0; i < 256; i++) {
            myColorMap.push({r: i, g: i, b: i});
          }
        }
        else {
          for (var i = 0; i < 256; i++) {
            myColorMap.push(this.getColor(i, 0));
          }
        }

        var azimuth = 315;
        var angle_altitude = 45;

        var half_pi = Math.PI / 2;
        var sin_alt = Math.sin(angle_altitude * deg2rad);
        var cos_alt = Math.cos(angle_altitude * deg2rad);
        var az = azimuth * deg2rad;

        // ref. https://github.com/OSGeo/gdal/blob/2.0/gdal/apps/gdaldem.cpp#L463
        winFunc = function (w, ewres, nsres) {
          var x = ((w[0] + 2 * w[3] + w[6]) - (w[2] + 2 * w[5] + w[8])) / ewres,
              y = ((w[6] + 2 * w[7] + w[8]) - (w[0] + 2 * w[1] + w[2])) / nsres;
          var slope = half_pi - Math.atan(Math.sqrt(x * x + y * y));
          var aspect = Math.atan2(-y, x);
          var light = sin_alt * Math.sin(slope) + cos_alt * Math.cos(slope) * Math.cos(az - half_pi - aspect);
          return 255 * (light + 1) / 2;
        };
      }

      this.render = function (canvas, data, url) {
        var context = canvas.getContext('2d');
        var pixel = context.createImageData(1, 1);
        var d  = pixel.data;
        d[3] = 255;   // alpha

        var drawFunc = function (x, y, value) {
          var color = myColorMap[parseInt(value)];
          if (color !== undefined) {
            d[0] = color.r;
            d[1] = color.g;
            d[2] = color.b;
            context.putImageData(pixel, x, y);
          } /* else {
            console.log('Wrong value:', x, y, value);
          } */
        };

        // Get zoom level, x and y from the tile url
        //  url example: http://cyberjapandata.gsi.go.jp/xyz/dem/{z}/{x}/{y}.txt
        var names = url.split('/'),
            my = parseInt(names.pop().split('.')[0]),
            mx = names.pop(),
            zoom = parseInt(names.pop());

        var tileSize = TSIZE1 / Math.pow(2, zoom - 1),   // in meters (Spherical Mercator)
            tileRes = tileSize / 256,
            tileUpperY = TSIZE1 - my * tileSize,
            xpixels = 256 * Math.pow(2, zoom);           // world width in pixels

        // Parse the tile data
        var lines = data.split('\n'), vals = [], x, y, z = [];
        for (y = 0; y < 256; y++) {
          vals = lines[y].split(',');
          for (x = 0; x < 256; x++) {
            vals[x] = parseFloat(vals[x]);    // 'e' -> 0
          }
          z.push(vals);
        }

        // latitude at y (pixel) in this tile
        var getLatitude = function (y) {
          var lonLat = transform([0, tileUpperY - y * tileRes]);
          return lonLat[1];
        };

        // Calculate xres and yres
        var xres = [],  // n=256
            yres = [];  // n=255
        var lat0, lat1 = getLatitude(0.5);        // lat at the top line
        for (y = 0; y < 255; y++) {
          lat0 = lat1;
          lat1 = getLatitude(y + 1.5);        // lat at the next line
          yres.push(meridianArcLength(lat0, lat1));      // arc length between lat0 and lat1
          xres.push(2 * Math.PI * parallelRadius(lat0) / xpixels);    // arc length on parallel
        }
        xres.push(2 * Math.PI * parallelRadius(lat1) / xpixels);

        // Draw
        var w, ewres, nsres, line0, line1, line2;
        for (y = 1; y < 255; y++) {
          line0 = z[y - 1]; line1 = z[y]; line2 = z[y + 1];
          for (x = 1; x < 255; x++) {
            w = [line0[x - 1], line0[x], line0[x + 1],
                 line1[x - 1], line1[x], line1[x + 1],
                 line2[x - 1], line2[x], line2[x + 1]];
            ewres = xres[y];
            nsres = (yres[y - 1] + yres[y]) / 2;
            drawFunc(x, y, winFunc(w, ewres, nsres));
          }
        }

        // Draw edges
        for (x = 1; x < 255; x++) {
          y = 0;
          line0 = line1 = z[y]; line2 = z[y + 1];
          w = [line0[x - 1], line0[x], line0[x + 1],
               line1[x - 1], line1[x], line1[x + 1],
               line2[x - 1], line2[x], line2[x + 1]];
          ewres = xres[y];
          nsres = yres[y] / 2;
          drawFunc(x, y, winFunc(w, ewres, nsres));

          y = 255;
          line0 = z[y - 1]; line1 = line2 = z[y];
          w = [line0[x - 1], line0[x], line0[x + 1],
               line1[x - 1], line1[x], line1[x + 1],
               line2[x - 1], line2[x], line2[x + 1]];
          ewres = xres[y];
          nsres = yres[y - 1] / 2;
          drawFunc(x, y, winFunc(w, ewres, nsres));
        }

        for (y = 1; y < 255; y++) {
          line0 = z[y - 1]; line1 = z[y]; line2 = z[y + 1];
          x = 0;
          w = [line0[x], line0[x], line0[x + 1],
               line1[x], line1[x], line1[x + 1],
               line2[x], line2[x], line2[x + 1]];
          ewres = xres[y] / 2;
          nsres = (yres[y - 1] + yres[y]) / 2;
          drawFunc(x, y, winFunc(w, ewres, nsres));

          x = 255;
          w = [line0[x - 1], line0[x], line0[x],
               line1[x - 1], line1[x], line1[x],
               line2[x - 1], line2[x], line2[x]];
          ewres = xres[y] / 2;
          nsres = (yres[y - 1] + yres[y]) / 2;
          drawFunc(x, y, winFunc(w, ewres, nsres));
        }

        // Draw four corners
        y = 0;
        line0 = line1 = z[y]; line2 = z[y + 1];
        ewres = xres[y] / 2;
        nsres = yres[y] / 2;

        x = 0;
        w = [line0[x], line0[x], line0[x + 1],
             line1[x], line1[x], line1[x + 1],
             line2[x], line2[x], line2[x + 1]];
        drawFunc(x, y, winFunc(w, ewres, nsres));

        x = 255;
        w = [line0[x - 1], line0[x], line0[x],
             line1[x - 1], line1[x], line1[x],
             line2[x - 1], line2[x], line2[x]];
        drawFunc(x, y, winFunc(w, ewres, nsres));

        y = 255;
        line0 = z[y - 1]; line1 = line2 = z[y];
        ewres = xres[y - 1] / 2;
        nsres = yres[y - 1] / 2;

        x = 0;
        w = [line0[x], line0[x], line0[x + 1],
             line1[x], line1[x], line1[x + 1],
             line2[x], line2[x], line2[x + 1]];
        drawFunc(x, y, winFunc(w, ewres, nsres));

        x = 255;
        w = [line0[x - 1], line0[x], line0[x],
             line1[x - 1], line1[x], line1[x],
             line2[x - 1], line2[x], line2[x]];
        drawFunc(x, y, winFunc(w, ewres, nsres));
      };
    }

    this.setTileLoadFunction(function (imageTile, src) {
      var canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;

      $.ajax({
        url: src,
        success: function (data) {
          scope.render(canvas, data, src);
          imageTile.getImage().src = canvas.toDataURL();
        }
      });
    });
  };
})();
