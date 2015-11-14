// olapp.project
var projectsToTest = [
  {title: 'Experimental Project', filename: 'files/experimental.js'},
  {title: 'Experimental UTM53 Project', filename: 'files/experimental_utm53.js'}
];

function testNextProject() {
  if (projectsToTest.length == 0) return;
  var project = projectsToTest.shift();
  QUnit.test('Project loading:' + project.title, function(assert) {
    var done = assert.async();
    olapp.loadProject(project.filename, function () {
      assert.ok(Object.keys(olapp.project.mapLayers).length > 0, "Loaded!");
      done();
      testNextProject();
    });
  });
}
testNextProject();
