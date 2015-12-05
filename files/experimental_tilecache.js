olapp.loadProject(new olapp.Project({
  title: 'Tile Cache Plugin Test Project',
  description: '',
  view: new ol.View({
    projection: 'EPSG:3857',
    center: ol.proj.transform([138.7, 35.4], 'EPSG:4326', 'EPSG:3857'),
    maxZoom: 18,
    zoom: 5
  }),
  plugins: ['source/gsitiles.js', 'source/gsielevtile.js', 'source/gsj.js', 'cache/tilecache.js'],
  layers: [
    {source: 'GSITiles', layer: 'std'},                                   // 標準地図
    {source: 'GSITiles', layer: 'ort', options: {visible: false}}/*,*/    // 写真
//  {source: 'GSIElevTile', layer: 'slope', options: {visible: false}},   // 傾斜区分図
//  {source: 'GSJ', layer: 'g', options: {visible: false}}                // シームレス地質図 (詳細版)
  ]
}));
