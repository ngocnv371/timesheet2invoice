import React from 'react';

interface DateCalendarProps {
  dailyTotals: Record<string, number>;
  referenceYear?: number;
}

const WEEKDAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const DateCalendar: React.FC<DateCalendarProps> = ({ dailyTotals, referenceYear }) => {
  const year = referenceYear ?? new Date().getFullYear();

  const entries = (Object.entries(dailyTotals) as [string, number][])
    .map(([date, hours]): [string, number, number] => {
      const [m, d] = date.split('/').map(Number);
      return [date, hours, m * 100 + d];
    })
    .sort((a, b) => a[2] - b[2]);

  const months = new Map<number, Map<number, number>>();
  entries.forEach(([date, hours, sortKey]) => {
    const month = Math.floor(sortKey / 100);
    const day = sortKey % 100;
    if (!months.has(month)) months.set(month, new Map());
    months.get(month)!.set(day, hours);
  });

  const renderCell = (month: number, day: number) => {
    if (!day) return <div key={`${month}-empty`} className="aspect-square rounded-lg bg-slate-900/40 border border-slate-800/40" />;
    const hours = months.get(month)?.get(day);
    const dateKey = `${month}/${day}`;
    const hasHours = hours !== undefined && hours > 0;
    const isWeekend = new Date(year, month - 1, day).getDay() === 0 || new Date(year, month - 1, day).getDay() === 6;
    const isRed = hasHours && hours !== 8 && !isWeekend;
    const isOrange = !hasHours && !isWeekend;
    return (
      <div
        key={dateKey}
        title={`${dateKey} - ${hasHours ? `${hours!.toFixed(1)}h` : '0h'}${isWeekend ? ' (weekend)' : ''}`}
        className={`aspect-square flex flex-col items-center justify-center rounded-lg border ${isRed ? 'bg-red-500/20 border-red-500/50' : isOrange ? 'bg-orange-500/20 border-orange-500/40' : 'bg-slate-800 border-slate-700'}`}
      >
        <span className={`text-[9px] font-bold leading-none ${isWeekend ? 'text-slate-600' : 'text-slate-400'}`}>{day}</span>
        <span className={`text-[10px] font-bold leading-tight mt-0.5 ${isRed ? 'text-red-400' : isOrange ? 'text-orange-400' : 'text-slate-600'}`}>
          {hasHours ? `${hours!.toFixed(1)}` : '-'}
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {Array.from(months.entries())
        .sort(([a], [b]) => a - b)
        .map(([month, days]) => {
          const firstWeekday = new Date(year, month - 1, 1).getDay();
          const daysInMonth = new Date(year, month, 0).getDate();
          const cells: (number | null)[] = [];
          for (let i = 0; i < firstWeekday; i++) cells.push(null);
          for (let d = 1; d <= daysInMonth; d++) cells.push(d);
          while (cells.length % 7 !== 0) cells.push(null);

          const weeks: (number | null)[][] = [];
          for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

          return (
            <div key={month}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">{MONTH_NAMES[month - 1]} {year}</div>
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAY_HEADERS.map(h => (
                  <div key={h} className="text-center text-[9px] font-bold text-slate-600">{h}</div>
                ))}
                {weeks.flat().map((day, idx) => (day === null ? renderCell(month, 0) : renderCell(month, day)))}
              </div>
            </div>
          );
        })}
    </div>
  );
};

export default DateCalendar;
