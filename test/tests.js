// olapp.project
QUnit.test("project: load experimental project", function(assert) {
  var done = assert.async();
  olapp.loadProject('projects/experimental.js', function () {
    assert.ok(Object.keys(olapp.project.mapLayers).length > 0, "Loaded!");
    done();
  });
});
