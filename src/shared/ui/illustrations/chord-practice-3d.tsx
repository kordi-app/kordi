import Image from "next/image";

export function ChordPractice3D({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Image src="/chordy/chordy-idle.png" alt="Chordy" width={80} height={80} className="object-contain" />
    </div>
  );
}
