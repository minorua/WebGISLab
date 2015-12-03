// publish.js
// (C) 2015 Minoru Akagi | MIT License
// https://github.com/minorua/WebGISLab
// Dependencies: jQuery

(function () {
  var plugin = {
    name: 'Publish Project',
    path: 'export/publish.js',
    type: 'export',
    experimental: true,
    description: ''
  };

  plugin.init = function () {
    return olapp.core.loadScripts(['lib/bootbox/bootbox.min.js', 'lib/jszip/jszip.min.js', 'lib/FileSaver.js/FileSaver.min.js']);
  };

  plugin.run = function () {
    if (location.protocol == 'file:') {
      alert('This feature is not available with the file protocol (file:).');
      return;
    }

    var html =
'<div>Are you sure you want to save the project with HTML file and library files for web publishing?</div>' +
'<div style="margin: 10px 0; font-weight: bold;">Page type:</div>' +
'<label><input type="radio" name="pagetype" value="index">index.html (Bootstrap)</label><br>' +
'<label><input type="radio" name="pagetype" value="simple" checked>simple.html</label>';

    bootbox.dialog({
      title: 'Publish Project "' + olapp.project.title + '"',
      message: html,
      buttons: {
        ok: {
          label: 'Save',
          className: "btn-primary",
          callback: function () {
            plugin.export($(this).find('input[name=pagetype]:checked').val());
          }
        },
        cancel: {
          label: 'Cancel',
          className: "btn-default",
          callback: function () {}
        }
      }
    });
  };

  plugin.export = function (pageType) {
    var zip = new JSZip();

    // project file
    var projectPath = 'project.js';
    zip.file(projectPath, olapp.project.toString());

    olapp.core.loadScript('filelist.js').then(function () {
      var gets = [];

      // HTML file
      gets.push($.get(pageType + '.html').then(function (content) {
        content = content.replace('<!-- [olapp project here] -->',
                                  '<script src="' + projectPath + '" type="text/javascript"></script>');
        zip.file('index.html', content);
      }));

      // libraries, plugins and other files
      olapp.exportFiles.forEach(function (url) {
        var ext = url.split('.').pop().toLowerCase();
        gets.push($.ajax({
          url: url,
          dataType: (ext == 'js' || ext == 'svg') ? 'text' : undefined,
          success: function (content) {
            zip.file(url, content);
            console.log('Zipped', url);
          },
          error: function () {
            console.log('Failed to download', url);
          }
        }));
      });

      // archive download
      $.when.apply(this, gets).then(function () {
        saveAs(zip.generate({type: 'blob'}), 'project.zip');
      }, function () {
        alert('Failed to download files');
      });
    });
  };

  olapp.plugin.register(plugin.path, plugin);
})();
