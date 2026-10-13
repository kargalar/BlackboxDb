# Shared UI Components

Bu klasör, tüm content card component'leri tarafından kullanılan ortak UI component'lerini içerir.

## 📦 Component'ler

### ContentActionButtons
**Dosya:** `ContentActionButtons.tsx`

İçerik kartları için action button'ları sağlar:
- Watch/Read/Play button
- Favorite button  
- Watchlist button

**Kullanım:**
```tsx
<ContentActionButtons
  size="medium"
  actionType="watch" // 'watch' | 'read' | 'play'
  isWatched={false}
  isFavorite={false}
  isConsumeLater={false}
  onWatch={handleWatch}
  onToggleFavorite={handleToggleFavorite}
  onToggleWatchlist={handleToggleWatchlist}
/>
```

### ContentBadges
**Dosya:** `ContentBadges.tsx`

İçerik kartları için badge component'leri:

#### RatingBadge
Puan ve yorum sayısını gösterir.

#### StatusBadges  
İzlendi, favori, listede durumlarını badge olarak gösterir.

#### ContentBadgesContainer
Tüm badge'leri birlikte yöneten container component.

**Kullanım:**
```tsx
<ContentBadgesContainer
  showRating={true}
  rating={4.5}
  reviewCount={120}
  size="medium"
  isConsumed={true}
  isFavorite={false}
  isConsumeLater={true}
/>
```

## 🎯 Amaç

Bu component'ler şu amaçlarla oluşturulmuştur:
- **DRY (Don't Repeat Yourself):** Kod tekrarını önlemek
- **Consistency:** Tüm card'larda tutarlı görünüm
- **Maintainability:** Tek yerden yönetim
- **Reusability:** Farklı content type'larda kullanılabilir

## 🔧 Kullanılan Yerler

- MovieCard
- TvCard
- BookCard
- GameCard

## 📝 Notlar

- Size variants: 'small', 'medium', 'large'
- Action types: 'watch', 'read', 'play'
- Tüm component'ler TypeScript ile type-safe
- JSDoc yorumları ile dokümante edilmiş
