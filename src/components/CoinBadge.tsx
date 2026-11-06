export function Coin() {
  return <span className="coin-icon sm" aria-label="moedas" />;
}

export default function CoinBadge({ coins }: { coins: number }) {
  return (
    <div className="coin-badge" title="Moedas">
      <span className="coin-icon" />
      <span>{coins.toLocaleString('pt-BR')}</span>
    </div>
  );
}
