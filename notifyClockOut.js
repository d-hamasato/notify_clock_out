// 環境変数の読み込み
require('dotenv').config();
const env = process.env;
// 日付のライブラリ読み込み
const format = require('date-fns/format');
const {ja} = require('date-fns/locale');
// playwright のライブラリ読み込み（E2Eテストがないやつ）
const { chromium } = require('playwright');

const today = new Date();
// const today = new Date('2022/12/09 00:00:00');
// 出勤簿ページのテーブルから当日の行を見つけるための日付の文字列
const dateForTableSearch = format(today, 'MM/dd(E)', {locale:ja});

/**
 * 退勤打刻チェックを行った日が休日だった場合の例外
 * @param {string} date 日にち
 */
function DayOffException(date) {
  this.message = () => `\n${date}は休み`;
}

/**
 * 出勤日なのに出勤打刻がない場合の例外
 * @param {string} date 日にち
 */
function NoClockingInException(date) {
  this.message = () => `\n${date}の出勤打刻がありません\n打刻修正が必要な場合対応してください`;
  this.stickerPackageId = 6136;
  this.stickerId        = 10551394; // はい、おつー
}

/**
 * 退勤打刻を忘れている場合の例外
 * @param {string} date 日にち
 */
function NoClockingOutException(date) {
  this.loginURL = `\n${env.JOBCAN_LOGIN_URL}` ?? '';
  this.message = () => `\n${date}の退勤打刻がありません\n忘れてなーい？？${this.loginURL}`;
  this.stickerPackageId = 6136; // 謝罪
  this.stickerId = 10551382; // 許さん
}


const lineNotify = {
  request: new Request('https://notify-api.line.me/api/notify', {
      method: 'POST',
  }),
  headers: new Headers({
      'Authorization': `Bearer ${env.LINE_NOTIFY_ACCESS_TOKEN}`,
      // 'Content-Type': 'multipart/form-data', // 画像を送りたくなった場合追加する 恐らくbodyの中身に応じて Content-Type を変更する必要がある
  }),
  send: async function(body) {
    const form = new FormData();
    for (const [paramName, value] of Object.entries(body)) {
      await form.append(paramName, value);
    }
    return fetch(this.request, {
        headers: this.headers,
        body: form,
    });
  }
};

// ジョブカンのスクレイピングとその結果に応じた LINE通知 TODO スクレイピングとジョブカンの処理を分離させたい
(async () => {
  const browser = await chromium.launch({
    headless: true
  });
  const context = await browser.newContext({
    locale: 'ja-JP', 
  });
  const page = await context.newPage();

  try {
    await page.goto('https://id.jobcan.jp/users/sign_in?lang=ja');
    await page.getByPlaceholder('メールアドレスまたはスタッフコード').fill(env.JOBCAN_EMAIL);
    await page.getByPlaceholder('パスワード').fill(env.JOBCAN_PASSWORD);
    await page.getByRole('button', { name: 'ログイン' }).click();
    const [page1] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByRole('link', { name: '勤怠' }).click()
    ]);
    await page1.getByRole('link', { name: '出勤簿' }).click();
  
    console.log(`${dateForTableSearch} の打刻をチェック`);
    const row =  await page1.locator('#search-result').locator(`tr:has-text("${dateForTableSearch}") > td`);
  
    const shiftTime = await row.nth(2).innerText();
    const clockedInAt = await row.nth(3).innerText();
    if (!shiftTime) { // 休日
      throw new DayOffException(dateForTableSearch);
    } else if(!clockedInAt) { // 出勤日なのに出勤打刻がない
      throw new NoClockingInException(dateForTableSearch);
    }
  
    const clockedOutAt = await row.nth(4).innerText();
    if (clockedOutAt === '(勤務中)') {
      throw new NoClockingOutException(dateForTableSearch);
    } else {
      console.log(`${clockedOutAt}：に退勤してるね`);
    }

  } catch (e) {
    if (e instanceof DayOffException) {
      console.log(e.message());
      return;
    } else if (e instanceof NoClockingOutException || e instanceof NoClockingInException) {
      const response = await lineNotify.send({
        message: e.message(),
        stickerPackageId: e.stickerPackageId,
        stickerId: e.stickerId,
      });
      if (!response.ok) {
        console.log(`HTTP error! Status: ${response.status}`);
      } else {
        const data = await response.json();
        console.log(data);
      }
    } else {
      const response = await lineNotify.send({
        message: '\nスクレイピング処理でエラー発生\nログを確認してね',
        stickerPackageId: 6136,
        stickerId: 10551399, // ごめんっ
      });
      if (!response.ok) {
        console.log(`HTTP error! Status: ${response.status}`);
      } else {
        const data = await response.json();
        console.log(data);
      }
      // TODO log ファイルに書き出し
    }
  } finally {
    await context.close();
    await browser.close();
  }

})();
