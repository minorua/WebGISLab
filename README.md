# Welcome to WebGIS Lab

目標: デスクトップGISのような操作性のHTML5 WebGISアプリケーション

## Demos
* Default project: http://minorua.github.io/WebGISLab/index.html
    - [地理院タイル](http://maps.gsi.go.jp/development/ichiran.html) (標準地図, 色別標高図, 写真)

* Experimental project: http://minorua.github.io/WebGISLab/index.html?project=experimental
    - [地理院タイル](http://maps.gsi.go.jp/development/ichiran.html) (標準地図, 色別標高図, 写真)
    - 地理院ベクトルタイル ([道路中心線](https://github.com/gsi-cyberjapan/vector-tile-experiment), [基盤地図情報（基本項目）](https://github.com/gsi-cyberjapan/experimental_fgd))
    - [地理院標高タイル](http://maps.gsi.go.jp/development/demtile.html)を用いた段彩図, 傾斜区分図
    - [20万分の1日本シームレス地質図](https://gbank.gsj.jp/seamless/) (WMTS)

## Requirements

次の機能・特徴が欲しい
- レイヤリストまたはレイヤツリー
    - チェックボックスで表示・非表示切り替え
    - レイヤ順の並べ替え
    - 透過性の調整と混合
    - レイヤ情報表示
    - レイヤ領域へのズーム
    - レイヤの削除
- 属性テーブル
    - 地物へのズーム
- ラスタタイル(ベース地図)の追加
    - WMTSレイヤ
        - 20万分の1日本シームレス地質図 https://gbank.gsj.jp/seamless/
            - FeatureInfoの表示
    - レイヤ情報
- ベクトルタイルの追加
    - スタイル設定
        - 用意された外部スタイルファイル(関数)の適用
- 地理院標高タイルの利用
    - 段彩図、傾斜区分図レイヤの追加
        - 凡例
    - 地形断面図作成
        - キャンバス上の色で着色
- 地物情報の表示
    - 対象: すべての表示レイヤ/選択レイヤのみ
- 帰属 (attribution)
    - 表示を重複させない
    - ズームレベルに応じた表示
- 地図検索 (Nominatim/国土数値情報公共施設データ等)
    - 5件程度の結果を一覧表示する
- ローカルのKMLファイルの読み込み (ドラッグ&ドロップで)
- 読み込まれたデータのHTML5 ローカルストレージへの保存
- プロジェクトの保存と読み込み
    - ローカルストレージとファイルダウンロード
    - Java Scriptファイルにして初期プロジェクトとして読み込み可能に→プロジェクトの配布
- 3Dビューアの起動 (Cesium)
    - ローカルストレージデータの共有
- 距離・面積の計測ツール
- 軽量なコアアプリケーションと機能追加の容易性
    - プラグイン管理
- タッチデバイス対応


## Design for Project File

- プロジェクトファイル
    - 内容はJavaScriptのコード(拡張子はjs)
    - JSON形式とカスタム形式
    - olapp.project.load(olapp.Project object, json data or file)
    - JSON形式
        - `メニュー - プロジェクトの保存(ダウンロード)` での保存形式
        - 追加されたレイヤの情報
        - 読み込まれたローカルファイルデータ(データまたは参照)
        - レイヤに設定されたスタイル(データまたは関数)
    - カスタム形式
        - スクリプトの記述によるプロジェクトの構成
        - プロジェクトの保存は不可能(構成変更やスタイル設定に対応できたらいいが)
        - example: https://github.com/minorua/WebGISLab/blob/gh-pages/projects/experimental.js
- メニューからの読み込み
    - 読み込み可能な用意されたプロジェクト一覧
    - ローカルストレージに保存されたプロジェクト一覧
- URLパラメータによる読み込み
    - index.html?project=project_name
    - 安全のためにprojectsフォルダ以下のプロジェクトファイルに限定
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
  var myplugin = {};

  ...

  olapp.plugin.addPlugin(myplugin);
})();
```

プロジェクトファイルのコード
```javascript
olapp.project.load(new olapp.Project({
  title: 'New Project',
  description: '',
  plugins: ['source/csvelevtile.js'],
  init: function (project) {
    var layer = new ol.layer.Tile({
      source: new ol.source.XYZElevCSV({
      ....
    project.addLayer(layer);
  }
}));
```


## Test

http://minorua.github.io/WebGISLab/test.html


## TODO

https://github.com/minorua/WebGISLab/issues/1
