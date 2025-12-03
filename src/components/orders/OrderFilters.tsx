import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SlidersHorizontal, ChevronDown } from "lucide-react";

export type OrderFilter = "all" | "pending" | "delivered" | "cancelled";
export type OrderSort = "recent" | "oldest" | "amount-high" | "amount-low";

interface OrderFiltersProps {
  filter: OrderFilter;
  sort: OrderSort;
  onFilterChange: (filter: OrderFilter) => void;
  onSortChange: (sort: OrderSort) => void;
}

export function OrderFilters({ filter, sort, onFilterChange, onSortChange }: OrderFiltersProps) {
  const filterLabels: Record<OrderFilter, string> = {
    all: "All",
    pending: "Pending",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };

  const sortLabels: Record<OrderSort, string> = {
    recent: "Recent",
    oldest: "Oldest",
    "amount-high": "High → Low",
    "amount-low": "Low → High",
  };

  return (
    <div className="flex items-center gap-1">
      {/* Filter Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {filterLabels[filter]}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuRadioGroup value={filter} onValueChange={(v) => onFilterChange(v as OrderFilter)}>
            <DropdownMenuRadioItem value="all" className="text-xs">All Orders</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="pending" className="text-xs">Pending</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="delivered" className="text-xs">Delivered</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="cancelled" className="text-xs">Cancelled</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sort Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs">
            {sortLabels[sort]}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-28">
          <DropdownMenuRadioGroup value={sort} onValueChange={(v) => onSortChange(v as OrderSort)}>
            <DropdownMenuRadioItem value="recent" className="text-xs">Recent First</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="oldest" className="text-xs">Oldest First</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="amount-high" className="text-xs">High → Low</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="amount-low" className="text-xs">Low → High</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
