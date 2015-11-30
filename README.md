# Welcome to WebGIS Lab

目標: デスクトップGISのような画面構成をもち多機能で軽量な(使いたいと思った時にすぐに使える)HTML5 WebGISアプリケーション

## Demo Projects

* Default Project: http://minorua.github.io/WebGISLab/index.html ([メニューなし版](http://minorua.github.io/WebGISLab/simple.html))
    - レイヤ
        - [地理院タイル](http://maps.gsi.go.jp/development/ichiran.html) (標準地図, 色別標高図, 写真)
            - 他のレイヤ(一部)も追加可能

* Experimental Project: http://minorua.github.io/WebGISLab/index.html?project=experimental ([メニューなし版](http://minorua.github.io/WebGISLab/simple.html?project=experimental))
    - レイヤ
        - [地理院タイル](http://maps.gsi.go.jp/development/ichiran.html) (標準地図, 色別標高図)
        - 地理院ベクトルタイル ([道路中心線](https://github.com/gsi-cyberjapan/vector-tile-experiment), [基盤地図情報（基本項目）](https://github.com/gsi-cyberjapan/experimental_fgd))
        - [地理院標高タイル](http://maps.gsi.go.jp/development/demtile.html)を用いた傾斜区分図
            - 他に段彩図(カラー標高図), 陰影図, 急傾斜地図を追加可能
        - [20万分の1日本シームレス地質図](https://gbank.gsj.jp/seamless/) (WMTS)
    - 楕円体面上の距離計測 ([Vincentyの式](https://github.com/chrisveness/geodesy))

* Experimental UTM53 Project: http://minorua.github.io/WebGISLab/index.html?project=experimental_utm53 ([メニューなし版](http://minorua.github.io/WebGISLab/simple.html?project=experimental_utm53))
    - レイヤ
        - [地理院タイル](http://maps.gsi.go.jp/development/ichiran.html) (標準地図)
        - [地理院標高タイル](http://maps.gsi.go.jp/development/demtile.html)
    - ラスタタイルの投影変換 (OL >= 3.11)


## Requirements

次の機能・特徴を備えたい

- レイヤリストまたはレイヤツリー
    - チェックボックスによる表示・非表示切り替え
    - レイヤ順の並べ替え
    - 透過性の調整と混合モード切り替え
    - レイヤ情報の表示
    - レイヤ領域へズーム
    - レイヤの削除
- 属性テーブル
    - 地物へのズーム
- ラスタタイル(ベース地図)の追加
    - 地理院タイル
        - サーバに無駄なリクエストを送らないように領域とズームレベル範囲をレイヤ(ソース)に指定する
    - WMTSレイヤ
        - 20万分の1日本シームレス地質図 https://gbank.gsj.jp/seamless/
            - FeatureInfoの表示
    - レイヤ情報
- ベクトルタイルの追加
    - スタイル設定
        - 用意された外部スタイルファイル(関数)の適用
- Natural Earthデータレイヤの追加
    - 小スケールデータの一部
    - デフォルトプロジェクトで利用
    - スタイルの変更
- 地理院標高タイルの利用
    - 段彩図、傾斜区分図レイヤの追加
        - 凡例
    - 地形断面図作成
        - キャンバス上の色で着色
- 地物情報の表示
    - 対象: すべての表示レイヤ/選択レイヤのみ
- 帰属 (attribution)
    - 表示を重複させない
- 地図検索 (Nominatim/国土数値情報公共施設データ等)
    - 5件程度の結果を一覧表示する
- ローカルファイルの読み込み
    - KML
    - GeoJSON
    - JPGIS
        - 国土数値情報 (JPGIS 2.1)
- 読み込まれたデータのHTML5 ローカルストレージへの保存とダウンロード
- プロジェクトの保存と読み込み
    - ローカルストレージとファイルダウンロード
    - Java Scriptファイルにして初期プロジェクトとして読み込み可能に
- 3Dビューア (three.js)
    - 回転ボタン
    - STLファイル+画像エクスポートボタン
- 3Dビューアの起動 (Cesium)
    - ローカルストレージデータの共有
- 距離・面積の計測ツール
- 軽量なコアアプリケーションと機能追加の容易性
    - プラグイン管理
- タッチデバイス対応


## Design for Project File

### プロジェクトファイル

- 内容はJavaScriptのコード(拡張子はjs)。スクリプトの記述によるプロジェクトの構成
- example: https://github.com/minorua/WebGISLab/blob/gh-pages/projects/experimental.js

```javascript
olapp.loadProject(new olapp.Project({
  title: 'New Project',
  description: '',
  view: new ol.View({
    projection: 'EPSG:3857',
    center: ol.proj.transform([138.7, 35.4], 'EPSG:4326', 'EPSG:3857'),
    maxZoom: 18,
    zoom: 5
  }),
  plugins: ['source/gsitiles.js'],
  layers: [    // from bottom to top
    {source: 'GSITiles', layer: 'std'},
    {source: 'GSITiles', layer: 'ort', options: {visible: false}}
  ]
}));
```

### プロジェクトの保存

- プロジェクトの文字列化
    - olapp.Project.toString()
- jsファイルのダウンロード
- ローカルストレージへの保存

### プロジェクトに対する変更の保存

- レイヤの追加削除
- スタイル設定
- 読み込まれたローカルファイルデータ(データまたは参照)
    - レイヤに設定されたスタイル(データまたは関数)

```javascript
olapp.loadProject(new olapp.Project({
  title: 'New Project',
  description: '',
  view: new ol.View({
    projection: 'EPSG:3857',
    center: ol.proj.transform([138.7, 35.4], 'EPSG:4326', 'EPSG:3857'),
    maxZoom: 18,
    zoom: 5
  }),
  plugins: ['source/gsitiles.js'],
  init: function (project) {  // project is this project
    // some initialization code
  },
  layers: [    // from bottom to top
    {source: 'GSITiles', layer: 'std', options: {visible: true, opacity: 1, blendMode: 'source-over'}},
    {source: 'GSITiles', layer: 'relief', options: {visible: true, opacity: 0.8, blendMode: 'multiply'}},
    {source: 'Text', layer: 'filename.geojson20151123010100', options: {visible: true, opacity: 1, blendMode: 'source-over'}},
    {source: 'Custom', layer: 'customlayer1', options: {visible: true, opacity: 1, blendMode: 'source-over'}}
  ],
  styles: [    // same item count as layers
    undefined,
    function (feature, resolution) {
      return myfunction1(feature.getGeometry().getType());
    },
    function (feature, resolution) {
      return myfunction2(feature.getGeometry().getType());
    },
    undefined
  ],
  customLayers: {
    'customlayer1': function (project, layerOptions) {  // project is this project
      var options = {....};
      return new ol.layer.VectorTile($.extend(options, layerOptions));
    }
  },
  textSources: {
    'filename.geojson20151123010100': {format: 'GeoJSON', data: '{........JSON Content.......}'}
  }
}));
```

### プロジェクトの読み込み

- メニューからの読み込み
    - 読み込み可能な用意されたプロジェクト一覧
    - ローカルストレージに保存されたプロジェクト一覧
- URLパラメータによる読み込み
    - index.html?project=project_name
    - 安全のためにfilesフォルダ以下のプロジェクトファイルに限定
- ローカルプロジェクトファイルのドラッグ&ドロップによる読み込み


## Design for Plugin

- 必要な機能を必要な時にロードする
    - プロジェクトファイルまたはGUIから
- プラグインができることの例
    - メニューアイテムの追加
    - ダイアログの表示
    - データソースの追加

プラグインのコード
```javascript
(function () {
  var myplugin = {
    name: 'my plugin',
    description: '...'
  };

  myplugin.init = function () {
    return olapp.core.loadScripts(['js/olapp/module1.js', 'js/olapp/module2.js'], true);   // pass true as 2nd parameter to load scripts one by one
  };

  ...

  olapp.plugin.addPlugin(myplugin);
})();
```


## Test

http://minorua.github.io/WebGISLab/test.html


## TODO

https://github.com/minorua/WebGISLab/issues/1
