import { useCountUp } from '@/hooks/useCountUp';

interface StatCounterProps {
  value: number;
  suffix?: string;
  label: string;
  delay?: number;
}

export function StatCounter({ value, suffix = '', label, delay = 0 }: StatCounterProps) {
  const { count, ref } = useCountUp({
    end: value,
    duration: 2000,
    delay,
    suffix,
  });

  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl md:text-5xl font-bold text-white mb-2">
        {count}
      </div>
      <div className="text-white/80 text-sm md:text-base">{label}</div>
    </div>
  );
}
