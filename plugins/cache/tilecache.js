// tilecache.js
// (C) 2015 Minoru Akagi | MIT License
// https://github.com/minorua/WebGISLab
// Dependencies: jQuery

olapp.database = {};
olapp.database.open = function () {
  var request = indexedDB.open('webgislab', 1);
  // indexedDB.deleteDatabase('webgislab');

  request.onupgradeneeded = function (e) {
    var db = e.target.result;
    if (db.objectStoreNames.contains('project')) db.deleteObjectStore('project');
    if (db.objectStoreNames.contains('tilecache')) db.deleteObjectStore('tilecache');

    db.createObjectStore('project', {});
    db.createObjectStore('tilecache', {keyPath: 'url'});
  };
  request.onsuccess = function (e) {
    olapp.database._db = e.target.result;
  };
  request.onerror = function (e) {
    console.log('Cannot open webgislab database');
  };
};

(function () {
  var plugin = {
    name: 'Tile Cache',
    path: 'cache/tilecache.js',
    type: 'cache',
    experimental: true,
    description: ''
  };

  olapp.database.open();

  var storeName = 'tilecache';
  var getTileCache = function (key) {
    var d = $.Deferred();
    var db = olapp.database._db;
    if (db) {
      var tx = db.transaction([storeName]);
      var store = tx.objectStore(storeName);
      var request = store.get(key);
      request.onsuccess = function (e) {
        if (request.result) d.resolve(request.result.data);
        else d.reject();
      };
      request.onerror = function (e) {
        d.reject();
      };
    }
    else {
      console.log('DB is not ready');
      window.setTimeout(function () {
        d.reject();
      }, 0);
    }
    return d.promise();
  };

  var putTileCache = function (url, data) {
    var db = olapp.database._db;
    if (db) {
      var tx = db.transaction([storeName], 'readwrite');
      var store = tx.objectStore(storeName);
      var request = store.put({url: url, data: data});
    }
    else {
      console.log('DB is not ready');
    }
  };

  // Get a file as a Blob
  function download(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';

    var d = $.Deferred();
    xhr.onload = function (e) {
      d.resolve(this.response);
    };
    xhr.onerror = function (e) {
      d.reject();
    };
    xhr.send(null);
    return d.promise();
  };

  plugin.init = function () {
    function setBlobImage(image, data) {
      var reader = new FileReader();
      reader.onload = function (e) {
        image.src = e.target.result;
      };
      reader.readAsDataURL(data);
    }

    function makeCacheable(layer) {
      if (!(layer instanceof ol.layer.Tile)) return;
      var source = layer.getSource();
      if (!(source instanceof ol.source.TileImage)) return;
      var origFunc = source.getTileLoadFunction();

      source.setTileLoadFunction(function (imageTile, src) {
        var image = imageTile.getImage();
        getTileCache(src).then(function (data) {
          setBlobImage(image, data);
          console.log('Cache found', src);
        }, function () {
          console.log('Cache not found', src);
          download(src).then(function (data) {
            setBlobImage(image, data);
            putTileCache(src, data);
          });
        });
      });
    }

    olapp.map.getLayers().on('add', function (e) {
      var layer = e.element;
      if (layer instanceof ol.layer.Group) {
        layer.getLayers().forEach(makeCacheable);
      }
      else {
        makeCacheable(layer);
      }
    });

    console.log('Tile Cache plugin initialized');
  };

  olapp.plugin.register(plugin.path, plugin);
})();
