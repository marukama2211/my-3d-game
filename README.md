# 3Dブラウザゲーム

「残響の灯台」を題材に、ブラウザで遊べる短編3D探索・アクションを制作します。技術デモではなく、探索・戦闘・進行・クリア条件を備えたゲームとして完成させることを目標にします。仕様と開発上の基本ルールは [`PROJECT_SPEC.md`](PROJECT_SPEC.md) を参照してください。

## 現在の状態

- ゲーム案、三人称視点、Three.js + TypeScript の方針は確認済みです。
- **Phase 1 完了:** Three.js のWebGL表示、回転、リサイズを実装し、Androidブラウザでも確認済みです。
- **Phase 2 完了:** Three.jsの数学型を公開するゲーム用窓口と単体テストを追加済みです。
- **Phase 3 完了:** OrbitControlsによる三人称オービット、対象追従、マウス／タッチ回転、角度制限を実装し、Node.jsテスト13件と本番ビルドに成功しました。Androidブラウザでも表示・タッチ操作・角度制限・スクロール抑止・エラーなしを確認済みです。
- **Phase 4 完了:** カプセル型プレイヤー、カメラ相対の水平移動、PCキーボード、Android向けフローティングスティック／右側カメラ操作を実装しました。ローカルforwardとYaw符号の不一致を修正し、4方向・180度境界の自動テスト25件、本番ビルドに成功。ユーザーが修正後のAndroid実機とPCで操作確認を完了しました。
- **Phase 5 未着手:** 地面・壁・障害物との衝突判定はまだ実装していません。
- `npm run dev` は `127.0.0.1:5173` で待ち受けます。同じAndroid端末のブラウザから `http://127.0.0.1:5173/` でアクセスできます。

## 技術構成

- TypeScript、Three.js、Vite
- Three.js の WebGLRenderer と公式 OrbitControls アドオン
- Node.js 組み込みテストランナーと tsx による検証

## ディレクトリ構成

```text
.
├── PROJECT_SPEC.md
├── README.md
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── docs/
│   └── DEVELOPMENT_LOG.md
├── src/
│   ├── app/        # 起動処理と画面スタイル
│   ├── render/     # シーン描画
│   ├── game/
│   │   ├── camera/ # 三人称オービットカメラ
│   │   ├── player/ # プレイヤー仮モデルと移動制御
│   │   └── math/   # Three.js 数学型のゲーム用エクスポート
│   └── input/      # キーボード／タッチ入力の共通窓口
├── tests/          # Phase 1〜4のメッシュ、数学、カメラ、入力、移動検証
└── assets/         # モデル、テクスチャ、音声（現時点では空）
```

## 起動・確認方法

```sh
npm install
npm run dev
```

Termuxと同じAndroid端末のブラウザで `http://127.0.0.1:5173/` を開きます。自動検証は `npm test`、TypeScript型チェックと本番ビルドは `npm run build`、ビルドの配信確認は `npm run preview` で行います。

## 開発の進め方

Phase は [`PROJECT_SPEC.md`](PROJECT_SPEC.md) の順番で一つずつ進めます。各Phaseの完了条件を確認してから次に移ります。作業のたびにこのREADMEの状態・決定事項・起動方法を最新化し、[`docs/DEVELOPMENT_LOG.md`](docs/DEVELOPMENT_LOG.md) に実施内容、確認結果、残課題、再開手順を記録します。
