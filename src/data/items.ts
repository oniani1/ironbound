import type { Item } from '../types'
import raw from './items.json'

export const ITEMS = raw as Item[]

export const ITEM_BY_ID: Record<string, Item> = Object.fromEntries(ITEMS.map((i) => [i.id, i]))
