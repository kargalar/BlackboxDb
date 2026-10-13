# Custom React Hooks

Bu klasör, proje genelinde kullanılan custom React hook'larını içerir.

## 🪝 Hook'lar

### useContentActions
**Dosya:** `useContentActions.ts`

İçerik aksiyonları için event handler'ları yönetir.

**Özellikler:**
- Event propagation yönetimi (preventDefault, stopPropagation)
- Type-safe event handlers
- Debug logging (development mode)
- Generic type support

**Kullanım:**
```tsx
const { handleWatch, handleToggleFavorite, handleToggleWatchlist } = 
  useContentActions({
    contentId: movie.id,
    contentType: 'movie',
    onWatch,
    onToggleFavorite,
    onToggleWatchlist,
  });
```

**Parametreler:**
- `contentId`: İçeriğin ID'si (number veya string)
- `contentType`: İçerik tipi string'i (logging için)
- `onWatch`: Watch/Read/Play callback
- `onToggleFavorite`: Favorite toggle callback
- `onToggleWatchlist`: Watchlist toggle callback

**Döndürdüğü değerler:**
- `handleWatch`: Watch event handler
- `handleToggleFavorite`: Favorite toggle event handler
- `handleToggleWatchlist`: Watchlist toggle event handler

## 🎯 Amaç

Bu hook'lar şu amaçlarla oluşturulmuştur:
- **Code Reuse:** Event handler logic'ini tekrar kullanılabilir yapmak
- **Consistency:** Tutarlı event handling
- **Type Safety:** TypeScript ile tip güvenliği
- **Debug Support:** Development'ta debug logging

## 🔧 Kullanılan Yerler

- MovieCard
- TvCard
- BookCard
- GameCard

## 📝 Notlar

- Generic type desteği ile hem number hem string ID'ler desteklenir
- Console.log'lar sadece development ortamında aktif olmalı
- useCallback ile memoization yapılır
