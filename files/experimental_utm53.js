olapp.defineProjection('EPSG:3099', '+proj=utm +zone=53 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

olapp.loadProject(new olapp.Project({
  title: 'Experimental UTM53 Project',
  description: '',
  view: new ol.View({
    projection: 'EPSG:3099',
    center: ol.proj.transform([135, 34.5], 'EPSG:4326', 'EPSG:3099'),
    maxZoom: 20,
    zoom: 8
  }),
  plugins: ['source/naturalearth.js', 'source/gsitiles.js', 'source/gsielevtile.js', 'source/gsj.js', 'source/gist.js', 'import/photo.js', 'tool/measure-vincenty.js'],
  layers: [
    {source: 'GSITiles', layer: 'std'},                                 // 標準地図
    {source: 'NaturalEarth', layer: 'cl', options: {visible: false}}    // Coastline
  ]
}));
