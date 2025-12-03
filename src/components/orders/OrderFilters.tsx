import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Filter, ArrowUpDown } from "lucide-react";

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
    all: "All Orders",
    pending: "Pending",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };

  const sortLabels: Record<OrderSort, string> = {
    recent: "Recent First",
    oldest: "Oldest First",
    "amount-high": "Amount: High → Low",
    "amount-low": "Amount: Low → High",
  };

  return (
    <div className="flex items-center gap-2">
      {/* Filter Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 shadow-soft">
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">{filterLabels[filter]}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={filter} onValueChange={(v) => onFilterChange(v as OrderFilter)}>
            <DropdownMenuRadioItem value="all">All Orders</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="pending">Pending</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="delivered">Delivered</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="cancelled">Cancelled</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sort Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 shadow-soft">
            <ArrowUpDown className="h-4 w-4" />
            <span className="hidden sm:inline">{sortLabels[sort]}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Sort Orders</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={sort} onValueChange={(v) => onSortChange(v as OrderSort)}>
            <DropdownMenuRadioItem value="recent">Recent First</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="oldest">Oldest First</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="amount-high">Amount: High → Low</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="amount-low">Amount: Low → High</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
