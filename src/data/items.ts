import type { Item } from '../types'
import { asset } from '../lib/asset'
import raw from './items.json'

/** Catalog with image paths resolved against the build base. */
export const ITEMS: Item[] = (raw as Item[]).map((i) => ({ ...i, image: asset(i.image), thumb: i.thumb ? asset(i.thumb) : undefined }))

export const ITEM_BY_ID: Record<string, Item> = Object.fromEntries(ITEMS.map((i) => [i.id, i]))
