# POLYGON STRIKE v0.6.0

1980年代の初期3D/ポリゴン・シューティングを思わせる雰囲気を、オリジナル素材だけで再構成したゲームです。ブラウザ版に加え、v0.6.0 から Windows 用 EXE を配布します。

## Windows 用 EXE

最新版は GitHub Releases の Latest からダウンロードできます。

**固定ダウンロードリンク:**

https://github.com/hnamaizawa/polygon_shooting_game/releases/latest/download/POLYGON-STRIKE-win-x64.exe

- 対象: Windows 10 / 11 x64
- .NET Runtime は EXE に含む自己完結型です
- Microsoft Edge WebView2 Runtime を使用します
- Windows 10 / 11 では通常 WebView2 Runtime は導入済みです
- 未導入の場合は起動時に Microsoft 公式 WebView2 ページへの案内を表示します

EXE はブラウザ版とは別実装ではなく、`index.html` / `style.css` / JavaScript を同じまま埋め込んで WebView2 で実行します。そのため、ゲーム本体の修正はブラウザ版と EXE 版へ同時に反映されます。

## 自動 Release

`.github/workflows/windows-release.yml` により、次の運用を自動化しています。

1. Pull Request ごとに Windows runner で `check_harness.cmd` を実行
2. .NET 8 / WebView2 の Windows ラッパーを restore / publish
3. `win-x64` 自己完結型 Single-file EXE を生成
4. 生成した EXE を `--smoke-test` で実起動確認
5. `main` へマージされた場合のみ、一意な `v0.6.0-build.N` タグで GitHub Release を作成
6. `POLYGON-STRIKE-win-x64.exe` を添付し、その Release を **Latest** に設定

したがって、今後 `main` へマージするたびに固定ダウンロードリンクの EXE が最新版へ更新されます。

## ゲーム内容

### ポリゴン表現

既存の機体シルエットは維持しつつ、三角面の内部に追加のファセット分割を表示しています。

- 自機
- 通常敵
- BOMBER / RAIDER / BEAM FIGHTER
- 地上砲台
- ボス

### 2周構成

4ステージをクリアすると、そのまま **2周目のStage 1** へ進みます。

- 1周目: 基本難易度
- 2周目: 敵の出現密度を約 **1.2倍**
- 2周目: 各ボスの最大HPを **1.2倍**（端数切り上げ）
- 敵そのものの移動速度は、2周目だからという理由では上げません
- 2周目Stage 4を終了するとゲームクリア
- コンティニュー時も現在の周回・ステージを維持

HUDでは `LOOP 1 / LOOP 2` と、各周回内の `STAGE 1〜4` を表示します。

### チャージレーザー

- `Space` / `J`: 通常のパルス弾
- `L` 長押し: レーザーをチャージ
- 約1.35秒チャージすると、約1秒間レーザーを自動照射
- 照射後は再チャージが必要
- 破壊不能回転装甲板に当たるとレーザーは遮断

### ステージ背景

Stage 1 / EARTH SURFACE:
- 地表、道路、河川、森林、農地、市街地、山地

Stage 2 / DEEP SPACE:
- 多層の星空と星雲
- 遠方の惑星
- 小惑星・デブリ
- 宇宙アウトポスト

Stage 3 / ENEMY FLAGSHIP:
- 巨大戦艦の側壁・甲板
- ハンガー、トレンチ、排気口、砲台区画
- ランウェイライト、上部構造物

Stage 4 / FLAGSHIP CORE:
- 床・左右壁・天井で構成した内部通路
- フレーム／リブ構造
- 導管、配管、ゲート、ベイ
- 発光するリアクター区画

`worldScroll` はステージ間・周回間でも連続します。

### 隠れキャラ

オリジナルの隠れキャラ **GOLDEN SCOUT** は各ステージで1回だけ出現機会があります。

- 通常弾またはチャージレーザーで発見可能
- 発見すると **7,777点**
- ゲームクリアには必須ではありません

## その他の主な仕様

- 4ステージ×2周、各ステージ60秒固定
- 約50秒でボス登場
- INTERCEPTOR / FIGHTER / DART / RAIDER / BOMBER / BEAM FIGHTER
- 地上敵、LASER TURRET、敵レーザー
- `I`: 無敵モード
- `C`: ゲームオーバー時のコンティニュー
- `B`: BGM ON/OFF
- `T`: テクスチャ ON/OFF
- `M`: 全音声 ON/OFF
- 固定1/60秒ステップによるスロー化対策
- 破壊不能回転装甲板

## ブラウザ版の起動方法

`index.html` を Chrome / Edge で開き、`MISSION START` を押してください。

## テスト

Windows:

```bat
check_harness.cmd
```

Node.js がある場合は構文検査と `tests/core.test.js`、Node.js がない場合は Edge / Chrome のブラウザフォールバックテストを実行します。

GitHub Actions ではさらに Windows EXE の publish と `--smoke-test` を実施します。