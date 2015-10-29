// xyz-elevcsv.js
// (C) 2015 Minoru Akagi | MIT License
// https://github.com/minorua/WebGISLab

/*
ol.source.XYZElevCSV
  inherits from ol.source.XYZ
*/
ol.source.XYZElevCSV = function (options) {
  ol.source.XYZ.call(this, options);

  var colorMap = [
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
  ];
  var colorMapLength = colorMap.length;
  var lastColorIndex = 0;

  // Get color for passed elevation value.
  var pixelColor = function (val) {
    // Start look-up from last color index - 1.
    // For quick look-up. Not completely accurate.
    for (var i = Math.max(1, --lastColorIndex); i < colorMapLength; i++) {
      if (val < colorMap[i][0]) {
        var c0 = colorMap[i - 1],
            c1 = colorMap[i],
            p = (val - c0[0]) / (c1[0] - c0[0]);

        lastColorIndex = i - 1;

        // discrete
        return [c1[1], c1[2], c1[3]];

        // linear interpolation
        return [
          (c1[1] - c0[1]) * p + c0[1],
          (c1[2] - c0[2]) * p + c0[2],
          (c1[3] - c0[3]) * p + c0[3]
        ];
      }
    }
    lastColorIndex = 0;
    return [0, 0, 0];

    // an old function 1
    return [
      Math.min(parseInt(255 * val / 2000), 255),        // red
      Math.min(255 - parseInt(255 * val / 2000), 255),  // green
      Math.min(200 - parseInt(200 * val / 2000), 255)   // blue
    ];
  };

  var render = function (imageTile, data) {
    var canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;

    var context = canvas.getContext('2d');
    var pixel = context.createImageData(1, 1);
    var d  = pixel.data;
    d[3] = 255;   // alpha

    var lines = data.split('\n'), x, y, vals, rgb;
    for (y = 0; y < 256; y++) {
      vals = lines[y].split(',');
      lastColorIndex = 0;
      for (x = 0; x < 256; x++) {
        rgb = pixelColor(parseFloat(vals[x]) || 0);   // 'e' -> 0
        d[0] = rgb[0];
        d[1] = rgb[1];
        d[2] = rgb[2];
        context.putImageData(pixel, x, y);
      }
    }
    imageTile.getImage().src = canvas.toDataURL();
  };

  this.setTileLoadFunction(function (imageTile, src) {
    var async = true;
    if (async) {
      $.ajax({
        url: src,
        success: function (data) {
          render(imageTile, data);
        }
      });
    } else {
      var data = $.ajax({
        url: src,
        async: false
      }).responseText;
      render(imageTile, data);
    }
  });

};

ol.source.XYZElevCSV.prototype = Object.create(ol.source.XYZ.prototype);
ol.source.XYZElevCSV.prototype.constructor = ol.source.XYZ;
