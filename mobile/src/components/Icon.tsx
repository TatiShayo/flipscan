// Hand-rolled icon set, Lucide-styled (24x24 viewBox, 2px round stroke, no fill) — one
// consistent set, one stroke weight, per PLAYBOOK 1.5. Avoids adding lucide-react-native
// as a dependency: its peer range (`react` ^16-18) conflicts with this project's React 19.2,
// and the app only needs ~14 glyphs, well under the "write least code necessary" threshold
// for pulling in an entire icon package.
import Svg, { Path, Circle, Line, Rect } from 'react-native-svg';

export type IconName =
  | 'camera'
  | 'barcode'
  | 'history'
  | 'star'
  | 'trending'
  | 'settings'
  | 'check'
  | 'x'
  | 'chevron-right'
  | 'share'
  | 'download'
  | 'flash'
  | 'flash-off'
  | 'switch-camera'
  | 'plus'
  | 'wifi-off';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 24, color = '#211D18', strokeWidth = 2 }: IconProps) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (name) {
    case 'camera':
      return (
        <Svg {...props}>
          <Path d="M4 8a2 2 0 0 1 2-2h1.5l1-1.5h7l1 1.5H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
          <Circle cx={12} cy={13} r={3.5} />
        </Svg>
      );
    case 'barcode':
      return (
        <Svg {...props}>
          <Line x1={4} y1={5} x2={4} y2={19} />
          <Line x1={8} y1={5} x2={8} y2={19} />
          <Line x1={11} y1={5} x2={11} y2={19} />
          <Line x1={15} y1={5} x2={15} y2={19} />
          <Line x1={17.5} y1={5} x2={17.5} y2={19} />
          <Line x1={20} y1={5} x2={20} y2={19} />
        </Svg>
      );
    case 'history':
      return (
        <Svg {...props}>
          <Path d="M3 12a9 9 0 1 0 3-6.7" />
          <Path d="M3 4v4h4" />
          <Path d="M12 7v5l3 3" />
        </Svg>
      );
    case 'star':
      return (
        <Svg {...props}>
          <Path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z" />
        </Svg>
      );
    case 'trending':
      return (
        <Svg {...props}>
          <Path d="M4 16l5-5 3 3 6-7" />
          <Path d="M14 7h4v4" />
        </Svg>
      );
    case 'settings':
      return (
        <Svg {...props}>
          <Circle cx={12} cy={12} r={3} />
          <Path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V20a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H4a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.5V4a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.5 1H20a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1Z" />
        </Svg>
      );
    case 'check':
      return (
        <Svg {...props}>
          <Path d="M20 6L9 17l-5-5" />
        </Svg>
      );
    case 'x':
      return (
        <Svg {...props}>
          <Line x1={18} y1={6} x2={6} y2={18} />
          <Line x1={6} y1={6} x2={18} y2={18} />
        </Svg>
      );
    case 'chevron-right':
      return (
        <Svg {...props}>
          <Path d="M9 6l6 6-6 6" />
        </Svg>
      );
    case 'share':
      return (
        <Svg {...props}>
          <Path d="M12 16V4" />
          <Path d="M7 9l5-5 5 5" />
          <Path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
        </Svg>
      );
    case 'download':
      return (
        <Svg {...props}>
          <Path d="M12 4v12" />
          <Path d="M7 11l5 5 5-5" />
          <Path d="M5 20h14" />
        </Svg>
      );
    case 'flash':
      return (
        <Svg {...props}>
          <Path d="M13 3 5 13h5l-1 8 8-10h-5Z" />
        </Svg>
      );
    case 'flash-off':
      return (
        <Svg {...props}>
          <Path d="M13 3 8.5 8.9" />
          <Path d="M6 12.5 5 13h5l-1 8 5.1-6.4" />
          <Path d="M13 3l-1.6 4.9M18 6l-5 6h5l-8 10" opacity={0} />
          <Line x1={3} y1={3} x2={21} y2={21} />
        </Svg>
      );
    case 'switch-camera':
      return (
        <Svg {...props}>
          <Path d="M4 8a2 2 0 0 1 2-2h1.5l1-1.5h7l1 1.5H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
          <Path d="M9.5 13.5a2.5 2.5 0 0 0 4.3 1.2M14.5 12.5a2.5 2.5 0 0 0-4.3-1.2" />
        </Svg>
      );
    case 'plus':
      return (
        <Svg {...props}>
          <Line x1={12} y1={5} x2={12} y2={19} />
          <Line x1={5} y1={12} x2={19} y2={12} />
        </Svg>
      );
    case 'wifi-off':
      return (
        <Svg {...props}>
          <Line x1={3} y1={3} x2={21} y2={21} />
          <Path d="M8.5 16.5a5 5 0 0 1 7 0" />
          <Path d="M5 12.5a10 10 0 0 1 3.5-2.3" />
          <Path d="M19 12.5a10 10 0 0 0-3-2.1" />
          <Rect x={11} y={19} width={2} height={2} rx={1} fill={color} stroke="none" />
        </Svg>
      );
    default:
      return null;
  }
}
