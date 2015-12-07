// clone.js
// (C) 2015 Minoru Akagi | MIT License
// https://github.com/minorua/WebGISLab
// Dependencies: jQuery

(function () {
  var plugin = {
    name: 'Clone Application',
    path: 'export/clone.js',
    type: 'export',
    experimental: true,
    description: 'Clone the application and set the current project as default project.'
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
'<div>Are you sure you want to save the project with HTML file and library files?</div>' +
'<div style="margin: 10px 0; font-weight: bold;">Page type:</div>' +
'<label><input type="radio" name="pagetype" value="index">index.html (Bootstrap)</label><br>' +
'<label><input type="radio" name="pagetype" value="simple" checked>simple.html</label>';

    bootbox.dialog({
      title: 'Clone the Application',
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

  // Get a file as an ArrayBuffer
  function download(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';

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
        gets.push(download(url).then(function (data) {
          zip.file(url, data);
          console.log('Zipped', url);
        }, function () {
          console.log('Failed to download', url);
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
