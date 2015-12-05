var CACHE_NAME = 'webgislab-cache';
// var olapp = {};
// importScripts('filelist.js');
// olapp.exportFiles.push('tilecache.html');
// var urlsToCache = olapp.exportFiles;
var urlsToCache = [
  'lib/bootbox/bootbox.min.js',
  'lib/bootstrap/css/bootstrap.min.css',
  'lib/bootstrap/js/bootstrap.min.js',
  'lib/jquery-2.1.4.min.js',
  'lib/jquery-ui/jquery-ui.min.css',
  'lib/jquery-ui/jquery-ui.min.js',
  'lib/jquery.ui.touch-punch.min.js',
  'lib/ol3/ol-debug.js',
  'lib/ol3/ol.css',
  'lib/ol3-layerswitcher/ol3-layerswitcher.css',
  'lib/ol3-layerswitcher/ol3-layerswitcher.js',
  'lib/proj4js/proj4.js',
  'lib/tinycolor/tinycolor-min.js',
  'plugins/cache/tilecache.js',
  'plugins/source/gsielevtile.js',
  'plugins/source/gsitiles.js',
  'plugins/source/gsj.js',
  'plugins/source/naturalearth.js',
  'js/demtile/gsielevtile.js',
  'js/source/gsielevtile.js',
  'files/experimental_tilecache.js',
  'olapp.css',
  'olapp.js',
  'tilecache.html'
];

self.addEventListener('install', function(event) {
  event.waitUntil(caches.open(CACHE_NAME).then(function(cache) {
    console.log('Opened cache');
    return cache.addAll(urlsToCache);
  }));
});

self.addEventListener('fetch', function(event) {
  event.respondWith(caches.match(event.request).then(function(response) {
    if (response) return response;
    return fetch(event.request);
  }));
});
