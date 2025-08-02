import React from 'react';

interface CharacterIconProps {
  size?: 'small' | 'medium' | 'large' | 'xl' | 'favicon';
  shape?: 'circle' | 'square';
  className?: string;
  alt?: string;
}

export const CharacterIcon: React.FC<CharacterIconProps> = ({
  size = 'medium',
  shape = 'circle',
  className = '',
  alt = 'BUNGU SQUAD キャラクター'
}) => {
  const sizeClass = `character-icon-${size}`;
  const shapeClass = shape === 'square' ? 'character-icon-square' : '';
  
  return (
    <div className={`character-icon ${sizeClass} ${shapeClass} ${className}`}>
      <img 
        src="/assets/characters/main-character.JPG" 
        alt={alt}
        loading="lazy"
      />
    </div>
  );
};

// 使用例のコメント
/*
使用方法:

// 小さい円形アイコン
<CharacterIcon size="small" />

// 大きい正方形アイコン  
<CharacterIcon size="large" shape="square" />

// カスタムクラス付き
<CharacterIcon size="xl" className="border-2 border-gold" />

// ファビコンサイズ
<CharacterIcon size="favicon" shape="square" />
*/