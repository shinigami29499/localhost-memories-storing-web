"use client";

import { useState } from "react";
import { DropdownRangeDatePicker } from "@/components/ui/dropdown-range-date-picker";

export default function DropdownRangeDatePickerDemoPage() {
  const [range, setRange] = useState({ from: "", to: "" });
  return (
    <div className="flex min-h-screen items-center justify-center">
        <DropdownRangeDatePicker from={range.from} to={range.to} onChange={(from, to) => setRange({ from, to })} />
    </div>
  );
}

