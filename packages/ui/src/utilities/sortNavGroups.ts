import type { I18nClient } from '@payloadcms/translations'
import type { SanitizedConfig } from 'payload'

import { getTranslation } from '@payloadcms/translations'

import type { NavGroupType } from './groupNavItems.js'

type SortNavGroupsArgs = {
  /** Group labels in the order they should render, from `admin.groups`. */
  groupOrder?: SanitizedConfig['admin']['groups']
  /** Nav groups in their default order, as returned by `groupNavItems`. */
  groups: NavGroupType[]
  i18n: I18nClient
}

/**
 * Orders nav groups by `admin.groups`: listed groups first, in list order, then unlisted groups
 * in their default order. Entries match a group by its translated label, like `admin.group`.
 */
export function sortNavGroups({ groupOrder, groups, i18n }: SortNavGroupsArgs): NavGroupType[] {
  if (!groupOrder?.length) {
    return groups
  }

  const orderedLabels = groupOrder.map((label) => getTranslation(label, i18n))

  const getPosition = ({ label }: NavGroupType): number => {
    const index = orderedLabels.indexOf(label)

    return index === -1 ? orderedLabels.length : index
  }

  // Array.prototype.sort is stable, so unlisted groups keep their default order
  return [...groups].sort((a, b) => getPosition(a) - getPosition(b))
}
