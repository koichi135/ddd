import potionSvg from './assets/items/potion.svg'
import swordSvg from './assets/items/sword.svg'
import keySvg from './assets/items/key.svg'
import './ItemMenu.css'

export interface ItemEntry {
  id: string
  name: string
  icon: string
  quantity: number
  description: string
  usable: boolean
}

interface ItemMenuProps {
  potions: number
  level: number
  bossDefeated: boolean
  onUsePotion: () => void
  onClose: () => void
}

export default function ItemMenu({
  potions,
  level,
  bossDefeated,
  onUsePotion,
  onClose,
}: ItemMenuProps) {
  const items: ItemEntry[] = [
    {
      id: 'potion',
      name: 'ポーション',
      icon: potionSvg,
      quantity: potions,
      description: 'HPを30回復する',
      usable: potions > 0,
    },
    {
      id: 'sword',
      name: level >= 5 ? '鋼の剣' : level >= 3 ? '鉄の剣' : '銅の剣',
      icon: swordSvg,
      quantity: 1,
      description: `ATK+${level >= 5 ? 6 : level >= 3 ? 3 : 0}`,
      usable: false,
    },
    {
      id: 'key',
      name: 'ボスのカギ',
      icon: keySvg,
      quantity: bossDefeated ? 1 : 0,
      description: 'ボスを倒した証',
      usable: false,
    },
  ]

  return (
    <div className="item-menu">
      <div className="item-menu-header">
        <span>もちもの</span>
        <button className="item-menu-close" onClick={onClose}>
          とじる
        </button>
      </div>
      <div className="item-menu-list">
        {items
          .filter((item) => item.quantity > 0)
          .map((item) => (
            <div key={item.id} className="item-menu-row">
              <img
                className="item-menu-icon"
                src={item.icon}
                alt={item.name}
              />
              <div className="item-menu-info">
                <span className="item-menu-name">{item.name}</span>
                <span className="item-menu-desc">{item.description}</span>
              </div>
              <span className="item-menu-qty">x{item.quantity}</span>
              {item.usable && (
                <button className="item-menu-use" onClick={onUsePotion}>
                  つかう
                </button>
              )}
            </div>
          ))}
        {items.every((item) => item.quantity === 0) && (
          <p className="item-menu-empty">もちものはない...</p>
        )}
      </div>
    </div>
  )
}
