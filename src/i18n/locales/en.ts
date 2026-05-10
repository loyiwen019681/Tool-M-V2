const en = {
  // ── Common ─────────────────────────────────────────────────────────────────
  'common.cancel':    'Cancel',
  'common.confirm':   'Confirm',
  'common.save':      'Save',
  'common.close':     'Close',
  'common.search':    'Search',
  'common.duplicate': 'Duplicate',
  'common.exportExcel': 'Export Excel',
  'common.undo':      '↩ Undo',
  'common.noData':    'No data',

  // ── Errors (Firestore / Auth) ───────────────────────────────────────────────
  'error.unknown':          'An unknown error occurred.',
  'error.quota':            'Daily write quota exceeded. Please try again later or contact the administrator.',
  'error.permission':       'Insufficient permissions to perform this action.',
  'error.network':          'Network connection unstable. Please check your connection.',
  'error.auth':             'Incorrect email or password. Please try again.',
  'error.tooManyRequests':  'Too many attempts. Account temporarily locked. Please try again later.',
  'error.unknownRetry':     'An unknown error occurred. Please try again.',
  'error.pageError':        'Page Error',
  'error.unknownError':     'Unknown error',
  'error.retry':            'Retry',

  // ── CRUD toasts ────────────────────────────────────────────────────────────
  'crud.addFailed':    'Failed to add. Please try again.',
  'crud.updateFailed': 'Failed to update. Please try again.',
  'crud.deleted':      'Deleted',
  'crud.deleteFailed': 'Failed to delete. Please try again.',

  // ── App-level ──────────────────────────────────────────────────────────────
  'app.quotaWarning': 'Daily write quota reached. Import, delete, and edit features may be temporarily unavailable.',

  // ── Login ──────────────────────────────────────────────────────────────────
  'login.quotaFull': 'System write quota exceeded. Unable to process login. Please try again later.',
  'login.authError':  'Incorrect account or password. If you have a custom Email, please sign in with that Email.',
  'login.failed':     'Login failed: ',

  // ── Dashboard ──────────────────────────────────────────────────────────────
  'dashboard.searchTitle': 'Quick Search (Ctrl+K)',
  'dashboard.searchLabel': 'Search',

  // ── Command Palette ────────────────────────────────────────────────────────
  'palette.groupPage':   'Pages',
  'palette.groupData':   'Data',
  'palette.placeholder': 'Search pages or data (Device, Tools ID…)',
  'palette.noResults':   'No matching pages or data found',
  'palette.navigate':    'Navigate',
  'palette.goTo':        'Go to',
  'palette.close':       'Close',
  'palette.results':     'results',

  // ── Data Management ────────────────────────────────────────────────────────
  'data.noMatch':          'No matching data',
  'data.quotaExceeded':    'Firestore write quota exceeded (20,000/day). Please wait 24 hours for reset or contact the administrator.',
  'data.importPreview':    'Import Preview',
  'data.importPreviewDesc':'Verify field mappings before importing',
  'data.totalRows':        '{{count}} rows',
  'data.noValidRows':      'No valid data rows detected',
  'data.moreRows':         '{{count}} more rows not shown',
  'data.confirmImport':    'Confirm Import',

  // ── Info pages ─────────────────────────────────────────────────────────────
  'info.recordCopied': 'Record duplicated',

  // ── User Management ────────────────────────────────────────────────────────
  'users.emailHint': 'If provided, the user must sign in with this email. If left blank, they can sign in with their username.',

  // ── Offline Banner ─────────────────────────────────────────────────────────
  'offline.message':     'You are offline — showing cached data. Changes will sync when reconnected.',
  'offline.reconnected': 'Network connection restored',

  // ── Theme Switcher ─────────────────────────────────────────────────────────
  'theme.light':    'Light',
  'theme.dark':     'Dark',
  'theme.colored':  'Colored',
  'theme.language': 'Language',

  // ── Saved Views ────────────────────────────────────────────────────────────
  'views.title':       'Saved Filter Presets',
  'views.preset':      'Presets',
  'views.saveCurrent': 'Save current',
  'views.namePlaceholder': 'Enter preset name…',
  'views.empty':       'No saved presets',

  // ── Bulk Action Bar ────────────────────────────────────────────────────────
  'bulk.selected':       'selected',
  'bulk.deleteSelected': 'Delete selected',

  // ── Validation ────────────────────────────────────────────────────────────
  'validate.required':  '"{{label}}" is required',
  'validate.minLength': '"{{label}}" must be at least {{min}} characters',
} as const;

export default en;
