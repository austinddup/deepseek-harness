/** `sddWorkbench` namespace dictionaries. The zh and en strings come verbatim from the PRD COPY table. */
import type {} from '@deepseek-ai/dsh-client-ui-slots'

/** Dictionary namespace owned by this plugin. */
export const NS = 'sddWorkbench'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  title: 'SDD 工作台', // COPY-01
  'guide.description': '浏览 mai-specs 中的需求与规格', // COPY-02
  refresh: '刷新', // COPY-03
  section: '{section} ({count})', // COPY-04
  'state.noWorkspace': '当前会话没有工作目录', // COPY-05
  'state.uninitialized': '未找到 mai-specs/ROADMAP.md。请先在项目中初始化 my-ai-infra', // COPY-06
  'state.noFeatures': 'ROADMAP 中还没有需求', // COPY-07
  'state.roadmapFailed': '无法读取 ROADMAP：{reason}', // COPY-08
  'feature.missing': '未找到需求目录 {path}', // COPY-09
  'feature.empty': '没有文件', // COPY-10
  filter: '按编号、标题或文件名过滤', // COPY-11
  'filter.noMatch': '没有匹配的需求或文件', // COPY-12
  'feature.failed': '无法读取需求目录：{reason}', // COPY-13
  'refresh.failed': '刷新失败：{reason}。显示的是上次的结果', // COPY-14
}

/** Keys of the `sddWorkbench` namespace. */
export type SddWorkbenchKey = keyof typeof zh

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Workbench page title, guide entry, list states, and failure lines. */
    sddWorkbench: SddWorkbenchKey
  }
}

/** English dictionary. */
export const en: Record<SddWorkbenchKey, string> = {
  title: 'SDD workbench',
  'guide.description': 'Browse features and specs in mai-specs',
  refresh: 'Refresh',
  section: '{section} ({count})',
  'state.noWorkspace': 'This session has no working directory.',
  'state.uninitialized': 'mai-specs/ROADMAP.md not found. Set up my-ai-infra in this project first.',
  'state.noFeatures': 'No features in ROADMAP yet.',
  'state.roadmapFailed': "Couldn't read ROADMAP: {reason}",
  'feature.missing': 'Feature folder {path} not found',
  'feature.empty': 'No files',
  filter: 'Filter by number, title, or file name',
  'filter.noMatch': 'No matching features or files',
  'feature.failed': "Couldn't read feature folder: {reason}",
  'refresh.failed': 'Refresh failed: {reason}. Showing the previous results.',
}

/** Japanese dictionary. */
export const ja: Record<SddWorkbenchKey, string> = {
  title: 'SDD ワークベンチ',
  'guide.description': 'mai-specs の機能と仕様を閲覧',
  refresh: '再読み込み',
  section: '{section} ({count})',
  'state.noWorkspace': 'このセッションには作業ディレクトリがありません。',
  'state.uninitialized': 'mai-specs/ROADMAP.md が見つかりません。先にこのプロジェクトで my-ai-infra をセットアップしてください。',
  'state.noFeatures': 'ROADMAP にはまだ機能がありません。',
  'state.roadmapFailed': 'ROADMAP を読み込めません：{reason}',
  'feature.missing': '機能フォルダー {path} が見つかりません',
  'feature.empty': 'ファイルはありません',
  filter: '番号、タイトル、ファイル名で絞り込む',
  'filter.noMatch': '一致する機能やファイルはありません',
  'feature.failed': '機能フォルダーを読み込めません：{reason}',
  'refresh.failed': '再読み込みに失敗しました：{reason}。前回の結果を表示しています。',
}

/** Spanish dictionary. */
export const es: Record<SddWorkbenchKey, string> = {
  title: 'Banco de trabajo SDD',
  'guide.description': 'Explora funciones y especificaciones en mai-specs',
  refresh: 'Actualizar',
  section: '{section} ({count})',
  'state.noWorkspace': 'Esta sesión no tiene directorio de trabajo.',
  'state.uninitialized': 'No se encontró mai-specs/ROADMAP.md. Configura primero my-ai-infra en este proyecto.',
  'state.noFeatures': 'Aún no hay funciones en el ROADMAP.',
  'state.roadmapFailed': 'No se pudo leer el ROADMAP: {reason}',
  'feature.missing': 'No se encontró la carpeta de la función {path}',
  'feature.empty': 'No hay archivos',
  filter: 'Filtrar por número, título o nombre de archivo',
  'filter.noMatch': 'No hay funciones ni archivos que coincidan',
  'feature.failed': 'No se pudo leer la carpeta de la función: {reason}',
  'refresh.failed': 'No se pudo actualizar: {reason}. Se muestran los resultados anteriores.',
}

