// xyz-elevcsv.js
// (C) 2015 Minoru Akagi | MIT License
// https://github.com/minorua/WebGISLab

/*
ol.source.XYZElevCSV
  inherits from ol.source.XYZ
*/
ol.source.XYZElevCSV = function (options) {
  ol.source.XYZ.call(this, options);

  var pixelColor = function (val) {
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
