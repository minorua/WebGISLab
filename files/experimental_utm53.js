proj4.defs('EPSG:3099', '+proj=utm +zone=53 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

olapp.loadProject(new olapp.Project({
  title: 'Experimental UTM53 Project',
  description: '',
  view: new ol.View({
    projection: 'EPSG:3099',
    center: ol.proj.transform([138.7, 35.4], 'EPSG:4326', 'EPSG:3099'),
    maxZoom: 18,
    zoom: 5
  }),
  plugins: ['source/naturalearth.js'],
  init: function (project) {
    // Natural Earth data
    var ne = new olapp.source.NaturalEarth;
    project.addLayer(ne.createLayer('cl'));       // Coastline
  }
}));
