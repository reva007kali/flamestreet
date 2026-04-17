import { useCartStore } from '@/store/cartStore'
import { useFullscreenNoticeStore } from '@/store/fullscreenNoticeStore'

export function addToCart(item) {
  useCartStore.getState().addItem(item)
  useFullscreenNoticeStore.getState().show({
    title: 'Item ditambah ke Cart',
    subtitle: 'Siap untuk checkout',
    durationMs: 2000,
  })
}

