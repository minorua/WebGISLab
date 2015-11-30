olapp.loadProject(new olapp.Project({
  title: '飛び出せ ニッポン! (Beta)',
  description: 'ブラウザで見ている地図がクリック1つで3D表示に! 地理院タイルの「標準地図」のほかに「色別標高図」や「写真」レイヤの表示が可能で3DモデルをSTLファイルに保存することも可能. 画像・地形データには地理院タイルを利用しています.',
  view: new ol.View({
    projection: 'EPSG:3857',
    center: ol.proj.transform([138.7, 35.4], 'EPSG:4326', 'EPSG:3857'),
    maxZoom: 18,
    zoom: 5
  }),
  plugins: ['source/gsitiles.js'],
  layers: [
    {source: 'GSITiles', layer: 'std'},                                   // 標準地図
    {source: 'GSITiles', layer: 'relief', options: {visible: false}},     // 色別標高図
    {source: 'GSITiles', layer: 'ort', options: {visible: false}}         // 写真
  ]
}));
