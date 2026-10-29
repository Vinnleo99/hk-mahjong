import { memo } from 'react';
import { tileSvg } from './tileSvg';
import { tileName } from './engine/tiles';

interface Props {
  face: number;
  size?: number;
  onClick?: () => void;
  selected?: boolean;
  dim?: boolean;
  badge?: string;
  label?: string;
  back?: boolean;
}
const cache = new Map<string, string>();
const svgFor = (f: number, back = false) => {
  const k = `${f}${back}`;
  if (!cache.has(k)) cache.set(k, tileSvg(f, { back }));
  return cache.get(k)!;
};
export const Tile = memo(function Tile({ face, size = 44, onClick, selected, dim, badge, label, back }: Props) {
  const name = label ?? (face < 34 ? tileName(face) : face < 38 ? `Flower ${face - 33}` : `Season ${face - 37}`);
  return (
    <button
      type="button"
      className={`tile${selected ? ' selected' : ''}${dim ? ' dim' : ''}${onClick ? ' tappable' : ''}`}
      style={{ width: size, height: size * (80 / 60) }}
      onClick={onClick}
      disabled={!onClick}
      aria-label={name}
      title={name}
    >
      <span className="tile-svg" dangerouslySetInnerHTML={{ __html: svgFor(face, back) }} />
      {badge && <span className="tile-badge">{badge}</span>}
    </button>
  );
});
