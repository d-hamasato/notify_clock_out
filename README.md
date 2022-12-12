# notify_clock_out
退勤打刻済みかをジョブカンのページからスクレイピングし取得、退勤打刻を忘れていたら LINE Notify で LINE に通知する Node.js  
完全に個人用途で作成したものですが、使いたい方がいましたらどうぞ。  
（2022/12/12時点 console.logも消していない雑な状態です）  
![Photo_22-12-12-11-12-37 086](https://user-images.githubusercontent.com/73775819/206948612-bf4f9797-884a-4723-9377-e6b8b0e10350.png)

## Description
### 打刻情報のスクレイピングには [Playwright](https://github.com/microsoft/playwright) を使用しています。
E2Eテストのnpmですが、スクレイピングに使用しているだけで今回テスト機能は使用していません。  
スクレイピングやプラウザの自動操作のみで使用する場合は公式ドキュメントの [Library](https://playwright.dev/docs/library) の項が参考になります。  
（ソースコード上では使用していませんがテストのモジュールも npmインストール済みです）

### リマインドの通知は [LINE Notify](https://notify-bot.line.me/ja/) を使用しています。
個人利用の場合簡単なパーソナルアクセストークンの発行だけで使えるので最適！

#### LINE Notify　パーソナルアクセストークン取得方法
1. [LINE Notify](https://notify-bot.line.me/ja/) ページからログインし LINE Notifyマイページへ
<img width="1175" alt="スクリーンショット 2022-12-12 11 01 10" src="https://user-images.githubusercontent.com/73775819/206945563-c8d5279c-aef1-4869-8ecd-9e55e973de11.png">
1. アクセストークン発行
  - 「トークンを発行する」ボタンからトークンを取得する（LINE Notify の仕様上「トークン名」が通知の1行目として使われます）

## Requirement
利用するには node.js の実行環境が必要です。
通知の送信に fetch API を使っているので v18以上である必要があります。  
開発は以下の環境で行っています。

- node.js
  - v18.12.1
- npm
  - v8.19.2

（もしあなたが node.js, npm のバージョン管理を [VOLTA](https://volta.sh/) で行っている場合 - `package.json` にバージョン情報を記載済みです⚡️）

```
  "volta": {
    "node": "18.12.1",
    "npm": "8.19.2"
  },
```


# Usage
1. プロジェクトのルートディレクトリで、npmインストールを実行し必要なパッケージをインストールする
```
npm install
```
2. プロジェクトのルートディレクトリに環境変数用の .env ファイルを作成し自分のログイン情報などを書き込む
```
cp -i .env.example .env
vi .env
```
3. スクレイピングでジョブカンから勤怠情報を取得し、出勤日にも関わらず打刻がない場合にLINE通知を行う node.js を実行する
```
node notifyClockOut.js
```

4. 出勤日の19時以降、退勤打刻をまだ行っていない状態で `notifyClockOut.js` を実行し、LINEに通知が来れば成功です🎉

---

ただこれだと `notifyClockOut.js` をコマンドラインから手動実行しているだけなので、それぞれの環境にあった方法で自動実行する必要があります。(crontab等)  

macユーザーの場合、[hammerspoon](https://www.hammerspoon.org/) というアプリの利用がおすすめです。  
（設定ファイルに luaというスクリプト言語で処理を記述することで、あらゆるmacのハードウィアイベントに対して任意の処理を自動実行することができます）  
退勤打刻時間（19:00 ~ 00:00）の間に macの画面をロックしたとき1度だけ `notifyClockOut.js` を実行するというサンプルを `hammerspoon_init_example` 内に用意しました。  

「hammerspoon」は画面分割アプリ「Shiftit」の代替として知ったのですが、APIが充実していて様々な自動化に使えるのでおすすめです！  
今回のケースでは `hs.execute()` を使用して コマンドラインから node.js を実行しています。（ここまでくるとほとんどの事ができる…）  
macの操作をするApple純正のスクリプト AppleScript (jsならJXA) よりもドキュメントが充実していてはるかに使いやすい印象でした。  
