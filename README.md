# 3Dブラウザゲーム

「残響の灯台」を題材に、ブラウザで遊べる短編3D探索・アクションを制作します。技術デモではなく、探索・戦闘・進行・クリア条件を備えたゲームとして完成させることを目標にします。仕様と開発上の基本ルールは [`PROJECT_SPEC.md`](PROJECT_SPEC.md) を参照してください。

## 現在の状態

- ゲーム案、三人称視点、Three.js + TypeScript の方針は確認済みです。
- Phase 1 の描画基盤を実装しました。Three.js で WebGL レンダラーを初期化し、ライト付きの立方体を表示・回転します。
- TypeScript の型チェック、本番ビルド、生成 JavaScript の構文検査、4件の Node.js 単体テストに合格しました。
- `npm run dev` は `127.0.0.1:5173` で待ち受けます。同じAndroid端末のブラウザから `http://127.0.0.1:5173/` でアクセスできます。
- 実ブラウザでの WebGL コンテキスト取得、シェーダー実行、画面表示は未検証です。Phase 1 の状態と未確認項目は [`docs/DEVELOPMENT_LOG.md`](docs/DEVELOPMENT_LOG.md) を参照してください。
- Phase 2 以降の機能は未実装で、Phase 1 のブラウザ依存確認が済むまで進みません。

## 技術構成

- TypeScript、Three.js、Vite
- Three.js の WebGLRenderer による WebGL 描画
- Node.js 組み込みテストランナーと tsx による幾何・カメラ計算の検証

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
│   ├── app/       # 起動処理と画面スタイル
│   └── render/    # Phase 1 の Three.js シーンと生成関数
├── tests/         # Phase 1 のメッシュ・カメラ検証
└── assets/        # モデル、テクスチャ、音声（現時点では空）
```

## 起動・確認方法

```sh
npm install
npm run dev
```

Termuxと同じAndroid端末のブラウザで `http://127.0.0.1:5173/` を開きます。自動検証は `npm test`、TypeScript 型チェックと本番ビルドは `npm run build`、ビルドの配信確認は `npm run preview` で行います。

## 開発の進め方

Phase は [`PROJECT_SPEC.md`](PROJECT_SPEC.md) の順番で一つずつ進めます。各 Phase の完了条件を確認してから次に移ります。作業のたびにこの README の状態・決定事項・起動方法を最新化し、[`docs/DEVELOPMENT_LOG.md`](docs/DEVELOPMENT_LOG.md) に実施内容、確認結果、残課題、再開手順を記録します。
