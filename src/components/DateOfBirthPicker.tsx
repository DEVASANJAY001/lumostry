import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface DateOfBirthPickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  className?: string;
}

export default function DateOfBirthPicker({ value, onChange, className }: DateOfBirthPickerProps) {
  const currentYear = new Date().getFullYear();
  const minYear = 1920;
  const maxYear = currentYear - 18;

  const [day, setDay] = useState<number | "">(value ? value.getDate() : "");
  const [month, setMonth] = useState<number | "">(value ? value.getMonth() : "");
  const [year, setYear] = useState<number | "">(value ? value.getFullYear() : "");

  // Sync from external value
  useEffect(() => {
    if (value) {
      setDay(value.getDate());
      setMonth(value.getMonth());
      setYear(value.getFullYear());
    }
  }, [value]);

  const getDaysInMonth = (m: number | "", y: number | "") => {
    if (m === "" || y === "") return 31;
    return new Date(y as number, (m as number) + 1, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(month, year);

  const handleChange = (newDay: number | "", newMonth: number | "", newYear: number | "") => {
    setDay(newDay);
    setMonth(newMonth);
    setYear(newYear);

    if (newDay !== "" && newMonth !== "" && newYear !== "") {
      const maxDay = getDaysInMonth(newMonth, newYear);
      const clampedDay = Math.min(newDay as number, maxDay);
      const date = new Date(newYear as number, newMonth as number, clampedDay);
      onChange(date);
    } else {
      onChange(null);
    }
  };

  const selectClass = cn(
    "h-11 rounded-xl bg-secondary border border-border px-3 text-sm font-medium",
    "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary",
    "appearance-none cursor-pointer text-foreground"
  );

  return (
    <div className={cn("flex gap-2", className)}>
      {/* Day */}
      <select
        value={day}
        onChange={(e) => handleChange(e.target.value ? parseInt(e.target.value) : "", month, year)}
        className={cn(selectClass, "w-[72px]")}
      >
        <option value="">Day</option>
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>

      {/* Month */}
      <select
        value={month}
        onChange={(e) => handleChange(day, e.target.value !== "" ? parseInt(e.target.value) : "", year)}
        className={cn(selectClass, "flex-1")}
      >
        <option value="">Month</option>
        {MONTHS.map((m, i) => (
          <option key={m} value={i}>{m}</option>
        ))}
      </select>

      {/* Year */}
      <select
        value={year}
        onChange={(e) => handleChange(day, month, e.target.value ? parseInt(e.target.value) : "")}
        className={cn(selectClass, "w-[88px]")}
      >
        <option value="">Year</option>
        {Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i).map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}
