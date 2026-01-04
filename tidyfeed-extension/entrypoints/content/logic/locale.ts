export type Locale = 'zh' | 'ja' | 'es' | 'en';

export const LOCALE_STRINGS: Record<string, Record<Locale, string>> = {
    bookmark: {
        en: 'Bookmark to TidyFeed',
        zh: '收藏到 TidyFeed',
        ja: 'TidyFeedに保存',
        es: 'Guardar en TidyFeed'
    },
    saved: {
        en: 'Saved to TidyFeed',
        zh: '已收藏到 TidyFeed',
        ja: 'TidyFeedに保存しました',
        es: 'Guardado en TidyFeed'
    },
    login_required: {
        en: 'Login to save posts',
        zh: '登录后即可收藏',
        ja: 'ログインして保存',
        es: 'Inicia sesión para guardar'
    },
    click_to_login: {
        en: 'Click to login',
        zh: '点击登录',
        ja: 'クリックしてログイン',
        es: 'Haz clic para iniciar sesión'
    },
    sync_btn: {
        en: 'Sync to TidyFeed',
        zh: '同步到 TidyFeed',
        ja: 'TidyFeedに同期',
        es: 'Sincronizar con TidyFeed'
    },
    syncing: {
        en: 'Syncing Bookmarks',
        zh: '正在同步书签',
        ja: 'ブックマークを同期中',
        es: 'Sincronizando marcadores'
    },
    stop: {
        en: 'Stop',
        zh: '停止',
        ja: '停止',
        es: 'Detener'
    },
    synced_count: {
        en: 'Synced',
        zh: '已同步',
        ja: '同期済み',
        es: 'Sincronizado'
    },
    skipped_count: {
        en: 'Skipped',
        zh: '已跳过',
        ja: 'スキップ',
        es: 'Omitido'
    },
    scanning: {
        en: 'Scanning...',
        zh: '扫描中...',
        ja: 'スキャン中...',
        es: 'Escaneando...'
    },
    sync_complete: {
        en: 'Sync Complete',
        zh: '同步完成',
        ja: '同期完了',
        es: 'Sincronización completa'
    },
    sync_success_msg: {
        en: 'Synced {n} new bookmarks.',
        zh: '成功同步了 {n} 个新书签。',
        ja: '{n} 個の新しいブックマークを同期しました。',
        es: 'Se han sincronizado {n} nuevos marcadores.'
    },
    login_alert: {
        en: 'Please login to TidyFeed first.',
        zh: '请先登录 TidyFeed。',
        ja: '先にTidyFeedにログインしてください。',
        es: 'Por favor, inicie sesión en TidyFeed primero.'
    }
};

export function getLocaleString(key: string): string {
    const lang = navigator.language.slice(0, 2).toLowerCase();
    let locale: Locale = 'en';
    if (lang === 'zh') locale = 'zh';
    else if (lang === 'ja') locale = 'ja';
    else if (lang === 'es') locale = 'es';

    return LOCALE_STRINGS[key]?.[locale] || LOCALE_STRINGS[key]?.['en'] || key;
}
