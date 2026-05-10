const ja = {
  // ── Common ─────────────────────────────────────────────────────────────────
  'common.cancel':    'キャンセル',
  'common.confirm':   '確認',
  'common.save':      '保存',
  'common.close':     '閉じる',
  'common.search':    '検索',
  'common.duplicate': '複製',
  'common.exportExcel': 'Excelエクスポート',
  'common.undo':      '↩ 元に戻す',
  'common.noData':    'データなし',

  // ── Errors (Firestore / Auth) ───────────────────────────────────────────────
  'error.unknown':          '不明なエラーが発生しました。',
  'error.quota':            '1日の書き込み上限に達しました。後でもう一度お試しいただくか、管理者にご連絡ください。',
  'error.permission':       'この操作を実行する権限がありません。',
  'error.network':          'ネットワーク接続が不安定です。接続を確認してください。',
  'error.auth':             'メールアドレスまたはパスワードが正しくありません。再度お試しください。',
  'error.tooManyRequests':  '試行回数が多すぎます。アカウントが一時的にロックされています。後でもう一度お試しください。',
  'error.unknownRetry':     '不明なエラーが発生しました。再度お試しください。',
  'error.pageError':        'ページエラー',
  'error.unknownError':     '不明なエラー',
  'error.retry':            '再試行',

  // ── CRUD toasts ────────────────────────────────────────────────────────────
  'crud.addFailed':    '追加に失敗しました。再度お試しください。',
  'crud.updateFailed': '更新に失敗しました。再度お試しください。',
  'crud.deleted':      '削除しました',
  'crud.deleteFailed': '削除に失敗しました。再度お試しください。',

  // ── App-level ──────────────────────────────────────────────────────────────
  'app.quotaWarning': '1日の書き込み上限に達しました。インポート、削除、編集機能が一時的に利用できない場合があります。',

  // ── Login ──────────────────────────────────────────────────────────────────
  'login.quotaFull': 'システムの書き込み上限を超えました。ログインを処理できません。後でもう一度お試しください。',
  'login.authError':  'アカウントまたはパスワードが正しくありません。カスタムメールをお持ちの場合は、そのメールでサインインしてください。',
  'login.failed':     'ログイン失敗：',

  // ── Dashboard ──────────────────────────────────────────────────────────────
  'dashboard.searchTitle': 'クイック検索 (Ctrl+K)',
  'dashboard.searchLabel': '検索',

  // ── Command Palette ────────────────────────────────────────────────────────
  'palette.groupPage':   'ページ',
  'palette.groupData':   'データ',
  'palette.placeholder': 'ページまたはデータを検索 (Device、Tools ID…)',
  'palette.noResults':   '一致するページまたはデータが見つかりません',
  'palette.navigate':    'ナビゲート',
  'palette.goTo':        '移動',
  'palette.close':       '閉じる',
  'palette.results':     '件',

  // ── Data Management ────────────────────────────────────────────────────────
  'data.noMatch':          '一致するデータなし',
  'data.quotaExceeded':    'Firestoreの書き込み上限に達しました（20,000回/日）。24時間後にリセットされるまでお待いただくか、管理者にご連絡ください。',
  'data.importPreview':    'インポートプレビュー',
  'data.importPreviewDesc':'インポート前にフィールドのマッピングを確認してください',
  'data.totalRows':        '{{count}}件',
  'data.noValidRows':      '有効なデータ行が検出されませんでした',
  'data.moreRows':         'さらに{{count}}件は表示されていません',
  'data.confirmImport':    'インポートを確認',

  // ── Info pages ─────────────────────────────────────────────────────────────
  'info.recordCopied': 'レコードが複製されました',

  // ── User Management ────────────────────────────────────────────────────────
  'users.emailHint': '入力した場合、ユーザーはこのメールでサインインする必要があります。空白の場合、ユーザー名でサインインできます。',

  // ── Offline Banner ─────────────────────────────────────────────────────────
  'offline.message':     'オフラインです — キャッシュデータを表示しています。接続が回復すると変更が同期されます。',
  'offline.reconnected': 'ネットワーク接続が回復しました',

  // ── Theme Switcher ─────────────────────────────────────────────────────────
  'theme.light':    'ライト',
  'theme.dark':     'ダーク',
  'theme.colored':  'カラー',
  'theme.language': '言語',

  // ── Saved Views ────────────────────────────────────────────────────────────
  'views.title':       '保存したフィルタープリセット',
  'views.preset':      'プリセット',
  'views.saveCurrent': '現在を保存',
  'views.namePlaceholder': 'プリセット名を入力…',
  'views.empty':       '保存されたプリセットはありません',

  // ── Bulk Action Bar ────────────────────────────────────────────────────────
  'bulk.selected':       '件選択中',
  'bulk.deleteSelected': '選択を削除',

  // ── Validation ────────────────────────────────────────────────────────────
  'validate.required':  '「{{label}}」は必須項目です',
  'validate.minLength': '「{{label}}」は最低{{min}}文字必要です',
} as const;

export default ja;
