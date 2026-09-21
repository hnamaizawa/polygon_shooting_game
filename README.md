# POLYGON STRIKE v0.5.0

1980年代の初期3D/ポリゴン・シューティングを思わせる雰囲気を、オリジナル素材だけで再構成したブラウザゲームです。

## v0.5.0 の主な変更

### より自然な連続マップ

背景を一定間隔の単純反復から、**区画ごとに構成が変化する決定論的な連続マップ**へ変更しました。`worldScroll` は従来どおりステージをまたいで連続します。

- Stage 1 / EARTH SURFACE
  - plain / forest / farmland / water / urban / ridge が区画ごとに変化
  - 道路は区画間で滑らかに左右へカーブ
  - 河川も位置・幅・出現頻度が変化
  - 建物、森林、畑、岩場、ランドマークを配置
- Stage 2 / DEEP SPACE
  - nebula / debris / asteroids / outpost / void を変化させる
- Stage 3 / ENEMY FLAGSHIP
  - hangar / vents / trench / turret deck / armor section を連続配置
- Stage 4 / FLAGSHIP CORE
  - reactor / conduit / bay / gate / corridor を連続配置

同じ区画番号は常に同じ構成になるため、フレームごとにランダムにちらつく背景ではありません。

### 敵の種類と動きを追加

従来の INTERCEPTOR / FIGHTER / DART に加えて以下を追加しました。

- **RAIDER**: 画面端から高速で横切る
- **BOMBER**: 低速・重装甲で大きく蛇行
- **BEAM FIGHTER**: プレイヤーを追いながらレーザーをチャージして照射
- **LASER TURRET**: 後半ステージに出現する地上レーザー砲台

敵ごとに hunter / weave / dash / cross / orbit / stalk の異なる移動ロジックを持ちます。

### レーザー武器

自機:
- `Space` / `J`: 従来のパルス弾
- `L`: **連続レーザー**
- レーザーは前方の最も近い敵へ継続ダメージ
- 破壊不能回転装甲板に当たるとそこで遮断され、本体は壊れません

敵:
- BEAM FIGHTER、後半の LASER TURRET、ボスがレーザーを使用
- いきなり照射せず、**細い予告線 → 太いレーザー**の順で発射

## 維持される主な仕様

- 4ステージ、各60秒固定
- 約50秒でボス登場
- `I`: 無敵モード
- `C`: ゲームオーバー時のコンティニュー
- `B`: BGM ON/OFF
- `T`: テクスチャ ON/OFF
- `M`: 全音声 ON/OFF
- 固定1/60秒ステップによるスロー化対策
- 地上敵の破壊
- 破壊不能回転装甲板

## 起動方法

`index.html` を Chrome / Edge で開き、`MISSION START` を押してください。

## テスト

Windows:

```bat
check_harness.cmd
```

Node.js がある場合は構文検査と `tests/core.test.js`、Node.js がない場合は Edge / Chrome のブラウザフォールバックテストを実行します。
