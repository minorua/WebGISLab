// olapp.project
// load projects
var projectsToTest = [
  {title: 'Experimental Project', filename: 'files/experimental.js'},
  {title: 'Experimental UTM53 Project', filename: 'files/experimental_utm53.js'}
];

projectsToTest.forEach(function (project) {
  QUnit.test('Project loading:' + project.title, function(assert) {
    var done = assert.async();
    olapp.loadProject(project.filename, function () {
      assert.ok(olapp.project.title == project.title, project.title + ' loaded');
      assert.ok(olapp.project.mapLayers.length > 0, olapp.project.mapLayers.length + ' layers loaded');
      olapp.project.mapLayers.forEach(function (layer) {
        var lyrDef = layer.get('olapp');
        assert.ok(lyrDef !== undefined, 'Layer [' + lyrDef.source + ', ' + lyrDef.layer + ']: ' + layer.get('title'));
      });
      assert.ok(olapp.project.toString(), 'Serializable');
      done();
    });
  });
});
