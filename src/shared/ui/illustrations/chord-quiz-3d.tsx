import Image from "next/image";

export function ChordQuiz3D({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Image src="/chordy/chordy-correct.png" alt="Chordy" width={80} height={80} className="object-contain" />
    </div>
  );
}
