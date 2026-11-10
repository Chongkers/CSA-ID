type MapuaSquaresProps = { className?: string };

const colors = [
  "red", "gold", "ink", "muted", "red", "gold",
  "muted", "ink", "gold", "red", "ink", "muted",
  "gold", "red", "muted", "gold", "ink", "red",
];

export function MapuaSquares({ className = "" }: MapuaSquaresProps) {
  return (
    <div className={`mapuaSquares ${className}`} aria-hidden="true">
      {colors.map((color, index) => <span className={color} key={`${color}-${index}`} />)}
    </div>
  );
}
