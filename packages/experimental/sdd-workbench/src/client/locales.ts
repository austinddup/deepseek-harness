/** `sddWorkbench` namespace dictionaries. The zh and en strings come verbatim from the PRD COPY table. */
import type {} from '@deepseek-ai/dsh-client-ui-slots'

/** Dictionary namespace owned by this plugin. */
export const NS = 'sddWorkbench'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  title: 'SDD 工作台',
  'guide.description': '浏览 mai-specs 中的需求与规格',
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
}

/** Japanese dictionary. */
export const ja: Record<SddWorkbenchKey, string> = {
  title: 'SDD ワークベンチ',
  'guide.description': 'mai-specs の機能と仕様を閲覧',
}

/** Spanish dictionary. */
export const es: Record<SddWorkbenchKey, string> = {
  title: 'Banco de trabajo SDD',
  'guide.description': 'Explora funciones y especificaciones en mai-specs',
}

/** French dictionary. */
export const fr: Record<SddWorkbenchKey, string> = {
  title: 'Atelier SDD',
  'guide.description': 'Parcourir les fonctionnalités et spécifications de mai-specs',
}

/** German dictionary. */
export const de: Record<SddWorkbenchKey, string> = {
  title: 'SDD-Werkbank',
  'guide.description': 'Features und Spezifikationen in mai-specs durchsuchen',
}

/** Russian dictionary. */
export const ru: Record<SddWorkbenchKey, string> = {
  title: 'Рабочее место SDD',
  'guide.description': 'Просмотр функций и спецификаций в mai-specs',
}

/** Portuguese dictionary. */
export const pt: Record<SddWorkbenchKey, string> = {
  title: 'Bancada SDD',
  'guide.description': 'Navegue por funcionalidades e especificações em mai-specs',
}
