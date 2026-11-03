import type { I18nClient } from '@payloadcms/translations'
import type {
  SanitizedCollectionConfig,
  SanitizedConfig,
  SanitizedGlobalConfig,
  SanitizedPermissions,
  VisibleEntities,
} from 'payload'

import { EntityType } from 'payload/shared'
import { describe, expect, it } from 'vitest'

import type { EntityToGroup, NavGroupType } from './groupNavItems.js'

import { getNavGroups } from './getNavGroups.js'
import { groupNavItems } from './groupNavItems.js'
import { sortNavGroups } from './sortNavGroups.js'

// Only the default group labels go through `t`; custom group labels go through getTranslation.
const defaultGroupLabels: Record<string, Record<string, string>> = {
  de: { 'general:collections': 'Sammlungen', 'general:globals': 'Globale Dokumente' },
  en: { 'general:collections': 'Collections', 'general:globals': 'Globals' },
}

const makeI18n = (language: string) =>
  ({
    fallbackLanguage: 'en',
    language,
    t: (key: string) => defaultGroupLabels[language]?.[key] ?? key,
  }) as unknown as I18nClient

const en = makeI18n('en')

const makeCollection = (slug: string, group?: Record<string, string> | string) =>
  ({
    admin: { group },
    labels: { plural: slug, singular: slug },
    slug,
  }) as unknown as SanitizedCollectionConfig

const makeGlobal = (slug: string, group?: Record<string, string> | string) =>
  ({ admin: { group }, label: slug, slug }) as unknown as SanitizedGlobalConfig

const collections = [
  makeCollection('zebra', 'Animals'),
  makeCollection('apple', 'Food'),
  makeCollection('settings', { de: 'Einstellungen', en: 'System' }),
  makeCollection('banana'),
  makeCollection('lion', 'Animals'),
]

const globals = [makeGlobal('header', 'Layout'), makeGlobal('footer')]

const permissions = {
  collections: Object.fromEntries(collections.map(({ slug }) => [slug, { read: true }])),
  globals: Object.fromEntries(globals.map(({ slug }) => [slug, { read: true }])),
} as unknown as SanitizedPermissions

const groupInDefaultOrder = (i18n: I18nClient): NavGroupType[] =>
  groupNavItems(
    [
      ...collections.map((entity): EntityToGroup => ({ type: EntityType.collection, entity })),
      ...globals.map((entity): EntityToGroup => ({ type: EntityType.global, entity })),
    ],
    permissions,
    i18n,
  )

const getLabels = (groups: NavGroupType[]) => groups.map(({ label }) => label)

const defaultOrder = ['Collections', 'Globals', 'Animals', 'Food', 'System', 'Layout']

describe('sortNavGroups', () => {
  it('should keep the default order when admin.groups is not set', () => {
    const groups = sortNavGroups({
      groupOrder: undefined,
      groups: groupInDefaultOrder(en),
      i18n: en,
    })

    expect(getLabels(groups)).toEqual(defaultOrder)
  })

  it('should keep the default order when admin.groups is empty', () => {
    const groups = sortNavGroups({ groupOrder: [], groups: groupInDefaultOrder(en), i18n: en })

    expect(getLabels(groups)).toEqual(defaultOrder)
  })

  it('should render groups in the order of admin.groups, including the default groups', () => {
    const groupOrder = ['System', 'Animals', 'Food', 'Layout', 'Collections', 'Globals']

    const groups = sortNavGroups({ groupOrder, groups: groupInDefaultOrder(en), i18n: en })

    expect(getLabels(groups)).toEqual(groupOrder)
  })

  it('should render unlisted groups after the listed ones in the default order', () => {
    const groups = sortNavGroups({
      groupOrder: ['Layout', 'Food'],
      groups: groupInDefaultOrder(en),
      i18n: en,
    })

    expect(getLabels(groups)).toEqual([
      'Layout',
      'Food',
      'Collections',
      'Globals',
      'Animals',
      'System',
    ])
  })

  it('should match localized entries against the group labels of the current language', () => {
    const de = makeI18n('de')

    const groups = sortNavGroups({
      groupOrder: [
        { de: 'Einstellungen', en: 'System' },
        { de: 'Globale Dokumente', en: 'Globals' },
      ],
      groups: groupInDefaultOrder(de),
      i18n: de,
    })

    expect(getLabels(groups)).toEqual([
      'Einstellungen',
      'Globale Dokumente',
      'Sammlungen',
      'Animals',
      'Food',
      'Layout',
    ])
  })

  it('should not render a group for an entry that matches no group', () => {
    const groups = sortNavGroups({
      groupOrder: ['Missing', 'Layout'],
      groups: groupInDefaultOrder(en),
      i18n: en,
    })

    expect(getLabels(groups)).toEqual([
      'Layout',
      'Collections',
      'Globals',
      'Animals',
      'Food',
      'System',
    ])
  })

  it('should keep the order of links inside each group', () => {
    const [animals] = sortNavGroups({
      groupOrder: ['Animals'],
      groups: groupInDefaultOrder(en),
      i18n: en,
    })

    expect(animals.entities.map(({ slug }) => slug)).toEqual(['zebra', 'lion'])
  })
})

describe('getNavGroups', () => {
  it('should order the groups by admin.groups', () => {
    const config = {
      admin: { groups: ['Layout', 'System'] },
      collections,
      globals,
    } as unknown as SanitizedConfig

    const visibleEntities: VisibleEntities = {
      collections: collections.map(({ slug }) => slug),
      globals: globals.map(({ slug }) => slug),
    }

    const groups = getNavGroups(permissions, visibleEntities, config, en)

    expect(getLabels(groups)).toEqual([
      'Layout',
      'System',
      'Collections',
      'Globals',
      'Animals',
      'Food',
    ])
  })
})
