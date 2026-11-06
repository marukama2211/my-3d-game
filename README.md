# 3Dブラウザゲーム

「残響の灯台」を題材に、ブラウザで遊べる短編3D探索・アクションを制作します。技術デモではなく、探索・戦闘・進行・クリア条件を備えたゲームとして完成させることを目標にします。仕様と開発上の基本ルールは [`PROJECT_SPEC.md`](PROJECT_SPEC.md) を参照してください。

## 現在の状態

- ゲーム案、三人称視点、Three.js + TypeScript の方針は確認済みです。
- **Phase 1 完了:** Three.js の WebGL レンダラーで立方体と床を表示し、回転・画面サイズ追従を実装。AndroidブラウザでWebGL2と表示も確認済みです。
- **Phase 2 完了:** Three.js のベクトル、行列、回転、Transform型を公開するゲーム用数学モジュールを追加しました。独自演算実装は持たず、Three.jsの機能を利用します。
- `npm test` は8件成功。TypeScript型チェックと本番ビルドも通過しています。
- **Phase 3 未着手:** ゲーム用カメラの追従・入力などを実装する段階です。
- `npm run dev` は `127.0.0.1:5173` で待ち受けます。同じAndroid端末のブラウザから `http://127.0.0.1:5173/` でアクセスできます。

## 技術構成

- TypeScript、Three.js、Vite
- Three.js の WebGLRenderer による WebGL 描画
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
│   ├── render/     # Phase 1 の Three.js シーン
│   └── game/
│       └── math/   # Three.js 数学型のゲーム用エクスポート
├── tests/          # Phase 1・2のメッシュ、カメラ、数学検証
└── assets/         # モデル、テクスチャ、音声（現時点では空）
```

## 起動・確認方法

```sh
npm install
npm run dev
```

Termuxと同じAndroid端末のブラウザで `http://127.0.0.1:5173/` を開きます。自動検証は `npm test`、TypeScript 型チェックと本番ビルドは `npm run build`、ビルドの配信確認は `npm run preview` で行います。

## 開発の進め方

Phase は [`PROJECT_SPEC.md`](PROJECT_SPEC.md) の順番で一つずつ進めます。各 Phase の完了条件を確認してから次に移ります。作業のたびにこの README の状態・決定事項・起動方法を最新化し、[`docs/DEVELOPMENT_LOG.md`](docs/DEVELOPMENT_LOG.md) に実施内容、確認結果、残課題、再開手順を記録します。
