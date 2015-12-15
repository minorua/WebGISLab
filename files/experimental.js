olapp.loadProject(new olapp.Project({
  title: 'Experimental Project',
  description: '',
  view: new ol.View({
    projection: 'EPSG:3857',
    center: ol.proj.transform([138.7, 35.4], 'EPSG:4326', 'EPSG:3857'),
    maxZoom: 18,
    zoom: 5
  }),
  plugins: ['source/gsitiles.js', 'source/gsielevtile.js', 'source/gsj.js', 'source/gist.js', 'import/photo.js', 'tool/measure-vincenty.js'],
  layers: [
    {source: 'GSITiles', layer: 'std'},                                   // 標準地図
    {source: 'GSITiles', layer: 'relief', options: {visible: false}},     // 色別標高図
    {source: 'GSIElevTile', layer: 'slope', options: {visible: false}},   // 傾斜区分図
    {source: 'GSJ', layer: 'g', options: {visible: false}},               // シームレス地質図 (詳細版)
    {source: 'Custom', layer: 'vt_rdcl', options: {visible: false}},
    {source: 'Custom', layer: 'vt_fgd', options: {visible: false}}
  ],
  customLayers: {
    'vt_rdcl': function (project, layerOptions) {
      // EXPERIMENTAL vector tile - experimental_rdcl
      var attr = "<a href='https://github.com/gsi-cyberjapan/vector-tile-experiment' target='_blank'>地理院提供実験(rdcl)</a>";
      var options = {
        source: new ol.source.VectorTile({
          attributions: [olapp.core.getAttribution(attr)],
          format: new ol.format.GeoJSON({defaultProjection: 'EPSG:4326'}),
          projection: 'EPSG:3857',
          tileGrid: ol.tilegrid.createXYZ({
            minZoom: 16,
            maxZoom: 16
          }),
          url: 'http://cyberjapandata.gsi.go.jp/xyz/experimental_rdcl/{z}/{x}/{y}.geojson'
        }),
        style: function(feature, resolution) {
          feature.getGeometry().applyTransform(olapp.core.transformFromWgs84);    // temporary fix for 3.11.1
          return [new ol.style.Style({
            stroke: new ol.style.Stroke({
              color: 'orange', 
              width: 4
            })
          })];
        },
        maxResolution: olapp.tools.projection.resolutionFromZoomLevel(16 - 0.1),
        title: '道路中心線 (z>=16)'
      };
      return new ol.layer.VectorTile($.extend(options, layerOptions));
    },
    'vt_fgd': function (project, layerOptions) {
      // EXPERIMENTAL vector tile - experimental_fgd
      var styleMap = {
        'Cstline':  {c: "#33f", w: 2},   // #00f, 2
        'WStrL':    {c: "#88f", w: 1},   // #77f, 1
        'WL':       {c: "#9cf", w: 1},   // #00f, 2
        'RdEdg':    {c: "#888", w: 1},   // #777, 2
        'RdCompt':  {c: "#aaa", w: 1},   // #aaa, 1
        'RailCL':   {c: "#777", w: 3},   // #7f7, 2
        'SBBdry':   {c: "#fbb", w: 2},   // #fbb, 2 + //TODO: dashArray:"5,5"
        'CommBdry': {c: "#f77", w: 2},   // #f77, 2 + //TODO: dashArray:"10,10"
        'AdmBdry':  {c: "#f77", w: 4}    // #f77, 4 + //TODO: dashArray:"10,10"
      };

      var pointStyleFunction = olapp.core.createStyleFunction('#0f0');
      var featureStyleFunction = function (feature, resolution) {
        if (feature.values_['vis'] == '非表示') return [];

        feature.getGeometry().applyTransform(olapp.core.transformFromWgs84);    // temporary fix for 3.11.1
        var geomType = feature.getGeometry().getType();
        if (geomType == 'LineString') {
          var className = feature.values_['class'],
              s = styleMap[className];
          if (s === undefined) {
            if (className == 'Cntr') {
              s = {c: "#b95", w: 1};     // #ca5, 2
              if (feature.values_['alti'] % 50 == 0) s.w = 2;
            }
            if (className == 'BldL') {
              s = {c: '#e72'};           // #f72, opacity:0.5,lineCap:"butt"
              s.w = (feature.values_['type'] == '堅ろう建物') ? 2 : 1;
            }
          }

          if (s !== undefined) {
            return [new ol.style.Style({
                stroke: new ol.style.Stroke({
                  color: s.c,
                  width: s.w
                  // + opacity: 0.5, lineCap: "butt"
                })
              })];
          }
        }

        // TODO: Point style is not implemented yet.
        return pointStyleFunction(feature, resolution);
      };

      var attr = "<a href='https://github.com/gsi-cyberjapan/experimental_fgd' target='_blank'>地理院提供実験(fgd)</a>";
      var options = {
        source: new ol.source.VectorTile({
          attributions: [olapp.core.getAttribution(attr)],
          format: new ol.format.GeoJSON({defaultProjection: 'EPSG:4326'}),
          projection: 'EPSG:3857',
          tileGrid: ol.tilegrid.createXYZ({
            minZoom: 18,
            maxZoom: 18
          }),
          url: 'http://cyberjapandata.gsi.go.jp/xyz/experimental_fgd/{z}/{x}/{y}.geojson'
        }),
        style: featureStyleFunction,
        maxResolution: olapp.tools.projection.resolutionFromZoomLevel(18 - 0.1),
        title: '基盤地図情報（基本項目）(z>=18)'
      };
      return new ol.layer.VectorTile($.extend(options, layerOptions));
    }
  }
}));
