
import type { Profile } from '@/types/matchmaking';

interface MatchFunnelProps {
  client: Profile;
  considered: number;
  qualified: number;
  excluded: Record<string, number>;
}

export default function MatchFunnel({
  client,
  considered,
  qualified,
  excluded,
}: MatchFunnelProps) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
        <span className="font-bold text-stone-800">
          {considered} in pool →{' '}
          <span className="text-rose-600">
            {qualified} qualified
          </span>
        </span>

        {Object.entries(excluded)
          .sort((a, b) => b[1] - a[1])
          .map(([reason, count]) => (
            <span
              key={reason}
              className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600"
            >
              −{count} {reason.toLowerCase()}
            </span>
          ))}
      </div>

      <p className="text-[11px] text-stone-400 mt-2">
        Scores are mutual: how well they fit {client.firstName}&apos;s
        wants, blended with how well {client.firstName} fits theirs.
      </p>
    </div>
  );
}
