'use client';

interface TasteQuizProgressProps {
  rated: number;
  total: number;
  minimum: number;
}

export function TasteQuizProgress({ rated, total, minimum }: TasteQuizProgressProps) {
  const progressPercentage = (rated / total) * 100;
  const minimumPercentage = (minimum / total) * 100;
  const isComplete = rated >= minimum;

  return (
    <div className="w-full max-w-lg">
      {/* Progress Bar */}
      <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
        {/* Filled Progress */}
        <div
          className="h-full bg-red-600 transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        />

        {/* Minimum Threshold Marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-slate-400"
          style={{ left: `${minimumPercentage}%` }}
        >
          {/* Small circle marker at the threshold */}
          <div className="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-slate-400" />
        </div>
      </div>

      {/* Progress Text */}
      <div className="mt-2 flex justify-between items-center">
        <p className="text-slate-400 text-sm">
          {rated} of {total} movies rated
        </p>

        {isComplete && (
          <p className="text-green-500 text-sm font-medium">
            You're ready! Continue to browse
          </p>
        )}
      </div>
    </div>
  );
}