/** French dictionary. */
export const fr: Record<SddWorkbenchKey, string> = {
  title: 'Atelier SDD',
  'guide.description': 'Parcourir les fonctionnalités et spécifications de mai-specs',
  refresh: 'Actualiser',
  section: '{section} ({count})',
  'state.noWorkspace': 'Cette session n’a pas de répertoire de travail.',
  'state.uninitialized': 'mai-specs/ROADMAP.md introuvable. Configurez d’abord my-ai-infra dans ce projet.',
  'state.noFeatures': 'Aucune fonctionnalité dans le ROADMAP pour l’instant.',
  'state.roadmapFailed': 'Impossible de lire le ROADMAP : {reason}',
  'feature.missing': 'Dossier de fonctionnalité {path} introuvable',
  'feature.empty': 'Aucun fichier',
  filter: 'Filtrer par numéro, titre ou nom de fichier',
  'filter.noMatch': 'Aucune fonctionnalité ni aucun fichier correspondant',
  'feature.failed': 'Impossible de lire le dossier de fonctionnalité : {reason}',
  'refresh.failed': 'Échec de l’actualisation : {reason}. Les résultats précédents sont affichés.',
}

/** German dictionary. */
export const de: Record<SddWorkbenchKey, string> = {
  title: 'SDD-Werkbank',
  'guide.description': 'Features und Spezifikationen in mai-specs durchsuchen',
  refresh: 'Aktualisieren',
  section: '{section} ({count})',
  'state.noWorkspace': 'Diese Sitzung hat kein Arbeitsverzeichnis.',
  'state.uninitialized': 'mai-specs/ROADMAP.md nicht gefunden. Richte zuerst my-ai-infra in diesem Projekt ein.',
  'state.noFeatures': 'Noch keine Features im ROADMAP.',
  'state.roadmapFailed': 'ROADMAP konnte nicht gelesen werden: {reason}',
  'feature.missing': 'Feature-Ordner {path} nicht gefunden',
  'feature.empty': 'Keine Dateien',
  filter: 'Nach Nummer, Titel oder Dateiname filtern',
  'filter.noMatch': 'Keine passenden Features oder Dateien',
  'feature.failed': 'Feature-Ordner konnte nicht gelesen werden: {reason}',
  'refresh.failed': 'Aktualisierung fehlgeschlagen: {reason}. Es werden die vorherigen Ergebnisse angezeigt.',
}

/** Russian dictionary. */
export const ru: Record<SddWorkbenchKey, string> = {
  title: 'Рабочее место SDD',
  'guide.description': 'Просмотр функций и спецификаций в mai-specs',
  refresh: 'Обновить',
  section: '{section} ({count})',
  'state.noWorkspace': 'У этого сеанса нет рабочего каталога.',
  'state.uninitialized': 'Файл mai-specs/ROADMAP.md не найден. Сначала настройте my-ai-infra в этом проекте.',
  'state.noFeatures': 'В ROADMAP пока нет функций.',
  'state.roadmapFailed': 'Не удалось прочитать ROADMAP: {reason}',
  'feature.missing': 'Папка функции {path} не найдена',
  'feature.empty': 'Нет файлов',
  filter: 'Фильтр по номеру, названию или имени файла',
  'filter.noMatch': 'Нет подходящих функций или файлов',
  'feature.failed': 'Не удалось прочитать папку функции: {reason}',
  'refresh.failed': 'Не удалось обновить: {reason}. Показаны предыдущие результаты.',
}

/** Portuguese dictionary. */
export const pt: Record<SddWorkbenchKey, string> = {
  title: 'Bancada SDD',
  'guide.description': 'Navegue por funcionalidades e especificações em mai-specs',
  refresh: 'Atualizar',
  section: '{section} ({count})',
  'state.noWorkspace': 'Esta sessão não tem diretório de trabalho.',
  'state.uninitialized': 'mai-specs/ROADMAP.md não encontrado. Configure o my-ai-infra neste projeto primeiro.',
  'state.noFeatures': 'Ainda não há funcionalidades no ROADMAP.',
  'state.roadmapFailed': 'Não foi possível ler o ROADMAP: {reason}',
  'feature.missing': 'Pasta da funcionalidade {path} não encontrada',
  'feature.empty': 'Nenhum arquivo',
  filter: 'Filtrar por número, título ou nome de arquivo',
  'filter.noMatch': 'Nenhuma funcionalidade ou arquivo correspondente',
  'feature.failed': 'Não foi possível ler a pasta da funcionalidade: {reason}',
  'refresh.failed': 'Falha ao atualizar: {reason}. Mostrando os resultados anteriores.',
}
