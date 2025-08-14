import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "./status-badge";
import { formatCurrency } from "./currency";
import type { Room } from "@/types";

interface TopRoomsTableProps {
  rooms: Room[];
  isKRW: boolean;
}

export function TopRoomsTable({ rooms, isKRW }: TopRoomsTableProps) {
  return (
    <Card className="border border-border gap-0">
      <CardHeader className="border-b border-border">
        <CardTitle className="font-medium">Top Rooms by Usage</CardTitle>
        <CardDescription>Rooms with the highest LiveKit usage</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="h-14">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="bg-background font-semibold">
                Room
              </TableHead>
              <TableHead className="bg-background font-semibold text-right">
                Broadcasting
              </TableHead>
              <TableHead className="bg-background font-semibold text-right">
                Listening
              </TableHead>
              <TableHead className="bg-background font-semibold text-right">
                Cost
              </TableHead>
              <TableHead className="bg-background font-semibold">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rooms.map((room, index) => (
              <TableRow
                key={room.room || `room-${index}`}
                className="border-border hover:bg-muted/50 h-16"
              >
                <TableCell className="font-medium">
                  <div className="space-y-1">
                    <div className="font-semibold">{room.room}</div>
                    <div className="text-xs text-muted-foreground">
                      {room.participants} participants
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {room.broadcasting.toLocaleString()} min
                </TableCell>
                <TableCell className="text-right font-mono">
                  {room.listening.toLocaleString()} min
                </TableCell>
                <TableCell className="text-right font-mono font-semibold">
                  {formatCurrency(room.cost, isKRW)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={room.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
