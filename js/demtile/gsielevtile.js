// gsielevtile.js
// (C) 2015 Minoru Akagi | MIT License
// https://github.com/minorua/WebGISLab
// Dependencies: jQuery

(function () {
  var TILE_SIZE = 256;
  var TSIZE1 = 20037508.342789244;
  var ZMAX = 14;

  var DEMBlocks = function (zoom, xmin, ymin, xmax, ymax) {
    this.tileSize = TSIZE1 / Math.pow(2, zoom - 1);
    this.tileRange = [xmin, ymin, xmax, ymax];

    this.extent = [
      xmin * this.tileSize - TSIZE1, TSIZE1 - (ymax + 1) * this.tileSize,
      (xmax + 1) * this.tileSize - TSIZE1, TSIZE1 - ymin * this.tileSize
    ];
    this.cols = xmax - xmin + 1;
    this.rows = ymax - ymin + 1;
    this.cellSize = this.tileSize / TILE_SIZE;

    this.blocks = [];
  };

  DEMBlocks.prototype = {

    constructor: DEMBlocks,

    set: function (x, y, data) {
      this.blocks[(x - this.tileRange[0]) + (y - this.tileRange[1]) * this.cols] = data;
    },

    // nx, ny: number of grid points
    read: function (extent, nx, ny, projection) {
      var transform;
      if (projection === undefined || projection == 'EPSG:3857') transform = function (pt) { return pt; };
      else transform = ol.proj.getTransform(projection, 'EPSG:3857');

      var xres = (extent[2] - extent[0]) / (nx - 1),
          yres = (extent[3] - extent[1]) / (ny - 1);

      var vals = [], pt, py;
      for (var y = 0; y < ny; y++) {
        py = extent[3] - y * yres;
        for (var x = 0; x < nx; x++) {
          pt = transform([extent[0] + x * xres, py]);
          //vals.push(this.nearest(pt));
          vals.push(this.bilinear(pt));
        }
      }
      return vals;
    },

    // read bilinear-interpolated value
    bilinear: function (pt) {
      var gx = (pt[0] - this.extent[0]) / this.cellSize,
          gy = (this.extent[3] - pt[1]) / this.cellSize,
          gx0 = Math.floor(gx),
          gy0 = Math.floor(gy),
          sx = gx - gx0,
          sy = gy - gy0;

      var ti, i = 0, z = [];
      for (var yi = 0; yi < 2; yi++) {
        for (var xi = 0; xi < 2; xi++, i++) {
          ti = parseInt((gx + xi) / TILE_SIZE) + parseInt((gy + yi) / TILE_SIZE) * this.cols;
          if (this.blocks[ti] === undefined) z[i] = 0;
          else z[i] = this.blocks[ti][parseInt((gx + xi) % TILE_SIZE) + parseInt((gy + yi) % TILE_SIZE) * TILE_SIZE] || 0;
        }
      }
      return (1 - sx) * ((1 - sy) * z[0] + sy * z[2]) + sx * ((1 - sy) * z[1] + sy * z[3]);
    },

    // read nearest-neighbor value
    nearest: function (pt) {
      var gx = (pt[0] - this.extent[0]) / this.cellSize,
          gy = (this.extent[3] - pt[1]) / this.cellSize,
          ti = parseInt(gx / TILE_SIZE) + parseInt(gy / TILE_SIZE) * this.cols;

      if (this.blocks[ti] === undefined) return 0;
      return this.blocks[ti][parseInt(gx % TILE_SIZE) + parseInt(gy % TILE_SIZE) * TILE_SIZE] || 0;
    }

  };

  // olapp.demProvider.GSIElevTile
  if (olapp.demProvider === undefined) olapp.demProvider = {};
  olapp.demProvider.GSIElevTile = function () {
    this.urlTmpl = 'http://cyberjapandata.gsi.go.jp/xyz/dem/{z}/{x}/{y}.txt';
    this.extent = [13667807, 2320477, 17230031, 5713298];
  };

  olapp.demProvider.GSIElevTile.prototype = {

    constructor: olapp.demProvider.GSIElevTile,

    readBlock: function (extent, width, height, projection) {
      projection = projection || 'EPSG:3857';
      var merc_rect = (projection == 'EPSG:3857') ? extent : ol.proj.transformExtent(extent, projection, 'EPSG:3857');
      if (!ol.extent.intersects(this.extent, merc_rect)) {
        var d = new $.Deferred();
        d.resolve(Array.apply(null, Array(width * height)).map(function (x, i) { return 0; }));
        return d.promise();
      }
      var over_smpl = 1;
      var segments_x = (width == 1) ? 1 : width - 1;
      var res = (extent[2] - extent[0]) / segments_x / over_smpl;

      var d = new $.Deferred();
      this.getBlocks(merc_rect, res).then(function (blocks) {
        d.resolve(blocks.read(extent, width, height, projection));
      });
      return d.promise();
    },

    getValue: function (coords, zoom, projection) {
      // $.Deferred
    },

    getBlocks: function (extent, mapUnitsPerPixel) {
      // Calculate zoom level
      var mpp1 = TSIZE1 / TILE_SIZE;
      var zoom = Math.ceil(Math.LOG2E * Math.log(mpp1 / mapUnitsPerPixel) + 1);
      zoom = Math.max(0, Math.min(zoom, ZMAX));

      // Calculate tile range (yOrigin is top)
      var tileSize = TSIZE1 / Math.pow(2, zoom - 1);
      var matrixSize = Math.pow(2, zoom);
      var ulx = Math.max(0, parseInt((extent[0] + TSIZE1) / tileSize)),
          uly = Math.max(0, parseInt((TSIZE1 - extent[3]) / tileSize)),
          lrx = Math.min(parseInt((extent[2] + TSIZE1) / tileSize), matrixSize - 1),
          lry = Math.min(parseInt((TSIZE1 - extent[1]) / tileSize), matrixSize - 1);

      // download count limit
      if ((lrx - ulx + 1) * (lry - uly + 1) > 128) {
        console.log('Number of tiles to fetch is too large!');
        return null;
      }

      return this.fetchFiles(zoom, ulx, uly, lrx, lry);
    },

    fetchFiles: function (zoom, xmin, ymin, xmax, ymax) {
      var blocks = new DEMBlocks(zoom, xmin, ymin, xmax, ymax);
      var tiles = [];
      for (var y = ymin; y <= ymax; y++) {
        for (var x = xmin; x <= xmax; x++) {
          tiles.push({
            x: x,
            y: y,
            url: this.urlTmpl.replace('{x}', x).replace('{y}', y).replace('{z}', zoom)
          });
        }
      }

      var gets = [];
      tiles.forEach(function (tile) {
        gets.push($.get(tile.url, function (data) {
          var vals = data.replace(/\n/g, ',').split(',');
          for (var i = 0, l = vals.length; i < l; i++) {
            vals[i] = parseFloat(vals[i]) || 0;
          }
          blocks.set(tile.x, tile.y, vals);
        }));
      });

      var d = new $.Deferred();
      $.when.apply(this, gets).always(function () {
        d.resolve(blocks);
      });
      return d.promise();
    }

  };

})();
