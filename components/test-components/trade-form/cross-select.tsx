import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CrossSelectProps {
  value: string;
  onChange: (v: string) => void;
}

export function CrossSelect({ value, onChange }: CrossSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="cross">Cross</SelectItem>
        <SelectItem value="isolated">Isolated</SelectItem>
      </SelectContent>
    </Select>
  );
}
