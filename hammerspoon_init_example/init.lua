-- hammerspoon 設定ファイルのサンプルです。
  -- プロジェクトのディレクトリは各自の環境に応じて変更してください。
  -- デバッグ用のconsole出力も残っている状態です。必要に応じて変更を行ってください。

-- 退勤打刻時間かの判定 (19:00 ~ 24:00)
local function isClockingOutHours()
  return 19 <= tonumber(os.date("%H")) and 23 >= tonumber(os.date("%H"))
end

-- notifyClockOut.js の実行ログ
notifyClockOutExecutionLog = {
  lastExcecutedDay = nil -- notifyClockOut.js を実行後に代入する
}
function notifyClockOutExecutionLog:setLastExcecutedDay(day)
  self.lastExcecutedDay = day -- notityClockOut.js を実行後に更新する
end
function notifyClockOutExecutionLog:isExcecutedToday()
  return self.lastExcecutedDay == os.date("%D")
end

-- 退勤打刻時間内の画面ロックをきっかけにジョブカンの退勤打刻チェックとLINE通知を実行する（1日1回だけ）
function notifyClockOutHandler(eventType)
  if isClockingOutHours() and eventType == hs.caffeinate.watcher.screensDidLock then
    hs.console.printStyledtext('退勤打刻する時間に画面ロック！')
    if notifyClockOutExecutionLog:isExcecutedToday() == false then
      -- ジョブカンから退勤打刻情報をスクレイピングした結果に応じて LINE通知を送る Node.js を実行
      nodeExcuteResults = hs.execute('cd ~/notify_clock_out/\nnode notifyClockOut.js', true) -- ディレクトリは各自の環境に合わせて変更してください
      hs.console.printStyledtext(nodeExcuteResults)
      notifyClockOutExecutionLog:setLastExcecutedDay(os.date("%D"))
    else
      hs.console.printStyledtext('すでに今日は通知済み')
    end
  else
    hs.console.printStyledtext('「退勤打刻時間の画面ロック」ではない caffeinate イベント')
  end
end

notifyClockOutWatcher = hs.caffeinate.watcher.new(notifyClockOutHandler);
notifyClockOutWatcher:start()
