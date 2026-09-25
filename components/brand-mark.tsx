import Image from "next/image";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand-mark">
      <Image src="/brand-g.jpg" alt="Símbolo da G Delivery" width={compact ? 42 : 54} height={compact ? 42 : 54} priority />
      <span>
        <b>G DELIVERY</b>
        {!compact && <small>GONÇALVES DIAS • MA</small>}
      </span>
    </span>
  );
}
