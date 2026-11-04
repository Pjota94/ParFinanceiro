'use client';

import { useState } from 'react';

export function usePeriod() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  function prevMonth() {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();

  function goToday() {
    setMonth(now.getMonth() + 1);
    setYear(now.getFullYear());
  }

  return { month, year, setMonth, setYear, prevMonth, nextMonth, goToday, isCurrentMonth };
}
