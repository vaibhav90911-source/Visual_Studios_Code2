import React, { useState } from "react";
import type { AppUser } from "@/lib/auth-types";
import { isStaffOrAbove, ROLE_LABEL } from "@/lib/auth-types";
import { getEligibleStaffOptions, EVERYONE_STAFF_VALUE } from "@/lib/staff-assignment";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserCheck, Users, ShieldAlert, Sparkles, UserPlus } from "lucide-react";

interface StaffSelectorProps {
  value: string;
  onChange: (val: string) => void;
  users: AppUser[];
  currentUser: AppUser | null;
  placeholder?: string;
  className?: string;
  showQuickAssignMe?: boolean;
}

export function StaffSelector({
  value,
  onChange,
  users,
  currentUser,
  placeholder = "Select staff member or team…",
  className = "",
  showQuickAssignMe = true,
}: StaffSelectorProps) {
  const [isCustom, setIsCustom] = useState(false);
  const [customInput, setCustomInput] = useState("");

  const staffOptions = getEligibleStaffOptions(users);

  // Group staff by role
  const founders = staffOptions.filter((o) => o.role === "super_admin" && !o.isEveryone);
  const managers = staffOptions.filter((o) => o.role === "admin" && !o.isEveryone);
  const recordingTeam = staffOptions.filter((o) => o.role === "staff" && !o.isEveryone);

  const handleQuickAssignMe = () => {
    if (!currentUser) return;
    const name = `${currentUser.display_name} (${ROLE_LABEL[currentUser.role]})`;
    onChange(name);
    setIsCustom(false);
  };

  const handleSelectChange = (val: string) => {
    if (val === "__custom__") {
      setIsCustom(true);
      setCustomInput(value || "");
    } else {
      setIsCustom(false);
      onChange(val);
    }
  };

  const handleCustomSubmit = (text: string) => {
    setCustomInput(text);
    onChange(text);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {!isCustom ? (
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Select value={value || ""} onValueChange={handleSelectChange}>
              <SelectTrigger className="w-full rounded-xl border-glass-border bg-background/50 text-xs sm:text-sm">
                <SelectValue placeholder={placeholder}>
                  {value ? (
                    <span className="flex items-center gap-1.5 truncate">
                      {value.includes("Everyone") || value.includes("All Recording Staff") ? (
                        <Users className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                      ) : (
                        <UserCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                      )}
                      <span className="truncate">{value}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{placeholder}</span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[300px] border-glass-border bg-popover/95 backdrop-blur-xl">
                {/* 1. Everyone / Team Option */}
                <SelectGroup>
                  <SelectLabel className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400">
                    <Users className="h-3.5 w-3.5" /> Broadcast & Team Wide
                  </SelectLabel>
                  <SelectItem
                    value={EVERYONE_STAFF_VALUE}
                    className="cursor-pointer font-medium text-indigo-300 focus:bg-indigo-500/20 focus:text-indigo-200"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-[10px] text-indigo-400">
                        👥
                      </div>
                      <div>
                        <div className="font-semibold text-xs">{EVERYONE_STAFF_VALUE}</div>
                        <div className="text-[10px] text-muted-foreground">
                          Notifies & assigns to all active recording team members
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectGroup>

                {/* 2. Founders */}
                {founders.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
                      <Sparkles className="h-3.5 w-3.5" /> Founders / Super Admins
                    </SelectLabel>
                    {founders.map((f) => (
                      <SelectItem key={f.id} value={f.name} className="cursor-pointer text-xs">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-300">
                            Founder
                          </span>
                          <span>{f.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}

                {/* 3. Managers */}
                {managers.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="flex items-center gap-1.5 text-xs font-semibold text-purple-400">
                      <ShieldAlert className="h-3.5 w-3.5" /> Managers / Admins
                    </SelectLabel>
                    {managers.map((m) => (
                      <SelectItem key={m.id} value={m.name} className="cursor-pointer text-xs">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-bold text-purple-300">
                            Manager
                          </span>
                          <span>{m.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}

                {/* 4. Recording Team Staff */}
                {recordingTeam.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="flex items-center gap-1.5 text-xs font-semibold text-orange-400">
                      <UserCheck className="h-3.5 w-3.5" /> Recording Team Staff
                    </SelectLabel>
                    {recordingTeam.map((st) => (
                      <SelectItem key={st.id} value={st.name} className="cursor-pointer text-xs">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-[10px] font-bold text-orange-300">
                            Recording Team
                          </span>
                          <span>{st.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}

                {/* 5. Custom Entry */}
                <SelectGroup>
                  <SelectLabel className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Other Options
                  </SelectLabel>
                  <SelectItem
                    value="__custom__"
                    className="cursor-pointer text-xs text-muted-foreground hover:text-foreground"
                  >
                    <div className="flex items-center gap-1.5">
                      <UserPlus className="h-3.5 w-3.5" /> Enter custom staff / guest director…
                    </div>
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {showQuickAssignMe && currentUser && isStaffOrAbove(currentUser.role) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleQuickAssignMe}
              className="rounded-xl border-primary/40 bg-primary/10 text-xs font-medium text-primary hover:bg-primary/20 shrink-0 h-9 px-2.5"
              title="Quickly assign this session to yourself"
            >
              <UserCheck className="mr-1 h-3.5 w-3.5" /> Assign to Me
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="Type staff or director name…"
              value={customInput}
              onChange={(e) => handleCustomSubmit(e.target.value)}
              className="rounded-xl border-glass-border bg-background/50 text-xs sm:text-sm"
              autoFocus
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsCustom(false)}
              className="rounded-xl text-xs text-muted-foreground hover:text-foreground shrink-0 h-9"
            >
              Choose from List
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Tip: Select from the list to enable automated notifications for that staff member.
          </p>
        </div>
      )}
    </div>
  );
}
