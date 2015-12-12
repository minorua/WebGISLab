# Welcome to WebGIS Lab

OpenLayersを利用したWebGISアプリケーションの開発。試行錯誤の中でちょっとしたものが生まれればいい。

## Released Web Maps

* 飛び出せ ニッポン! (Beta): http://minorua.github.io/maps/japan3d.html

    地理院タイルの「標準地図」「色別標高図」「写真」レイヤの表示が可能で、クリック1つで3D表示にすることができます. 簡単な操作で3DモデルをSTLファイルに保存することができ、3Dプリンタを用いて地形をパソコンの外へ出力することができます.


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


## 備えたい機能・特徴

- プロジェクト
    - 読み込み
        - [ ] 保存されたプロジェクトをメニューから開く
        - [x] 初期プロジェクトの指定 (URLパラメータまたはscriptタグ)
    - 保存
        - [x] ファイル
        - [ ] IndexedDB
    - 新規プロジェクトの作成と既存プロジェクトの変更
        - [ ] タイトル・説明
        - [ ] 座標参照系
            - [ ] カスタム座標参照系
        - [ ] プラグイン
- レイヤリスト
    - [x] チェックボックスによる表示・非表示切り替え
    - [x] レイヤ順の並べ替え
    - [x] 透過性の調整と混合モード切り替え
    - [x] レイヤ領域へズーム
    - [ ] 属性テーブル
    - [x] プロパティ
    - [x] レイヤの削除
- レイヤプロパティダイアログ
    - プロパティの変更
        - [ ] タイトル
        - [ ] ベクトルレイヤのスタイル
- 属性テーブル
    - [ ] 地物の検索
    - [ ] 地物へのズーム
- ラスタタイル(ベース地図)の追加
    - [x] 地理院タイル
        - [x] サーバに無駄なリクエストを送らないように領域とズームレベル範囲をレイヤ(ソース)に指定する
        - [ ] 各レイヤに関する情報
    - [x] WMTSレイヤ
        - [x] 20万分の1日本シームレス地質図 https://gbank.gsj.jp/seamless/
            - [ ] FeatureInfoの表示
    - [ ] OpenStreetMap
- Natural Earthデータレイヤの追加
    - 小スケールデータの一部
    - [x] デフォルトプロジェクトで利用する
- 地理院標高タイルの利用
    - [x] 段彩図、傾斜区分図レイヤの追加
        - [ ] 凡例
    - [ ] 地形断面図作成
        - [ ] キャンバス上の色で着色
- 地物情報の表示
    - [ ] 対象の選択: すべての表示レイヤ/選択レイヤのみ
- 帰属
    - [x] 表示を重複させない
- 印刷
    - [ ] 印刷用ページ
- 地図検索 ([Nominatim](https://nominatim.openstreetmap.org/))
    - [x] 検索結果へのジャンプ
    - [ ] 5件程度の結果を一覧表示する
- ローカルのファイル(KML, GeoJSON形式)の読み込み
    - [x] ドラッグ&ドロップで
    - [ ] レイヤ追加ダイアログから
- ローカルの写真ファイルの読み込み
    - [ ] ドラック&ドロップで
    - [ ] 場所情報の取得
    - [ ] 地図上にマーカまたはサムネイルの配置
    - [ ] ポップアップ表示
    - [ ] IndexedDBに保存 (保管目的ではない)
- GistやGitHubにアップロードされたファイルの読み込み
    - クロスオリジンアクセスが可能 (CORS)
    - KML, GeoJSON形式
    - [x] レイヤ追加ダイアログから追加
    - [x] Gist
    - [ ] GitHub
- 読み込まれたファイルレイヤの保存
    - [ ] ファイル保存
    - [ ] IndexedDB
- プロジェクトの発行(アーカイブ)
    - [x] 発行可能な構成でHTMLファイルとプロジェクトファイル、ライブラリファイルをアーカイブ
- 3Dビューア (three.js)
    - [x] 3Dビューア
    - [x] 回転ボタン
    - [x] STLファイル保存ボタン
        - [ ] 地図画像も保存
- Cesiumの起動
    - [ ] Cesiumの起動
    - [ ] ストレージデータの共有
- 距離・面積の計測ツール
    - [x] 距離の計測
        - [x] Vincentyの式
    - [x] 面積の計測
- ウェブ地図リンク
    - 外部サイトへのリンク
- タッチデバイス対応
- 軽量なコアアプリケーションと機能追加の容易性
    - プラグイン管理

### 試験的な機能

- ベクトルタイル
    - [x] 国土地理院のベクトルタイルレイヤの追加
    - [ ] スタイル設定
        - [ ] 用意された外部スタイルファイル(関数)の適用
- ネットワーク接続のない環境での利用
    - [x] IndexedDBを用いたタイル画像データのキャッシュ
    - [x] ServiceWorkerを用いたファイルのキャッシュ
    - 動作確認
        - [ ] Android
        - [ ] iOS


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

- プロジェクトの文字列化 (Project.toString())
- jsファイルの保存
- ストレージへの保存

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
    {source: 'JSON', layer: 'filename.geojson#20151123010100', options: {visible: true, opacity: 1, blendMode: 'source-over'}},
    {source: 'Text', layer: 'filename.kml#20151123020100', options: {visible: true, opacity: 1, blendMode: 'source-over'}},
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
  sources: {
    'filename.geojson#20151123010100': {format: 'geojson', data: {........GeoJSON Content........}},
    'filename.kml#20151123020100': {format: 'kml', data: "<?xml version=\"1.0\" encoding=\"utf-8\" ?>........KML Content......."}
  }
}));
```

### プロジェクトの読み込み

- メニューからの読み込み
    - 読み込み可能な用意されたプロジェクト一覧
    - ストレージに保存されたプロジェクト一覧
- URLパラメータによる読み込み
    - index.html?project=project_name
    - 安全のためにfilesフォルダ以下のプロジェクトファイルに限定
- HTMLファイルのScriptタグによる読み込み
- ローカルのプロジェクトファイルのドラッグ&ドロップによる読み込み


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


## テスト

http://minorua.github.io/WebGISLab/test.html


## スクリーンショット

https://github.com/minorua/WebGISLab/issues/1
