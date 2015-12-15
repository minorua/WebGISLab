// photo.js
// (C) 2015 Minoru Akagi | MIT License
// https://github.com/minorua/WebGISLab
// Dependencies: jQuery, Bootstrap, Bootbox.js

(function () {
  var plugin = {
    name: 'Geo-tagged Photo Importer',
    path: 'import/photo.js',
    type: 'import',
    description: 'You can add photos onto the map by dropping geo-tagged JPEG image files.'
  };

  var thumbSize = 32;

  function addOverlay(lonLat, image, filename) {
    // Generate thumbnail image
    var canvas = document.createElement('canvas');
    canvas.width = thumbSize;
    canvas.height = thumbSize;

    var context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, thumbSize, thumbSize);

    var obj = $('<img>').attr('src', canvas.toDataURL()).css('cursor', 'pointer').click(function () {
      var html =
'<button type="button" class="btn btn-default" style="float:right; margin-top:-3px; margin-right:20px; padding:4px 10px; opacity:0.5;" title="View EXIF data">' +
'  <span class="glyphicon glyphicon-info-sign"></span>' +
'</button>' +
'<div>' + filename + '</div>';
      var title = $(html);

      // EXIF button
      title.first().click(function () {
        EXIF.getData(image, function() {
          bootbox.dialog({
            title: '[EXIF] ' + filename,
            message: '<div style="height:350px; overflow:auto;"><div>' + EXIF.pretty(this).replace(/\n/g, '<br>') + '</div></div>'
          });
        });
      });

      bootbox.dialog({
        title: title,
        message: $('<img>').attr('src', image.src).css({width: '100%', height: '100%'})
      });
    });

    var loc = olapp.core.transformFromWgs84(lonLat);
    olapp.map.addOverlay(new ol.Overlay({
      position: loc,
      element: obj
    }));
    olapp.map.getView().setCenter(loc);
    olapp.map.getView().setResolution(olapp.tools.projection.resolutionFromZoomLevel(15));
  }

  plugin.init = function () {
    // TODO: add olapp file drop event listener
    $(document).on('drop', function (e) {
      var files = e.originalEvent.dataTransfer.files;
      olapp.core.loadScript('lib/exif-js/exif.js').then(function () {

        function addImageFile(file) {
          var msg = olapp.gui.status.showMessage('Loading ' + file.name + '...');
          var image = new Image();
          image.onload = function () {
            EXIF.getData(image, function() {
              msg.remove();
              var lat = EXIF.getTag(this, 'GPSLatitude'),
                  lon = EXIF.getTag(this, 'GPSLongitude'),
                  latRef = EXIF.getTag(this, 'GPSLatitudeRef') || 'N',
                  lonRef = EXIF.getTag(this, 'GPSLongitudeRef') || 'E';
              if (lat === undefined || lon === undefined) {
                olapp.gui.status.showMessage('Cannot add "' + file.name + '" to the map because it has no GPS-tags.', 5000);
              }
              else {
                lat = (lat[0] + lat[1] / 60 + lat[2] / 3600) * (latRef == 'N' ? 1 : -1);
                lon = (lon[0] + lon[1] / 60 + lon[2] / 3600) * (lonRef == 'E' ? 1 : -1);
                addOverlay([lon, lat], image, file.name);
              }
            });
          };

          var reader = new FileReader();
          reader.onload = function (event) {
            image.src = reader.result;
          };
          reader.readAsDataURL(file);
        }

        for (var i = 0; i < files.length; i++) {
          var ext = files[i].name.split('.').pop().toLowerCase();
          if (ext == 'jpeg' || ext == 'jpg') addImageFile(files[i])
        }
      });
    });
  };

  olapp.plugin.register(plugin.path, plugin);
})();
