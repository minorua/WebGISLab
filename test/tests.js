// olapp.project
QUnit.test("project: load experimental project", function(assert) {
  var done = assert.async();
  olapp.project.load('projects/experimental.js');
  setTimeout(function () {
    assert.ok(Object.keys(olapp.project.mapLayers).length > 0, "Loaded!");
    done();
  }, 100);
});
